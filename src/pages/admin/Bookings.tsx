import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { MONTHS, addDaysKey, dateLong, dayKey, todayKey, weekdayOf } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Booking, BookingStatus } from '../../types';
import { BOOKING_STATUS_LABEL } from '../../components/Badge';
import { BookingItem } from '../../components/admin/BookingItem';
import { Icon } from '../../components/Icon';
import { Empty, ErrorNotice, Loading } from '../../components/Notice';
import { useAdminContext } from './AdminLayout';

type Filter = 'tutte' | BookingStatus;
const FILTERS: Filter[] = ['tutte', 'in_attesa', 'confermata', 'completata', 'rifiutata', 'annullata'];

function MonthCalendar({
  month,
  setMonth,
  counts,
  selected,
  onSelect,
}: {
  month: string; // "YYYY-MM"
  setMonth: (m: string) => void;
  counts: Map<string, { pending: number; confirmed: number }>;
  selected: string | null;
  onSelect: (day: string | null) => void;
}) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const lead = (weekdayOf(first) + 6) % 7; // lunedì = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  const today = todayKey();
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  return (
    <section className="card h-fit p-4 lg:sticky lg:top-4" aria-label="Calendario">
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-outline btn-sm !px-2" onClick={() => shift(-1)} aria-label="Mese precedente"><Icon name="chevronLeft" size={18} /></button>
        <h2 className="font-display text-lg font-semibold capitalize">{MONTHS[m - 1]} {y}</h2>
        <button type="button" className="btn btn-outline btn-sm !px-2" onClick={() => shift(1)} aria-label="Mese successivo"><Icon name="chevronRight" size={18} /></button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-brand-muted" aria-hidden="true">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const c = counts.get(day);
          const total = (c?.pending ?? 0) + (c?.confirmed ?? 0);
          const isSel = selected === day;
          const label = `${dateLong(day)}${total ? `: ${c?.confirmed ?? 0} confermate, ${c?.pending ?? 0} in attesa` : ''}`;
          return (
            <button
              key={day}
              type="button"
              aria-label={label}
              aria-pressed={isSel}
              onClick={() => onSelect(isSel ? null : day)}
              className={`flex min-h-12 flex-col items-center justify-center rounded-lg border text-sm ${
                isSel ? 'border-brand-blue bg-brand-blue text-white' : day === today ? 'border-brand-blue bg-white' : 'border-transparent bg-brand-mist hover:border-brand-line'
              }`}
            >
              <span className="font-semibold">{Number(day.slice(8))}</span>
              {total > 0 && (
                <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                  {(c?.pending ?? 0) > 0 && <span className="h-2 w-2 rounded-full bg-brand-yellow ring-1 ring-brand-navy/30" />}
                  {(c?.confirmed ?? 0) > 0 && <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-brand-blue'}`} />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex gap-4 text-xs text-brand-muted">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-yellow ring-1 ring-brand-navy/30" />in attesa</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-brand-blue" />confermate</span>
      </p>
    </section>
  );
}

export function AdminBookingsPage() {
  const { refreshCounts } = useAdminContext();
  const bookings = useAsync(() => api.adminListBookings(), []);
  const today = todayKey();
  const [filter, setFilter] = useState<Filter>('in_attesa');
  const [showPast, setShowPast] = useState(false);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(null);

  const all = bookings.data ?? [];

  const counts = useMemo(() => {
    const map = new Map<string, { pending: number; confirmed: number }>();
    for (const b of all) {
      if (b.status !== 'in_attesa' && b.status !== 'confermata') continue;
      const k = dayKey(b.start_at);
      const c = map.get(k) ?? { pending: 0, confirmed: 0 };
      if (b.status === 'in_attesa') c.pending++;
      else c.confirmed++;
      map.set(k, c);
    }
    return map;
  }, [all]);

  const statusCount = (f: Filter) => (f === 'tutte' ? all.length : all.filter((b) => b.status === f).length);

  const grouped = useMemo(() => {
    const list = all.filter((b) => {
      if (filter !== 'tutte' && b.status !== filter) return false;
      const d = dayKey(b.start_at);
      if (selected) return d === selected;
      // Le prenotazioni passate restano nascoste, tranne quelle ancora da gestire.
      if (!showPast && d < today && b.status !== 'in_attesa') return false;
      return true;
    });
    list.sort((a, b) => a.start_at.localeCompare(b.start_at));
    const groups = new Map<string, Booking[]>();
    for (const b of list) {
      const k = dayKey(b.start_at);
      groups.set(k, [...(groups.get(k) ?? []), b]);
    }
    return [...groups.entries()];
  }, [all, filter, selected, showPast, today]);

  if (bookings.loading && !bookings.data) return <Loading />;
  if (bookings.error) return <ErrorNotice error={bookings.error} onRetry={bookings.reload} />;

  const changed = () => {
    bookings.reload();
    refreshCounts();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Prenotazioni</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <MonthCalendar month={month} setMonth={setMonth} counts={counts} selected={selected} onSelect={setSelected} />

        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per stato">
            {FILTERS.map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === 'tutte' ? 'Tutte' : BOOKING_STATUS_LABEL[f]} ({statusCount(f)})
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-5 w-5 accent-[#01427F]" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
              Mostra anche le passate
            </label>
            {selected && (
              <button type="button" className="font-semibold text-brand-blue underline" onClick={() => setSelected(null)}>
                Giorno selezionato: {dateLong(selected)} — mostra tutti
              </button>
            )}
          </div>

          <div className="mt-5 space-y-8">
            {grouped.length === 0 ? (
              <Empty title="Nessuna prenotazione da mostrare">Cambia filtro o scegli un altro giorno.</Empty>
            ) : (
              grouped.map(([day, items]) => (
                <section key={day} aria-label={dateLong(day)}>
                  <h2 className="font-display text-lg font-semibold capitalize text-brand-blue">
                    {dateLong(day)}
                    {day === today && <span className="ml-2 rounded-full bg-brand-yellow px-2 py-0.5 text-xs text-brand-navy">oggi</span>}
                    {day === addDaysKey(today, 1) && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs">domani</span>}
                  </h2>
                  <div className="mt-3 space-y-3">
                    {items.map((b) => (
                      <BookingItem key={b.id} booking={b} onChanged={changed} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
