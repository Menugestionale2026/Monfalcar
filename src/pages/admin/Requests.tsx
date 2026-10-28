import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { dateShort, timeHM } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import { Icon } from '../../components/Icon';
import { Empty, ErrorNotice, Loading } from '../../components/Notice';

export function AdminRequestsPage() {
  const requests = useAsync(() => api.adminListRequests(), []);
  const [onlyNew, setOnlyNew] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string, handled: boolean) {
    setError(null);
    try {
      await api.adminSetRequestHandled(id, handled);
      requests.reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const all = requests.data ?? [];
  const list = all.filter((r) => !onlyNew || !r.handled).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Richieste di informazioni</h1>
      <label className="mt-4 inline-flex items-center gap-2">
        <input type="checkbox" className="h-5 w-5 accent-[#01427F]" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
        Mostra solo quelle da gestire
      </label>
      {error && <p role="alert" className="mt-3 font-semibold text-[#B42318]">{error}</p>}

      <div className="mt-5">
        {requests.loading && !requests.data ? (
          <Loading />
        ) : requests.error ? (
          <ErrorNotice error={requests.error} onRetry={requests.reload} />
        ) : list.length === 0 ? (
          <Empty title={onlyNew ? 'Nessuna richiesta da gestire' : 'Nessuna richiesta'}>Le richieste dalle schede auto e dalla pagina Contatti arrivano qui.</Empty>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => {
              const wa = (r.phone ?? '').replace(/[^\d]/g, '');
              return (
                <li key={r.id} className={`card p-4 ${r.handled ? 'opacity-70' : 'border-2 border-brand-yellow'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-semibold">{r.name}</p>
                      <p className="text-sm text-brand-muted">
                        {dateShort(r.created_at)} {timeHM(r.created_at)}
                        {r.car_title && (
                          <> · su {r.car_id ? <Link to={`/auto/${r.car_id}`} className="text-brand-blue">{r.car_title}</Link> : r.car_title}</>
                        )}
                      </p>
                    </div>
                    <button type="button" className={`btn btn-sm ${r.handled ? 'btn-outline' : 'btn-blue'}`} onClick={() => toggle(r.id, !r.handled)}>
                      {r.handled ? 'Riporta da gestire' : <><Icon name="check" size={16} strokeWidth={2.4} />Segna come gestita</>}
                    </button>
                  </div>
                  {r.message && <p className="mt-3 whitespace-pre-line break-words">{r.message}</p>}
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1.5 break-all text-brand-blue"><Icon name="mail" size={16} />{r.email}</a>
                    {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 text-brand-blue"><Icon name="phone" size={16} />{r.phone}</a>}
                    {wa.length >= 6 && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-blue"><Icon name="chat" size={16} />WhatsApp</a>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
