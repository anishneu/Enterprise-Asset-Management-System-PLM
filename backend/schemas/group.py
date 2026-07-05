from typing import List, Optional

from pydantic import BaseModel, Field


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1)
    memberIds: Optional[List[str]] = None
    roles: Optional[List[str]] = None
