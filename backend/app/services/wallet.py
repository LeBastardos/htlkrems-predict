"""
Wallet-Service: alle Coin-Operationen gehen durch hier.
Nutzt db_service für atomare DB-Transaktionen.
"""

from __future__ import annotations

from typing import List

from sqlmodel import Session

import app.db.db_service as db_service
from app.schemas.wallet import Transaction


def get_user_balance(db: Session, user_id: int) -> float:
    return db_service.get_user_balance(db, user_id)


def update_user_balance(db: Session, user_id: int, delta: float) -> float:
    return db_service.update_user_balance(db, user_id, delta)


def claim_daily(db: Session, user_id: int) -> tuple[float, float]:
    """Gibt (neue_balance, coins_added) zurück oder wirft ValueError."""
    return db_service.claim_daily_bonus(db, user_id)


def get_history(db: Session, user_id: int) -> List[Transaction]:
    return db_service.get_transaction_history(db, user_id)
