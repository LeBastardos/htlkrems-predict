from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Bet(SQLModel, table=True):
    """DB table for individual bets placed by users."""

    __tablename__ = "bets"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)
    market_id: int = Field(index=True)
    amount: float
    choice: bool                   # True = Yes, False = No
    status: str = Field(default="placed")   # placed | won | lost | refunded
    created_at: datetime = Field(default_factory=datetime.now)


class BetCreate(SQLModel):
    market_id: int
    amount: float = Field(..., gt=0)
    choice: bool


class BetRead(SQLModel):
    id: int
    user_id: int
    market_id: int
    amount: float
    choice: bool
    status: str
    created_at: datetime
