from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """DB table model for registered users."""

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    azure_oid: str = Field(unique=True, index=True, default="")
    name: str = Field(default="")
    email: str = Field(unique=True, index=True)
    role: str = Field(default="user")          # user | trustee | admin
    balance: float = Field(default=1000.0)
    last_daily_claim: Optional[datetime] = Field(default=None)
    last_login_at: Optional[datetime] = Field(default=None)
    allow_as_subject: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.now)


class MicrosoftProfile(SQLModel):
    """Parsed info from a Microsoft ID token — not a DB table."""

    azure_oid: str
    name: str
    email: str


class UserRead(SQLModel):
    """API response for a user profile (never expose secrets)."""

    id: int
    name: str
    email: str
    role: str
    balance: float
    allow_as_subject: bool


class AuthCallbackRequest(SQLModel):
    """Request body for POST /auth/callback."""

    code: str
    redirect_uri: Optional[str] = None


class AuthTokenResponse(SQLModel):
    """Response returned after successful authentication."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead


class UserSettingsUpdate(SQLModel):
    """Request body for PATCH /user/me/settings."""

    allow_as_subject: bool