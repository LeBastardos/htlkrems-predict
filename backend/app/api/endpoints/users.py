import app.services.notification_service as notification_service
from app.schemas.notification import NotificationRead
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session, engine
from app.schemas.user import UserRead, UserSettingsUpdate
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy import or_


class RoleUpdate(BaseModel):
	role: str

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_my_profile(current_user: User = Depends(get_current_user)):
	return UserRead.model_validate(current_user, from_attributes=True)


@router.patch("/me/settings", response_model=UserRead)
def update_my_settings(
	payload: UserSettingsUpdate,
	current_user: User = Depends(get_current_user),
	session=Depends(get_session),
):
	current_user.allow_as_subject = payload.allow_as_subject
	session.add(current_user)
	session.commit()
	session.refresh(current_user)
	return UserRead.model_validate(current_user, from_attributes=True)


@router.get("/all", response_model=List[UserRead])
def list_users(q: Optional[str] = None, current_user: User = Depends(get_current_user)):
	"""List users. Admin-only. Optional `q` filters by name/username/email."""
	if current_user.role != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
	with Session(engine) as session:
		if q:
			pattern = f"%{q}%"
			stmt = select(User).where(
				or_(User.name.ilike(pattern), User.username.ilike(pattern), User.email.ilike(pattern))
			).order_by(User.created_at.desc())
		else:
			stmt = select(User).order_by(User.created_at.desc())
		users = session.exec(stmt).all()
		return [UserRead.model_validate(u, from_attributes=True) for u in users]


@router.post("/{user_id}/role")
def set_user_role(user_id: int, payload: RoleUpdate, current_user: User = Depends(get_current_user)):
	"""Set a user's role. Admin-only. Allowed roles: user, trustee, admin."""
	if current_user.role != "admin":
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
	role = (payload.role or "").strip()
	allowed = {"user", "admin", "trustee"}
	if role not in allowed:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role. Allowed: {', '.join(sorted(allowed))}")
	with Session(engine) as session:
		user = session.get(User, user_id)
		if not user:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
		user.role = role
		session.add(user)
		session.commit()
		session.refresh(user)
		return UserRead.model_validate(user, from_attributes=True)


@router.get("/me/notifications", response_model=List[NotificationRead])
async def get_my_notifications(current_user: User = Depends(get_current_user)):
	"""List notifications for current user (most recent first)."""
	return await notification_service.get_notifications_for_user(current_user.id)


@router.post("/me/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, current_user: User = Depends(get_current_user)):
	# mark notification as read (only owner)
	with Session(engine) as session:
		from app.db.models import Notification as NotificationModel

		n = session.get(NotificationModel, notification_id)
		if not n:
			raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
		if n.user_id != current_user.id:
			raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
	await notification_service.mark_notification_read(notification_id)
	return {"notification_id": notification_id, "status": "read"}

