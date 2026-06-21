from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# 🔥 CREATE (POST)
class DocumentCreate(BaseModel):
    dname: str
    ddesc: Optional[str] = None
    doctype: str
    fmat: str


# 🔥 UPDATE (PUT/PATCH)
class DocumentUpdate(BaseModel):
    dname: Optional[str] = None
    ddesc: Optional[str] = None
    doctype: Optional[str] = None
    fmat: Optional[str] = None


# 🔥 RESPONSE (GET)
class DocumentResponse(BaseModel):
    id: int
    dname: str
    ddesc: Optional[str] = None
    doctype: str
    fmat: str
    updated: Optional[datetime]

    class Config:
        from_attributes = True