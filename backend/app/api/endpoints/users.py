from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.user import UserRead, UserSettingsUpdate

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

