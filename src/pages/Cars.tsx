import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { business } from '../config/business';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import type { Car } from '../types';
import { CarCard } from '../components/CarCard';
import { Empty, ErrorNotice, Loading } from '../components/Notice';

type Kind = 'tutte' | 'vendita' | 'noleggio';
type Sort = 'recenti' | 'prezzo-asc' | 'prezzo-desc' | 'km-asc' | 'anno-desc';

const KINDS: { key: Kind; label: string }[] = [
  { key: 'tutte', label: 'Tutte' },
  { key: 'vendita', label: 'In vendita' },
  { key: 'noleggio', label: 'A noleggio' },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: 'recenti', label: 'Più recenti inserite' },
  { key: 'prezzo-asc', label: 'Prezzo: dal più basso' },
  { key: 'prezzo-desc', label: 'Prezzo: dal più alto' },
  { key: 'km-asc', label: 'Meno chilometri' },
  { key: 'anno-desc', label: 'Anno: più recente' },
];

function num(v: string | null): number | null {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Prezzo usato per filtrare e ordinare: tariffa giornaliera nella vista noleggio, prezzo di vendita altrove. */
function refPrice(car: Car, kind: Kind): number | null {
  return kind === 'noleggio' ? car.rate_day : car.price;
}

/** Differenza sicura tra due prezzi: le auto senza prezzo finiscono in fondo. */
function diff(a: number | null, b: number | null, desc: boolean): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return desc ? b - a : a - b;
}

export function CarsPage() {
  usePageMeta('Auto', `Auto usate in vendita e a noleggio da ${business.name}. Filtra per prezzo, alimentazione, anno e chilometri.`);
  const [params, setParams] = useSearchParams();
  const cars = useAsync(() => api.listCars(), []);

  const kind = (KINDS.find((k) => k.key === params.get('servizio'))?.key ?? 'tutte') as Kind;
  const fuel = params.get('alimentazione') ?? '';
  const maxPrice = num(params.get('prezzo'));
  const minYear = num(params.get('anno'));
  const maxKm = num(params.get('km'));
  const sort = (SORTS.find((s) => s.key === params.get('ordine'))?.key ?? 'recenti') as Sort;

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === 'tutte' || (key === 'ordine' && value === 'recenti')) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };
  const reset = () => setParams({}, { replace: true });

  const all = cars.data ?? [];
  const fuels = useMemo(() => [...new Set(all.map((c) => c.fuel).filter((f): f is string => !!f))].sort(), [all]);
  const years = useMemo(() => {
    const ys = all.map((c) => c.year).filter((y): y is number => y !== null);
    return ys.length ? { min: Math.min(...ys), max: Math.max(...ys) } : null;
  }, [all]);

  const filtered = useMemo(() => {
    const list = all.filter((c) => {
      if (c.status === 'non_disponibile') return false;
      if (kind === 'vendita' && c.service_type === 'noleggio') return false;
      if (kind === 'noleggio' && c.service_type === 'vendita') return false;
      if (fuel && c.fuel !== fuel) return false;
      if (maxPrice !== null) {
        const p = refPrice(c, kind);
        if (p === null || p > maxPrice) return false;
      }
      if (minYear !== null && (c.year === null || c.year < minYear)) return false;
      if (maxKm !== null && (c.km === null || c.km > maxKm)) return false;
      return true;
    });
    const cmp = (a: Car, b: Car): number => {
      switch (sort) {
        case 'prezzo-asc':
          return diff(refPrice(a, kind), refPrice(b, kind), false);
        case 'prezzo-desc':
          return diff(refPrice(a, kind), refPrice(b, kind), true);
        case 'km-asc':
          return diff(a.km, b.km, false);
        case 'anno-desc':
          return (b.year ?? 0) - (a.year ?? 0);
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    };
    // Le auto vendute vanno in fondo, con il loro cartellino.
    return [...list].sort((a, b) => {
      const sa = a.status === 'venduta' ? 1 : 0;
      const sb = b.status === 'venduta' ? 1 : 0;
      return sa - sb || cmp(a, b);
    });
  }, [all, kind, fuel, maxPrice, minYear, maxKm, sort]);

  const hasFilters = kind !== 'tutte' || fuel || maxPrice !== null || minYear !== null || maxKm !== null;
  const priceLabel = kind === 'noleggio' ? 'Tariffa giornaliera massima (€)' : 'Prezzo di vendita massimo (€)';

  return (
    <div className="container-page py-12 md:py-16">
      <p className="eyebrow">Catalogo</p>
      <h1 className="h2 mt-2">Le nostre auto</h1>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Tipo di offerta">
        {KINDS.map((k) => (
          <button key={k.key} type="button" className="chip" aria-pressed={kind === k.key} onClick={() => set('servizio', k.key)}>
            {k.label}
          </button>
        ))}
      </div>

      <form className="card mt-5 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="Filtri">
        <div>
          <label htmlFor="f-fuel" className="label">Alimentazione</label>
          <select id="f-fuel" className="input" value={fuel} onChange={(e) => set('alimentazione', e.target.value)}>
            <option value="">Tutte</option>
            {fuels.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-price" className="label">{priceLabel}</label>
          <input id="f-price" className="input" inputMode="numeric" type="number" min={0} step={500} placeholder="Nessun limite" value={params.get('prezzo') ?? ''} onChange={(e) => set('prezzo', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-year" className="label">Anno da</label>
          <input id="f-year" className="input" inputMode="numeric" type="number" min={1990} max={new Date().getFullYear()} placeholder={years ? String(years.min) : 'Qualsiasi'} value={params.get('anno') ?? ''} onChange={(e) => set('anno', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-km" className="label">Chilometri massimi</label>
          <input id="f-km" className="input" inputMode="numeric" type="number" min={0} step={5000} placeholder="Nessun limite" value={params.get('km') ?? ''} onChange={(e) => set('km', e.target.value)} />
        </div>
        <div>
          <label htmlFor="f-sort" className="label">Ordina per</label>
          <select id="f-sort" className="input" value={sort} onChange={(e) => set('ordine', e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-live="polite">
        <p className="text-brand-muted">
          {cars.loading ? 'Caricamento…' : filtered.length === 1 ? '1 auto trovata' : `${filtered.length} auto trovate`}
        </p>
        {hasFilters && (
          <button type="button" className="font-semibold text-brand-blue underline" onClick={reset}>
            Azzera i filtri
          </button>
        )}
      </div>

      <div className="mt-4">
        {cars.loading ? (
          <Loading />
        ) : cars.error ? (
          <ErrorNotice error={cars.error} onRetry={cars.reload} />
        ) : filtered.length === 0 ? (
          <Empty title="Nessuna auto corrisponde ai filtri">
            Prova ad allargare la ricerca, oppure{' '}
            <Link to="/contatti" className="font-semibold text-brand-blue">
              contattaci
            </Link>
            : possiamo cercare l’auto che ti serve.
          </Empty>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <li key={c.id}>
                <CarCard car={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
