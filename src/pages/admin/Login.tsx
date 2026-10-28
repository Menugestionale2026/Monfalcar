import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DEMO_LOGIN } from '../../lib/api/demoData';
import { errorMessage } from '../../lib/errors';
import { usePageMeta } from '../../lib/usePageMeta';
import { Logo } from '../../components/Logo';
import { TextField } from '../../components/Fields';

export function AdminLoginPage() {
  usePageMeta('Accesso gestori', undefined, true);
  const { user, loading, offline, signIn, redeemReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const resetToken = params.get('reset');
  const redeeming = useRef(false);
  const [checkingLink, setCheckingLink] = useState(!!resetToken);
  const from = (location.state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  // Link "password dimenticata" ricevuto per email: ?reset=CODICE. Si usa una volta sola.
  useEffect(() => {
    if (!resetToken || loading || redeeming.current) return;
    redeeming.current = true;
    redeemReset(resetToken)
      .then(() => navigate('/admin/account', { replace: true }))
      .catch(() => {
        setError('Il link non è valido oppure è scaduto (dura 30 minuti e si può usare una volta sola). Chiedine uno nuovo con “Password dimenticata?”.');
        setParams({}, { replace: true });
        setCheckingLink(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, loading]);

  if (!loading && user && !checkingLink) {
    if (api.isRecoverySession()) return <Navigate to="/admin/account" replace />;
    return <Navigate to={from && from.startsWith('/admin') ? from : '/admin'} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Inserisci email e password.');
      return;
    }
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      navigate(api.isRecoverySession() ? '/admin/account' : from && from.startsWith('/admin') ? from : '/admin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Scrivi un indirizzo email valido.');
      return;
    }
    setBusy(true);
    try {
      await api.requestPasswordReset(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-mist px-4 py-10">
      <div className="card w-full max-w-md p-6 shadow-xl md:p-8">
        <Link to="/" className="no-underline"><Logo /></Link>
        <h1 className="mt-6 font-display text-2xl font-bold">Area riservata</h1>
        <p className="mt-1 text-brand-muted">Accesso per i gestori del sito.</p>
        {checkingLink && (
          <p role="status" className="mt-4 rounded-xl bg-brand-soft p-3 text-brand-ink">Controllo il link ricevuto per email…</p>
        )}
        {offline && !checkingLink && (
          <p role="alert" className="mt-4 rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-3 text-[#8A1C13]">
            Non riesco a collegarmi ai dati del sito. Controlla la connessione e ricarica la pagina.
          </p>
        )}
        {api.mode === 'demo' && (
          <div className="mt-4 rounded-xl bg-brand-yellow/40 p-4" role="note">
            <p className="text-sm font-semibold">Anteprima dimostrativa: accedi con questi dati di prova.</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="font-semibold">Email</dt>
              <dd className="break-all font-mono">{DEMO_LOGIN.email}</dd>
              <dt className="font-semibold">Password</dt>
              <dd className="font-mono">{DEMO_LOGIN.password}</dd>
            </dl>
            <button
              type="button"
              className="btn btn-primary mt-3 w-full"
              disabled={busy}
              onClick={() => {
                setEmail(DEMO_LOGIN.email);
                setPassword(DEMO_LOGIN.password);
                setError(null);
                setMode('login');
              }}
            >
              Compila i dati per me
            </button>
          </div>
        )}
        {mode === 'login' ? (
          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
            <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-3 font-semibold text-[#8A1C13]">{error}</p>}
            <button type="submit" className="btn btn-blue w-full" disabled={busy}>{busy ? 'Accesso…' : 'Accedi'}</button>
            <p className="text-sm">
              <button type="button" className="text-brand-blue underline" onClick={() => { setMode('reset'); setError(null); setResetSent(false); }}>
                Password dimenticata?
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={onReset} noValidate className="mt-5 space-y-4">
            <p className="text-brand-ink">Scrivi l’email con cui accedi: ti mandiamo un link per scegliere una nuova password.</p>
            <p className="text-sm text-brand-muted">Il link vale 30 minuti e arriva a questo indirizzo (guarda anche la posta indesiderata).</p>
            <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-3 font-semibold text-[#8A1C13]">{error}</p>}
            {resetSent && (
              <p role="status" className="rounded-xl border border-[#9AD7AE] bg-[#E8F7ED] p-3 text-[#14532D]">
                {api.mode === 'demo'
                  ? 'In anteprima non viene inviata nessuna email. Nel sito vero arriva un messaggio con il link.'
                  : 'Se l’indirizzo è abilitato, tra pochi minuti trovi un’email con il link (controlla anche la posta indesiderata).'}
              </p>
            )}
            <button type="submit" className="btn btn-blue w-full" disabled={busy}>{busy ? 'Invio…' : 'Invia il link'}</button>
            <p className="text-sm">
              <button type="button" className="text-brand-blue underline" onClick={() => { setMode('login'); setError(null); }}>
                Torna all’accesso
              </button>
            </p>
          </form>
        )}
        <p className="mt-5 text-sm">
          <Link to="/" className="text-brand-blue">← Torna al sito</Link>
        </p>
      </div>
    </main>
  );
}
