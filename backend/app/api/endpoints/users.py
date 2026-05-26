from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth import get_current_user, require_role
from app.db.models import User
from app.db.session import get_session
from app.schemas.user import UserRead, UserSettingsUpdate
from app.schemas.wallet import BalanceResponse

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_my_profile(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user, from_attributes=True)


@router.patch("/me/settings", response_model=UserRead)
def update_my_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    current_user.allow_as_subject = payload.allow_as_subject
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return UserRead.model_validate(current_user, from_attributes=True)


@router.get("/list", response_model=list[UserRead])
def list_users(
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    """Nur für Admins: Alle User auflisten."""
    from sqlmodel import select
    users = session.exec(select(User)).all()
    return [UserRead.model_validate(u, from_attributes=True) for u in users]


@router.patch("/{user_id}/role", response_model=UserRead)
def set_user_role(
    user_id: int,
    role: str,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    """Nur für Admins: Rolle eines Users setzen."""
    if role not in ("user", "trustee", "admin"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ungültige Rolle.")
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")
    user.role = role
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user, from_attributes=True)

