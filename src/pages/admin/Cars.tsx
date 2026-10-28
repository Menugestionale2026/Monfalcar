import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { eur, parseNumber } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { Car, CarPrices, CarStatus } from '../../types';
import { CAR_STATUS_LABEL, ServiceBadges } from '../../components/Badge';
import { CarPhoto } from '../../components/CarCard';
import { TextField } from '../../components/Fields';
import { Icon } from '../../components/Icon';
import { Empty, ErrorNotice, Loading } from '../../components/Notice';

const STATUSES: CarStatus[] = ['disponibile', 'a_noleggio', 'venduta', 'non_disponibile'];

function ConfirmDelete({ car, onClose, onDone }: { car: Car; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.adminDeleteCar(car.id);
      if (car.photos.length) await api.adminRemovePhotos(car.photos).catch(() => undefined);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-labelledby="del-t" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-brand-line p-0 shadow-2xl backdrop:bg-brand-navy/50">
      <div className="p-6">
        <h2 id="del-t" className="font-display text-xl font-semibold">Eliminare questa auto?</h2>
        <p className="mt-2"><strong>{car.title}</strong> verrà rimossa dal sito insieme alle sue foto. L’operazione non si può annullare.</p>
        <p className="mt-2 text-sm text-brand-muted">Se l’auto è stata venduta, di solito conviene cambiarne lo stato in “Venduta” invece di eliminarla.</p>
        {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn btn-outline" onClick={() => ref.current?.close()} disabled={busy}>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? 'Elimino…' : 'Elimina'}</button>
        </div>
      </div>
    </dialog>
  );
}

/** Cambio rapido dei prezzi, senza aprire tutta la scheda dell'auto. */
function PriceDialog({ car, onClose, onDone }: { car: Car; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const sale = car.service_type !== 'noleggio';
  const rent = car.service_type !== 'vendita';
  const text = (n: number | null) => (n === null ? '' : String(n));
  const [values, setValues] = useState({
    price: text(car.price),
    rate_day: text(car.rate_day),
    rate_week: text(car.rate_week),
    rate_month: text(car.rate_month),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const set = (k: keyof typeof values) => ({
    value: values[k],
    error: errors[k],
    inputMode: 'decimal' as const,
    onChange: (e: { target: { value: string } }) => {
      setValues({ ...values, [k]: e.target.value });
      if (errors[k]) setErrors({ ...errors, [k]: '' });
    },
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    const parsed = {} as Record<keyof typeof values, number | null>;
    for (const k of ['price', 'rate_day', 'rate_week', 'rate_month'] as const) {
      const n = parseNumber(values[k]);
      if (n === undefined) next[k] = 'Inserisci solo un numero (es. 12500).';
      else if (n !== null && n > 10_000_000) next[k] = 'Importo troppo alto.';
      else parsed[k] = n === null ? null : Math.round(n);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const prices: CarPrices = {
      price: sale ? parsed.price : null,
      rate_day: rent ? parsed.rate_day : null,
      rate_week: rent ? parsed.rate_week : null,
      rate_month: rent ? parsed.rate_month : null,
    };
    setBusy(true);
    try {
      await api.adminSetCarPrices(car.id, prices);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-labelledby="price-t" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-brand-line p-0 shadow-2xl backdrop:bg-brand-navy/50">
      <form onSubmit={save} noValidate className="space-y-4 p-6">
        <h2 id="price-t" className="font-display text-xl font-semibold">Cambia prezzo</h2>
        <p className="text-brand-muted">{car.title}</p>
        {sale && <TextField label="Prezzo di vendita (€)" hint="Lascia vuoto per mostrare “Prezzo su richiesta”." {...set('price')} />}
        {rent && (
          <>
            <TextField label="Noleggio al giorno (€)" {...set('rate_day')} />
            <TextField label="Noleggio a settimana (€)" {...set('rate_week')} />
            <TextField label="Noleggio al mese (€)" {...set('rate_month')} />
          </>
        )}
        {error && <p role="alert" className="font-semibold text-[#B42318]">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" className="btn btn-outline" onClick={() => ref.current?.close()} disabled={busy}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvo…' : 'Salva prezzo'}</button>
        </div>
      </form>
    </dialog>
  );
}

export function AdminCarsPage() {
  const cars = useAsync(() => api.adminListCars(), []);
  const [toDelete, setToDelete] = useState<Car | null>(null);
  const [toPrice, setToPrice] = useState<Car | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(car: Car, status: CarStatus) {
    setError(null);
    try {
      await api.adminSetCarStatus(car.id, status);
      cars.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Auto</h1>
        <Link to="/admin/auto/nuova" className="btn btn-primary no-underline">
          <Icon name="plus" size={18} />
          Aggiungi auto
        </Link>
      </div>

      {error && <p role="alert" className="mt-4 font-semibold text-[#B42318]">{error}</p>}

      <div className="mt-6">
        {cars.loading && !cars.data ? (
          <Loading />
        ) : cars.error ? (
          <ErrorNotice error={cars.error} onRetry={cars.reload} />
        ) : (cars.data ?? []).length === 0 ? (
          <Empty title="Non hai ancora inserito auto">Con “Aggiungi auto” puoi pubblicare la prima.</Empty>
        ) : (
          <ul className="space-y-3">
            {(cars.data ?? []).map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center gap-4 p-3">
                <CarPhoto car={c} className="h-20 w-28 shrink-0 rounded-lg" />
                <div className="min-w-48 flex-1">
                  <p className="font-display text-lg font-semibold">{c.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
                    <ServiceBadges car={c} />
                    {c.service_type !== 'noleggio' && <span>{c.price !== null ? eur(c.price) : 'Prezzo su richiesta'}</span>}
                    {c.rate_day !== null && <span>{eur(c.rate_day)}/giorno</span>}
                    <span>{c.photos.length} foto</span>
                  </p>
                </div>
                <div>
                  <label htmlFor={`st-${c.id}`} className="sr-only">Stato di {c.title}</label>
                  <select id={`st-${c.id}`} className="input !min-h-10 !py-1.5" value={c.status} onChange={(e) => changeStatus(c, e.target.value as CarStatus)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{CAR_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setToPrice(c)} aria-label={`Cambia prezzo di ${c.title}`}><Icon name="banknote" size={16} />Prezzo</button>
                  <Link to={`/admin/auto/${c.id}`} className="btn btn-outline btn-sm no-underline"><Icon name="edit" size={16} />Modifica</Link>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setToDelete(c)} aria-label={`Elimina ${c.title}`}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toPrice && (
        <PriceDialog
          car={toPrice}
          onClose={() => setToPrice(null)}
          onDone={() => {
            setToPrice(null);
            cars.reload();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDelete
          car={toDelete}
          onClose={() => setToDelete(null)}
          onDone={() => {
            setToDelete(null);
            cars.reload();
          }}
        />
      )}
    </div>
  );
}
