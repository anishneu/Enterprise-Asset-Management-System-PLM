from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(min_length=1)
    email: str = Field(min_length=1)
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    email: Optional[str] = None
    enabled: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)