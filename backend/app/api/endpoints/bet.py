from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.auth import get_current_user
from app.db.models import User, Market, Bet
from app.db.session import get_session
from app.schemas.bet import BetCreate, BetRead
from app.services import wallet as wallet_service
from app.services import market_service
from app.services.calculator import estimate_payout_multiplier
from app.api.websocket import notify_market_update

router = APIRouter()


@router.post("/place", response_model=BetRead, status_code=status.HTTP_201_CREATED)
def place_bet(
    bet_in: BetCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Wette platzieren: Balance prüfen, Coins abziehen, Wette speichern, Quoten aktualisieren.
    Alles in einer DB-Session (atomar durch SQLModel/SQLAlchemy transaction).
    """
    market = session.get(Market, bet_in.market_id)
    if market is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Markt nicht gefunden.")
    if market.status != "OPEN":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Dieser Markt ist nicht mehr offen.")

    # Balance abziehen (wirft 400 bei zu wenig Guthaben)
    wallet_service.deduct_balance(
        session,
        current_user.id,
        bet_in.amount,
        reason=f"Wette auf Markt #{market.id}: {market.title}",
    )

    # Wette speichern
    bet = Bet(
        user_id=current_user.id,
        market_id=market.id,
        amount=bet_in.amount,
        choice=bet_in.choice,
    )
    session.add(bet)
    session.commit()
    session.refresh(bet)

    # Markt-Pool und Quoten aktualisieren
    market_service.update_market_after_bet(session, market, bet_in.amount, bet_in.choice)

    # WebSocket-Broadcast (fire-and-forget)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(
                notify_market_update(market.id, {"yes": market.odds_yes, "no": market.odds_no})
            )
    except Exception:
        pass

    return BetRead.model_validate(bet, from_attributes=True)


@router.get("/my", response_model=list[BetRead])
def my_bets(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Alle eigenen Wetten des eingeloggten Users."""
    stmt = select(Bet).where(Bet.user_id == current_user.id).order_by(Bet.placed_at.desc())
    bets = session.exec(stmt).all()
    return [BetRead.model_validate(b, from_attributes=True) for b in bets]

