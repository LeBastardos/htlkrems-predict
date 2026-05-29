from __future__ import annotations


from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class RecurringMarket(SQLModel, table=True):
    __tablename__ = "recurring_markets"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    # scheduling: frequency + interval count
    frequency: str = Field(default="daily")  # one of: minutes, daily, weekly, monthly, yearly
    interval: int = Field(default=1, description="Number of frequency units between runs")
    # duration expressed in the same units as `frequency` (e.g. duration=1 + frequency=weekly -> 1 week)
    duration_units: int = Field(default=1)
    occurrences: Optional[int] = Field(default=None, description="None means infinite")
    remaining: Optional[int] = Field(default=None)
    next_run: datetime
    initial_odds_yes: float = Field(default=0.5)
    initial_odds_no: float = Field(default=0.5)
    # optional wall-clock time for start (HH:MM) and explicit duration in minutes
    start_time: Optional[str] = Field(default=None, description="Start time in HH:MM (local) for each occurrence")
    duration_minutes: Optional[int] = Field(default=None, description="Explicit duration in minutes for the created market. Overrides duration_units when present.")
    only_weekdays: bool = Field(default=False, description="If true, skip Saturdays and Sundays for daily schedules")
    exclude_holidays: bool = Field(default=False, description="If true, skip configured holiday dates")
    holiday_dates: Optional[str] = Field(default=None, description="Comma-separated YYYY-MM-DD dates to skip when exclude_holidays=true")
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RecurringMarketCreate(SQLModel):
    title: str
    description: Optional[str] = None
    frequency: str = "daily"
    interval: int = 1
    duration_units: int = 1
    occurrences: Optional[int] = None
    start_delay_minutes: int = 0
    initial_odds_yes: float = 0.5
    initial_odds_no: float = 0.5
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    only_weekdays: bool = False
    exclude_holidays: bool = False
    holiday_dates: Optional[str] = None


class DeleteSchedule(SQLModel, table=True):
    __tablename__ = "delete_schedules"

    id: Optional[int] = Field(default=None, primary_key=True)
    market_id: int
    delete_at: datetime
    processed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
