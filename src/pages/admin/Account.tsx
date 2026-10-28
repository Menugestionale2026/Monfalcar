import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { errorMessage } from '../../lib/errors';
import { TextField } from '../../components/Fields';
import { Icon } from '../../components/Icon';

const MIN_LENGTH = 8;

/** Cambio password del gestore che ha fatto l'accesso. */
export function AdminAccountPage() {
  const { user } = useAuth();
  const [recovery, setRecovery] = useState(() => api.isRecoverySession());
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    setDone(false);
    const problems: Record<string, string> = {};
    if (!recovery && !current) problems.current = 'Inserisci la password che usi adesso.';
    if (next.length < MIN_LENGTH) problems.next = `Usa almeno ${MIN_LENGTH} caratteri.`;
    else if (!recovery && next === current) problems.next = 'La nuova password deve essere diversa da quella attuale.';
    if (again !== next) problems.again = 'Le due password non coincidono.';
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    try {
      await api.adminChangePassword(recovery ? null : current, next);
      setCurrent('');
      setNext('');
      setAgain('');
      setRecovery(false);
      setDone(true);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const clear = (k: string) => setErrors((x) => ({ ...x, [k]: '' }));

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <p className="mt-2 text-brand-muted">
        Hai effettuato l’accesso come <strong className="text-brand-navy">{user?.email}</strong>.
      </p>

      <form onSubmit={onSubmit} noValidate className="card mt-6 space-y-4 p-5" aria-labelledby="pw-title">
        <h2 id="pw-title" className="font-display text-xl font-semibold">{recovery ? 'Scegli una nuova password' : 'Cambia password'}</h2>
        {recovery && (
          <p className="rounded-xl bg-brand-soft p-3 text-brand-ink" role="note">
            Sei entrato con una password provvisoria o dal link ricevuto per email: scegli qui la tua nuova password.
          </p>
        )}
        {/* Il campo nascosto aiuta il gestore password del browser a collegare la nuova password all'account */}
        <input type="text" name="username" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
        {!recovery && (
          <TextField
            label="Password attuale"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            error={errors.current}
            onChange={(e) => { setCurrent(e.target.value); setDone(false); clear('current'); }}
          />
        )}
        <TextField
          label="Nuova password"
          type="password"
          autoComplete="new-password"
          required
          hint={`Almeno ${MIN_LENGTH} caratteri. Meglio una frase facile da ricordare che una parola sola.`}
          value={next}
          error={errors.next}
          onChange={(e) => { setNext(e.target.value); setDone(false); clear('next'); }}
        />
        <TextField
          label="Ripeti la nuova password"
          type="password"
          autoComplete="new-password"
          required
          value={again}
          error={errors.again}
          onChange={(e) => { setAgain(e.target.value); setDone(false); clear('again'); }}
        />
        {sendError && <p role="alert" className="font-semibold text-[#B42318]">{sendError}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvo…' : 'Salva la nuova password'}</button>
          <span role="status" className={`inline-flex items-center gap-1 font-semibold text-[#14532D] ${done ? '' : 'invisible'}`}>
            <Icon name="check" size={18} strokeWidth={2.6} /> Password aggiornata
          </span>
        </div>
      </form>

      <p className="mt-6 text-sm text-brand-muted">
        Se dimentichi la password, dalla pagina di accesso usa “Password dimenticata?”: ti arriva un’email con il link per sceglierne una nuova.
        Per aggiungere un’altra persona o togliere un accesso apri il Foglio Google dell’attività e usa il menu MONFALCAR in alto.
      </p>
    </div>
  );
}
