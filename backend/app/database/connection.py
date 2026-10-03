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
    Also executes lightweight migrations for SQLite if columns are missing.
    """
    import app.models  # noqa: F401 - ensure models are registered
    Base.metadata.create_all(bind=engine)

    # Lightweight migration check for SQLite
    try:
        with engine.connect() as conn:
            # Check assessment_submissions columns
            result = conn.exec_driver_sql("PRAGMA table_info(assessment_submissions);")
            existing_cols = {row[1] for row in result.fetchall()}
            if "assignment_id" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN assignment_id VARCHAR(36);")
            if "student_name" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN student_name VARCHAR(100) DEFAULT 'Student';")
            if "teacher_feedback" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE assessment_submissions ADD COLUMN teacher_feedback TEXT;")
            conn.commit()
    except Exception as e:
        print(f"Database schema synchronization notice: {e}")
