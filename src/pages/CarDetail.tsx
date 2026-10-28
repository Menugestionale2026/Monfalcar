import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { business } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { eur, kmText, numberText } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import type { Car } from '../types';
import { CarStatusBadge, ServiceBadges } from '../components/Badge';
import { CarArt } from '../components/CarArt';
import { CarCard } from '../components/CarCard';
import { Icon } from '../components/Icon';
import { InfoRequestForm } from '../components/InfoRequestForm';
import { ErrorNotice, Loading } from '../components/Notice';

function Gallery({ car }: { car: Car }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [car.id]);
  const photos = car.photos;
  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-brand-soft">
        <CarArt className="w-1/2" />
      </div>
    );
  }
  const go = (d: number) => setIndex((i) => (i + d + photos.length) % photos.length);
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-brand-soft">
        <img src={api.photoUrl(photos[index], 1400)} alt={`${car.title} - foto ${index + 1} di ${photos.length}`} className="aspect-[4/3] w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto precedente" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow">
              <Icon name="chevronLeft" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Foto successiva" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-navy shadow">
              <Icon name="chevronRight" />
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, i) => (
            <li key={p} className="shrink-0">
              <button type="button" onClick={() => setIndex(i)} aria-label={`Mostra foto ${i + 1}`} aria-current={i === index} className={`block overflow-hidden rounded-lg border-2 ${i === index ? 'border-brand-blue' : 'border-transparent'}`}>
                <img src={api.photoUrl(p, 240)} alt="" loading="lazy" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Specs({ car }: { car: Car }) {
  const rows: [string, string][] = [
    ['Marca', car.brand ?? ''],
    ['Modello', car.model ?? ''],
    ['Versione', car.version ?? ''],
    ['Anno', car.year ? String(car.year) : ''],
    ['Chilometri', kmText(car.km)],
    ['Alimentazione', car.fuel ?? ''],
    ['Cambio', car.gearbox ?? ''],
    ['Potenza', car.power_kw ? `${car.power_kw} kW (${Math.round(car.power_kw * 1.36)} CV)` : ''],
    ['Carrozzeria', car.body_type ?? ''],
    ['Colore', car.color ?? ''],
    ['Porte', car.doors ? String(car.doors) : ''],
    ['Posti', car.seats ? String(car.seats) : ''],
  ];
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <section aria-labelledby="specs-t" className="mt-10">
      <h2 id="specs-t" className="font-display text-2xl font-semibold">Scheda tecnica</h2>
      <dl className="card mt-4 divide-y divide-brand-line overflow-hidden">
        {filled.map(([k, v]) => (
          <div key={k} className="grid grid-cols-2 gap-4 px-4 py-3 odd:bg-brand-mist">
            <dt className="text-brand-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CarDetailPage() {
  const biz = useBusiness();
  const { id = '' } = useParams();
  const car = useAsync(() => api.getCar(id), [id]);
  const all = useAsync(() => api.listCars(), []);
  const c = car.data;

  usePageMeta(c ? c.title : 'Auto', c ? `${c.title}${c.year ? ` del ${c.year}` : ''}${c.km !== null ? `, ${numberText(c.km)} km` : ''}. ${business.name}.` : undefined);

  if (car.loading) return <Loading />;
  if (car.error) return <div className="container-page py-12"><ErrorNotice error={car.error} onRetry={car.reload} /></div>;
  if (!c) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="h2">Auto non trovata</h1>
        <p className="mt-3 text-brand-muted">Potrebbe essere stata venduta o rimossa dal catalogo.</p>
        <Link to="/auto" className="btn btn-blue mt-6 no-underline">Torna al catalogo</Link>
      </div>
    );
  }

  const sale = c.service_type !== 'noleggio' && c.price !== null;
  const rent = c.service_type !== 'vendita' && c.rate_day !== null;
  const sold = c.status === 'venduta';
  const unavailable = sold || c.status === 'non_disponibile';
  const similar = (all.data ?? [])
    .filter((x) => x.id !== c.id && x.status !== 'venduta' && x.status !== 'non_disponibile' && (x.service_type === c.service_type || x.service_type === 'entrambi'))
    .slice(0, 3);
  const wa = biz.whatsappHref(`Buongiorno, vorrei informazioni su: ${c.title}.`);

  return (
    <div className="container-page py-8 md:py-12">
      <nav aria-label="Percorso" className="text-sm text-brand-muted">
        <Link to="/auto" className="text-brand-blue">Auto</Link> <span aria-hidden="true">/</span> <span>{c.title}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <Gallery car={c} />

        <div>
          <div className="flex flex-wrap gap-2">
            <ServiceBadges car={c} />
            <CarStatusBadge status={c.status} />
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl">{c.title}</h1>
          <p className="mt-2 text-brand-muted">
            {[c.year, c.km !== null ? kmText(c.km) : null, c.fuel, c.gearbox].filter(Boolean).join(' · ')}
          </p>

          <div className="card mt-5 p-5">
            {sale && (
              <p className={`font-display text-4xl font-bold ${sold ? 'text-brand-muted line-through' : 'text-brand-blue'}`}>{eur(c.price)}</p>
            )}
            {rent && (
              <div className={sale ? 'mt-4 border-t border-brand-line pt-4' : ''}>
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-muted">Noleggio</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                  <span><span className="font-display text-2xl font-bold text-brand-blue">{eur(c.rate_day)}</span> / giorno</span>
                  {c.rate_week !== null && <span><strong>{eur(c.rate_week)}</strong> / settimana</span>}
                  {c.rate_month !== null && <span><strong>{eur(c.rate_month)}</strong> / mese</span>}
                </p>
              </div>
            )}
            {!sale && !rent && <p className="font-display text-2xl font-bold text-brand-blue">Prezzo su richiesta</p>}
            {sold && <p className="mt-3 font-semibold">Questa auto è stata venduta. <Link to="/auto" className="text-brand-blue">Guarda le altre.</Link></p>}
          </div>

          {!unavailable && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {c.service_type !== 'noleggio' && (
                <Link to={`/prenota?motivo=test-drive&auto=${c.id}`} className="btn btn-primary no-underline">
                  <Icon name="calendar" size={18} />
                  Prenota test drive
                </Link>
              )}
              {c.service_type !== 'vendita' && (
                <Link to={`/prenota?motivo=noleggio&auto=${c.id}`} className="btn btn-primary no-underline">
                  <Icon name="key" size={18} />
                  Chiedi disponibilità noleggio
                </Link>
              )}
              <button type="button" className="btn btn-outline" onClick={() => document.getElementById('info')?.scrollIntoView({ behavior: 'smooth' })}>
                Richiedi informazioni
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-[15px]">
            <a href={biz.phoneHref} className="inline-flex items-center gap-2 font-semibold text-brand-blue no-underline hover:underline">
              <Icon name="phone" size={18} /> {biz.phone}
            </a>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-brand-blue no-underline hover:underline">
              <Icon name="chat" size={18} /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {c.description && (
            <section aria-labelledby="desc-t">
              <h2 id="desc-t" className="font-display text-2xl font-semibold">Descrizione</h2>
              <p className="mt-3 whitespace-pre-line text-lg text-brand-ink">{c.description}</p>
            </section>
          )}
          {c.features.length > 0 && (
            <section aria-labelledby="feat-t" className="mt-10">
              <h2 id="feat-t" className="font-display text-2xl font-semibold">Dotazioni</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {c.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Icon name="check" size={20} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-blue" />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Specs car={c} />
        </div>

        <section id="info" aria-labelledby="info-t" className="card h-fit scroll-mt-28 p-5 md:p-6">
          <h2 id="info-t" className="font-display text-xl font-semibold">Richiedi informazioni</h2>
          <p className="mb-4 mt-1 text-brand-muted">Ti rispondiamo {biz.replyTime}.</p>
          <InfoRequestForm carId={c.id} carTitle={c.title} />
        </section>
      </div>

      {similar.length > 0 && (
        <section className="mt-16" aria-labelledby="sim-t">
          <h2 id="sim-t" className="h2">Potrebbero interessarti</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <li key={s.id}><CarCard car={s} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
