import re

_LETTER_RE = re.compile(r"^[A-Za-z]+$")
_INTEGER_RE = re.compile(r"^\d+$")
_DECIMAL_RE = re.compile(r"^(\d+)\.(\d+)$")


def normalize_revision(value: str | None, *, default: str = "A") -> str:
    revision = (value or default).strip() or default
    if _LETTER_RE.match(revision):
        return revision.upper()
    return revision


def next_revision(current: str | None) -> str:
    revision = normalize_revision(current)

    if _LETTER_RE.match(revision):
        return _next_letter_revision(revision)

    decimal_match = _DECIMAL_RE.match(revision)
    if decimal_match:
        major = int(decimal_match.group(1))
        minor = int(decimal_match.group(2))
        if minor >= 5:
            return str(major + 1)
        return f"{major}.{minor + 1}"

    if _INTEGER_RE.match(revision):
        return f"{int(revision)}.1"

    return f"{revision}.1"


def _next_letter_revision(revision: str) -> str:
    if len(revision) != 1:
        return f"{revision}A"

    code = ord(revision)
    if code < ord("A") or code >= ord("Z"):
        return "A"

    return chr(code + 1)
