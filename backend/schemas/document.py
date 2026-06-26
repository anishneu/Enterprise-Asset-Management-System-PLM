from typing import Optional



from pydantic import BaseModel

from typing import Any

from datetime import datetime, date





class DocumentCreate(BaseModel):

    dname: Optional[str] = None

    ddesc: Optional[str] = None

    dtype: str

    ftype: str

    fid: int

    fmat: str

    drev: Optional[str] = None

    dstatus: Optional[str] = None

    dlink: Optional[str] = None

    downer: Optional[str] = None

    dapprover: Optional[str] = None

    deffective: Optional[date] = None

    fielddata: Optional[Any] = None





class DocumentUpdate(BaseModel):

    dname: Optional[str] = None

    ddesc: Optional[str] = None

    dtype: Optional[str] = None

    ftype: Optional[str] = None

    fid: Optional[int] = None

    fmat: Optional[str] = None

    drev: Optional[str] = None

    dstatus: Optional[str] = None

    dlink: Optional[str] = None

    downer: Optional[str] = None

    dapprover: Optional[str] = None

    deffective: Optional[date] = None

    fielddata: Optional[Any] = None





class DocumentResponse(BaseModel):

    id: int

    dname: str

    ddesc: Optional[str] = None

    dtype: str

    ftype: str

    fid: int

    fmat: str

    drev: Optional[str] = "1"

    dstatus: Optional[str] = "Draft"

    dlink: Optional[str] = None

    downer: Optional[str] = None

    dapprover: Optional[str] = None

    deffective: Optional[date] = None

    fielddata: Optional[Any] = None

    updated: Optional[datetime] = None

    created: Optional[datetime] = None



    class Config:

        from_attributes = True


