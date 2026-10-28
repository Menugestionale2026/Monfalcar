const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
export const MAX_RECIPIENTS = 5;

/** Da un testo con indirizzi separati da virgola, punto e virgola, spazi o a capo: validi (senza doppioni) e non validi. */
export function checkRecipients(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    if (!EMAIL_RE.test(e)) {
      if (!invalid.includes(e)) invalid.push(e);
    } else if (!valid.includes(e)) valid.push(e);
  }
  return { valid, invalid };
}
