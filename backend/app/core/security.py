from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def create_access_token(subject: str, expires_delta_minutes: int | None = None) -> str:
	now = datetime.now(timezone.utc)
	expire_minutes = expires_delta_minutes if expires_delta_minutes is not None else settings.ACCESS_TOKEN_EXPIRE_MINUTES
	expires_at = now + timedelta(minutes=expire_minutes)
	payload = {
		"sub": subject,
		"iat": int(now.timestamp()),
		"exp": int(expires_at.timestamp()),
	}
	return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
	return jwt.decode(
		token,
		settings.JWT_SECRET_KEY,
		algorithms=[settings.JWT_ALGORITHM],
		options={"require": ["sub", "exp"]},
	)
