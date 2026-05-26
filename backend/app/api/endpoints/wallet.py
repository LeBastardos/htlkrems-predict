from fastapi import APIRouter
import app.services.wallet as wallet_service
from app.schemas.wallet import BalanceResponse, ClaimDailyResponse, WalletHistoryResponse

router = APIRouter()


@router.get("/balance/{user_id}", response_model=BalanceResponse)
async def get_balance(user_id: int):
    bal = await wallet_service.get_user_balance(user_id)
    return BalanceResponse(user_id=user_id, balance=bal)


@router.post("/claim-daily/{user_id}", response_model=ClaimDailyResponse)
async def claim_daily(user_id: int):
    new = await wallet_service.claim_daily(user_id)
    return ClaimDailyResponse(user_id=user_id, new_balance=new)


@router.get("/history/{user_id}", response_model=WalletHistoryResponse)
async def get_history(user_id: int):
    # placeholder: no persistent history in the in-memory wallet
    return WalletHistoryResponse(user_id=user_id, history=[])
