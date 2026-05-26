"""
Market-Service: Geschäftslogik für Märkte und deren Verwaltung.
"""

from __future__ import annotations

from datetime import datetime
from typing import List

from sqlmodel import Session

import app.db.db_service as db_service
from app.schemas.market import Market, MarketCreate, MarketRead, MarketResolve


def get_active_markets(db: Session) -> List[Market]:
    return db_service.get_all_active_markets(db)


def create_market(db: Session, market_in: MarketCreate, created_by: int | None = None) -> Market:
    market = Market(
        title=market_in.title,
        description=market_in.description,
        end_date=market_in.end_date,
        odds_yes=0.5,
        odds_no=0.5,
        created_by=created_by,
    )
    return db_service.create_market(db, market)


def get_market_history(db: Session, market_id: int) -> dict:
    history = db_service.get_odds_history(db, market_id)
    return {
        "market_id": market_id,
        "history": [
            {
                "timestamp": h.timestamp,
                "odds_yes": h.odds_yes,
                "odds_no": h.odds_no,
                "pool_yes": h.pool_yes,
                "pool_no": h.pool_no,
            }
            for h in history
        ],
    }


def resolve_market(db: Session, resolve_data: MarketResolve) -> dict:
    return db_service.payout_market(db, resolve_data.market_id, resolve_data.outcome)


def delete_market(db: Session, market_id: int, reason: str) -> None:
    from fastapi import HTTPException

    market = db_service.get_market_by_id(db, market_id)
    if market is None:
        raise HTTPException(status_code=404, detail="Market not found")

    bets = db_service.get_bets_for_market(db, market_id)
    if bets:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a market that already has bets. Close it instead.",
        )
    db_service.delete_market(db, market_id)