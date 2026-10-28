import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { MAX_RECIPIENTS, checkRecipients } from '../../lib/recipients';
import { useAsync } from '../../lib/useAsync';
import { CheckField, TextAreaField } from '../../components/Fields';
import { Icon } from '../../components/Icon';
import { ErrorNotice, Loading } from '../../components/Notice';

const CUSTOMER_MAILS = [
  ['Richiesta ricevuta', 'subito dopo che il cliente prenota o scrive dal sito'],
  ['Appuntamento confermato', 'quando premi “Accetta e invia conferma”'],
  ['Richiesta non confermata', 'quando premi “Rifiuta”, con il motivo che hai scelto'],
  ['Promemoria', 'il giorno prima dell’appuntamento'],
];

/** A chi arrivano gli avvisi email per prenotazioni e richieste di informazioni. */
export function AdminNotificationsPage() {
  const saved = useAsync(() => api.adminGetNotifications(), []);
  const [emails, setEmails] = useState('');
  const [onBooking, setOnBooking] = useState(true);
  const [onRequest, setOnRequest] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (saved.data) {
      setEmails(saved.data.emails);
      setOnBooking(saved.data.on_booking);
      setOnRequest(saved.data.on_request);
    }
  }, [saved.data]);

  const touch = () => {
    setDone(null);
    setSendError(null);
  };

  /** Controlla gli indirizzi scritti; restituisce quelli validi oppure null se c'è un errore da mostrare. */
  function validate(): string[] | null {
    const { valid, invalid } = checkRecipients(emails);
    if (invalid.length > 0) {
      setError(`Non sembra un indirizzo email valido: ${invalid.join(', ')}.`);
      return null;
    }
    if (valid.length > MAX_RECIPIENTS) {
      setError(`Puoi indicare al massimo ${MAX_RECIPIENTS} indirizzi.`);
      return null;
    }
    setError(null);
    return valid;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setDone(null);
    setSendError(null);
    const valid = validate();
    if (!valid) return;
    setBusy('save');
    try {
      await api.adminSaveNotifications({ emails: valid.join(', '), on_booking: onBooking, on_request: onRequest });
      setEmails(valid.join(', '));
      setDone('Salvato');
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onTest() {
    setDone(null);
    setSendError(null);
    const valid = validate();
    if (!valid) return;
    setBusy('test');
    try {
      const { sent } = await api.adminSendTestEmail(valid);
      setDone(
        api.mode === 'demo'
          ? 'In anteprima non parte nessuna email: sul sito vero arriva un messaggio di prova.'
          : `Email di prova inviata a ${sent === 1 ? 'un indirizzo' : `${sent} indirizzi`}: controlla la posta, anche tra la posta indesiderata.`,
      );
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (saved.loading && !saved.data) return <Loading />;
  if (saved.error) return <ErrorNotice error={saved.error} onRetry={saved.reload} />;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Notifiche email</h1>
      <p className="mt-2 text-brand-muted">
        Quando un cliente prenota o scrive dal sito, vi arriva un’email. Qui scegli chi la riceve e per cosa.
      </p>

      <form onSubmit={onSave} noValidate className="card mt-6 space-y-4 p-5" aria-labelledby="n-avvisi">
        <h2 id="n-avvisi" className="font-display text-xl font-semibold">Avvisi per voi</h2>
        <TextAreaField
          label="Indirizzi email che ricevono gli avvisi"
          rows={3}
          autoComplete="off"
          placeholder="officina@esempio.it, titolare@esempio.it"
          hint={`Fino a ${MAX_RECIPIENTS} indirizzi, separati da virgola o a capo. Rispondendo a un avviso scrivi direttamente al cliente. Se lo lasci vuoto gli avvisi arrivano alla Gmail dell’account Google dell’attività.`}
          value={emails}
          error={error}
          onChange={(e) => {
            setEmails(e.target.value);
            setError(null);
            touch();
          }}
        />
        <fieldset className="space-y-2">
          <legend className="label">Avvisami quando</legend>
          <CheckField
            checked={onBooking}
            onChange={(e) => {
              setOnBooking(e.target.checked);
              touch();
            }}
          >
            un cliente prenota (appuntamento, test drive, valutazione, noleggio)
          </CheckField>
          <CheckField
            checked={onRequest}
            onChange={(e) => {
              setOnRequest(e.target.checked);
              touch();
            }}
          >
            un cliente invia una richiesta di informazioni (scheda auto o Contatti)
          </CheckField>
        </fieldset>
        {sendError && <p role="alert" className="font-semibold text-[#B42318]">{sendError}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>{busy === 'save' ? 'Salvo…' : 'Salva'}</button>
          <button type="button" className="btn btn-outline" onClick={onTest} disabled={busy !== null}>
            <Icon name="mail" size={18} />
            {busy === 'test' ? 'Invio…' : 'Invia email di prova'}
          </button>
        </div>
        <p role="status" className={`flex items-start gap-1 font-semibold text-[#14532D] ${done ? '' : 'hidden'}`}>
          <Icon name="check" size={18} strokeWidth={2.6} className="mt-0.5 shrink-0" /> <span>{done}</span>
        </p>
        <p className="text-sm text-brand-muted">
          L’email di prova va agli indirizzi scritti qui sopra, anche se non li hai ancora salvati. Le email partono dall’account
          Google dell’attività: se non arriva, guarda anche nella posta indesiderata e nel “Registro email” del Foglio Google.
        </p>
      </form>

      <section className="card mt-6 p-5" aria-labelledby="n-clienti">
        <h2 id="n-clienti" className="font-display text-xl font-semibold">Email automatiche per i clienti</h2>
        <p className="mt-1 text-brand-muted">Partono da sole, non serve fare nulla.</p>
        <ul className="mt-3 divide-y divide-brand-line">
          {CUSTOMER_MAILS.map(([title, when]) => (
            <li key={title} className="flex items-start gap-3 py-2.5">
              <Icon name="check" size={18} strokeWidth={2.4} className="mt-1 shrink-0 text-brand-blue" />
              <span>
                <strong>{title}</strong>: {when}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-brand-muted">
          Per gli appuntamenti in officina le email ricordano che serve a vedere l’auto e che giorno e tempi del lavoro si
          concordano dopo. Se il cliente risponde a una di queste email, la risposta arriva al primo indirizzo della lista.
        </p>
      </section>
    </div>
  );
}
