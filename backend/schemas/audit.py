from typing import Any, Optional

from pydantic import BaseModel, Field


class AuditEntry(BaseModel):
    id: int | str
    source: str
    entityType: str
    entityId: str
    entityLabel: Optional[str] = None
    revision: Optional[str] = None
    action: str
    summary: Optional[str] = None
    changes: Optional[Any] = None
    performedBy: Optional[str] = None
    performedBySub: Optional[str] = None
    actionDate: Optional[str] = None


class AuditListResponse(BaseModel):
    items: list[AuditEntry] = Field(default_factory=list)
    count: int = 0
    total: int = 0
