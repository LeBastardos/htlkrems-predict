from fastapi import APIRouter, Depends
import app.services.wallet as wallet_service
from app.schemas.wallet import BalanceResponse, ClaimDailyResponse, WalletHistoryResponse
from app.core.auth import get_current_user
from app.db.models import User

router = APIRouter()


@router.get("/balance/{user_id}", response_model=BalanceResponse)
async def get_balance(user_id: int):
    bal = await wallet_service.get_user_balance(user_id)
    return BalanceResponse(user_id=user_id, balance=bal)


@router.get("/me", response_model=BalanceResponse)
async def get_my_balance(current_user: User = Depends(get_current_user)):
    bal = await wallet_service.get_user_balance(current_user.id)
    return BalanceResponse(user_id=current_user.id, balance=bal)


@router.post("/claim-daily/{user_id}", response_model=ClaimDailyResponse)
async def claim_daily(user_id: int):
    new = await wallet_service.claim_daily(user_id)
    return ClaimDailyResponse(user_id=user_id, new_balance=new)


@router.post("/me/claim-daily", response_model=ClaimDailyResponse)
async def claim_daily_me(current_user: User = Depends(get_current_user)):
    new = await wallet_service.claim_daily(current_user.id)
    return ClaimDailyResponse(user_id=current_user.id, new_balance=new)


@router.get("/history/{user_id}", response_model=WalletHistoryResponse)
async def get_history(user_id: int):
    history = await wallet_service.get_user_history(user_id)
    return WalletHistoryResponse(user_id=user_id, history=history)


@router.get("/me/history", response_model=WalletHistoryResponse)
async def get_my_history(current_user: User = Depends(get_current_user)):
    history = await wallet_service.get_user_history(current_user.id)
    return WalletHistoryResponse(user_id=current_user.id, history=history)
