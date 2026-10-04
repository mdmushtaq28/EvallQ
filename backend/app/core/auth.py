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
    Validates HMAC signature and expiration timestamp. Returns payload if valid, None otherwise.
    """
    if not token or "." not in token:
        return None
    try:
        parts = token.strip().split(".")
        if len(parts) != 2:
            return None
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
        # Add padding back if necessary
        rem = len(payload_b64) % 4
        padded_b64 = payload_b64 + ("=" * (4 - rem) if rem > 0 else "")
        payload_bytes = base64.urlsafe_b64decode(padded_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Check expiration
        if payload.get("exp", 0) < int(time.time()):
            return None

        return payload
    except Exception:
        return None


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency extracting and authenticating the user from the Bearer token or X-Auth-Token header.
    Raises 401 Unauthorized if invalid or missing.
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
