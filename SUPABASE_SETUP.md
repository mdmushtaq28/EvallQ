# EvallQ — Supabase Authentication & Database Setup Guide

This guide walks you through setting up Supabase as the production authentication provider and relational database for **EvallQ**, supporting role-based access control (Teachers & Students), email verification, session persistence, and Render deployment.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New Project**.
3. Enter your project details:
   - **Name**: `EvallQ` (or your preferred name)
   - **Database Password**: Generate and save a strong password securely.
   - **Region**: Select the region closest to your users / Render server.
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

---

## 2. Run the SQL Migration Script

EvallQ includes an automated migration script that creates the `profiles` table, auto-sync triggers for new user signups, application tables, and strict Row Level Security (RLS) policies.

1. In your Supabase Dashboard, navigate to the **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open [`supabase/migrations/20261004_evallq_auth_and_rls.sql`](./supabase/migrations/20261004_evallq_auth_and_rls.sql) in your code editor.
4. Copy the entire contents and paste into the Supabase SQL Editor.
5. Click **Run** (or press `Ctrl+Enter`).
6. Confirm the query executes successfully with status `Success. No rows returned`.

### What this migration creates:
- `public.profiles`: Stores user name, role (`TEACHER` or `STUDENT`), avatar, and verification timestamp linked to `auth.users(id)` with cascading deletes.
- `public.handle_new_user()` trigger: Automatically inserts a profile into `public.profiles` whenever a user registers through Supabase Auth, extracting their selected role and full name.
- `public.handle_user_updated()` trigger: Automatically syncs verified email timestamps when users confirm their email.
- Tables: `assignments`, `assignment_question_items`, `assignment_students`, `assessment_submissions`, `assessment_questions`.
- Row-Level Security (RLS): Strict separation ensuring students can only access assigned assignments/submissions, while teachers control their created assignments and evaluations.

---

## 3. Configure Supabase Authentication Settings

Navigate to **Authentication** -> **URL Configuration** in your Supabase Dashboard:

### 3.1 Site URL
- **Local Development**: `http://localhost:5173`
- **Render Production**: `https://<YOUR-FRONTEND-SUBDOMAIN>.onrender.com`

### 3.2 Redirect URLs (Add all of the following):
Click **Add URL** and add each pattern:
- `http://localhost:5173/**`
- `http://127.0.0.1:5173/**`
- `http://localhost:5173/verify-email`
- `http://localhost:5173/reset-password`
- `https://<YOUR-FRONTEND-SUBDOMAIN>.onrender.com/**`
- `https://<YOUR-FRONTEND-SUBDOMAIN>.onrender.com/verify-email`
- `https://<YOUR-FRONTEND-SUBDOMAIN>.onrender.com/reset-password`

### 3.3 Email Auth Settings
Navigate to **Authentication** -> **Providers** -> **Email**:
- **Enable Email provider**: `ON`
- **Confirm email**: `ON` (Recommended for production to enforce verification)
- **Secure password change**: `ON`

---

## 4. Obtain API Keys & Secrets

Navigate to **Project Settings** -> **API**:
1. Copy **Project URL**: e.g., `https://xyzcompany.supabase.co`
2. Under **Project API keys**, copy the `anon` `public` key.
3. Under **JWT Settings**, copy the **JWT Secret**.

---

## 5. Environment Variables Configuration

### 5.1 Local Frontend (`frontend/.env` or `.env.local`)
Create or edit `frontend/.env.local`:
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
```

### 5.2 Local Backend (`backend/.env`)
Create or edit `backend/.env`:
```env
APP_NAME=EvallQ API
APP_VERSION=0.1.0
HOST=127.0.0.1
PORT=8000
DATABASE_URL=sqlite:///./focusflow.db
FRONTEND_URL=http://localhost:5173

# Supabase Auth Integration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Local LLM Inference
LLM_PROVIDER=local
LLM_MODEL=qwen2.5:0.5b
LLM_BASE_URL=http://127.0.0.1:11434
LLM_TIMEOUT_SECONDS=60.0
```

---

## 6. Render Production Deployment

When deploying to [Render](https://render.com):

### Frontend Static Site (or Web Service)
Add the following Environment Variables in the Render Dashboard:
| Key | Value |
|---|---|
| `VITE_API_URL` | `https://<YOUR-BACKEND-API>.onrender.com` |
| `VITE_SUPABASE_URL` | `https://<YOUR-PROJECT-ID>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (Your Supabase Anon Key) |

### Backend Web Service (FastAPI)
Add the following Environment Variables in the Render Dashboard:
| Key | Value |
|---|---|
| `PORT` | `10000` (or Render's assigned port) |
| `FRONTEND_URL` | `https://<YOUR-FRONTEND>.onrender.com` |
| `SUPABASE_URL` | `https://<YOUR-PROJECT-ID>.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` (Your Supabase Anon Key) |
| `SUPABASE_JWT_SECRET` | `your-jwt-secret-here` |

---

## 7. Authentication Flow Overview

1. **Sign Up**:
   - The user registers at `/signup` choosing their role (`Student` or `Teacher`).
   - Supabase creates the `auth.users` record and the database trigger creates their profile in `public.profiles`.
   - A verification email is automatically sent by Supabase.
2. **Email Verification**:
   - The user is redirected to `/verify-email`. Clicking the link in the confirmation email brings them back to the app, where Supabase updates `email_confirmed_at`.
3. **Log In**:
   - Users sign in at `/login`.
   - EvallQ verifies email status and synchronizes the session with the backend API.
4. **Role Routing & RBAC**:
   - Teachers are routed to the Teacher Dashboard, Rubric Generator, Review Queue, and Student Progress trackers.
   - Students are restricted to assigned assignments, active submissions, and evaluated results.
5. **Password Reset**:
   - Users request a reset link at `/forgot-password`.
   - The link in the email directs to `/reset-password` where they securely enter their new password.
