import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useBusiness } from '../lib/siteInfo';
import { errorMessage } from '../lib/errors';
import { CheckField, EMAIL_RE, Honeypot, TextAreaField, TextField, phoneOk } from './Fields';
import { SuccessNotice } from './Notice';

interface Props {
  carId?: string | null;
  carTitle?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  submitLabel?: string;
}

interface Errors {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  consent?: string;
}

/** Modulo "Richiedi informazioni": usato nella scheda auto e nella pagina Contatti. */
export function InfoRequestForm({
  carId = null,
  carTitle,
  messageLabel = 'Messaggio',
  messagePlaceholder,
  submitLabel = 'Invia richiesta',
}: Props) {
  const biz = useBusiness();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(carTitle ? `Buongiorno, vorrei informazioni su: ${carTitle}.` : '');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Inserisci il tuo nome.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Inserisci un indirizzo email valido.';
    if (phone.trim() !== '' && !phoneOk(phone)) next.phone = 'Il numero di telefono non sembra corretto.';
    if (message.trim().length < 5) next.message = 'Scrivi un breve messaggio.';
    if (!consent) next.consent = 'Per inviare la richiesta devi acconsentire al trattamento dei dati.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Campo trappola compilato: è un robot. Fingiamo che sia andato tutto bene.
    if (trap) {
      setDone(true);
      return;
    }
    setSending(true);
    try {
      await api.createInfoRequest({
        carId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        consent,
      });
      setDone(true);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <SuccessNotice title="Richiesta inviata">
        Grazie! Ti rispondiamo {biz.replyTime}. Se è urgente, chiamaci.
      </SuccessNotice>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      <TextField label="Nome e cognome" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField label="Telefono" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} hint="Facoltativo, se preferisci essere richiamato." />
      </div>
      <TextAreaField label={messageLabel} required placeholder={messagePlaceholder} value={message} onChange={(e) => setMessage(e.target.value)} error={errors.message} />
      <Honeypot value={trap} onChange={setTrap} />
      <CheckField checked={consent} onChange={(e) => setConsent(e.target.checked)} error={errors.consent}>
        Ho letto l’<Link to="/privacy" className="font-semibold text-brand-blue underline">informativa privacy</Link> e acconsento al trattamento dei miei dati per essere ricontattato.
      </CheckField>
      {sendError && (
        <p role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-3 font-semibold text-[#8A1C13]">
          {sendError}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={sending}>
        {sending ? 'Invio in corso…' : submitLabel}
      </button>
    </form>
  );
}
