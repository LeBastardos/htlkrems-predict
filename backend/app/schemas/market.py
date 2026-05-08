from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict

class MarketBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=100, example="Die 3BHIT gewinnt das Fußballturnier")
    description: Optional[str] = Field(None, max_length=500)
    end_date: datetime

class MarketCreate(MarketBase):
    "POST /admin/create"

    initial_odds_yes: float = Field(default=0.5, description="Die Anfangsquote für 'Ja'")
    initial_odds_no: float = Field(default=0.5, description="Die Anfangsquote für 'Nein'")

    @validator('end_date')
    def end_date_has_to_be_future(cls, v):
        if v <= datetime.now():
            raise ValueError('Das Enddatum muss in der Zukunft liegen.')
        return v
    
class MarketRead(MarketBase):
    "GET /markets/{market_id}"
    id: int
    status: str # "OPEN", "CLOSED", "CANCELED", "RESOLVED"
    current_pool: float
    odds_yes: float
    odds_no: float
    created_at: datetime

    class Config:
        orm_mode = True

class MarketDelete(BaseModel):
    "DELETE /admin/markets/{id}"
    reason: str = Field(..., min_length=5, max_length=200, example="Wette wurde doppelt erstellt")
    confirm_delete: bool = Field(..., example=True)

class MarketResolve(BaseModel):
    "POST /admin/resolve"
    outcome: bool
    admin_note: Optional[str] = None

# backend/app/schemas/market.py (Ergänzung)

class MarketHistoryPoint(BaseModel):
    "/markets/{market_id}/history/{timestamp}"
    timestamp: datetime
    odds_yes: float
    odds_no: float

class MarketHistory(BaseModel):
    "/markets/{market_id}/history"
    market_id: int
    history: List[MarketHistoryPoint]

class MarketList(BaseModel):
    "/markets/active"
    markets: List[MarketRead]
    total_count: int