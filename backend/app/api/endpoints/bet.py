from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.bet import BetCreate, BetRead
import app.db.db_service as db_service

router = APIRouter()


@router.post("/place", response_model=BetRead, status_code=status.HTTP_201_CREATED)
def place_bet(
    bet_in: BetCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Platziert eine Wette.
    Atomar: prüft Balance → zieht Coins ab → erstellt Bet → aktualisiert Markt-Odds.
    """
    try:
        bet = db_service.place_bet_atomic(
            db=db,
            user_id=current_user.id,
            market_id=bet_in.market_id,
            amount=bet_in.amount,
            choice=bet_in.choice,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Broadcast WebSocket update (best-effort, non-blocking)
    try:
        import asyncio
        from app.api.websocket import notify_market_update
        from app.db.db_service import get_market_by_id

        market = get_market_by_id(db, bet_in.market_id)
        if market:
            asyncio.create_task(
                notify_market_update(
                    market.id,
                    {"yes": market.odds_yes, "no": market.odds_no},
                )
            )
    except Exception:
        pass  # WebSocket broadcast is best-effort

    return BetRead.model_validate(bet, from_attributes=True)
