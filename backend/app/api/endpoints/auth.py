from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.auth import create_user_access_token, exchange_microsoft_code, get_or_create_user
from app.db.session import get_session
from app.db.models import User
from app.schemas.user import AuthCallbackRequest, AuthTokenResponse, MicrosoftProfile, UserRead

router = APIRouter()


@router.post("/callback", response_model=AuthTokenResponse)
def auth_callback(payload: AuthCallbackRequest, session: Session = Depends(get_session)):
    login_result = exchange_microsoft_code(payload.code, payload.redirect_uri)
    user = get_or_create_user(session, login_result.profile)
    token = create_user_access_token(user)
    return AuthTokenResponse(access_token=token, user=UserRead.model_validate(user, from_attributes=True))


@router.post("/dev-login", response_model=AuthTokenResponse)
def dev_login(
    email: str = Query(..., description="E-Mail-Adresse für den Dev-Login"),
    name: str = Query(default="Dev User", description="Anzeigename"),
    session: Session = Depends(get_session),
):
    """
    Vereinfachter Login für Entwicklung/Testing ohne Microsoft OAuth.
    Erstellt den User falls er noch nicht existiert.
    """
    profile = MicrosoftProfile(
        azure_oid=f"dev-{email}",
        name=name,
        email=email.strip().lower(),
    )
    user = get_or_create_user(session, profile)
    token = create_user_access_token(user)
    return AuthTokenResponse(access_token=token, user=UserRead.model_validate(user, from_attributes=True))

