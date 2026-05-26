from fastapi import APIRouter, HTTPException, status
from app.schemas.bet import BetCreate, BetRead
import app.services.bet_service as bet_service

router = APIRouter()


@router.post("/place", response_model=BetRead, status_code=status.HTTP_201_CREATED)
async def place_bet(bet: BetCreate):
    return await bet_service.place_bet(bet)
