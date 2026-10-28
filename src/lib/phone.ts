/**
 * Dal numero scritto a mano ("0481 123456", "333 1234567", "+39 333 1234567") ricava le sole cifre
 * con prefisso internazionale (es. "393331234567"), usate per i link "Chiama" e WhatsApp.
 * Senza prefisso si presume un numero italiano. Restituisce null se non sembra un numero.
 */
export function phoneDigits(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  const hasPrefix = t.startsWith('+') || t.startsWith('00');
  let d = t.replace(/\D/g, '');
  if (t.startsWith('00')) d = d.slice(2);
  if (d.length < 6 || d.length > 15) return null;
  if (!hasPrefix && !(d.startsWith('39') && d.length >= 11)) d = `39${d}`;
  return d;
}
