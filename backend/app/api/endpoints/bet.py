from fastapi import APIRouter, HTTPException, status
from app.schemas.bet import BetCreate, BetRead
import app.services.wallet as wallet_service
import app.services.market_service as market_service
from typing import Dict

router = APIRouter()

# simple in-memory bet id counter
_next_bet_id = 1


@router.post("/place", response_model=BetRead, status_code=status.HTTP_201_CREATED)
async def place_bet(bet: BetCreate):
    """Place a bet: check balance, deduct amount, and return bet info.

    This is a minimal implementation intended as a placeholder.
    """
    bal = await wallet_service.get_user_balance(bet.user_id)
    if bal < bet.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    # deduct amount
    await wallet_service.update_user_balance(bet.user_id, -bet.amount)

    # optionally we could validate market exists; for now assume ok
    global _next_bet_id
    bid = _next_bet_id
    _next_bet_id += 1

    # notify market_service / websocket in future
    return BetRead(id=bid, user_id=bet.user_id, market_id=bet.market_id, amount=bet.amount, choice=bet.choice)
