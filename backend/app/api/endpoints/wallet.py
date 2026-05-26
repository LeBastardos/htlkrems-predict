from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.wallet import BalanceResponse, ClaimDailyResponse, WalletHistoryResponse, TransactionRead
import app.services.wallet as wallet_service

router = APIRouter()


@router.get("/balance", response_model=BalanceResponse)
def get_my_balance(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Gibt den eigenen Kontostand zurück."""
    bal = wallet_service.get_user_balance(db, current_user.id)
    return BalanceResponse(user_id=current_user.id, balance=bal)


@router.post("/claim-daily", response_model=ClaimDailyResponse)
def claim_daily(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Beansprucht den täglichen Bonus (100 Coins, einmal pro 24h)."""
    try:
        new_balance, coins_added = wallet_service.claim_daily(db, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc))
    return ClaimDailyResponse(user_id=current_user.id, new_balance=new_balance, coins_added=coins_added)


@router.get("/history", response_model=WalletHistoryResponse)
def get_history(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Transaktions-History des eingeloggten Users."""
    history = wallet_service.get_history(db, current_user.id)
    return WalletHistoryResponse(
        user_id=current_user.id,
        history=[TransactionRead.model_validate(t, from_attributes=True) for t in history],
    )


# Admin: check another user's balance
@router.get("/balance/{user_id}", response_model=BalanceResponse)
def get_balance_for_user(
    user_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Admin: gibt den Kontostand eines beliebigen Users zurück."""
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins dürfen fremde Kontostände einsehen.",
        )
    bal = wallet_service.get_user_balance(db, user_id)
    return BalanceResponse(user_id=user_id, balance=bal)
