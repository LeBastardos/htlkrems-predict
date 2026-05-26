from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.bet import BetRead, Bet
from app.schemas.user import UserRead, UserSettingsUpdate

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


@router.get("/me/bets", response_model=List[BetRead])
def get_my_bets(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Gibt alle Wetten des eingeloggten Users zurück."""
    bets = session.exec(select(Bet).where(Bet.user_id == current_user.id)).all()
    return [BetRead.model_validate(b, from_attributes=True) for b in bets]


@router.get("/leaderboard", response_model=List[UserRead])
def get_leaderboard(session: Session = Depends(get_session)):
    """Gibt die Top-User nach Kontostand zurück."""
    users = session.exec(
        select(User)
        .where(User.allow_as_subject == True)  # noqa: E712
        .order_by(User.balance.desc())
        .limit(10)
    ).all()
    return [UserRead.model_validate(u, from_attributes=True) for u in users]
