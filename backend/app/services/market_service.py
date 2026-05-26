from __future__ import annotations

from datetime import datetime
from typing import List

from sqlmodel import Session, select

from app.db.session import engine
from app.schemas.market import Market, MarketCreate, MarketHistory, MarketHistoryPoint
from app.schemas.bet import Bet


async def get_active_markets() -> List[Market]:
    with Session(engine) as session:
        stmt = select(Market).where(Market.status == "OPEN")
        results = session.exec(stmt).all()
        return results


async def create_market(market_data: MarketCreate) -> Market:
    with Session(engine) as session:
        m = Market(
            title=market_data.title,
            description=market_data.description,
            end_date=market_data.end_date,
            initial_odds_yes=market_data.initial_odds_yes,
            initial_odds_no=market_data.initial_odds_no,
            status="OPEN",
            current_pool=0.0,
            odds_yes=market_data.initial_odds_yes,
            odds_no=market_data.initial_odds_no,
            created_at=datetime.utcnow(),
        )
        session.add(m)
        session.commit()
        session.refresh(m)
        return m


async def get_market_history(market_id: int) -> MarketHistory:
    # For now return empty history; could be built from stored odds over time.
    return MarketHistory(market_id=market_id, history=[])


async def resolve_market(market_id: int, resolution) -> dict:
    with Session(engine) as session:
        m = session.get(Market, market_id)
        if not m:
            return {"error": "market not found"}
        m.status = "RESOLVED"
        session.add(m)
        session.commit()
        return {"market_id": market_id, "status": "resolved", "outcome": getattr(resolution, 'outcome', None)}


async def delete_market(market_id: int, reason: str) -> None:
    with Session(engine) as session:
        m = session.get(Market, market_id)
        if m:
            session.delete(m)
            session.commit()