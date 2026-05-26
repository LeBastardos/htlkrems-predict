from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.auth import create_user_access_token, exchange_microsoft_code, get_or_create_user
from app.db.session import get_session
from app.schemas.user import AuthCallbackRequest, AuthTokenResponse, UserRead

router = APIRouter()


@router.post("/callback", response_model=AuthTokenResponse)
def auth_callback(payload: AuthCallbackRequest, session: Session = Depends(get_session)):
	login_result = exchange_microsoft_code(payload.code, payload.redirect_uri)
	user = get_or_create_user(session, login_result.profile)
	token = create_user_access_token(user)
	return AuthTokenResponse(access_token=token, user=UserRead.model_validate(user, from_attributes=True))

