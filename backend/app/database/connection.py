from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# SQLite specific connect_args to allow multithreaded FastAPI worker queries safely
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a scoped SQLAlchemy database session.
    Automatically closes session after request concludes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initializes database tables defined on SQLAlchemy Base metadata.
    Also executes lightweight migrations for SQLite and seeds default test users.
    """
    import app.models  # noqa: F401 - ensure models are registered
    Base.metadata.create_all(bind=engine)

    # Lightweight migration check for SQLite
    try:
        with engine.connect() as conn:
            # Check assessment_submissions columns
            result = conn.exec_driver_sql("PRAGMA table_info(assessment_submissions);")
            existing_sub_cols = {row[1] for row in result.fetchall()}
            if "assignment_id" not in existing_sub_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN assignment_id VARCHAR(36);")
            if "student_id" not in existing_sub_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN student_id VARCHAR(36);")
            if "student_name" not in existing_sub_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN student_name VARCHAR(100) DEFAULT 'Student';")
            if "submission_type" not in existing_sub_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN submission_type VARCHAR(30) DEFAULT 'scanned';")
            if "teacher_feedback" not in existing_sub_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN teacher_feedback TEXT;")

            # Check assignments columns
            res_asgn = conn.exec_driver_sql("PRAGMA table_info(assignments);")
            existing_asgn_cols = {row[1] for row in res_asgn.fetchall()}
            if "teacher_id" not in existing_asgn_cols:
                conn.exec_driver_sql("ALTER TABLE assignments ADD COLUMN teacher_id VARCHAR(36);")
            if "teacher_name" not in existing_asgn_cols:
                conn.exec_driver_sql("ALTER TABLE assignments ADD COLUMN teacher_name VARCHAR(100) DEFAULT 'Teacher';")
            if "due_date" not in existing_asgn_cols:
                conn.exec_driver_sql("ALTER TABLE assignments ADD COLUMN due_date VARCHAR(50);")
            if "status" not in existing_asgn_cols:
                conn.exec_driver_sql("ALTER TABLE assignments ADD COLUMN status VARCHAR(30) DEFAULT 'draft';")

            # Check assignment_question_items columns
            try:
                res_aqi = conn.exec_driver_sql("PRAGMA table_info(assignment_question_items);")
                existing_aqi_cols = {row[1] for row in res_aqi.fetchall()}
                if "model_answer" not in existing_aqi_cols:
                    conn.exec_driver_sql("ALTER TABLE assignment_question_items ADD COLUMN model_answer TEXT;")
                if "key_concepts" not in existing_aqi_cols:
                    conn.exec_driver_sql("ALTER TABLE assignment_question_items ADD COLUMN key_concepts TEXT;")
                if "strictness" not in existing_aqi_cols:
                    conn.exec_driver_sql("ALTER TABLE assignment_question_items ADD COLUMN strictness VARCHAR(20) DEFAULT 'balanced';")
            except Exception:
                pass

            # Check assessment_questions columns
            try:
                res_aq = conn.exec_driver_sql("PRAGMA table_info(assessment_questions);")
                existing_aq_cols = {row[1] for row in res_aq.fetchall()}
                if "model_answer" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN model_answer TEXT;")
                if "key_concepts" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN key_concepts TEXT;")
                if "rubric" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN rubric TEXT;")
                if "strictness" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN strictness VARCHAR(20) DEFAULT 'balanced';")
                if "criterion_scores" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN criterion_scores TEXT;")
                if "supported_points" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN supported_points TEXT;")
                if "missing_points" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN missing_points TEXT;")
                if "confidence" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN confidence FLOAT DEFAULT 0.95;")
                if "teacher_review_required" not in existing_aq_cols:
                    conn.exec_driver_sql("ALTER TABLE assessment_questions ADD COLUMN teacher_review_required INTEGER DEFAULT 0;")
            except Exception:
                pass

            conn.commit()
    except Exception as e:
        print(f"Database schema synchronization notice: {e}")

    # Seed default user accounts if user table is empty
    try:
        from app.models.user import User
        db = SessionLocal()
        if db.query(User).count() == 0:
            default_users = [
                User(
                    name="Prof. Robert Chen",
                    email="teacher@evallq.ai",
                    password_hash=User.hash_password("teacher123"),
                    role="TEACHER"
                ),
                User(
                    name="Alex Rivera",
                    email="student@evallq.ai",
                    password_hash=User.hash_password("student123"),
                    role="STUDENT"
                ),
                User(
                    name="Jordan Lee",
                    email="jordan@evallq.ai",
                    password_hash=User.hash_password("student123"),
                    role="STUDENT"
                ),
                User(
                    name="Maya Patel",
                    email="maya@evallq.ai",
                    password_hash=User.hash_password("student123"),
                    role="STUDENT"
                ),
            ]
            db.add_all(default_users)
            db.commit()
            print("Successfully seeded default EvallQ accounts: teacher@evallq.ai, student@evallq.ai, jordan@evallq.ai, maya@evallq.ai")
        db.close()
    except Exception as e:
        print(f"Default user seeding notice: {e}")
