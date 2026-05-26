from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List

from sqlmodel import SQLModel, Field


class Transaction(SQLModel, table=True):
    """Datenbank-Modell für Wallet-Transaktionen."""

    __tablename__ = "transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    amount: float
    type: str  # "bet", "win", "daily", "refund", "admin_grant"
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BalanceResponse(SQLModel):
    user_id: int
    balance: float


class ClaimDailyResponse(SQLModel):
    user_id: int
    new_balance: float
    coins_claimed: float


class TransactionRead(SQLModel):
    id: int
    user_id: int
    amount: float
    type: str
    reason: Optional[str]
    timestamp: datetime


class WalletHistoryResponse(SQLModel):
    user_id: int
    history: List[TransactionRead] = []
