from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = None  # TEACHER or STUDENT


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = Field(default="STUDENT", description="TEACHER or STUDENT")


class StudentListItem(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True
