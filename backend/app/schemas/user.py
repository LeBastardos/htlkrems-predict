import enum
import uuid
from sqlmodel import Field, SQLModel
from pydantic import EmailStr

class UserRole(str, enum.Enum):
    USER = "user"
    TRUSTEE = "trustee"
    ADMIN = "admin"

class UserBase(SQLModel, table=True):
    __tablenAme__ = "users"

    id: uuid.UUID = Field (
        default_factory = uuid.uuid4, #erstellt ID wenn nicht gegeben
        primary_key = True,
        index = True,
        nullable = False
    )

    name: str = Field(minLength = 3)

    email: EmailStr = Field(unique = True, index = True)

    balance: float = Field(default=0)

    role: UserRole = Field(default=UserRole.USER)