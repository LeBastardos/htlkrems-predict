from sqlmodel import SQLModel, Field
from pydantic import field_validator
from datetime import datetime
from typing import Optional, List


class MarketBase(SQLModel):
    """Basis-Eigenschaften für einen Markt"""
    title: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    end_date: datetime
    initial_odds_yes: float = Field(default=0.5, description="Die Anfangsquote für 'Ja'")
    initial_odds_no: float = Field(default=0.5, description="Die Anfangsquote für 'Nein'")

    @field_validator('end_date', mode='after')
    @classmethod
    def end_date_has_to_be_future(cls, v):
        if v <= datetime.now():
            raise ValueError('Das Enddatum muss in der Zukunft liegen.')
        return v


class Market(MarketBase, table=True):
    """Datenbank-Modell für Märkte"""
    __tablename__ = "markets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = Field(default="OPEN")  # "OPEN", "CLOSED", "CANCELED", "RESOLVED"
    current_pool: float = Field(default=0.0)
    odds_yes: float = Field(default=0.5)
    odds_no: float = Field(default=0.5)
    created_at: datetime = Field(default_factory=datetime.now)


class MarketCreate(SQLModel):
    """Schema zum Erstellen eines neuen Markts (POST /admin/create)"""
    title: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    end_date: datetime
    initial_odds_yes: float = Field(default=0.5, description="Die Anfangsquote für 'Ja'")
    initial_odds_no: float = Field(default=0.5, description="Die Anfangsquote für 'Nein'")

    @field_validator('end_date', mode='after')
    @classmethod
    def end_date_has_to_be_future(cls, v):
        if v <= datetime.now():
            raise ValueError('Das Enddatum muss in der Zukunft liegen.')
        return v


class MarketRead(SQLModel):
    """Schema zum Lesen eines Markts (GET /markets/{id})"""
    id: int
    title: str
    description: Optional[str]
    end_date: datetime
    status: str
    current_pool: float
    odds_yes: float
    odds_no: float
    created_at: datetime


class MarketDelete(SQLModel):
    """Schema zum Löschen eines Markts (DELETE /admin/markets/{id})"""
    reason: str = Field(..., min_length=5, max_length=200)
    confirm_delete: bool = Field(...)


class MarketResolve(SQLModel):
    """Schema zum Auflösen eines Markts (POST /admin/resolve)"""
    outcome: bool
    admin_note: Optional[str] = None


class MarketHistoryPoint(SQLModel):
    """Ein Punkt in der Quoten-Historie eines Markts"""
    timestamp: datetime
    odds_yes: float
    odds_no: float


class MarketHistory(SQLModel):
    """Historie der Quoten eines Markts (GET /markets/{market_id}/history)"""
    market_id: int
    history: List[MarketHistoryPoint]


class MarketList(SQLModel):
    """Liste aktiver Märkte (GET /markets/active)"""
    markets: List[MarketRead]
    total_count: int