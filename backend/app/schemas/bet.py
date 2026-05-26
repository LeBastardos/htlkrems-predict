from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SMField


class Bet(SQLModel, table=True):
    """Datenbank-Modell für eine Wette."""

    __tablename__ = "bets"

    id: Optional[int] = SMField(default=None, primary_key=True)
    user_id: int = SMField(index=True)
    market_id: int = SMField(index=True)
    amount: float
    choice: bool  # True = Ja, False = Nein
    status: str = SMField(default="placed")  # "placed" | "won" | "lost" | "refunded"
    payout: float = SMField(default=0.0)
    placed_at: datetime = SMField(default_factory=lambda: datetime.now(timezone.utc))


class BetCreate(BaseModel):
    market_id: int
    amount: float = Field(..., gt=0)
    choice: bool


class BetRead(BaseModel):
    id: int
    user_id: int
    market_id: int
    amount: float
    choice: bool
    status: str = "placed"
    payout: float = 0.0
    placed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
