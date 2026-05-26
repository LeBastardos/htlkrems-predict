from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.auth import create_user_access_token, exchange_microsoft_code, get_or_create_user
from app.core.config import settings
from app.db.session import get_session
from app.schemas.user import AuthCallbackRequest, AuthTokenResponse, MicrosoftProfile, User, UserRead

router = APIRouter()


@router.post("/callback", response_model=AuthTokenResponse)
def auth_callback(payload: AuthCallbackRequest, session: Session = Depends(get_session)):
    """Microsoft OAuth2 Callback: tauscht Code gegen JWT."""
    login_result = exchange_microsoft_code(payload.code, payload.redirect_uri)
    user = get_or_create_user(session, login_result.profile)
    token = create_user_access_token(user)
    return AuthTokenResponse(access_token=token, user=UserRead.model_validate(user, from_attributes=True))


@router.post("/dev-login", response_model=AuthTokenResponse)
def dev_login(email: str, name: Optional[str] = None, session: Session = Depends(get_session)):
    """
    Entwickler-Login ohne Microsoft OAuth.
    Erstellt/lädt einen User anhand der E-Mail.
    NUR für lokale Entwicklung — deaktivieren wenn Azure AD konfiguriert ist.
    """
    email = email.strip().lower()
    allowed_domain = settings.ALLOWED_EMAIL_DOMAIN.lower().strip()
    if not email.endswith(f"@{allowed_domain}"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Nur @{allowed_domain} Adressen sind erlaubt.",
        )

    profile = MicrosoftProfile(
        azure_oid=f"dev-{email}",
        name=name or email.split("@")[0],
        email=email,
    )
    user = get_or_create_user(session, profile)
    token = create_user_access_token(user)
    return AuthTokenResponse(access_token=token, user=UserRead.model_validate(user, from_attributes=True))

