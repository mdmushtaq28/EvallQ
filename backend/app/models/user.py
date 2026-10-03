import uuid
import hashlib
import os
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from ..database.connection import Base


class User(Base):
    """
    SQLAlchemy ORM model for teachers and students with secure password hashing.
    Passwords are never stored in plain text.
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # "TEACHER" or "STUDENT"

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hashes password using PBKDF2-HMAC-SHA256 with a unique cryptographic salt.
        Never stores plain text.
        """
        salt = os.urandom(16).hex()
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return f"{salt}${dk.hex()}"

    def verify_password(self, password: str) -> bool:
        """
        Verifies a plaintext password against the stored PBKDF2 hash using constant-time comparison.
        """
        if not self.password_hash or "$" not in self.password_hash:
            return False
        try:
            salt, stored_hash = self.password_hash.split("$", 1)
            dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
            return hashlib.sha256(dk.hex().encode()).digest() == hashlib.sha256(stored_hash.encode()).digest()
        except Exception:
            return False
