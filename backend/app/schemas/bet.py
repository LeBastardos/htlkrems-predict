from pydantic import BaseModel, Field
from typing import Optional


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
