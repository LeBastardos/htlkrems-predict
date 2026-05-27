from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlmodel import Field, SQLModel


class MicrosoftProfile(BaseModel):
    azure_oid: str
    name: str
    email: EmailStr


class AuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class UserBase(SQLModel):
    username: Optional[str] = Field(default=None, index=True, unique=True, min_length=3)
    email: EmailStr | None = Field(default=None, index=True)


class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: Optional[str] = Field(default=None)
    azure_oid: Optional[str] = Field(default=None, index=True)
    role: str = Field(default="user")
    allow_as_subject: bool = Field(default=True)
    last_login_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserRead(SQLModel):
    id: int
    username: Optional[str]
    name: Optional[str]
    email: Optional[EmailStr]
    role: str
    allow_as_subject: bool


class UserSettingsUpdate(BaseModel):
    allow_as_subject: bool


class AuthTokenResponse(BaseModel):
    access_token: str
    user: UserRead