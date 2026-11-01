import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { business, legal } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { hoursSummary } from '../lib/hours';
import { useAsync } from '../lib/useAsync';
import { Icon } from './Icon';
import { Logo } from './Logo';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/servizi', label: 'Servizi' },
  { to: '/auto', label: 'Auto' },
  { to: '/prenota', label: 'Prenota' },
  { to: '/contatti', label: 'Contatti' },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-[15px] font-medium no-underline transition-colors ${
    isActive ? 'bg-brand-soft text-brand-blue' : 'text-brand-navy hover:bg-brand-mist'
  }`;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function DemoBanner() {
  const [open, setOpen] = useState(false);
  if (api.mode !== 'demo') return null;
  return (
    <div className="bg-brand-yellow px-4 py-2 text-center text-sm text-brand-navy" role="note">
      <p className="font-semibold">
        Anteprima dimostrativa: auto, prenotazioni e contatti sono di esempio.{' '}
        <Link to="/admin/login" className="underline">Prova l’area gestori</Link>
        {' · '}
        <button type="button" className="font-semibold underline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Chiudi la guida' : 'Come provarla'}
        </button>
      </p>
      {open && (
        <ol className="mx-auto mt-2 max-w-2xl list-decimal space-y-1 pl-5 text-left">
          <li>Come cliente: sfoglia le auto, prova i filtri e prenota un appuntamento (menu Prenota).</li>
          <li>Come gestore: apri “Prova l’area gestori”, accedi con i dati di prova scritti nella pagina e, in Prenotazioni, accetta o rifiuta la richiesta appena fatta.</li>
          <li>Sempre nell’area gestori: aggiungi un’auto con le foto, cambia un prezzo dall’elenco (pulsante Prezzo), imposta orari e chiusure e inserisci telefono e indirizzo in “Dati dell’attività”.</li>
          <li>In anteprima nessuna email parte davvero e, ricaricando la pagina, tutto torna come all’inizio.</li>
        </ol>
      )}
    </div>
  );
}

function TopBar() {
  const biz = useBusiness();
  const hours = useAsync(() => api.getOpeningHours(), []);
  const summary = hours.data ? hoursSummary(hours.data) : '';
  return (
    <div className="zone-dark hidden bg-brand-navy text-sm text-white md:block">
      <div className="container-page flex items-center justify-between py-2">
        <div className="flex items-center gap-5">
          <a href={biz.phoneHref} className="inline-flex items-center gap-2 text-white no-underline hover:underline">
            <Icon name="phone" size={16} />
            {biz.phone}
          </a>
          {summary && (
            <span className="inline-flex items-center gap-2">
              <Icon name="clock" size={16} />
              {summary}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-2">
          <Icon name="pin" size={16} />
          {biz.address}, {biz.city}
        </span>
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 border-b border-brand-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between md:h-[72px]">
        <Link to="/" aria-label={`${business.name} - Home`} className="no-underline">
          <Logo />
        </Link>
        <nav aria-label="Principale" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/prenota" className="btn btn-primary hidden no-underline sm:inline-flex">
            Prenota
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-brand-line lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? 'Chiudi menu' : 'Apri menu'}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-mobile" aria-label="Menu mobile" className="border-t border-brand-line bg-white lg:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={navClass}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const biz = useBusiness();
  const hours = useAsync(() => api.getOpeningHours(), []);
  const summary = hours.data ? hoursSummary(hours.data) : '';
  return (
    <footer className="zone-dark mt-20 bg-brand-navy pb-24 pt-14 text-white md:pb-14">
      <div className="container-page grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo light />
          <p className="mt-4 max-w-xs text-[15px] text-[#C9D6EE]">{business.tagline}</p>
        </div>
        <div>
          <h2 className="font-display text-base font-semibold">Il sito</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-[#C9D6EE] no-underline hover:text-white hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/privacy" className="text-[#C9D6EE] no-underline hover:text-white hover:underline">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base font-semibold">Contatti</h2>
          <ul className="mt-3 space-y-2 text-[15px] text-[#C9D6EE]">
            <li>
              <a href={biz.phoneHref} className="text-[#C9D6EE] no-underline hover:text-white hover:underline">
                {biz.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${biz.email}`} className="text-[#C9D6EE] no-underline hover:text-white hover:underline">
                {biz.email}
              </a>
            </li>
            <li>
              {biz.address}
              <br />
              {biz.city}
            </li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-base font-semibold">Orari</h2>
          <p className="mt-3 text-[15px] text-[#C9D6EE]">{summary || 'Vedi la pagina Contatti'}</p>
          <Link to="/contatti" className="mt-2 inline-block text-[15px] font-semibold text-brand-yellow no-underline hover:underline">
            Tutti gli orari
          </Link>
        </div>
      </div>
      <div className="container-page mt-10 border-t border-white/15 pt-6 text-sm leading-relaxed text-[#C9D6EE]">
        <p>
          © {new Date().getFullYear()} {legal.companyName}
        </p>
        <p className="mt-1">
          Sede legale: {legal.seat} · {biz.vat} · REA {legal.rea} ({legal.registryOffice}) · PEC{' '}
          <a href={`mailto:${legal.pec}`} className="text-[#C9D6EE] underline hover:text-white">
            {legal.pec}
          </a>
        </p>
      </div>
    </footer>
  );
}

function MobileBar() {
  const biz = useBusiness();
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-brand-line bg-white p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_16px_rgba(11,42,91,0.12)] md:hidden"
      role="region"
      aria-label="Azioni rapide"
    >
      <a href={biz.phoneHref} className="btn btn-outline btn-sm flex-col gap-0.5 !px-1 no-underline">
        <Icon name="phone" size={18} />
        Chiama
      </a>
      <a href={biz.whatsappHref('Buongiorno, vorrei informazioni.')} className="btn btn-outline btn-sm flex-col gap-0.5 !px-1 no-underline" target="_blank" rel="noopener noreferrer">
        <Icon name="chat" size={18} />
        WhatsApp
      </a>
      <Link to="/prenota" className="btn btn-primary btn-sm flex-col gap-0.5 !px-1 no-underline">
        <Icon name="calendar" size={18} />
        Prenota
      </Link>
    </div>
  );
}

export function SiteLayout() {
  return (
    <>
      <button
        type="button"
        onClick={() => document.getElementById('contenuto')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-yellow focus:px-4 focus:py-2 focus:font-semibold"
      >
        Vai al contenuto
      </button>
      <DemoBanner />
      <TopBar />
      <Header />
      <main id="contenuto" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
