from fastapi import APIRouter

router = APIRouter()


@router.get("/me")
async def read_my_profile():
	return {"id": "stub-user", "name": "Stub User", "balance": 1000}

