/**
 * Compute the next revision label for PLM revise actions.
 * Supports letter revisions (A → B), integers (1 → 2), and decimals (1.1 → 1.2).
 */
export function nextRevision(current) {
  const revision = String(current || "1").trim() || "1";

  if (/^[A-Za-z]+$/.test(revision)) {
    const letter = revision.toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter < "Z") {
      return String.fromCharCode(letter.charCodeAt(0) + 1);
    }
    return `${letter}A`;
  }

  const decimalMatch = revision.match(/^(\d+)\.(\d+)$/);
  if (decimalMatch) {
    const major = decimalMatch[1];
    const minor = Number(decimalMatch[2]) + 1;
    return `${major}.${minor}`;
  }

  if (/^\d+$/.test(revision)) {
    return String(Number(revision) + 1);
  }

  return `${revision}.1`;
}

export function revisionHelpText() {
  return "Approval keeps the same revision. After release, use Create revision to move A → B, 1 → 2, or 1.1 → 1.2.";
}
