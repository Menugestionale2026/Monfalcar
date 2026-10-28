import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useAsync } from '../../lib/useAsync';
import { ADMIN_NOTICE_EVENT } from '../../lib/notices';
import { usePageMeta } from '../../lib/usePageMeta';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Logo } from '../../components/Logo';

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/admin', label: 'Riepilogo', icon: 'dashboard', end: true },
  { to: '/admin/prenotazioni', label: 'Prenotazioni', icon: 'calendar' },
  { to: '/admin/auto', label: 'Auto', icon: 'car' },
  { to: '/admin/richieste', label: 'Richieste', icon: 'inbox' },
  { to: '/admin/orari', label: 'Orari e chiusure', icon: 'clock' },
  { to: '/admin/attivita', label: 'Dati dell’attività', icon: 'pin' },
  { to: '/admin/notifiche', label: 'Notifiche', icon: 'mail' },
  { to: '/admin/account', label: 'Account', icon: 'key' },
];

interface AdminContext {
  /** Aggiorna il contatore delle prenotazioni da gestire nel menu. */
  refreshCounts: () => void;
}

export function useAdminContext(): AdminContext {
  return useOutletContext<AdminContext>();
}

export function AdminLayout() {
  usePageMeta('Area riservata', undefined, true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<string[]>([]);
  useEffect(() => {
    const onNotice = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (text) setNotices((n) => [...n.filter((x) => x !== text), text].slice(-3));
    };
    window.addEventListener(ADMIN_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(ADMIN_NOTICE_EVENT, onNotice);
  }, []);
  // Contatore delle prenotazioni da gestire, mostrato accanto alla voce di menu
  const bookings = useAsync(() => api.adminListBookings(), []);
  const pending = (bookings.data ?? []).filter((b) => b.status === 'in_attesa').length;

  async function logout() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  const link = ({ isActive }: { isActive: boolean }) =>
    `relative inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 font-medium no-underline whitespace-nowrap ${
      isActive ? 'bg-brand-soft text-brand-blue' : 'text-brand-navy hover:bg-brand-mist'
    }`;

  return (
    <div className="min-h-screen bg-brand-mist">
      {api.mode === 'demo' && (
        <div className="bg-brand-yellow px-4 py-1.5 text-center text-sm font-semibold" role="note">
          Anteprima dimostrativa: le modifiche restano solo in questa pagina e si perdono ricaricando.
        </div>
      )}
      <header className="border-b border-brand-line bg-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Logo size={28} />
            <span className="rounded-full bg-brand-navy px-2.5 py-1 text-xs font-semibold text-white">Gestione</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-brand-blue">Vedi il sito</Link>
            <span className="hidden text-brand-muted sm:inline">{user?.email}</span>
            <button type="button" onClick={logout} className="btn btn-outline btn-sm">
              <Icon name="logout" size={16} />
              Esci
            </button>
          </div>
        </div>
        <nav aria-label="Area riservata" className="container-page flex gap-1 overflow-x-auto pb-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={link}>
              <Icon name={n.icon} size={18} />
              {n.label}
              {n.to === '/admin/prenotazioni' && pending > 0 && (
                <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-bold text-brand-navy" aria-label={`${pending} da gestire`}>{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="container-page py-8">
        <Outlet context={{ refreshCounts: bookings.reload } satisfies AdminContext} />
      </main>
      {notices.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 space-y-2 p-3 sm:left-auto sm:max-w-md" role="alert">
          {notices.map((n) => (
            <div key={n} className="flex items-start gap-3 rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-4 text-[#8A1C13] shadow-xl">
              <p className="flex-1 font-semibold">{n}</p>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setNotices((x) => x.filter((y) => y !== n))}>
                Ho capito
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
