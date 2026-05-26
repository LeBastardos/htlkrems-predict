from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import field_validator
from sqlmodel import Field, SQLModel


class Market(SQLModel, table=True):
    """DB table model for prediction markets."""

    __tablename__ = "markets"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    end_date: datetime
    status: str = Field(default="OPEN")    # OPEN | CLOSED | RESOLVED | CANCELED
    current_pool: float = Field(default=0.0)
    pool_yes: float = Field(default=0.0)   # coins bet on Yes
    pool_no: float = Field(default=0.0)    # coins bet on No
    odds_yes: float = Field(default=0.5)
    odds_no: float = Field(default=0.5)
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[int] = Field(default=None)  # user_id of creator


class OddsHistory(SQLModel, table=True):
    """Tracks how odds evolve over time for each market."""

    __tablename__ = "odds_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    market_id: int = Field(index=True)
    odds_yes: float
    odds_no: float
    pool_yes: float = Field(default=0.0)
    pool_no: float = Field(default=0.0)
    timestamp: datetime = Field(default_factory=datetime.now)


class MarketCreate(SQLModel):
    """Request body for POST /admin/create."""

    title: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    end_date: datetime

    @field_validator("end_date", mode="after")
    @classmethod
    def end_date_must_be_future(cls, v: datetime) -> datetime:
        if v <= datetime.now():
            raise ValueError("Das Enddatum muss in der Zukunft liegen.")
        return v


class MarketRead(SQLModel):
    """API response for a market."""

    id: int
    title: str
    description: Optional[str]
    end_date: datetime
    status: str
    current_pool: float
    pool_yes: float
    pool_no: float
    odds_yes: float
    odds_no: float
    created_at: datetime
    created_by: Optional[int]


class MarketDelete(SQLModel):
    reason: str = Field(..., min_length=5, max_length=200)
    confirm_delete: bool


class MarketResolve(SQLModel):
    market_id: int
    outcome: bool
    admin_note: Optional[str] = None


class MarketHistoryPoint(SQLModel):
    timestamp: datetime
    odds_yes: float
    odds_no: float
    pool_yes: float
    pool_no: float


class MarketHistory(SQLModel):
    market_id: int
    history: List[MarketHistoryPoint]


class MarketList(SQLModel):
    markets: List[MarketRead]
    total_count: int