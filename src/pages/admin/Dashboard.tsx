import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { addDaysKey, dayKey, todayKey } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { useSavedSiteInfo } from '../../lib/siteInfo';
import { BookingItem } from '../../components/admin/BookingItem';
import { Empty, ErrorNotice, Loading } from '../../components/Notice';
import { useAdminContext } from './AdminLayout';

function Stat({ label, value, to, accent = false }: { label: string; value: number; to: string; accent?: boolean }) {
  return (
    <Link to={to} className={`card block p-5 no-underline transition hover:shadow-md ${accent && value > 0 ? 'border-2 border-brand-yellow bg-[#FFF8E1]' : ''}`}>
      <p className="font-display text-4xl font-bold text-brand-blue">{value}</p>
      <p className="mt-1 font-medium text-brand-ink">{label}</p>
    </Link>
  );
}

export function AdminDashboardPage() {
  const { refreshCounts } = useAdminContext();
  const bookings = useAsync(() => api.adminListBookings(), []);
  const requests = useAsync(() => api.adminListRequests(), []);
  const siteInfo = useSavedSiteInfo();

  if ((bookings.loading && !bookings.data) || (requests.loading && !requests.data)) return <Loading />;
  if (bookings.error) return <ErrorNotice error={bookings.error} onRetry={bookings.reload} />;
  if (requests.error) return <ErrorNotice error={requests.error} onRetry={requests.reload} />;

  const all = bookings.data ?? [];
  const today = todayKey();
  const weekEnd = addDaysKey(today, 7);
  const pending = all.filter((b) => b.status === 'in_attesa').sort((a, b) => a.start_at.localeCompare(b.start_at));
  const confirmed = all.filter((b) => b.status === 'confermata');
  const todayCount = confirmed.filter((b) => dayKey(b.start_at) === today).length;
  const weekCount = confirmed.filter((b) => {
    const d = dayKey(b.start_at);
    return d >= today && d <= weekEnd;
  }).length;
  const newRequests = (requests.data ?? []).filter((r) => !r.handled).length;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Riepilogo</h1>
      {(!siteInfo?.phone.trim() || !siteInfo.address.trim()) && (
        <p className="mt-4 rounded-xl border-2 border-brand-yellow bg-[#FFF8E1] p-4" role="note">
          Il sito mostra ancora telefono o indirizzo provvisori.{' '}
          <Link to="/admin/attivita" className="font-semibold text-brand-blue">Inserisci i dati dell’attività</Link>
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Prenotazioni da gestire" value={pending.length} to="/admin/prenotazioni" accent />
        <Stat label="Appuntamenti di oggi" value={todayCount} to="/admin/prenotazioni" />
        <Stat label="Prossimi 7 giorni" value={weekCount} to="/admin/prenotazioni" />
        <Stat label="Richieste da leggere" value={newRequests} to="/admin/richieste" accent />
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold">Da gestire</h2>
      <div className="mt-4 space-y-4">
        {pending.length === 0 ? (
          <Empty title="Nessuna prenotazione in attesa">Quando un cliente prenota la vedrai qui.</Empty>
        ) : (
          pending.map((b) => (
            <BookingItem
              key={b.id}
              booking={b}
              onChanged={() => {
                bookings.reload();
                refreshCounts();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
