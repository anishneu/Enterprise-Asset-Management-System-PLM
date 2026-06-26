import re

_LETTER_RE = re.compile(r"^[A-Za-z]+$")
_INTEGER_RE = re.compile(r"^\d+$")
_DECIMAL_RE = re.compile(r"^(\d+)\.(\d+)$")


def next_revision(current: str | None) -> str:
    revision = (current or "1").strip() or "1"

    if _LETTER_RE.match(revision):
        return _next_letter_revision(revision.upper())

    decimal_match = _DECIMAL_RE.match(revision)
    if decimal_match:
        major = decimal_match.group(1)
        minor = int(decimal_match.group(2)) + 1
        return f"{major}.{minor}"

    if _INTEGER_RE.match(revision):
        return str(int(revision) + 1)

    return f"{revision}.1"


def _next_letter_revision(revision: str) -> str:
    if len(revision) != 1:
        return f"{revision}A"

    code = ord(revision)
    if code < ord("A") or code >= ord("Z"):
        return "A"

    return chr(code + 1)
