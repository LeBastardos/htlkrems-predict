from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Datenbank-Modell für einen Benutzer."""

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str = Field(default="")
    azure_oid: Optional[str] = Field(default=None, unique=True, index=True)

    # Wallet: Guthaben direkt auf dem User-Objekt
    balance: float = Field(default=1000.0)

    # Rolle: "user" | "trustee" | "admin"
    role: str = Field(default="user")

    # Einstellungen
    allow_as_subject: bool = Field(default=True)

    # Zeitstempel
    last_login_at: Optional[datetime] = Field(default=None)
    last_daily_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserRead(BaseModel):
    id: int
    email: str
    name: str
    balance: float
    role: str
    allow_as_subject: bool

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    allow_as_subject: bool


class MicrosoftProfile(BaseModel):
    azure_oid: str
    name: str
    email: str


class AuthCallbackRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead