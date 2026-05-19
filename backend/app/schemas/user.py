from sqlmodel import Field, SQLModel
from pydantic import EmailStr # Braucht: pip install "pydantic[email]"

class UserBase(SQLModel, table=True):

    id: int | None = Field(default=None, primary_key=True)

    username: str = Field(index=True, unique=True, min_length=3)

    email: EmailStr = Field(unique=True)