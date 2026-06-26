from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class FormTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=250)


class FormTypeResponse(BaseModel):
    id: int
    name: str
    updated: Optional[datetime] = None

    class Config:
        from_attributes = True
