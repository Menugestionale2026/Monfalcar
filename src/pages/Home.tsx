import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../lib/api';
import { business, ctaBand, strengths, testimonials } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { REASONS } from '../lib/bookingFields';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import heroPhoto from '../assets/hero.webp';
import { CarCard } from '../components/CarCard';
import { Icon } from '../components/Icon';
import { Empty, ErrorNotice, Loading } from '../components/Notice';

function Hero() {
  const biz = useBusiness();
  return (
    <section className="zone-dark relative isolate overflow-hidden bg-brand-navy text-white">
      {/* Foto della sede come sfondo; la velatura blu rende il testo sempre leggibile */}
      <img
        src={heroPhoto}
        alt=""
        aria-hidden="true"
        width={1600}
        height={1200}
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[35%_55%] lg:object-[50%_30%]"
      />
      <div className="hero-shade absolute inset-0 -z-10" aria-hidden="true" />
      <div className="container-page grid items-center gap-10 py-12 md:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow !text-brand-yellow">Officina · Auto · Noleggio</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            L’auto giusta, <span className="text-brand-yellow">curata da chi la conosce.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#E3EAF6]">
            Dalla riparazione alla vendita, dalla valutazione della tua auto al noleggio. Prenoti online in pochi
            minuti e ti rispondiamo noi.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/prenota" className="btn btn-primary no-underline">
              Prenota online
            </Link>
            <Link to="/auto" className="btn btn-outline-light no-underline">
              Vedi le auto
            </Link>
          </div>
          <p className="mt-5 text-sm text-[#D3DEF0]">
            Preferisci parlare con noi? Chiama il{' '}
            <a href={biz.phoneHref} className="font-semibold text-white underline underline-offset-2">
              {biz.phone}
            </a>
            .
          </p>
        </div>
        <div className="card p-5 text-brand-navy shadow-[0_18px_50px_rgba(0,0,0,0.30)] md:p-7">
          <h2 className="font-display text-xl font-semibold">Di cosa hai bisogno?</h2>
          <p className="mt-1 text-brand-muted">Scegli e prenota in pochi passaggi.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {REASONS.map((r) => (
              <li key={r.key}>
                <Link
                  to={`/prenota?motivo=${r.key}`}
                  className="flex h-full items-center gap-3 rounded-xl border-[1.5px] border-brand-line p-4 no-underline transition hover:border-brand-blue hover:bg-brand-mist"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-blue">
                    <Icon name={r.icon} />
                  </span>
                  <span className="font-display font-semibold leading-tight">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="container-page pt-16 md:pt-24" aria-labelledby="servizi-titolo">
      <p className="eyebrow">Cosa facciamo</p>
      <h2 id="servizi-titolo" className="h2 mt-2">
        Quattro servizi, un solo indirizzo
      </h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((r) => (
          <li key={r.key} className="card flex flex-col p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-blue">
              <Icon name={r.icon} size={26} />
            </span>
            <h3 className="mt-4 font-display text-xl font-semibold">{r.title}</h3>
            <p className="mt-2 flex-1 text-brand-muted">{r.text}</p>
            <Link to={`/prenota?motivo=${r.key}`} className="mt-4 inline-flex items-center gap-2 font-semibold text-brand-blue no-underline hover:underline">
              {r.cta}
              <Icon name="arrow" size={18} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Strengths() {
  return (
    <section className="zone-dark mt-16 bg-brand-blue text-white md:mt-24" aria-labelledby="forza-titolo">
      <div className="container-page py-14 md:py-20">
        <h2 id="forza-titolo" className="h2">
          Perché sceglierci
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {strengths.map((s) => (
            <li key={s.title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow text-brand-navy">
                <Icon name="check" size={22} strokeWidth={2.6} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[#DCE6FA]">{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type Tab = 'tutte' | 'vendita' | 'noleggio';

function Featured() {
  const cars = useAsync(() => api.listCars(), []);
  const [tab, setTab] = useState<Tab>('tutte');

  const all = (cars.data ?? []).filter((c) => c.status !== 'venduta' && c.status !== 'non_disponibile');
  const featured = all.filter((c) => c.featured);
  const pool = featured.length >= 3 ? featured : all;
  const shown = pool
    .filter((c) => tab === 'tutte' || c.service_type === tab || c.service_type === 'entrambi')
    .slice(0, 6);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'tutte', label: 'Tutte' },
    { key: 'vendita', label: 'In vendita' },
    { key: 'noleggio', label: 'A noleggio' },
  ];

  return (
    <section className="container-page pt-16 md:pt-24" aria-labelledby="auto-titolo">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Le nostre auto</p>
          <h2 id="auto-titolo" className="h2 mt-2">
            In evidenza
          </h2>
        </div>
        <Link to="/auto" className="inline-flex items-center gap-2 font-semibold text-brand-blue no-underline hover:underline">
          Tutto il catalogo
          <Icon name="arrow" size={18} />
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtra per tipo">
        {tabs.map((t) => (
          <button key={t.key} type="button" className="chip" aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {cars.loading ? (
          <Loading />
        ) : cars.error ? (
          <ErrorNotice error={cars.error} onRetry={cars.reload} />
        ) : shown.length === 0 ? (
          <Empty title="Nessuna auto in questa sezione">Torna a trovarci presto, oppure chiamaci: potremmo avere altre auto in arrivo.</Empty>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id}>
                <CarCard car={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Testimonials() {
  if (testimonials.length === 0) return null;
  return (
    <section className="container-page pt-16 md:pt-24" aria-labelledby="recensioni-titolo">
      <h2 id="recensioni-titolo" className="h2">
        Cosa dicono i clienti
      </h2>
      <ul className="mt-8 grid gap-5 md:grid-cols-3">
        {testimonials.map((t) => (
          <li key={t.name + t.quote} className="card p-6">
            <blockquote className="text-lg">“{t.quote}”</blockquote>
            <p className="mt-4 font-semibold">{t.name}</p>
            <p className="text-sm text-brand-muted">{t.service}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaBand() {
  const biz = useBusiness();
  return (
    <section className="container-page pt-16 md:pt-24">
      <div className="zone-dark rounded-3xl bg-brand-navy px-6 py-12 text-center text-white md:px-12 md:py-16">
        <h2 className="h2">{ctaBand.title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-[#C9D6EE]">{ctaBand.text}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/prenota" className="btn btn-primary no-underline">
            Prenota ora
          </Link>
          <a href={biz.phoneHref} className="btn btn-outline-light no-underline">
            <Icon name="phone" size={18} />
            Chiamaci
          </a>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  usePageMeta(null, `${business.name}: officina, vendita e acquisto di auto usate, noleggio. Prenota online.`);
  return (
    <>
      <Hero />
      <Services />
      <Strengths />
      <Featured />
      <Testimonials />
      <CtaBand />
    </>
  );
}
