"""
Admin-only endpoints für User-Verwaltung.
Nur zugänglich für Benutzer mit role="admin".
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.user import UserRead

router = APIRouter()


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins dürfen diese Aktion ausführen.",
        )
    return current_user


@router.get("/users", response_model=List[UserRead])
def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(_require_admin),
):
    """Liste aller registrierten User."""
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    return [UserRead.model_validate(u, from_attributes=True) for u in users]


@router.patch("/users/{user_id}/role", response_model=UserRead)
def set_user_role(
    user_id: int,
    role: str,
    session: Session = Depends(get_session),
    _: User = Depends(_require_admin),
):
    """Admin: Rolle eines Users ändern (user | trustee | admin)."""
    if role not in ("user", "trustee", "admin"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ungültige Rolle. Erlaubt: user, trustee, admin",
        )
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")
    user.role = role
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserRead.model_validate(user, from_attributes=True)


@router.patch("/users/{user_id}/balance", response_model=UserRead)
def adjust_user_balance(
    user_id: int,
    amount: float,
    reason: str = "Admin adjustment",
    session: Session = Depends(get_session),
    _: User = Depends(_require_admin),
):
    """Admin: Coins auf einem User-Konto anpassen."""
    from app.db.db_service import update_user_balance, record_transaction

    try:
        new_balance = update_user_balance(session, user_id, amount)
        record_transaction(session, user_id, amount, "admin", reason)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    user = session.get(User, user_id)
    return UserRead.model_validate(user, from_attributes=True)
