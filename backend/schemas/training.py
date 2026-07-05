from datetime import datetime

from typing import Any, Optional



from pydantic import BaseModel





class TrainingCreate(BaseModel):

    fid: Optional[int] = None

    rev: str = "1"

    title: str

    trainee: Optional[str] = None

    assigndate: Optional[datetime] = None

    duedate: Optional[datetime] = None

    completionstatus: str = "Pending"

    fielddata: Optional[Any] = None





class TrainingUpdate(BaseModel):

    fid: Optional[int] = None

    rev: Optional[str] = None

    title: Optional[str] = None

    trainee: Optional[str] = None

    assigndate: Optional[datetime] = None

    duedate: Optional[datetime] = None

    completionstatus: Optional[str] = None

    fielddata: Optional[Any] = None





class TrainingResponse(BaseModel):

    id: int

    fid: Optional[int] = None

    rev: str

    title: str

    trainee: Optional[str] = None

    assigndate: Optional[datetime] = None

    duedate: Optional[datetime] = None

    completionstatus: str = "Pending"

    fielddata: Optional[Any] = None

    updated: Optional[datetime] = None



    class Config:

        from_attributes = True

