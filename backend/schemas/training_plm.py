from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


COURSE_STATUSES = ("Draft", "Released", "Obsolete")
CURRICULUM_STATUSES = ("Draft", "Pending Approval", "Released", "Obsolete")
ASSIGNMENT_STATUSES = ("Assigned", "In Progress", "Completed", "Expired", "Reassigned")
RECORD_STATUSES = ("Assigned", "In Progress", "Completed")


class TrainingCourseCreate(BaseModel):
    course_code: str = Field(min_length=1, max_length=50)
    course_name: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    category: Optional[str] = None
    revision: str = "A"
    duration_hours: Optional[float] = None
    pass_percentage: Optional[int] = None
    requires_assessment: bool = False
    validity_months: Optional[int] = None
    doc_id: Optional[int] = None
    form_id: Optional[int] = None


class TrainingCourseUpdate(BaseModel):
    course_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    duration_hours: Optional[float] = None
    pass_percentage: Optional[int] = None
    requires_assessment: Optional[bool] = None
    validity_months: Optional[int] = None
    doc_id: Optional[int] = None
    form_id: Optional[int] = None
    release_due_date: Optional[datetime] = None


class CourseDocumentItem(BaseModel):
    doc_id: int
    sequence_order: int = 0


class CourseSetupUpdate(BaseModel):
    form_id: Optional[int] = None
    release_due_date: Optional[datetime] = None
    trainer_user_id: Optional[str] = None
    trainer_name: Optional[str] = None
    documents: list[CourseDocumentItem] = Field(default_factory=list)
    user_ids: list[str] = Field(default_factory=list)
    group_ids: list[str] = Field(default_factory=list)
    group_names: dict[str, str] = Field(default_factory=dict)


class CurriculumDocumentItem(BaseModel):
    doc_id: int
    sequence_order: int = 0


class CurriculumCreate(BaseModel):
    curriculum_code: str = Field(min_length=1, max_length=50)
    curriculum_name: str = Field(min_length=1, max_length=250)
    description: Optional[str] = None
    revision: str = "A"
    form_id: Optional[int] = None
    approver_user_id: Optional[str] = None
    effective_date: Optional[datetime] = None
    document_ids: list[int] = Field(default_factory=list)
    fielddata: Optional[dict] = None


class CurriculumUpdate(BaseModel):
    curriculum_name: Optional[str] = None
    description: Optional[str] = None
    revision: Optional[str] = None
    form_id: Optional[int] = None
    approver_user_id: Optional[str] = None
    effective_date: Optional[datetime] = None
    document_ids: Optional[list[int]] = None
    fielddata: Optional[dict] = None


class CurriculumSubmitReview(BaseModel):
    approver: Optional[str] = None
    approver_user_id: Optional[str] = None
    effective_date: Optional[datetime] = None


class CurriculumCourseItem(BaseModel):
    course_id: int
    sequence_order: int = 0
    mandatory: bool = True


class CurriculumCoursesUpdate(BaseModel):
    courses: list[CurriculumCourseItem] = Field(default_factory=list)


class CurriculumRuleUpdate(BaseModel):
    user_ids: list[str] = Field(default_factory=list)
    group_ids: list[str] = Field(default_factory=list)
    group_names: dict[str, str] = Field(default_factory=dict)
    due_date: Optional[datetime] = None


class CurriculumAssignRequest(BaseModel):
    curriculum_id: int
    user_ids: list[str] = Field(default_factory=list)
    group_ids: list[str] = Field(default_factory=list)
    due_date: Optional[datetime] = None


class TrainingRecordUpdate(BaseModel):
    submit_action: Optional[Literal["save", "submit"]] = None
    status: Optional[str] = None
    training_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    trainer: Optional[str] = None
    remarks: Optional[str] = None
    certificate_file: Optional[str] = None
    fielddata: Optional[dict] = None


class TrainingCourseResponse(BaseModel):
    id: int
    course_code: str
    course_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    revision: str
    status: str
    duration_hours: Optional[float] = None
    pass_percentage: Optional[int] = None
    requires_assessment: bool = False
    validity_months: Optional[int] = None
    doc_id: Optional[int] = None
    form_id: Optional[int] = None
    form_name: Optional[str] = None
    release_due_date: Optional[datetime] = None
    trainer_user_id: Optional[str] = None
    trainer_name: Optional[str] = None
    document_count: Optional[int] = 0
    assignee_count: Optional[int] = 0
    group_count: Optional[int] = 0
    documents: list[dict] = Field(default_factory=list)
    assignees: list[dict] = Field(default_factory=list)
    assignee_groups: list[dict] = Field(default_factory=list)
    owner_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CurriculumCourseResponse(BaseModel):
    id: int
    course_id: int
    sequence_order: int
    mandatory: bool
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    course_revision: Optional[str] = None
    course_status: Optional[str] = None


class CurriculumResponse(BaseModel):
    id: int
    curriculum_code: str
    curriculum_name: str
    description: Optional[str] = None
    revision: str
    status: str
    form_id: Optional[int] = None
    form_name: Optional[str] = None
    approver_user_id: Optional[str] = None
    approver_display: Optional[str] = None
    effective_date: Optional[datetime] = None
    fielddata: Optional[dict] = None
    assignment_due_date: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    courses: list[CurriculumCourseResponse] = Field(default_factory=list)
    documents: list[dict] = Field(default_factory=list)


class AssignmentResponse(BaseModel):
    id: int
    curriculum_id: int
    curriculum_name: Optional[str] = None
    user_id: str
    user_display: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: str


class PlmTrainingRecordResponse(BaseModel):
    id: int
    user_id: str
    user_display: Optional[str] = None
    course_id: int
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    course_revision: Optional[str] = None
    curriculum_id: Optional[int] = None
    curriculum_name: Optional[str] = None
    curriculum_revision: Optional[str] = None
    assignment_id: Optional[int] = None
    assigned_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    training_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    trainer: Optional[str] = None
    status: str
    certificate_file: Optional[str] = None
    remarks: Optional[str] = None
    form_id: Optional[int] = None
    form_name: Optional[str] = None
    fielddata: Optional[dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class QualificationCell(BaseModel):
    course_id: int
    course_code: str
    course_name: str
    status: str


class QualificationRow(BaseModel):
    user_id: str
    user_display: str
    courses: list[QualificationCell] = Field(default_factory=list)
    completion_percent: float = 0
