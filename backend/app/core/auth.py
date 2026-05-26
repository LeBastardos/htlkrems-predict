from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable

import msal
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import create_access_token, decode_access_token
from app.db.models import User
from app.db.session import get_session
from app.schemas.user import MicrosoftProfile


bearer_scheme = HTTPBearer(auto_error=False)

_ROLE_HIERARCHY = {"user": 0, "trustee": 1, "admin": 2}


@dataclass(slots=True)
class MicrosoftLoginResult:
	profile: MicrosoftProfile
	claims: dict[str, Any]


def _build_confidential_client() -> msal.ConfidentialClientApplication:
	if not settings.AZURE_CLIENT_ID or not settings.AZURE_CLIENT_SECRET:
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Azure AD is not configured. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET.",
		)

	authority = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}"
	return msal.ConfidentialClientApplication(
		client_id=settings.AZURE_CLIENT_ID,
		authority=authority,
		client_credential=settings.AZURE_CLIENT_SECRET,
	)


def _extract_email(claims: dict[str, Any]) -> str:
	email = claims.get("preferred_username") or claims.get("email") or claims.get("upn")
	if not email:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Microsoft account did not provide an email address.")
	return str(email).strip().lower()


def validate_school_email(email: str) -> None:
	allowed_domain = settings.ALLOWED_EMAIL_DOMAIN.lower().strip()
	if not email.endswith(f"@{allowed_domain}"):
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Only @{allowed_domain} addresses are allowed.")


def exchange_microsoft_code(code: str, redirect_uri: str | None = None) -> MicrosoftLoginResult:
	app = _build_confidential_client()
	result = app.acquire_token_by_authorization_code(
		code=code,
		scopes=["openid", "profile", "email", "offline_access", "User.Read"],
		redirect_uri=redirect_uri or settings.AZURE_REDIRECT_URI,
	)

	if not result or "error" in result:
		detail = result.get("error_description") if isinstance(result, dict) else "Unknown Microsoft authentication error."
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail or "Microsoft authentication failed.")

	claims = result.get("id_token_claims") or {}
	email = _extract_email(claims)
	validate_school_email(email)

	profile = MicrosoftProfile(
		azure_oid=str(claims.get("oid") or claims.get("sub") or email),
		name=str(claims.get("name") or email.split("@")[0]),
		email=email,
	)
	return MicrosoftLoginResult(profile=profile, claims=claims)


def get_or_create_user(session: Session, profile: MicrosoftProfile) -> User:
	statement = select(User).where((User.email == profile.email) | (User.azure_oid == profile.azure_oid))
	user = session.exec(statement).first()
	if user is None:
		user = User(
			email=profile.email,
			name=profile.name,
			azure_oid=profile.azure_oid,
			last_login_at=datetime.now(timezone.utc),
		)
		session.add(user)
		session.commit()
		session.refresh(user)
		return user

	user.name = profile.name
	user.azure_oid = profile.azure_oid
	user.last_login_at = datetime.now(timezone.utc)
	session.add(user)
	session.commit()
	session.refresh(user)
	return user


def create_user_access_token(user: User) -> str:
	return create_access_token(subject=str(user.id))


def get_current_user(
	credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
	session: Session = Depends(get_session),
) -> User:
	if credentials is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token.")

	try:
		payload = decode_access_token(credentials.credentials)
	except Exception:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

	sub = payload.get("sub")
	if not sub:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

	user = session.get(User, int(sub))
	if user is None:
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
	return user


def require_role(min_role: str) -> Callable[..., User]:
	"""
	Dependency-Factory: Prüft ob der eingeloggte User mindestens die angegebene Rolle hat.
	Verwendung: current_user: User = Depends(require_role("admin"))
	"""
	def _checker(current_user: User = Depends(get_current_user)) -> User:
		user_level = _ROLE_HIERARCHY.get(current_user.role, 0)
		required_level = _ROLE_HIERARCHY.get(min_role, 99)
		if user_level < required_level:
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail=f"Berechtigung verweigert. Benötigt: '{min_role}', vorhanden: '{current_user.role}'.",
			)
		return current_user

	return _checker

