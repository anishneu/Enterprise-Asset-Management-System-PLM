/**
 * PLM revision helpers.
 * Letters: A → B → C
 * Numbers: 1 → 1.1 → 1.2 → … → 1.5 → 2 → 2.1 → 2.2 …
 */
export function normalizeRevision(value, defaultValue = "A") {
  const revision = String(value || defaultValue).trim() || defaultValue;
  if (/^[A-Za-z]+$/.test(revision)) {
    return revision.toUpperCase();
  }
  return revision;
}

export function nextRevision(current) {
  const revision = normalizeRevision(current);

  if (/^[A-Za-z]+$/.test(revision)) {
    const letter = revision.toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter < "Z") {
      return String.fromCharCode(letter.charCodeAt(0) + 1);
    }
    return `${letter}A`;
  }

  const decimalMatch = revision.match(/^(\d+)\.(\d+)$/);
  if (decimalMatch) {
    const major = Number(decimalMatch[1]);
    const minor = Number(decimalMatch[2]);
    if (minor >= 5) {
      return String(major + 1);
    }
    return `${major}.${minor + 1}`;
  }

  if (/^\d+$/.test(revision)) {
    return `${Number(revision)}.1`;
  }

  return `${revision}.1`;
}

export function revisionHelpText() {
  return "Letters advance A → B → C. Numbers advance 1 → 1.1 → 1.2 → 1.5 → 2 → 2.1 → 2.2.";
}
