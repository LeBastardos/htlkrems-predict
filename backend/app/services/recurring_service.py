from __future__ import annotations

import asyncio
import calendar
from datetime import datetime, timezone, timedelta, time as _time
from typing import List

from sqlmodel import Session, select

from app.db.session import engine
from app.schemas.recurring import RecurringMarket, RecurringMarketCreate
from app.schemas.market import MarketCreate
import app.services.market_service as market_service


def _add_months(dt: datetime, months: int) -> datetime:
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _add_years(dt: datetime, years: int) -> datetime:
    try:
        return dt.replace(year=dt.year + years)
    except ValueError:
        # handle Feb 29
        return dt.replace(month=2, day=28, year=dt.year + years)


def _compute_end_date(start: datetime, frequency: str, duration_units: int) -> datetime:
    # duration_units is a fallback when duration_minutes is not provided.
    if frequency == "minutes":
        return start + timedelta(minutes=duration_units)
    if frequency == "daily":
        return start + timedelta(days=duration_units)
    if frequency == "weekly":
        return start + timedelta(weeks=duration_units)
    if frequency == "monthly":
        return _add_months(start, duration_units)
    if frequency == "yearly":
        return _add_years(start, duration_units)
    # fallback to daily
    return start + timedelta(days=duration_units)


def _parse_time_str(tstr: Optional[str]):
    if not tstr:
        return None
    try:
        parts = tstr.split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return _time(hour=h, minute=m)
    except Exception:
        return None


def _set_time(dt: datetime, tstr: Optional[str]) -> datetime:
    t = _parse_time_str(tstr)
    if not t:
        return dt
    return dt.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)


async def create_recurring(payload: RecurringMarketCreate) -> RecurringMarket:
    """Create and persist a recurring market schedule."""
    start = datetime.now(timezone.utc) + timedelta(minutes=payload.start_delay_minutes or 0)
    # normalize common boundaries and apply start_time if provided
    if payload.frequency == "weekly":
        # adjust to next Monday (week starts Monday)
        days_to_monday = (0 - start.weekday()) % 7
        start = start + timedelta(days=days_to_monday)
    elif payload.frequency == "monthly":
        # move to first day of next month
        start = _add_months(start.replace(day=1), 1)
    elif payload.frequency == "yearly":
        # move to Jan 1 of next year
        start = start.replace(month=1, day=1, year=start.year + 1)

    # apply start_time if provided (HH:MM)
    if getattr(payload, 'start_time', None):
        start = _set_time(start, payload.start_time)
        # ensure start is in the future
        now = datetime.now(timezone.utc)
        if start <= now:
            # advance by one frequency unit until in the future
            if payload.frequency == 'minutes':
                start = start + timedelta(minutes=payload.interval)
            elif payload.frequency == 'daily':
                start = start + timedelta(days=payload.interval)
            elif payload.frequency == 'weekly':
                start = start + timedelta(weeks=payload.interval)
            elif payload.frequency == 'monthly':
                start = _add_months(start, payload.interval)
            elif payload.frequency == 'yearly':
                start = _add_years(start, payload.interval)

    rm = RecurringMarket(
        title=payload.title,
        description=payload.description,
        frequency=payload.frequency,
        interval=payload.interval,
        duration_units=payload.duration_units,
        occurrences=payload.occurrences,
        remaining=payload.occurrences,
        next_run=start,
        initial_odds_yes=payload.initial_odds_yes,
        initial_odds_no=payload.initial_odds_no,
        only_weekdays=getattr(payload, 'only_weekdays', False),
        exclude_holidays=getattr(payload, 'exclude_holidays', False),
        holiday_dates=getattr(payload, 'holiday_dates', None),
        active=True,
    )
    with Session(engine) as session:
        session.add(rm)
        session.commit()
        session.refresh(rm)
        return rm


async def _process_due_once() -> None:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        stmt = select(RecurringMarket).where(RecurringMarket.active == True).where(RecurringMarket.next_run <= now)
        due = session.exec(stmt).all()
        for r in due:
            try:
                # build holiday set (dates)
                holidays = set()
                if getattr(r, 'holiday_dates', None):
                    for token in str(r.holiday_dates).split(','):
                        token = token.strip()
                        if not token:
                            continue
                        try:
                            d = datetime.fromisoformat(token).date()
                        except Exception:
                            try:
                                from datetime import datetime as _dt
                                d = _dt.strptime(token, "%Y-%m-%d").date()
                            except Exception:
                                continue
                        holidays.add(d)

                candidate = r.next_run

                # adjust candidate if weekdays-only or exclude-holidays requested
                if getattr(r, 'only_weekdays', False) or (getattr(r, 'exclude_holidays', False) and holidays):
                    safety = 0
                    while True:
                        safety += 1
                        if safety > 4000:
                            break
                        cdate = candidate.date()
                        is_weekend = cdate.weekday() >= 5
                        is_hol = cdate in holidays
                        if (getattr(r, 'only_weekdays', False) and is_weekend) or (getattr(r, 'exclude_holidays', False) and is_hol):
                            # advance candidate depending on schedule frequency
                            if r.frequency in ("minutes", "daily"):
                                candidate = candidate + timedelta(days=1)
                            elif r.frequency == "weekly":
                                candidate = candidate + timedelta(weeks=r.interval)
                            elif r.frequency == "monthly":
                                candidate = _add_months(candidate, r.interval)
                            elif r.frequency == "yearly":
                                candidate = _add_years(candidate, r.interval)
                            else:
                                candidate = candidate + timedelta(days=1)
                            continue
                        break

                # if we moved candidate into the future, persist and skip creating now
                if candidate > now:
                    r.next_run = candidate
                    session.add(r)
                    session.commit()
                    continue

                # create market for candidate
                # if explicit duration_minutes provided, use that; otherwise fall back to duration_units
                if getattr(r, 'duration_minutes', None):
                    end_date = candidate + timedelta(minutes=r.duration_minutes)
                else:
                    end_date = _compute_end_date(candidate, r.frequency, r.duration_units)
                market_in = MarketCreate(
                    title=r.title,
                    description=r.description,
                    end_date=end_date,
                    initial_odds_yes=r.initial_odds_yes,
                    initial_odds_no=r.initial_odds_no,
                )
                created = await market_service.create_market(market_in)

                # update schedule for next occurrence (advance from candidate)
                if r.occurrences is not None:
                    r.remaining = (r.remaining - 1) if r.remaining is not None else (r.occurrences - 1)
                if r.remaining is not None and r.remaining <= 0:
                    r.active = False
                else:
                    # compute next_run preserving start_time when present
                    if getattr(r, 'start_time', None):
                        if r.frequency == "minutes":
                            nr = candidate + timedelta(minutes=r.interval)
                        elif r.frequency == "daily":
                            nr = candidate + timedelta(days=r.interval)
                        elif r.frequency == "weekly":
                            nr = candidate + timedelta(weeks=r.interval)
                        elif r.frequency == "monthly":
                            nr = _add_months(candidate, r.interval)
                        elif r.frequency == "yearly":
                            nr = _add_years(candidate, r.interval)
                        else:
                            nr = candidate + timedelta(days=r.interval)
                        # ensure wall-clock time is applied
                        nr = _set_time(nr, r.start_time)
                        r.next_run = nr
                    else:
                        if r.frequency == "minutes":
                            r.next_run = candidate + timedelta(minutes=r.interval)
                        elif r.frequency == "daily":
                            r.next_run = candidate + timedelta(days=r.interval)
                        elif r.frequency == "weekly":
                            r.next_run = candidate + timedelta(weeks=r.interval)
                        elif r.frequency == "monthly":
                            r.next_run = _add_months(candidate, r.interval)
                        elif r.frequency == "yearly":
                            r.next_run = _add_years(candidate, r.interval)
                        else:
                            r.next_run = candidate + timedelta(days=r.interval)

                session.add(r)
                session.commit()
            except Exception:
                try:
                    session.rollback()
                except Exception:
                    pass


async def run_scheduler(poll_seconds: int = 30) -> None:
    """Background loop creating recurring markets when due."""
    while True:
        try:
            await _process_due_once()
        except Exception:
            # swallow errors and continue
            pass
        await asyncio.sleep(poll_seconds)
