import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { DETAIL_LABELS } from '../../lib/bookingFields';
import { errorMessage } from '../../lib/errors';
import { dateLong, timeHM } from '../../lib/format';
import { pushAdminNotice } from '../../lib/notices';
import type { Booking } from '../../types';
import { BookingStatusBadge } from '../Badge';
import { Icon } from '../Icon';

const SUGGESTED_REASONS = [
  'L’orario richiesto non è più disponibile.',
  'In quella data siamo al completo.',
  'L’auto richiesta non è più disponibile.',
  'Servizio non disponibile: ti chiamiamo per trovare un’alternativa.',
];

function RejectDialog({ booking, onClose, onConfirm }: { booking: Booking; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-brand-line p-0 shadow-2xl backdrop:bg-brand-navy/50"
      aria-labelledby="rifiuta-t"
    >
      <div className="p-6">
        <h2 id="rifiuta-t" className="font-display text-xl font-semibold">Rifiuta la prenotazione</h2>
        <p className="mt-2 text-brand-muted">
          {booking.customer.full_name} · {dateLong(booking.start_at)} alle {timeHM(booking.start_at)}
        </p>
        <p className="mt-4 text-sm font-semibold">Motivo (verrà scritto nell’email al cliente)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_REASONS.map((r) => (
            <button key={r} type="button" className="chip !min-h-0 !py-1.5 text-left text-sm" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
        <label htmlFor="rej-reason" className="label mt-4">Messaggio</label>
        <textarea id="rej-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Facoltativo, ma consigliato." />
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-outline" onClick={() => ref.current?.close()} disabled={busy}>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            {busy ? 'Invio…' : 'Rifiuta e avvisa il cliente'}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function BookingItem({ booking: b, onChanged }: { booking: Booking; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  async function setStatus(status: Booking['status'], reason?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.adminSetBookingStatus(b.id, status, reason);
      setRejecting(false);
      if (res.email === 'failed') {
        pushAdminNotice(
          `Prenotazione di ${b.customer.full_name} aggiornata, ma l’email al cliente NON è partita (indirizzo non valido o limite giornaliero di Gmail raggiunto). Avvisalo tu: ${b.customer.phone}.`,
        );
      }
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const detailEntries = Object.entries(b.details ?? {}).filter(([, v]) => v);
  const pending = b.status === 'in_attesa';
  const waNumber = b.customer.phone.replace(/[^\d]/g, '');

  return (
    <article className={`card p-4 md:p-5 ${pending ? 'border-brand-yellow border-2' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold capitalize">
            {dateLong(b.start_at)} · {timeHM(b.start_at)}
          </p>
          <p className="text-brand-muted">{b.service.name}{b.car ? ` · ${b.car.title}` : ''}</p>
        </div>
        <BookingStatusBadge status={b.status} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-semibold">{b.customer.full_name}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            <a href={`tel:${b.customer.phone}`} className="inline-flex items-center gap-1.5 text-brand-blue"><Icon name="phone" size={16} />{b.customer.phone}</a>
            <a href={`mailto:${b.customer.email}`} className="inline-flex items-center gap-1.5 break-all text-brand-blue"><Icon name="mail" size={16} />{b.customer.email}</a>
            {waNumber.length >= 6 && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-blue"><Icon name="chat" size={16} />WhatsApp</a>
            )}
          </p>
        </div>
        {(detailEntries.length > 0 || b.customer_note) && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[15px]">
            {detailEntries.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-brand-muted">{DETAIL_LABELS[k] ?? k}</dt>
                <dd className="whitespace-pre-line break-words">{v}</dd>
              </div>
            ))}
            {b.customer_note && (
              <div className="contents">
                <dt className="text-brand-muted">Note</dt>
                <dd className="whitespace-pre-line break-words">{b.customer_note}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {b.status === 'rifiutata' && b.reject_reason && (
        <p className="mt-3 text-sm text-brand-muted">Motivo del rifiuto: {b.reject_reason}</p>
      )}
      {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {pending && (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => setStatus('confermata')}>
              <Icon name="check" size={18} strokeWidth={2.4} />
              Accetta e invia conferma
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setRejecting(true)}>
              Rifiuta
            </button>
          </>
        )}
        {b.status === 'confermata' && (
          <>
            <button type="button" className="btn btn-blue btn-sm" disabled={busy} onClick={() => setStatus('completata')}>Segna come completata</button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setStatus('annullata')}>Annulla</button>
          </>
        )}
      </div>

      {rejecting && (
        <RejectDialog booking={b} onClose={() => setRejecting(false)} onConfirm={(reason) => setStatus('rifiutata', reason || undefined)} />
      )}
    </article>
  );
}
