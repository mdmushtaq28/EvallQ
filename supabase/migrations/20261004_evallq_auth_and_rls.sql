-- ==============================================================================
-- EvallQ Production Supabase Schema, Triggers, and Row-Level Security (RLS)
-- Migration: 20261004_evallq_auth_and_rls.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. PUBLIC PROFILES TABLE
-- Linked directly to Supabase auth.users(id) with cascading delete
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('TEACHER', 'STUDENT')),
    avatar TEXT DEFAULT 'academic',
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast lookup by email and role
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 3. AUTOMATED PROFILE SYNCHRONIZATION TRIGGERS
-- Auto-create/sync profile when users register or verify through Supabase Auth
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role TEXT;
BEGIN
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    user_role := UPPER(COALESCE(
        NEW.raw_user_meta_data->>'role',
        'STUDENT'
    ));

    IF user_role NOT IN ('TEACHER', 'STUDENT') THEN
        user_role := 'STUDENT';
    END IF;

    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        avatar,
        email_confirmed_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        user_name,
        NEW.email,
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'avatar', 'academic'),
        NEW.email_confirmed_at,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if present and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync email confirmation and updates
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET
        email = NEW.email,
        email_confirmed_at = NEW.email_confirmed_at,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email, email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();


-- ==============================================================================
-- 4. CORE APPLICATION TABLES
-- Assignments, Questions, Student Allocations, Submissions, Question Evaluations
-- ==============================================================================

-- 4.1 ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    teacher_name TEXT DEFAULT 'Teacher',
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    instructions TEXT,
    due_date TEXT,
    total_maximum_marks NUMERIC(6,2) NOT NULL DEFAULT 100.0,
    rubric_guidance TEXT,
    expected_concepts JSONB DEFAULT '[]'::jsonb,
    questions JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);

-- 4.2 ASSIGNMENT QUESTION ITEMS
CREATE TABLE IF NOT EXISTS public.assignment_question_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    question_number INT NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'Subjective',
    maximum_marks NUMERIC(6,2) NOT NULL DEFAULT 10.0,
    topic TEXT NOT NULL DEFAULT 'General',
    rubric TEXT,
    model_answer TEXT,
    key_concepts TEXT,
    strictness TEXT NOT NULL DEFAULT 'balanced',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_items_assignment_id ON public.assignment_question_items(assignment_id);

-- 4.3 ASSIGNMENT STUDENTS (Allocation mapping)
CREATE TABLE IF NOT EXISTS public.assignment_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT NOT NULL DEFAULT 'ASSIGNED',
    submission_id UUID,
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_students_student_id ON public.assignment_students(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_students_assignment_id ON public.assignment_students(assignment_id);

-- 4.4 ASSESSMENT SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.assessment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    student_name TEXT DEFAULT 'Student',
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT,
    page_count INT NOT NULL DEFAULT 1,
    ocr_status TEXT NOT NULL DEFAULT 'pending',
    ocr_engine TEXT,
    ocr_confidence NUMERIC(5,4),
    raw_ocr_text JSONB,
    verified_ocr_text TEXT,
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    evaluation_status TEXT NOT NULL DEFAULT 'pending',
    total_maximum_marks NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    ai_suggested_score NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    teacher_score NUMERIC(6,2),
    final_score NUMERIC(6,2),
    approval_status TEXT NOT NULL DEFAULT 'pending',
    topic_performance JSONB,
    learning_gaps JSONB,
    recommendations JSONB,
    submission_type TEXT NOT NULL DEFAULT 'typed',
    teacher_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.assessment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.assessment_submissions(student_id);

-- 4.5 ASSESSMENT QUESTIONS (Per-Question AI & Rubric Evaluation)
CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.assessment_submissions(id) ON DELETE CASCADE,
    question_number INT NOT NULL DEFAULT 1,
    page_number INT NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    student_answer TEXT NOT NULL,
    maximum_marks NUMERIC(6,2) NOT NULL DEFAULT 5.0,
    suggested_marks NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    teacher_marks NUMERIC(6,2),
    teacher_feedback TEXT,
    topic TEXT NOT NULL DEFAULT 'General',
    rubric_match TEXT,
    reasoning TEXT,
    feedback TEXT,
    strengths TEXT,
    mistakes TEXT,
    learning_gap TEXT,
    model_answer TEXT,
    key_concepts TEXT,
    rubric TEXT,
    strictness TEXT NOT NULL DEFAULT 'balanced',
    criterion_scores JSONB,
    supported_points JSONB,
    missing_points JSONB,
    confidence NUMERIC(4,3) DEFAULT 0.95,
    teacher_review_required INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_submission_id ON public.assessment_questions(submission_id);


-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict role and user separation
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_question_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- 5.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5.2 ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "assignments_teacher_all" ON public.assignments;
CREATE POLICY "assignments_teacher_all" ON public.assignments
    FOR ALL TO authenticated
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "assignments_student_select" ON public.assignments;
CREATE POLICY "assignments_student_select" ON public.assignments
    FOR SELECT TO authenticated
    USING (
        status IN ('published', 'active') AND
        EXISTS (
            SELECT 1 FROM public.assignment_students
            WHERE public.assignment_students.assignment_id = public.assignments.id
            AND public.assignment_students.student_id = auth.uid()
        )
    );

-- 5.3 ASSIGNMENT QUESTION ITEMS POLICIES
DROP POLICY IF EXISTS "question_items_teacher_all" ON public.assignment_question_items;
CREATE POLICY "question_items_teacher_all" ON public.assignment_question_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assignments
            WHERE public.assignments.id = public.assignment_question_items.assignment_id
            AND public.assignments.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "question_items_student_select" ON public.assignment_question_items;
CREATE POLICY "question_items_student_select" ON public.assignment_question_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assignment_students
            WHERE public.assignment_students.assignment_id = public.assignment_question_items.assignment_id
            AND public.assignment_students.student_id = auth.uid()
        )
    );

-- 5.4 ASSIGNMENT STUDENTS POLICIES
DROP POLICY IF EXISTS "assignment_students_teacher_all" ON public.assignment_students;
CREATE POLICY "assignment_students_teacher_all" ON public.assignment_students
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assignments
            WHERE public.assignments.id = public.assignment_students.assignment_id
            AND public.assignments.teacher_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "assignment_students_student_select" ON public.assignment_students;
CREATE POLICY "assignment_students_student_select" ON public.assignment_students
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

-- 5.5 ASSESSMENT SUBMISSIONS POLICIES
DROP POLICY IF EXISTS "submissions_student_select_own" ON public.assessment_submissions;
CREATE POLICY "submissions_student_select_own" ON public.assessment_submissions
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "submissions_student_insert_own" ON public.assessment_submissions;
CREATE POLICY "submissions_student_insert_own" ON public.assessment_submissions
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "submissions_teacher_all" ON public.assessment_submissions;
CREATE POLICY "submissions_teacher_all" ON public.assessment_submissions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assignments
            WHERE public.assignments.id = public.assessment_submissions.assignment_id
            AND public.assignments.teacher_id = auth.uid()
        )
    );

-- 5.6 ASSESSMENT QUESTIONS POLICIES
DROP POLICY IF EXISTS "assessment_questions_student_select" ON public.assessment_questions;
CREATE POLICY "assessment_questions_student_select" ON public.assessment_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_submissions
            WHERE public.assessment_submissions.id = public.assessment_questions.submission_id
            AND public.assessment_submissions.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "assessment_questions_teacher_all" ON public.assessment_questions;
CREATE POLICY "assessment_questions_teacher_all" ON public.assessment_questions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_submissions sub
            JOIN public.assignments a ON a.id = sub.assignment_id
            WHERE sub.id = public.assessment_questions.submission_id
            AND a.teacher_id = auth.uid()
        )
    );
