from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.market import Market, MarketCreate, MarketRead, MarketDelete, MarketResolve, MarketHistory
from app.schemas.recurring import RecurringMarket, RecurringMarketCreate
import app.services.market_service as market_service
import app.services.recurring_service as recurring_service
from app.core.auth import get_current_user
from app.db.models import User
from sqlmodel import Session, select
from app.db.session import engine
from app.db.models import Bet

router = APIRouter()

@router.get("/active", response_model=List[MarketRead])
async def get_active_markets():
    """
    GET /markets/active
    Gibt eine Liste aller aktiven Märkte zurück.
    """
    return await market_service.get_active_markets()


@router.get("/{market_id}", response_model=MarketRead)
async def get_market(market_id: int):
    try:
        return await market_service.get_market(market_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found")

@router.post("/admin/create", response_model=MarketRead, status_code=status.HTTP_201_CREATED)
async def create_market(market_in: MarketCreate, current_user: User = Depends(get_current_user)):
    """
    POST /admin/create
    Erstellt einen neuen Markt mit den angegebenen Daten.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return await market_service.create_market(market_in)

@router.get("/{market_id}/history", response_model=MarketHistory)
async def get_market_history(market_id: int):
    """
    GET /markets/{market_id}/history
    Gibt die Historie eines bestimmten Markts zurück.
    """
    return await market_service.get_market_history(market_id)


@router.get("/admin/list", response_model=List[MarketRead])
async def list_all_markets(current_user: User = Depends(get_current_user)):
    """Admin/trustee: return all markets regardless of status.

    Trustees are allowed to view CLOSED/RESOLVED markets so they can resolve them,
    while creation/deletion endpoints remain admin-only.
    """
    if current_user.role not in ("admin", "trustee"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or trustee privileges required")
    with Session(engine) as session:
        stmt = select(Market).order_by(Market.created_at.desc())
        markets = session.exec(stmt).all()
        return markets


@router.get("/{market_id}/bets")
async def get_market_bets(market_id: int, limit: int = 6):
    """
    GET /markets/{market_id}/bets
    Liefert die zuletzt platzierten Bets (anonymisiert) für einen Markt.
    """
    with Session(engine) as session:
        stmt = select(Bet).where(Bet.market_id == market_id).order_by(Bet.created_at.desc()).limit(limit)
        bets = session.exec(stmt).all()
        out = []
        for b in bets:
            user = session.get(User, getattr(b, 'user_id', None)) if getattr(b, 'user_id', None) else None
            uname = None
            if user:
                uname = user.name or user.username or (user.email.split('@')[0] if user.email else f"User {user.id}")
            out.append({
                "id": getattr(b, 'id', None),
                "user": uname,
                "choice": "Yes" if getattr(b, 'choice', False) else "No",
                "amount": float(getattr(b, 'amount', 0) or 0),
                "created_at": getattr(b, 'created_at', None),
            })
        return out



class RecurringMarketRequest(BaseModel):
    title: str
    description: Optional[str] = None
    interval_minutes: int = 60
    duration_minutes: int = 60
    occurrences: int = 1
    start_delay_minutes: int = 0
    initial_odds_yes: float = 0.5
    initial_odds_no: float = 0.5


@router.post("/admin/recurring", response_model=List[MarketRead], status_code=status.HTTP_201_CREATED)
async def create_recurring_markets(payload: RecurringMarketRequest, current_user: User = Depends(get_current_user)):
    """Create a batch of recurring markets spaced by `interval_minutes`.
    This is a simple scheduler substitute: it creates `occurrences` markets starting
    after `start_delay_minutes`, each lasting `duration_minutes`.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")

    from datetime import datetime, timezone, timedelta

    start = datetime.now(timezone.utc) + timedelta(minutes=payload.start_delay_minutes or 0)
    created = []
    for i in range(max(1, int(payload.occurrences or 1))):
        start_time = start + timedelta(minutes=payload.interval_minutes * i)
        end_date = start_time + timedelta(minutes=payload.duration_minutes)
        market_in = MarketCreate(
            title=payload.title,
            description=payload.description,
            end_date=end_date,
            initial_odds_yes=payload.initial_odds_yes,
            initial_odds_no=payload.initial_odds_no,
        )
        m = await market_service.create_market(market_in)
        created.append(m)

    return created


@router.post("/admin/recurring/schedule", response_model=RecurringMarket, status_code=status.HTTP_201_CREATED)
async def create_recurring_schedule(payload: RecurringMarketCreate, current_user: User = Depends(get_current_user)):
    """Persist a recurring market schedule which will create markets on schedule.

    Use this to create a persistent recurring schedule instead of an immediate batch.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return await recurring_service.create_recurring(payload)

@router.post("/admin/resolve", response_model=dict)
async def resolve_market(market_id: int, resolution: MarketResolve, current_user: User = Depends(get_current_user)):
    """
    POST /admin/resolve
    Löst einen Markt auf und gibt das Ergebnis zurück.
    """
    if current_user.role not in ("admin", "trustee"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or trustee privileges required")
    return await market_service.resolve_market(market_id, resolution)

@router.delete("/admin/markets/{market_id}")
async def delete_market(market_id: int, delete_info: MarketDelete, current_user: User = Depends(get_current_user)):
    """
    DELETE /admin/markets/{market_id}
    Löscht einen Markt mit Angabe eines Grundes.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    await market_service.delete_market(market_id, delete_info.reason)
    return {"message": f"Markt {market_id} wurde gelöscht."}