"""
Wallet-Service: Coin-Guthaben, tägliche Boni und Transaktions-Log.
Alle Operationen arbeiten direkt auf dem User-Objekt (balance-Feld).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.db.models import User
from app.schemas.wallet import Transaction, TransactionRead

DAILY_BONUS = 100.0
DAILY_COOLDOWN_HOURS = 24


def _record_transaction(
    session: Session,
    user_id: int,
    amount: float,
    tx_type: str,
    reason: str | None = None,
) -> None:
    tx = Transaction(user_id=user_id, amount=amount, type=tx_type, reason=reason)
    session.add(tx)


def get_balance(session: Session, user_id: int) -> float:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")
    return user.balance


def claim_daily(session: Session, user_id: int) -> tuple[float, float]:
    """
    Beansprucht den täglichen Bonus.
    Gibt (neue_balance, geclaimte_coins) zurück.
    """
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")

    now = datetime.now(timezone.utc)
    if user.last_daily_at is not None:
        last = user.last_daily_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if now - last < timedelta(hours=DAILY_COOLDOWN_HOURS):
            remaining = timedelta(hours=DAILY_COOLDOWN_HOURS) - (now - last)
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily Bonus bereits abgeholt. Nächste Abholung in {hours}h {minutes}m.",
            )

    user.balance += DAILY_BONUS
    user.last_daily_at = now
    _record_transaction(session, user_id, DAILY_BONUS, "daily", "Täglicher Bonus")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.balance, DAILY_BONUS


def deduct_balance(
    session: Session,
    user_id: int,
    amount: float,
    reason: str | None = None,
) -> float:
    """Zieht Coins vom User-Guthaben ab (atomare Operation). Gibt neues Guthaben zurück."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")
    if user.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nicht genug Guthaben. Verfügbar: {user.balance:.0f}, benötigt: {amount:.0f}.",
        )
    user.balance -= amount
    _record_transaction(session, user_id, -amount, "bet", reason or "Wette gesetzt")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.balance


def add_balance(
    session: Session,
    user_id: int,
    amount: float,
    tx_type: str = "win",
    reason: str | None = None,
) -> float:
    """Fügt Coins zum User-Guthaben hinzu. Gibt neues Guthaben zurück."""
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User nicht gefunden.")
    user.balance += amount
    _record_transaction(session, user_id, amount, tx_type, reason)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.balance


def get_history(session: Session, user_id: int, limit: int = 50) -> List[TransactionRead]:
    statement = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.timestamp.desc())
        .limit(limit)
    )
    rows = session.exec(statement).all()
    return [TransactionRead.model_validate(r, from_attributes=True) for r in rows]
