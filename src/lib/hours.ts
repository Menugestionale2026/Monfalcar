import { WEEKDAYS_LONG, hm } from './format';
import type { OpeningHour } from '../types';

export interface HoursRow {
  label: string;
  text: string;
  closed: boolean;
}

/** Elenco lunedì → domenica pronto da mostrare. */
export function hoursRows(hours: OpeningHour[]): HoursRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((wd) => {
    const h = hours.find((x) => x.weekday === wd);
    const label = WEEKDAYS_LONG[wd].charAt(0).toUpperCase() + WEEKDAYS_LONG[wd].slice(1);
    if (!h || h.closed || !h.opens || !h.closes) return { label, text: 'Chiuso', closed: true };
    const text =
      h.break_start && h.break_end
        ? `${hm(h.opens)} – ${hm(h.break_start)} / ${hm(h.break_end)} – ${hm(h.closes)}`
        : `${hm(h.opens)} – ${hm(h.closes)}`;
    return { label, text, closed: false };
  });
}

/** Riassunto breve per l'intestazione: il primo gruppo di giorni consecutivi con lo stesso orario, es. "Lun–Ven 08:30 – 12:30 / 14:30 – 18:30". */
export function hoursSummary(hours: OpeningHour[]): string {
  const rows = hoursRows(hours);
  const first = rows.findIndex((r) => !r.closed);
  if (first === -1) return '';
  let last = first;
  while (last + 1 < rows.length && !rows[last + 1].closed && rows[last + 1].text === rows[first].text) last++;
  const short = (i: number) => rows[i].label.slice(0, 3);
  return `${first === last ? short(first) : `${short(first)}–${short(last)}`} ${rows[first].text}`;
}
