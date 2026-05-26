"""
Market-Service: DB-gestützte Markt-Logik (Erstellen, Abfragen, Auflösen).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.db.models import Market, OddsHistory, Bet, User
from app.schemas.market import MarketCreate, MarketRead, MarketResolve, MarketHistory, MarketHistoryPoint
from app.services import calculator
from app.services import wallet as wallet_service


# ──────────────────────────────────────────────
# Abfragen
# ──────────────────────────────────────────────

def get_active_markets(session: Session) -> List[MarketRead]:
    stmt = select(Market).where(Market.status == "OPEN").order_by(Market.created_at.desc())
    markets = session.exec(stmt).all()
    return [MarketRead.model_validate(m, from_attributes=True) for m in markets]


def get_market_by_id(session: Session, market_id: int) -> Market:
    market = session.get(Market, market_id)
    if market is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Markt {market_id} nicht gefunden.")
    return market


def get_market_history(session: Session, market_id: int) -> MarketHistory:
    get_market_by_id(session, market_id)  # 404-Check
    stmt = (
        select(OddsHistory)
        .where(OddsHistory.market_id == market_id)
        .order_by(OddsHistory.timestamp.asc())
    )
    rows = session.exec(stmt).all()
    history = [
        MarketHistoryPoint(timestamp=r.timestamp, odds_yes=r.odds_yes, odds_no=r.odds_no)
        for r in rows
    ]
    return MarketHistory(market_id=market_id, history=history)


# ──────────────────────────────────────────────
# Admin: Erstellen / Löschen / Auflösen
# ──────────────────────────────────────────────

def create_market(session: Session, market_data: MarketCreate, creator_id: int | None = None) -> MarketRead:
    market = Market(
        title=market_data.title,
        description=market_data.description,
        end_date=market_data.end_date,
        initial_odds_yes=market_data.initial_odds_yes,
        initial_odds_no=market_data.initial_odds_no,
        odds_yes=market_data.initial_odds_yes,
        odds_no=market_data.initial_odds_no,
        created_by=creator_id,
    )
    session.add(market)
    session.commit()
    session.refresh(market)

    # Ersten Odds-Snapshot speichern
    _snapshot_odds(session, market)

    return MarketRead.model_validate(market, from_attributes=True)


def delete_market(session: Session, market_id: int, reason: str) -> None:
    market = get_market_by_id(session, market_id)

    # Nur löschen wenn keine Einsätze vorhanden
    if market.current_pool > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Markt kann nicht gelöscht werden – es gibt bereits Einsätze.",
        )
    session.delete(market)
    session.commit()


def resolve_market(session: Session, market_id: int, resolve_data: MarketResolve) -> dict:
    market = get_market_by_id(session, market_id)

    if market.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Markt ist nicht offen (Status: {market.status}).",
        )

    outcome = resolve_data.outcome  # True = Ja gewinnt, False = Nein gewinnt

    # Alle Wetten für diesen Markt laden
    stmt = select(Bet).where(Bet.market_id == market_id)
    bets = session.exec(stmt).all()

    winners = [b for b in bets if b.choice == outcome]
    losers = [b for b in bets if b.choice != outcome]

    winning_pool = market.yes_pool if outcome else market.no_pool
    payout_count = 0

    for bet in winners:
        payout = calculator.calculate_payout(bet.amount, bet.choice, market.yes_pool, market.no_pool)
        bet.status = "won"
        bet.payout = payout
        session.add(bet)
        # Auszahlung ans Konto
        wallet_service.add_balance(
            session,
            bet.user_id,
            payout,
            tx_type="win",
            reason=f"Gewinn aus Markt #{market_id}: {market.title}",
        )
        payout_count += 1

    for bet in losers:
        bet.status = "lost"
        session.add(bet)

    market.status = "RESOLVED"
    market.outcome = outcome
    session.add(market)
    session.commit()

    return {
        "message": "Markt aufgelöst",
        "market_id": market_id,
        "outcome": outcome,
        "total_bets": len(bets),
        "winners": payout_count,
        "losers": len(losers),
        "total_pool": market.current_pool,
    }


# ──────────────────────────────────────────────
# Interne Helfer
# ──────────────────────────────────────────────

def _snapshot_odds(session: Session, market: Market) -> None:
    snap = OddsHistory(
        market_id=market.id,
        odds_yes=market.odds_yes,
        odds_no=market.odds_no,
        yes_pool=market.yes_pool,
        no_pool=market.no_pool,
    )
    session.add(snap)
    session.commit()


def update_market_after_bet(session: Session, market: Market, amount: float, choice: bool) -> None:
    """Aktualisiert Pool und Quoten nach einer neuen Wette (wird von bet-endpoint aufgerufen)."""
    if choice:
        market.yes_pool += amount
    else:
        market.no_pool += amount

    market.current_pool += amount
    market.odds_yes, market.odds_no = calculator.recalculate_odds(market.yes_pool, market.no_pool)
    session.add(market)
    session.commit()
    session.refresh(market)

    # Odds-Snapshot
    _snapshot_odds(session, market)