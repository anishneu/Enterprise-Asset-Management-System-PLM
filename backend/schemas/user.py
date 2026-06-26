from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(min_length=1)
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    name: Optional[str] = None
    email: str = Field(min_length=1)
    password: Optional[str] = Field(default=None, min_length=6)


class UserUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    enabled: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=6)