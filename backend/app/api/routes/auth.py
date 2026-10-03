import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database.connection import get_db
from ...models.user import User
from ...schemas.auth import LoginRequest, AuthResponse, UserResponse, RegisterRequest, StudentListItem
from ...core.auth import create_access_token, get_current_user

logger = logging.getLogger("evallq.auth.api")
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticates a Teacher or Student using email and password.
    Never transmits or stores plain text passwords.
    """
    email = req.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not user.verify_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # If role was explicitly specified by the login modal, enforce matching
    if req.role and user.role.upper() != req.role.strip().upper():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as a {user.role}, not as a {req.role.upper()}."
        )

    token = create_access_token(user.id, user.email, user.role)
    logger.info(f"User {user.email} signed in successfully as {user.role}.")

    return AuthResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the currently authenticated user's profile and active role.
    """
    return UserResponse.model_validate(current_user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a new Teacher or Student account with cryptographically hashed password.
    """
    email = req.email.strip().lower()
    role = req.role.strip().upper()
    if role not in {"TEACHER", "STUDENT"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'TEACHER' or 'STUDENT'."
        )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    new_user = User(
        name=req.name.strip(),
        email=email,
        password_hash=User.hash_password(req.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id, new_user.email, new_user.role)
    return AuthResponse(
        token=token,
        user=UserResponse.model_validate(new_user)
    )


@router.get("/students", response_model=List[StudentListItem])
async def list_students(
    db: Session = Depends(get_db)
):
    """
    Returns all registered students for teacher assignment selection.
    """
    students = db.query(User).filter(User.role == "STUDENT").order_by(User.name.asc()).all()
    return [StudentListItem.model_validate(s) for s in students]
