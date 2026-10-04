import base64
import hashlib
import hmac
import json
import time
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import settings
from ..database.connection import get_db
from ..models.user import User

security = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, email: str, role: str, expires_in_seconds: int = 86400 * 30) -> str:
    """
    Creates an HMAC-SHA256 cryptographically signed bearer token.
    Contains user_id, email, role, and expiration timestamp.
    """
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates token signature and expiration timestamp.
    Supports both:
    1. Standard Supabase 3-part JWT (header.payload.signature)
    2. Local 2-part HMAC token (payload.signature)
    """
    if not token or "." not in token:
        return None
    try:
        parts = token.strip().split(".")

        # Case 1: Standard Supabase 3-part JWT
        if len(parts) == 3:
            header_b64, payload_b64, signature_b64 = parts

            # Decode payload
            rem = len(payload_b64) % 4
            padded_b64 = payload_b64 + ("=" * (4 - rem) if rem > 0 else "")
            payload_bytes = base64.urlsafe_b64decode(padded_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            # Check expiration
            if payload.get("exp", 0) < int(time.time()):
                return None

            # If Supabase JWT Secret is configured, verify HMAC signature
            if settings.SUPABASE_JWT_SECRET:
                signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
                expected_sig = hmac.new(
                    settings.SUPABASE_JWT_SECRET.encode("utf-8"),
                    signing_input,
                    hashlib.sha256
                ).digest()
                expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode("utf-8").rstrip("=")
                if not hmac.compare_digest(signature_b64, expected_sig_b64):
                    return None

            user_meta = payload.get("user_metadata") or {}
            app_meta = payload.get("app_metadata") or {}
            role_val = (user_meta.get("role") or app_meta.get("role") or "student").upper()
            full_name = user_meta.get("full_name") or user_meta.get("name") or payload.get("email") or "EvallQ User"

            return {
                "sub": payload.get("sub"),
                "email": payload.get("email", ""),
                "role": role_val,
                "name": full_name,
                "exp": payload.get("exp"),
                "is_supabase": True,
            }

        # Case 2: Local 2-part HMAC token
        if len(parts) == 2:
            payload_b64, signature = parts

            # Verify HMAC signature
            expected_sig = hmac.new(
                settings.SECRET_KEY.encode("utf-8"),
                payload_b64.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected_sig):
                return None

            # Decode payload
            rem = len(payload_b64) % 4
            padded_b64 = payload_b64 + ("=" * (4 - rem) if rem > 0 else "")
            payload_bytes = base64.urlsafe_b64decode(padded_b64)
            payload = json.loads(payload_bytes.decode("utf-8"))

            # Check expiration
            if payload.get("exp", 0) < int(time.time()):
                return None

            return payload

        return None
    except Exception:
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency extracting and authenticating the user from the Bearer token or X-Auth-Token header.
    Supports both Supabase JWT tokens and local tokens. Automatically syncs Supabase user accounts.
    """
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.headers.get("X-Auth-Token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()

    # If user authenticated with Supabase but not yet synced locally, auto-sync
    if not user and payload.get("is_supabase") and user_id:
        # Check by email first in case user was pre-seeded
        email_val = payload.get("email", "").strip().lower()
        if email_val:
            user = db.query(User).filter(User.email == email_val).first()

        if user:
            # Update user id to match Supabase sub UUID
            user.id = user_id
            db.commit()
            db.refresh(user)
        else:
            user = User(
                id=user_id,
                name=payload.get("name") or "EvallQ User",
                email=email_val or f"{user_id}@evallq.ai",
                password_hash="supabase_auth_managed",
                role=payload.get("role") or "STUDENT",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Non-blocking version of get_current_user that returns None if no valid token is supplied.
    """
    token = credentials.credentials if credentials else request.headers.get("X-Auth-Token")
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload:
        return None
    return db.query(User).filter(User.id == payload.get("sub")).first()


async def get_current_teacher(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces TEACHER role access.
    """
    if current_user.role.upper() != "TEACHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Teacher privileges required."
        )
    return current_user


async def get_current_student(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces STUDENT role access.
    """
    if current_user.role.upper() != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Student privileges required."
        )
    return current_user
