from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import List

from sqlmodel import Session, select

from app.db.session import engine
from app.schemas.recurring import DeleteSchedule
from app.schemas.market import Market


async def schedule_delete(market_id: int, delay_hours: int = 24) -> DeleteSchedule:
    with Session(engine) as session:
        ds = DeleteSchedule(market_id=market_id, delete_at=datetime.now(timezone.utc) + timedelta(hours=delay_hours))
        session.add(ds)
        session.commit()
        session.refresh(ds)
        return ds


async def _process_deletes_once() -> None:
    now = datetime.now(timezone.utc)
    with Session(engine) as session:
        stmt = select(DeleteSchedule).where(DeleteSchedule.processed == False).where(DeleteSchedule.delete_at <= now)
        due = session.exec(stmt).all()
        for ds in due:
            try:
                m = session.get(Market, ds.market_id)
                if m:
                    session.delete(m)
                ds.processed = True
                session.add(ds)
                session.commit()
            except Exception:
                try:
                    session.rollback()
                except Exception:
                    pass


async def run_cleanup_loop(poll_seconds: int = 60) -> None:
    while True:
        try:
            await _process_deletes_once()
        except Exception:
            pass
        await asyncio.sleep(poll_seconds)
