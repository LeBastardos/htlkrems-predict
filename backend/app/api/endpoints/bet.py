from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_current_user
from app.db.models import User
from app.schemas.bet import BetDetail, BetListItem, BetPlaceRequest, BetRead
import app.services.bet_service as bet_service

router = APIRouter()


@router.post("/place", response_model=BetRead, status_code=status.HTTP_201_CREATED)
async def place_bet(bet: BetPlaceRequest, current_user: User = Depends(get_current_user)):
    return await bet_service.place_bet(current_user.id, bet)


@router.get("/me", response_model=list[BetListItem])
async def list_my_bets(current_user: User = Depends(get_current_user)):
    return await bet_service.get_bets_for_user(current_user.id)


@router.get("/{bet_id}", response_model=BetDetail)
async def get_bet(bet_id: int, current_user: User = Depends(get_current_user)):
    bet = await bet_service.get_bet_detail(bet_id)
    if bet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bet not found")
    if bet.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this bet")
    return bet
