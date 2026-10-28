import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { WEEKDAYS_LONG, addDaysKey, dateLong, hm, todayKey } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { OpeningHour, Service } from '../../types';
import { Icon } from '../../components/Icon';
import { ErrorNotice, Loading } from '../../components/Notice';

const ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunedì → domenica

interface Row {
  weekday: number;
  open: boolean;
  opens: string;
  closes: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
}

function toRow(h: OpeningHour): Row {
  return {
    weekday: h.weekday,
    open: !h.closed,
    opens: hm(h.opens) || '08:30',
    closes: hm(h.closes) || '18:30',
    hasBreak: !!(h.break_start && h.break_end),
    breakStart: hm(h.break_start) || '12:30',
    breakEnd: hm(h.break_end) || '14:30',
  };
}

function Saved({ show }: { show: boolean }) {
  return (
    <span role="status" className={`inline-flex items-center gap-1 font-semibold text-[#14532D] ${show ? '' : 'invisible'}`}>
      <Icon name="check" size={18} strokeWidth={2.6} /> Salvato
    </span>
  );
}

function OpeningHoursSection() {
  const hours = useAsync(() => api.getOpeningHours(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hours.data) {
      const byDay = new Map(hours.data.map((h) => [h.weekday, h]));
      setRows(
        ORDER.map((wd) =>
          toRow(byDay.get(wd) ?? { weekday: wd, closed: true, opens: null, closes: null, break_start: null, break_end: null }),
        ),
      );
    }
  }, [hours.data]);

  const patch = (wd: number, change: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.weekday === wd ? { ...r, ...change } : r)));
  };

  async function save() {
    setError(null);
    for (const r of rows) {
      if (!r.open) continue;
      const name = WEEKDAYS_LONG[r.weekday];
      if (!r.opens || !r.closes || r.opens >= r.closes) return setError(`${name}: l’orario di chiusura deve essere dopo quello di apertura.`);
      if (r.hasBreak && (!r.breakStart || !r.breakEnd || r.breakStart >= r.breakEnd || r.breakStart <= r.opens || r.breakEnd >= r.closes)) {
        return setError(`${name}: la pausa deve essere compresa tra apertura e chiusura.`);
      }
    }
    setBusy(true);
    try {
      await api.adminSaveOpeningHours(
        rows.map((r) => ({
          weekday: r.weekday,
          closed: !r.open,
          opens: r.open ? r.opens : null,
          closes: r.open ? r.closes : null,
          break_start: r.open && r.hasBreak ? r.breakStart : null,
          break_end: r.open && r.hasBreak ? r.breakEnd : null,
        })),
      );
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (hours.loading && !hours.data) return <Loading />;
  if (hours.error) return <ErrorNotice error={hours.error} onRetry={hours.reload} />;

  return (
    <section className="card p-5" aria-labelledby="h-orari">
      <h2 id="h-orari" className="font-display text-xl font-semibold">Orari di apertura</h2>
      <p className="mt-1 text-brand-muted">I clienti possono prenotare solo dentro questi orari.</p>
      <ul className="mt-4 divide-y divide-brand-line">
        {rows.map((r) => {
          const name = WEEKDAYS_LONG[r.weekday];
          return (
            <li key={r.weekday} className="grid gap-3 py-3 md:grid-cols-[10rem_1fr] md:items-center">
              <label className="inline-flex items-center gap-3 font-semibold capitalize">
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#01427F]" checked={r.open} onChange={(e) => patch(r.weekday, { open: e.target.checked })} />
                {name}
                {!r.open && <span className="font-normal text-brand-muted">chiuso</span>}
              </label>
              {r.open && (
                <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                  <div>
                    <label htmlFor={`o-${r.weekday}`} className="label">Apre</label>
                    <input id={`o-${r.weekday}`} type="time" className="input !w-40" value={r.opens} onChange={(e) => patch(r.weekday, { opens: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor={`c-${r.weekday}`} className="label">Chiude</label>
                    <input id={`c-${r.weekday}`} type="time" className="input !w-40" value={r.closes} onChange={(e) => patch(r.weekday, { closes: e.target.value })} />
                  </div>
                  <label className="inline-flex min-h-11 items-center gap-2">
                    <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#01427F]" checked={r.hasBreak} onChange={(e) => patch(r.weekday, { hasBreak: e.target.checked })} />
                    Pausa
                  </label>
                  {r.hasBreak && (
                    <>
                      <div>
                        <label htmlFor={`bs-${r.weekday}`} className="label">Dalle</label>
                        <input id={`bs-${r.weekday}`} type="time" className="input !w-40" value={r.breakStart} onChange={(e) => patch(r.weekday, { breakStart: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor={`be-${r.weekday}`} className="label">Alle</label>
                        <input id={`be-${r.weekday}`} type="time" className="input !w-40" value={r.breakEnd} onChange={(e) => patch(r.weekday, { breakEnd: e.target.value })} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}
      <div className="mt-4 flex items-center gap-4">
        <button type="button" className="btn btn-blue" onClick={save} disabled={busy}>{busy ? 'Salvataggio…' : 'Salva orari'}</button>
        <Saved show={saved} />
      </div>
    </section>
  );
}

function ClosuresSection() {
  const closures = useAsync(() => api.adminListClosures(), []);
  const today = todayKey();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from) return setError('Scegli il giorno di chiusura.');
    const last = to || from;
    if (last < from) return setError('L’ultimo giorno deve essere uguale o dopo il primo.');
    const days: string[] = [];
    for (let d = from; d <= last && days.length <= 90; d = addDaysKey(d, 1)) days.push(d);
    if (days.length > 90) return setError('Puoi aggiungere al massimo 90 giorni alla volta.');
    setBusy(true);
    try {
      await api.adminAddClosures(days, reason);
      setFrom('');
      setTo('');
      setReason('');
      closures.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(day: string) {
    setError(null);
    try {
      await api.adminDeleteClosure(day);
      closures.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="card p-5" aria-labelledby="h-chiusure">
      <h2 id="h-chiusure" className="font-display text-xl font-semibold">Giorni di chiusura</h2>
      <p className="mt-1 text-brand-muted">Ferie, festivi, chiusure straordinarie: in questi giorni nessuno può prenotare.</p>

      <form onSubmit={add} noValidate className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="cl-from" className="label">Dal giorno</label>
          <input id="cl-from" type="date" min={today} className="input !w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="cl-to" className="label">Al giorno (facoltativo)</label>
          <input id="cl-to" type="date" min={from || today} className="input !w-44" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="cl-reason" className="label">Motivo (facoltativo)</label>
          <input id="cl-reason" type="text" className="input" placeholder="Es. Ferie estive" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Icon name="plus" size={18} />
          Aggiungi
        </button>
      </form>
      {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}

      <div className="mt-5">
        {closures.loading && !closures.data ? (
          <Loading />
        ) : closures.error ? (
          <ErrorNotice error={closures.error} onRetry={closures.reload} />
        ) : (closures.data ?? []).length === 0 ? (
          <p className="rounded-xl bg-brand-mist p-4 text-brand-muted">Nessuna chiusura in programma.</p>
        ) : (
          <ul className="divide-y divide-brand-line rounded-xl border border-brand-line">
            {(closures.data ?? []).map((c) => (
              <li key={c.day} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>
                  <span className="font-semibold capitalize">{dateLong(c.day)}</span>
                  {c.reason && <span className="text-brand-muted"> · {c.reason}</span>}
                </span>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(c.day)} aria-label={`Rimuovi la chiusura del ${dateLong(c.day)}`}>
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ServicesSection() {
  const services = useAsync(() => api.adminListServices(), []);
  const [draft, setDraft] = useState<Record<string, { duration: string; capacity: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (services.data) {
      setDraft(Object.fromEntries(services.data.map((s) => [s.id, { duration: String(s.duration_min), capacity: String(s.capacity) }])));
    }
  }, [services.data]);

  async function save(s: Service) {
    setError(null);
    const d = draft[s.id];
    const duration = Number(d?.duration);
    const capacity = Number(d?.capacity);
    if (!Number.isInteger(duration) || duration < 10 || duration > 480) return setError(`${s.name}: la durata deve essere tra 10 e 480 minuti.`);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return setError(`${s.name}: gli appuntamenti contemporanei devono essere tra 1 e 20.`);
    try {
      await api.adminSaveService(s.id, { duration_min: duration, capacity });
      setSavedId(s.id);
      services.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const set = (id: string, key: 'duration' | 'capacity', value: string) => {
    setSavedId(null);
    setDraft((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
  };

  return (
    <section className="card p-5" aria-labelledby="h-servizi">
      <h2 id="h-servizi" className="font-display text-xl font-semibold">Durata degli appuntamenti</h2>
      <p className="mt-1 text-brand-muted">
        “Contemporanei” = quanti appuntamenti dello stesso tipo possono svolgersi nello stesso momento (es. quante persone possono ricevere clienti insieme).
      </p>
      {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}
      <div className="mt-4">
        {services.loading && !services.data ? (
          <Loading />
        ) : services.error ? (
          <ErrorNotice error={services.error} onRetry={services.reload} />
        ) : (
          <ul className="divide-y divide-brand-line">
            {(services.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-end gap-x-4 gap-y-2 py-3">
                <p className="min-w-52 flex-1 font-semibold">{s.name}</p>
                <div>
                  <label htmlFor={`d-${s.id}`} className="label">Durata (minuti)</label>
                  <input id={`d-${s.id}`} type="number" inputMode="numeric" min={10} max={480} step={5} className="input !w-40" value={draft[s.id]?.duration ?? ''} onChange={(e) => set(s.id, 'duration', e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`k-${s.id}`} className="label">Contemporanei</label>
                  <input id={`k-${s.id}`} type="number" inputMode="numeric" min={1} max={20} className="input !w-40" value={draft[s.id]?.capacity ?? ''} onChange={(e) => set(s.id, 'capacity', e.target.value)} />
                </div>
                <button type="button" className="btn btn-blue btn-sm" onClick={() => save(s)}>Salva</button>
                <Saved show={savedId === s.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function AdminHoursPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Orari e chiusure</h1>
      <p className="mt-2 max-w-2xl text-brand-muted">
        Qui decidi quando i clienti possono prenotare. Le modifiche valgono subito sul sito.
      </p>
      <div className="mt-6 space-y-6">
        <OpeningHoursSection />
        <ClosuresSection />
        <ServicesSection />
      </div>
    </div>
  );
}
