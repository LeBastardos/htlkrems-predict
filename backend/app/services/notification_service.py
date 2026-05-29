from __future__ import annotations

from datetime import datetime
from typing import List

from sqlmodel import Session, select

from app.db.session import engine
from app.schemas.notification import Notification, NotificationRead


async def create_notification(user_id: int, message: str, link: str | None = None) -> NotificationRead:
    with Session(engine) as session:
        n = Notification(user_id=user_id, message=message, link=link, is_read=False, created_at=datetime.utcnow())
        session.add(n)
        session.commit()
        session.refresh(n)
        return NotificationRead.model_validate(n, from_attributes=True)


async def get_notifications_for_user(user_id: int, limit: int = 50) -> List[NotificationRead]:
    with Session(engine) as session:
        stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc()).limit(limit)
        rows = session.exec(stmt).all()
        return [NotificationRead.model_validate(r, from_attributes=True) for r in rows]


async def mark_notification_read(notification_id: int) -> None:
    with Session(engine) as session:
        n = session.get(Notification, notification_id)
        if not n:
            return
        n.is_read = True
        session.add(n)
        session.commit()
    return None