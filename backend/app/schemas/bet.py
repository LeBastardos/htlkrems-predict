from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from sqlmodel import Field as SQLField, SQLModel


class BetCreate(BaseModel):
    user_id: int
    market_id: int
    amount: float = Field(..., gt=0)
    choice: bool


class BetRead(BaseModel):
    id: int
    user_id: int
    market_id: int
    amount: float
    choice: bool
    status: Optional[str] = "placed"
    created_at: Optional[datetime]


class Bet(SQLModel, table=True):
    __tablename__ = "bets"
    id: Optional[int] = SQLField(default=None, primary_key=True)
    user_id: int
    market_id: int
    amount: float
    choice: bool
    status: str = SQLField(default="placed")
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
