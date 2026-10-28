import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { business } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { DETAIL_FIELDS, DETAIL_LABELS, REASONS, SLOT_INTRO, isReasonKey, serviceForReason } from '../lib/bookingFields';
import type { ReasonKey } from '../lib/bookingFields';
import { errorMessage, ApiError } from '../lib/errors';
import { WEEKDAYS_LONG, addDaysKey, dateLong, dateShort, timeHM, todayKey, weekdayOf } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { CheckField, EMAIL_RE, Honeypot, SelectField, TextAreaField, TextField, phoneOk } from '../components/Fields';
import { Icon } from '../components/Icon';
import { ErrorNotice, Loading, SuccessNotice } from '../components/Notice';

const STEPS = ['Motivo', 'Dettagli', 'Giorno e ora', 'I tuoi dati'] as const;
const MAX_DAYS_AHEAD = 60;

interface Summary {
  reason: string;
  when: string;
  email: string;
  /** Spiegazione aggiuntiva per il motivo scelto (es. officina) */
  extra: string | null;
}

export function BookingPage() {
  const biz = useBusiness();
  usePageMeta('Prenota', `Prenota online da ${business.name}: officina, valutazione auto, test drive, noleggio.`);
  const [params] = useSearchParams();
  const motivoParam = params.get('motivo');
  const autoParam = params.get('auto');

  const services = useAsync(() => api.listServices(), []);
  const cars = useAsync(() => api.listCars(), []);

  const [reason, setReason] = useState<ReasonKey | null>(isReasonKey(motivoParam) ? motivoParam : null);
  const [step, setStep] = useState<number>(isReasonKey(motivoParam) ? 2 : 1);
  const [carId, setCarId] = useState<string>(autoParam ?? '');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [date, setDate] = useState<string>('');
  const [slot, setSlot] = useState<string>('');
  const [slotsTick, setSlotsTick] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [trap, setTrap] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [done, setDone] = useState<Summary | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  const service = useMemo(
    () => (reason && services.data ? serviceForReason(services.data, reason) : undefined),
    [reason, services.data],
  );
  const reasonInfo = REASONS.find((r) => r.key === reason);

  // Auto selezionabili per test drive / noleggio
  const carOptions = useMemo(() => {
    const list = cars.data ?? [];
    if (reason === 'test-drive') return list.filter((c) => c.service_type !== 'noleggio' && c.status === 'disponibile');
    if (reason === 'noleggio') return list.filter((c) => c.service_type !== 'vendita' && c.status !== 'non_disponibile' && c.status !== 'venduta');
    return [];
  }, [cars.data, reason]);
  const chosenCar = carOptions.find((c) => c.id === carId) ?? (cars.data ?? []).find((c) => c.id === carId);

  const slots = useAsync(
    () => (date && service ? api.getSlots(date, service.id) : Promise.resolve([])),
    [date, service?.id, slotsTick],
  );

  const today = todayKey();
  const lastDay = addDaysKey(today, MAX_DAYS_AHEAD);
  const openingHours = useAsync(() => api.getOpeningHours(), []);
  // Giorni rapidi: solo quelli in cui l'officina è aperta (es. sabato e domenica chiusi non compaiono)
  const quickDays = useMemo(() => {
    const open = new Set((openingHours.data ?? []).filter((h) => !h.closed).map((h) => h.weekday));
    const next = Array.from({ length: 28 }, (_, i) => addDaysKey(today, i));
    return (open.size > 0 ? next.filter((d) => open.has(weekdayOf(d))) : next).slice(0, 14);
  }, [today, openingHours.data]);
  const closedWeekday =
    date !== '' && (openingHours.data ?? []).some((h) => h.weekday === weekdayOf(date) && h.closed)
      ? WEEKDAYS_LONG[weekdayOf(date)]
      : null;

  function clearError(key: string) {
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function chooseReason(key: ReasonKey) {
    if (key !== reason) {
      setReason(key);
      setDetails({});
      setSlot('');
      setDate('');
      setErrors({});
      if (key === 'officina' || key === 'valutazione') setCarId('');
    }
    setStep(2);
  }

  function validateDetails(): boolean {
    if (!reason) return false;
    const next: Record<string, string> = {};
    for (const f of DETAIL_FIELDS[reason]) {
      const v = (details[f.key] ?? '').trim();
      if (f.required && v === '') next[f.key] = 'Compila questo campo.';
      if (f.type === 'number' && v !== '' && !/^\d{1,7}$/.test(v)) next[f.key] = 'Inserisci solo numeri.';
    }
    if (reason === 'valutazione') {
      const y = Number(details.anno);
      if (!next.anno && (y < 1950 || y > new Date().getFullYear() + 1)) next.anno = 'Inserisci un anno valido.';
    }
    if (reason === 'noleggio') {
      const a = details.data_ritiro;
      const b = details.data_riconsegna;
      if (a && a < today) next.data_ritiro = 'La data non può essere nel passato.';
      if (a && b && b < a) next.data_riconsegna = 'La riconsegna deve essere dopo il ritiro.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function validateSlot(): boolean {
    if (!date || !slot) {
      setErrors({ slot: 'Scegli un giorno e un orario.' });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateContact(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Inserisci il tuo nome e cognome.';
    if (!EMAIL_RE.test(email.trim())) next.email = 'Inserisci un indirizzo email valido.';
    if (!phoneOk(phone)) next.phone = 'Inserisci un numero di telefono valido.';
    if (!consentPrivacy) next.consent = 'Per prenotare devi acconsentire al trattamento dei dati.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function next() {
    if (step === 2 && validateDetails()) setStep(3);
    else if (step === 3 && validateSlot()) setStep(4);
  }

  function back() {
    setErrors({});
    setSendError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    if (!reason || !service || !validateContact()) return;
    const summary: Summary = {
      reason: reasonInfo?.title ?? service.name,
      when: `${dateLong(slot)} alle ${timeHM(slot)}`,
      email: email.trim(),
      extra:
        reason === 'officina'
          ? 'Ricorda: è un appuntamento per vedere l’auto. Il giorno del lavoro lo concordiamo insieme dopo averla vista.'
          : null,
    };
    if (trap) {
      setDone(summary);
      return;
    }
    const cleanDetails: Record<string, string> = {};
    for (const f of DETAIL_FIELDS[reason]) {
      const v = (details[f.key] ?? '').trim();
      if (v) cleanDetails[f.key] = v;
    }
    if (chosenCar) cleanDetails.auto = chosenCar.title;

    setSending(true);
    try {
      await api.createBooking({
        serviceId: service.id,
        carId: chosenCar ? chosenCar.id : null,
        start: slot,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        note: note.trim(),
        details: cleanDetails,
        consentPrivacy,
        consentMarketing,
      });
      setDone(summary);
    } catch (err) {
      setSendError(errorMessage(err));
      if (err instanceof ApiError && err.code === 'slot_not_available') {
        setSlot('');
        setSlotsTick((t) => t + 1);
        setStep(3);
      }
    } finally {
      setSending(false);
    }
  }

  // ------------------------------------------------------------------ render
  if (done) {
    return (
      <div className="container-page max-w-2xl py-12 md:py-16">
        <h1 ref={headingRef} tabIndex={-1} className="h2 outline-none">Richiesta inviata</h1>
        <div className="mt-6">
          <SuccessNotice title="Abbiamo ricevuto la tua richiesta">
            <p>
              <strong>{done.reason}</strong> · {done.when}
            </p>
            {done.extra && <p className="mt-2">{done.extra}</p>}
            <p className="mt-2">
              Non è ancora una conferma: controlliamo l’agenda e ti scriviamo a <strong>{done.email}</strong> {biz.replyTime}.
              Se non trovi la nostra email, guarda nella posta indesiderata.
            </p>
          </SuccessNotice>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/" className="btn btn-blue no-underline">Torna alla Home</Link>
          <a href={biz.phoneHref} className="btn btn-outline no-underline">Chiamaci se è urgente</a>
        </div>
      </div>
    );
  }

  if (services.loading) return <Loading />;
  if (services.error) return <div className="container-page py-12"><ErrorNotice error={services.error} onRetry={services.reload} /></div>;

  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <p className="eyebrow">Prenotazione online</p>
      <h1 ref={headingRef} tabIndex={-1} className="h2 mt-2 outline-none">
        {step === 1 ? 'Di cosa hai bisogno?' : STEPS[step - 1]}
      </h1>

      <ol className="mt-5 flex gap-2" aria-label="Avanzamento">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1" aria-current={step === i + 1 ? 'step' : undefined}>
            <div className={`h-1.5 rounded-full ${i + 1 <= step ? 'bg-brand-blue' : 'bg-brand-line'}`} />
            <span className={`mt-1 hidden text-[13px] sm:block ${i + 1 === step ? 'font-semibold text-brand-blue' : 'text-brand-muted'}`}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-brand-muted sm:hidden">Passo {step} di 4</p>

      {sendError && (
        <p role="alert" className="mt-5 rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-4 font-semibold text-[#8A1C13]">
          {sendError}
        </p>
      )}

      {/* PASSO 1 */}
      {step === 1 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {REASONS.map((r) => (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => chooseReason(r.key)}
                className="card flex h-full w-full items-start gap-4 p-5 text-left transition hover:border-brand-blue hover:bg-brand-mist"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-blue">
                  <Icon name={r.icon} size={26} />
                </span>
                <span>
                  <span className="block font-display text-lg font-semibold">{r.title}</span>
                  <span className="mt-1 block text-brand-muted">{r.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* PASSO 2 */}
      {step === 2 && reason && (
        <div className="mt-6 space-y-5">
          <p className="rounded-xl bg-brand-soft px-4 py-3">
            Motivo: <strong>{reasonInfo?.title}</strong>{' '}
            <button type="button" className="ml-2 font-semibold text-brand-blue underline" onClick={() => setStep(1)}>
              Cambia
            </button>
          </p>
          {reason && SLOT_INTRO[reason] && (
            <p className="rounded-xl bg-brand-soft p-4 text-brand-ink" role="note">{SLOT_INTRO[reason]}</p>
          )}
          {!service && (
            <p role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-4 text-[#8A1C13]">
              Questo servizio non è al momento prenotabile online. Chiamaci al {biz.phone}.
            </p>
          )}
          {(reason === 'test-drive' || reason === 'noleggio') && (
            <SelectField
              label={reason === 'test-drive' ? 'Quale auto vuoi provare?' : 'Quale auto ti interessa?'}
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              hint="Facoltativo: puoi anche sceglierla con noi."
            >
              <option value="">Non l’ho ancora scelta</option>
              {carOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </SelectField>
          )}
          {DETAIL_FIELDS[reason].map((f) =>
            f.type === 'textarea' ? (
              <TextAreaField key={f.key} label={f.label} required={f.required} placeholder={f.placeholder} hint={f.hint} value={details[f.key] ?? ''} error={errors[f.key]} onChange={(e) => { setDetails({ ...details, [f.key]: e.target.value }); clearError(f.key); }} />
            ) : (
              <TextField
                key={f.key}
                label={f.label}
                required={f.required}
                placeholder={f.placeholder}
                hint={f.hint}
                type={f.type === 'date' ? 'date' : 'text'}
                inputMode={f.type === 'number' ? 'numeric' : undefined}
                min={f.type === 'date' ? today : undefined}
                value={details[f.key] ?? ''}
                error={errors[f.key]}
                onChange={(e) => {
                  setDetails({ ...details, [f.key]: e.target.value });
                  clearError(f.key);
                }}
              />
            ),
          )}
          {reason === 'valutazione' && (
            <p className="hint">Hai delle foto dell’auto? Mandale su WhatsApp dopo la prenotazione: ci aiutano a prepararci.</p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="btn btn-outline" onClick={back}>Indietro</button>
            <button type="button" className="btn btn-primary" onClick={next} disabled={!service}>Avanti</button>
          </div>
        </div>
      )}

      {/* PASSO 3 */}
      {step === 3 && service && (
        <div className="mt-6">
          <p className="text-brand-muted">
            Scegli il giorno e l’orario che preferisci. Durata indicativa: {service.duration_min} minuti.
          </p>
          {reason && SLOT_INTRO[reason] && (
            <p className="mt-3 rounded-xl bg-brand-soft p-4 text-brand-ink" role="note">{SLOT_INTRO[reason]}</p>
          )}

          <fieldset className="mt-5">
            <legend className="label">Giorno</legend>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {quickDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="chip shrink-0 flex-col !rounded-xl !px-3 text-center leading-tight"
                  aria-pressed={date === d}
                  onClick={() => {
                    setDate(d);
                    setSlot('');
                    setErrors({});
                  }}
                >
                  <span className="text-[13px] capitalize">{dateShort(d).split(' ')[0]}</span>
                  <span className="text-lg font-semibold">{dateShort(d).split(' ')[1]}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 max-w-xs">
              <TextField
                label="Oppure scegli un’altra data"
                type="date"
                min={today}
                max={lastDay}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot('');
                  setErrors({});
                }}
              />
            </div>
          </fieldset>

          {date && (
            <div className="mt-6" aria-live="polite">
              <h2 className="font-display text-lg font-semibold capitalize">{dateLong(date)}</h2>
              {slots.loading ? (
                <Loading label="Cerco gli orari liberi…" />
              ) : slots.error ? (
                <ErrorNotice error={slots.error} onRetry={slots.reload} />
              ) : (slots.data ?? []).filter((s) => s.available).length === 0 ? (
                <p className="mt-3 rounded-xl bg-brand-mist p-4">
                  {closedWeekday
                    ? `Il ${closedWeekday} siamo chiusi. Scegli un altro giorno.`
                    : 'Nessun orario libero in questo giorno (può essere chiuso o già pieno). Prova un altro giorno.'}
                </p>
              ) : (
                <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {(slots.data ?? []).map((s) => (
                    <li key={s.start}>
                      <button
                        type="button"
                        className="chip w-full justify-center disabled:cursor-not-allowed disabled:bg-brand-mist disabled:text-brand-field disabled:line-through"
                        aria-pressed={slot === s.start}
                        disabled={!s.available}
                        onClick={() => {
                          setSlot(s.start);
                          setErrors({});
                        }}
                      >
                        {timeHM(s.start)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {errors.slot && (
            <p role="alert" className="mt-3 font-semibold text-[#B42318]">{errors.slot}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-outline" onClick={back}>Indietro</button>
            <button type="button" className="btn btn-primary" onClick={next}>Avanti</button>
          </div>
        </div>
      )}

      {/* PASSO 4 */}
      {step === 4 && reason && service && (
        <form onSubmit={submit} noValidate className="relative mt-6 space-y-5">
          <div className="card bg-brand-mist p-4">
            <p className="font-display font-semibold">Riepilogo</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-brand-muted">Motivo</dt>
              <dd>{reasonInfo?.title}</dd>
              <dt className="text-brand-muted">Quando</dt>
              <dd className="capitalize">{dateLong(slot)} alle {timeHM(slot)}</dd>
              {chosenCar && (<><dt className="text-brand-muted">Auto</dt><dd>{chosenCar.title}</dd></>)}
              {DETAIL_FIELDS[reason].filter((f) => details[f.key]?.trim()).map((f) => (
                <FragmentRow key={f.key} label={DETAIL_LABELS[f.key] ?? f.label} value={details[f.key].trim()} />
              ))}
            </dl>
            <button type="button" className="mt-3 font-semibold text-brand-blue underline" onClick={() => setStep(3)}>Modifica giorno e ora</button>
          </div>

          <TextField label="Nome e cognome" required autoComplete="name" value={name} error={errors.name} onChange={(e) => { setName(e.target.value); clearError('name'); }} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" type="email" required autoComplete="email" value={email} error={errors.email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }} hint="Qui riceverai la conferma." />
            <TextField label="Telefono" type="tel" required autoComplete="tel" value={phone} error={errors.phone} onChange={(e) => { setPhone(e.target.value); clearError('phone'); }} />
          </div>
          <TextAreaField label="Note (facoltativo)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Honeypot value={trap} onChange={setTrap} />
          <CheckField checked={consentPrivacy} onChange={(e) => { setConsentPrivacy(e.target.checked); clearError('consent'); }} error={errors.consent}>
            Ho letto l’<Link to="/privacy" className="font-semibold text-brand-blue underline">informativa privacy</Link> e acconsento al trattamento dei miei dati per gestire la prenotazione. *
          </CheckField>
          <CheckField checked={consentMarketing} onChange={(e) => setConsentMarketing(e.target.checked)}>
            Desidero ricevere novità e promozioni di {business.name} (facoltativo).
          </CheckField>

          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" className="btn btn-outline" onClick={back}>Indietro</button>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Invio in corso…' : 'Invia richiesta di prenotazione'}
            </button>
          </div>
          <p className="hint">La prenotazione diventa valida solo dopo la nostra conferma via email.</p>
        </form>
      )}
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-brand-muted">{label}</dt>
      <dd className="whitespace-pre-line break-words">{value}</dd>
    </>
  );
}
