from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.auth import get_current_user, require_role
from app.db.models import User
from app.db.session import get_session
from app.schemas.wallet import BalanceResponse, ClaimDailyResponse, WalletHistoryResponse
from app.services import wallet as wallet_service

router = APIRouter()


@router.get("/balance", response_model=BalanceResponse)
def get_my_balance(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    balance = wallet_service.get_balance(session, current_user.id)
    return BalanceResponse(user_id=current_user.id, balance=balance)


@router.post("/claim-daily", response_model=ClaimDailyResponse)
def claim_daily(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    new_balance, coins = wallet_service.claim_daily(session, current_user.id)
    return ClaimDailyResponse(user_id=current_user.id, new_balance=new_balance, coins_claimed=coins)


@router.get("/history", response_model=WalletHistoryResponse)
def get_history(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    history = wallet_service.get_history(session, current_user.id)
    return WalletHistoryResponse(user_id=current_user.id, history=history)


# Legacy endpoints with user_id in path (kept for backwards compatibility, secured)
@router.get("/balance/{user_id}", response_model=BalanceResponse)
def get_balance_by_id(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    balance = wallet_service.get_balance(session, user_id)
    return BalanceResponse(user_id=user_id, balance=balance)


@router.post("/claim-daily/{user_id}", response_model=ClaimDailyResponse)
def claim_daily_by_id(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    new_balance, coins = wallet_service.claim_daily(session, user_id)
    return ClaimDailyResponse(user_id=user_id, new_balance=new_balance, coins_claimed=coins)


@router.get("/history/{user_id}", response_model=WalletHistoryResponse)
def get_history_by_id(
    user_id: int,
    current_user: User = Depends(require_role("admin")),
    session: Session = Depends(get_session),
):
    history = wallet_service.get_history(session, user_id)
    return WalletHistoryResponse(user_id=user_id, history=history)

