from sqlmodel import SQLModel, Field
from typing import Optional, List
from datetime import datetime


class WalletBase(SQLModel):
    user_id: int
    balance: float = Field(default=1000.0)


class Wallet(WalletBase, table=True):
    """DB model for wallet (one row per user)."""
    __tablename__ = "wallets"
    user_id: int = Field(primary_key=True)


class WalletRead(SQLModel):
    user_id: int
    balance: float


class BalanceResponse(SQLModel):
    user_id: int
    balance: float


class ClaimDailyResponse(SQLModel):
    user_id: int
    new_balance: float


class Transaction(SQLModel, table=True):
    """DB model for wallet transactions."""
    __tablename__ = "transactions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    amount: float
    type: str
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


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
