ENTITY_FORM = "form"
ENTITY_DOC = "doc"

STATUS_DRAFT = "Draft"
STATUS_PENDING = "Pending Approval"
STATUS_RELEASED = "Released"
STATUS_OBSOLETE = "Obsolete"

LEGACY_IN_REVIEW = "In Review"

REQUEST_PENDING = "Pending"
REQUEST_APPROVED = "Approved"
REQUEST_REJECTED = "Rejected"


def normalize_status(status: str | None) -> str:
    value = (status or STATUS_DRAFT).strip() or STATUS_DRAFT
    if value == LEGACY_IN_REVIEW:
        return STATUS_PENDING
    return value


def can_edit(status: str | None) -> bool:
    normalized = normalize_status(status)
    return normalized in {STATUS_DRAFT, STATUS_PENDING}


def can_delete(status: str | None) -> bool:
    return normalize_status(status) == STATUS_DRAFT


def can_submit(status: str | None) -> bool:
    return normalize_status(status) == STATUS_DRAFT


def can_approve_entity(status: str | None) -> bool:
    return normalize_status(status) == STATUS_PENDING


def can_revise(status: str | None) -> bool:
    return normalize_status(status) == STATUS_RELEASED


def is_read_only(status: str | None) -> bool:
    normalized = normalize_status(status)
    return normalized in {STATUS_PENDING, STATUS_RELEASED, STATUS_OBSOLETE}
