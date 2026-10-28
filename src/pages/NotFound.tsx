import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/usePageMeta';

export function NotFoundPage() {
  usePageMeta('Pagina non trovata', undefined, true);
  return (
    <div className="container-page py-20 text-center">
      <p className="eyebrow">Errore 404</p>
      <h1 className="h2 mt-2">Questa pagina non esiste</h1>
      <p className="mt-3 text-brand-muted">Il link potrebbe essere vecchio o digitato male.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-blue no-underline">Vai alla Home</Link>
        <Link to="/auto" className="btn btn-outline no-underline">Vedi le auto</Link>
      </div>
    </div>
  );
}
