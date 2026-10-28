import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { business } from '../../config/business';
import { errorMessage } from '../../lib/errors';
import { phoneDigits } from '../../lib/phone';
import { useReloadSiteInfo } from '../../lib/siteInfo';
import { useAsync } from '../../lib/useAsync';
import { TextField } from '../../components/Fields';
import { Icon } from '../../components/Icon';
import { ErrorNotice, Loading } from '../../components/Notice';

interface Form {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  vat: string;
  reply_time: string;
  map_lat: string;
  map_lon: string;
}

const EMPTY: Form = { phone: '', whatsapp: '', email: '', address: '', city: '', vat: '', reply_time: '', map_lat: '', map_lon: '' };
const coord = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));

/** Coordinate: il punto è sempre decimale (45.805), accettata anche la virgola. Vuoto = null, non valido = undefined. */
function parseCoord(value: string): number | null | undefined {
  const t = value.trim().replace(',', '.');
  if (t === '') return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : undefined;
}

/** Dati dell'attività mostrati sul sito: telefono, indirizzo, email, partita IVA, mappa. */
export function AdminBusinessPage() {
  const saved = useAsync(() => api.getSiteInfo(), []);
  const reloadPublic = useReloadSiteInfo();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (saved.data) {
      setForm({ ...saved.data, map_lat: coord(saved.data.map_lat), map_lon: coord(saved.data.map_lon) });
    }
  }, [saved.data]);

  const field = (k: keyof Form) => ({
    value: form[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => {
      setForm({ ...form, [k]: e.target.value });
      setDone(false);
      if (errors[k]) setErrors((x) => ({ ...x, [k]: '' }));
    },
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSendError(null);
    setDone(false);
    const next: Record<string, string> = {};
    if (form.phone.trim() && !phoneDigits(form.phone)) next.phone = 'Il numero non sembra valido: scrivilo con il prefisso, es. 0481 123456.';
    if (form.whatsapp.trim() && !phoneDigits(form.whatsapp)) next.whatsapp = 'Il numero non sembra valido: scrivilo con il prefisso, es. 333 1234567.';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Controlla l’indirizzo email.';
    const lat = parseCoord(form.map_lat);
    const lon = parseCoord(form.map_lon);
    if (lat === undefined) next.map_lat = 'Inserisci solo un numero (es. 45.805).';
    if (lon === undefined) next.map_lon = 'Inserisci solo un numero (es. 13.533).';
    if (lat !== undefined && lon !== undefined && (lat === null) !== (lon === null)) {
      next[lat === null ? 'map_lat' : 'map_lon'] = 'Per la mappa servono entrambe le coordinate, oppure nessuna.';
    }
    const latN = lat ?? null;
    const lonN = lon ?? null;
    if (latN !== null && Math.abs(latN) > 90) next.map_lat = 'La latitudine deve essere tra -90 e 90.';
    if (lonN !== null && Math.abs(lonN) > 180) next.map_lon = 'La longitudine deve essere tra -180 e 180.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await api.adminSaveSiteInfo({
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        address: form.address,
        city: form.city,
        vat: form.vat,
        reply_time: form.reply_time,
        map_lat: latN,
        map_lon: lonN,
      });
      reloadPublic();
      saved.reload();
      setDone(true);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (saved.loading && !saved.data) return <Loading />;
  if (saved.error) return <ErrorNotice error={saved.error} onRetry={saved.reload} />;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-bold">Dati dell’attività</h1>
      <p className="mt-2 text-brand-muted">
        Telefono, indirizzo e contatti che i clienti vedono nel sito, nelle email e nella pagina Contatti. Quello che scrivi qui
        sostituisce subito i valori provvisori. Un campo lasciato vuoto mostra il valore provvisorio.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
        <section className="card space-y-4 p-5" aria-labelledby="b-contatti">
          <h2 id="b-contatti" className="font-display text-xl font-semibold">Contatti</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Telefono" type="tel" autoComplete="off" placeholder={business.phone} hint="Il numero a cui chiamare. Scrivilo come preferisci." {...field('phone')} />
            <TextField label="WhatsApp" type="tel" autoComplete="off" hint="Facoltativo. Se è vuoto il pulsante WhatsApp non compare." {...field('whatsapp')} />
          </div>
          <TextField label="Email di contatto" type="email" autoComplete="off" placeholder={business.email} hint="Quella che i clienti vedono nel sito. Gli avvisi delle prenotazioni si scelgono nella pagina Notifiche." {...field('email')} />
          <TextField label="Tempo di risposta" placeholder={business.replyTime} hint="Frase che completa “Ti rispondiamo …”." {...field('reply_time')} />
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="b-sede">
          <h2 id="b-sede" className="font-display text-xl font-semibold">Sede</h2>
          <TextField label="Indirizzo" autoComplete="off" placeholder={business.address} {...field('address')} />
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="CAP e città" autoComplete="off" placeholder={business.city} {...field('city')} />
            <TextField label="Partita IVA" autoComplete="off" placeholder={business.vat} hint="Compare in fondo al sito e nell’informativa privacy." {...field('vat')} />
          </div>
        </section>

        <section className="card space-y-4 p-5" aria-labelledby="b-mappa">
          <h2 id="b-mappa" className="font-display text-xl font-semibold">Mappa (facoltativa)</h2>
          <p className="text-brand-muted">
            Per mostrare la mappa nella pagina Contatti inserisci le coordinate della sede. Su Google Maps tieni premuto sul punto
            giusto: in alto compaiono due numeri (latitudine e longitudine). Lasciando vuoto, la mappa non compare.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label="Latitudine" inputMode="decimal" autoComplete="off" placeholder="45.805" {...field('map_lat')} />
            <TextField label="Longitudine" inputMode="decimal" autoComplete="off" placeholder="13.533" {...field('map_lon')} />
          </div>
        </section>

        {sendError && <p role="alert" className="font-semibold text-[#B42318]">{sendError}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Salvo…' : 'Salva i dati'}</button>
          <span role="status" className={`inline-flex items-center gap-1 font-semibold text-[#14532D] ${done ? '' : 'invisible'}`}>
            <Icon name="check" size={18} strokeWidth={2.6} /> Salvato: il sito è aggiornato
          </span>
        </div>
      </form>
    </div>
  );
}
