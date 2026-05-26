from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlmodel import Field, SQLModel


class Transaction(SQLModel, table=True):
    """Audit log for all coin movements."""

    __tablename__ = "transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    amount: float                           # positive = credit, negative = debit
    type: str                               # bet | daily | payout | admin
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class TransactionRead(SQLModel):
    id: int
    user_id: int
    amount: float
    type: str
    reason: Optional[str]
    timestamp: datetime


class BalanceResponse(SQLModel):
    user_id: int
    balance: float


class ClaimDailyResponse(SQLModel):
    user_id: int
    new_balance: float
    coins_added: float


class WalletHistoryResponse(SQLModel):
    user_id: int
    history: List[TransactionRead] = []
