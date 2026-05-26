"""
Zentrale DB-Hilfsfunktionen für alle Services.
Alle Funktionen arbeiten synchron mit SQLModel Sessions.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlmodel import Session, select

from app.schemas.bet import Bet
from app.schemas.market import Market, OddsHistory
from app.schemas.user import User
from app.schemas.wallet import Transaction

DAILY_BONUS = 100.0
DAILY_COOLDOWN_HOURS = 24


# ─── Märkte ──────────────────────────────────────────────────────────────────

def get_market_by_id(db: Session, market_id: int) -> Optional[Market]:
    return db.get(Market, market_id)


def get_all_active_markets(db: Session) -> List[Market]:
    return list(db.exec(select(Market).where(Market.status == "OPEN")))


def create_market(db: Session, market: Market) -> Market:
    db.add(market)
    db.commit()
    db.refresh(market)
    _snapshot_odds(db, market)
    return market


def update_market_status(db: Session, market_id: int, new_status: str) -> Optional[Market]:
    market = db.get(Market, market_id)
    if market is None:
        return None
    market.status = new_status
    db.add(market)
    db.commit()
    db.refresh(market)
    return market


def delete_market(db: Session, market_id: int) -> bool:
    market = db.get(Market, market_id)
    if market is None:
        return False
    db.delete(market)
    db.commit()
    return True


# ─── Odds-Historie ────────────────────────────────────────────────────────────

def _snapshot_odds(db: Session, market: Market) -> None:
    """Speichert einen aktuellen Odds-Snapshot in die Historie."""
    snap = OddsHistory(
        market_id=market.id,
        odds_yes=market.odds_yes,
        odds_no=market.odds_no,
        pool_yes=market.pool_yes,
        pool_no=market.pool_no,
    )
    db.add(snap)
    db.commit()


def get_odds_history(db: Session, market_id: int) -> List[OddsHistory]:
    return list(
        db.exec(
            select(OddsHistory)
            .where(OddsHistory.market_id == market_id)
            .order_by(OddsHistory.timestamp)
        )
    )


# ─── User & Wallet ────────────────────────────────────────────────────────────

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.get(User, user_id)


def get_user_balance(db: Session, user_id: int) -> float:
    user = db.get(User, user_id)
    if user is None:
        return 0.0
    return user.balance


def update_user_balance(db: Session, user_id: int, delta: float) -> float:
    """Addiert/Subtrahiert Coins atomar. Gibt neuen Stand zurück."""
    user = db.get(User, user_id)
    if user is None:
        raise ValueError(f"User {user_id} not found")
    user.balance = round(user.balance + delta, 4)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.balance


def claim_daily_bonus(db: Session, user_id: int) -> tuple[float, float]:
    """
    Vergibt den täglichen Bonus.
    Gibt (neue_balance, gewonnene_coins) zurück.
    Wirft ValueError wenn zu früh.
    """
    user = db.get(User, user_id)
    if user is None:
        raise ValueError(f"User {user_id} not found")

    now = datetime.now(timezone.utc)
    if user.last_daily_claim is not None:
        # Ensure timezone-aware comparison
        last = user.last_daily_claim
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if now - last < timedelta(hours=DAILY_COOLDOWN_HOURS):
            next_claim = last + timedelta(hours=DAILY_COOLDOWN_HOURS)
            raise ValueError(f"Daily bonus already claimed. Next available: {next_claim.isoformat()}")

    user.balance = round(user.balance + DAILY_BONUS, 4)
    user.last_daily_claim = now
    db.add(user)

    tx = Transaction(
        user_id=user_id,
        amount=DAILY_BONUS,
        type="daily",
        reason="Daily bonus",
    )
    db.add(tx)
    db.commit()
    db.refresh(user)
    return user.balance, DAILY_BONUS


def get_transaction_history(db: Session, user_id: int) -> List[Transaction]:
    return list(
        db.exec(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.timestamp.desc())
        )
    )


def record_transaction(
    db: Session,
    user_id: int,
    amount: float,
    type_: str,
    reason: Optional[str] = None,
) -> Transaction:
    tx = Transaction(user_id=user_id, amount=amount, type=type_, reason=reason)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# ─── Wetten ──────────────────────────────────────────────────────────────────

def get_bets_for_market(db: Session, market_id: int) -> List[Bet]:
    return list(db.exec(select(Bet).where(Bet.market_id == market_id)))


def get_bets_for_user(db: Session, user_id: int) -> List[Bet]:
    return list(db.exec(select(Bet).where(Bet.user_id == user_id)))


def create_bet(db: Session, bet: Bet) -> Bet:
    db.add(bet)
    db.commit()
    db.refresh(bet)
    return bet


def place_bet_atomic(
    db: Session,
    user_id: int,
    market_id: int,
    amount: float,
    choice: bool,
) -> Bet:
    """
    Atomar: prüft Balance → zieht Coins ab → erstellt Wette → aktualisiert Markt-Pool.
    Alles in einer DB-Transaktion.
    """
    from app.services.calculator import recalculate_odds

    user = db.get(User, user_id)
    if user is None:
        raise ValueError("User not found")
    if user.balance < amount:
        raise ValueError("Insufficient balance")

    market = db.get(Market, market_id)
    if market is None:
        raise ValueError("Market not found")
    if market.status != "OPEN":
        raise ValueError(f"Market is not open (status: {market.status})")
    if market.end_date <= datetime.now():
        raise ValueError("Market has already ended")

    # Deduct balance
    user.balance = round(user.balance - amount, 4)
    db.add(user)

    # Record transaction
    tx = Transaction(
        user_id=user_id,
        amount=-amount,
        type="bet",
        reason=f"Bet on market {market_id} ({'Yes' if choice else 'No'})",
    )
    db.add(tx)

    # Update market pools
    market.current_pool = round(market.current_pool + amount, 4)
    if choice:
        market.pool_yes = round(market.pool_yes + amount, 4)
    else:
        market.pool_no = round(market.pool_no + amount, 4)

    # Recalculate odds
    market.odds_yes, market.odds_no = recalculate_odds(market.pool_yes, market.pool_no)
    db.add(market)

    # Save bet
    bet = Bet(
        user_id=user_id,
        market_id=market_id,
        amount=amount,
        choice=choice,
        status="placed",
    )
    db.add(bet)
    db.commit()

    # Snapshot odds after update
    _snapshot_odds(db, market)

    db.refresh(bet)
    return bet


def payout_market(db: Session, market_id: int, outcome: bool) -> dict:
    """
    Löst einen Markt auf und zahlt Gewinner aus.
    Gibt Statistiken zurück.
    """
    market = db.get(Market, market_id)
    if market is None:
        raise ValueError("Market not found")
    if market.status != "OPEN":
        raise ValueError(f"Market status must be OPEN to resolve, is: {market.status}")

    bets = get_bets_for_market(db, market_id)
    winning_bets = [b for b in bets if b.choice == outcome]
    total_winning_pool = sum(b.amount for b in winning_bets)
    total_pool = market.current_pool

    paid_out = 0.0
    for bet in bets:
        if bet.choice == outcome:
            if total_winning_pool > 0:
                payout = (bet.amount / total_winning_pool) * total_pool
            else:
                payout = bet.amount  # refund if no winners somehow
            payout = round(payout, 4)

            user = db.get(User, bet.user_id)
            if user:
                user.balance = round(user.balance + payout, 4)
                db.add(user)
                db.add(Transaction(
                    user_id=bet.user_id,
                    amount=payout,
                    type="payout",
                    reason=f"Won market {market_id}",
                ))
            paid_out += payout
            bet.status = "won"
        else:
            bet.status = "lost"
        db.add(bet)

    market.status = "RESOLVED"
    db.add(market)
    db.commit()

    return {
        "market_id": market_id,
        "outcome": outcome,
        "total_pool": total_pool,
        "total_winning_pool": total_winning_pool,
        "winning_bets": len(winning_bets),
        "total_paid_out": round(paid_out, 4),
    }