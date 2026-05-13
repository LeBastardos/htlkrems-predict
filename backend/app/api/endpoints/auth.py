from fastapi import APIRouter

router = APIRouter()


@router.post("/callback")
async def auth_callback():
	return {"message": "auth callback placeholder"}

