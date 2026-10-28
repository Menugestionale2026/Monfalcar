// Formattazione di prezzi, date e orari. Tutte le date sono mostrate all'ora di Roma.
export const TZ = 'Europe/Rome';

export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const WEEKDAYS_LONG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const eurFormat = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const numFormat = new Intl.NumberFormat('it-IT');

export function eur(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : eurFormat.format(n);
}

export function kmText(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : `${numFormat.format(n)} km`;
}

export function numberText(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : numFormat.format(n);
}

/** "2026-11-09" nel fuso di Roma per un istante ISO */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  );
}

export function todayKey(): string {
  return dayKey(new Date().toISOString());
}

export function addDaysKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = domenica ... 6 = sabato */
export function weekdayOf(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

export function timeHM(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(
    new Date(iso),
  );
}

/** "lunedì 9 novembre 2026" */
export function dateLong(isoOrKey: string): string {
  const d = isoOrKey.length === 10 ? new Date(`${isoOrKey}T12:00:00Z`) : new Date(isoOrKey);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  if (isoOrKey.length === 10) opts.timeZone = 'UTC';
  else opts.timeZone = TZ;
  return new Intl.DateTimeFormat('it-IT', opts).format(d);
}

/** "lun 9 nov" */
export function dateShort(isoOrKey: string): string {
  const d = isoOrKey.length === 10 ? new Date(`${isoOrKey}T12:00:00Z`) : new Date(isoOrKey);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  opts.timeZone = isoOrKey.length === 10 ? 'UTC' : TZ;
  return new Intl.DateTimeFormat('it-IT', opts).format(d);
}

function tzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Istante corrispondente a un giorno ("2026-11-09") e un'ora ("08:30") di Roma */
export function romeToDate(key: string, hm: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = tzOffsetMs(new Date(guess));
  let t = guess - off1;
  const off2 = tzOffsetMs(new Date(t));
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

export function hm(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

/**
 * Legge un numero scritto a mano nei moduli. Accetta il formato italiano: "12.500" = 12500,
 * "12.500,50" = 12500.5, "12,5" = 12.5. Campo vuoto = null; testo non valido = undefined.
 */
export function parseNumber(value: string): number | null | undefined {
  let t = value.trim().replace(/[€\s]/g, '');
  if (t === '') return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
}
