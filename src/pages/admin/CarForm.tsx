import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { parseNumber } from '../../lib/format';
import { shrinkImage } from '../../lib/image';
import { uuid } from '../../lib/uuid';
import { useAsync } from '../../lib/useAsync';
import type { AdminCar, CarInput, CarServiceType, CarStatus } from '../../types';
import { CAR_STATUS_LABEL } from '../../components/Badge';
import { CheckField, SelectField, TextAreaField, TextField } from '../../components/Fields';
import { Icon } from '../../components/Icon';
import { ErrorNotice, Loading } from '../../components/Notice';

interface FormState {
  title: string;
  brand: string;
  model: string;
  version: string;
  year: string;
  km: string;
  fuel: string;
  gearbox: string;
  power_kw: string;
  color: string;
  body_type: string;
  doors: string;
  seats: string;
  service_type: CarServiceType;
  price: string;
  rate_day: string;
  rate_week: string;
  rate_month: string;
  status: CarStatus;
  description: string;
  features: string; // una per riga
  plate: string;
  featured: boolean;
}

const EMPTY: FormState = {
  title: '', brand: '', model: '', version: '', year: '', km: '', fuel: '', gearbox: '', power_kw: '', color: '',
  body_type: '', doors: '', seats: '', service_type: 'vendita', price: '', rate_day: '', rate_week: '', rate_month: '',
  status: 'disponibile', description: '', features: '', plate: '', featured: false,
};

const FUELS = ['Benzina', 'Diesel', 'GPL', 'Metano', 'Ibrida', 'Elettrica'];
const STATUSES: CarStatus[] = ['disponibile', 'a_noleggio', 'venduta', 'non_disponibile'];
const str = (v: number | string | null | undefined) => (v === null || v === undefined ? '' : String(v));

function toForm(c: AdminCar): FormState {
  return {
    title: c.title, brand: str(c.brand), model: str(c.model), version: str(c.version), year: str(c.year), km: str(c.km),
    fuel: str(c.fuel), gearbox: str(c.gearbox), power_kw: str(c.power_kw), color: str(c.color), body_type: str(c.body_type),
    doors: str(c.doors), seats: str(c.seats), service_type: c.service_type, price: str(c.price), rate_day: str(c.rate_day),
    rate_week: str(c.rate_week), rate_month: str(c.rate_month), status: c.status, description: str(c.description),
    features: c.features.join('\n'), plate: c.plate, featured: c.featured,
  };
}

/** Numero intero non negativo oppure null se vuoto; undefined se non valido. */
export function AdminCarFormPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const loaded = useAsync(() => (id ? api.adminGetCar(id) : Promise.resolve(null)), [id]);

  const [carId] = useState(() => id ?? uuid());
  const [form, setForm] = useState<FormState>(EMPTY);
  const [photos, setPhotos] = useState<string[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (loaded.data && !hydrated.current) {
      hydrated.current = true;
      setForm(toForm(loaded.data));
      setPhotos(loaded.data.photos);
      setOriginal(loaded.data.photos);
    }
  }, [loaded.data]);

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  };
  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    error: errors[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });

  async function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setMessage(`“${file.name}” non è un’immagine e non è stato caricato.`);
          continue;
        }
        const { blob, ext } = await shrinkImage(file);
        const path = await api.adminUploadPhoto(carId, blob, ext);
        setPhotos((p) => [...p, path]);
        setUploaded((u) => [...u, path]);
      }
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function movePhoto(index: number, delta: number) {
    setPhotos((p) => {
      const next = [...p];
      const j = index + delta;
      if (j < 0 || j >= next.length) return p;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function removePhoto(path: string) {
    setPhotos((p) => p.filter((x) => x !== path));
    // Se è stata caricata in questa sessione e mai salvata, la togliamo subito dall'archivio.
    if (uploaded.includes(path) && !original.includes(path)) {
      setUploaded((u) => u.filter((x) => x !== path));
      await api.adminRemovePhotos([path]).catch(() => undefined);
    }
  }

  async function cancel() {
    // Elimina le foto caricate ma non salvate, così non restano file inutilizzati.
    const orphans = uploaded.filter((p) => !original.includes(p));
    if (orphans.length) await api.adminRemovePhotos(orphans).catch(() => undefined);
    navigate('/admin/auto');
  }

  function validate(): CarInput | null {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 3) next.title = 'Scrivi un titolo (es. “Fiat Panda 1.0 Hybrid”).';

    const nums = {} as Record<'year' | 'km' | 'power_kw' | 'doors' | 'seats' | 'price' | 'rate_day' | 'rate_week' | 'rate_month', number | null>;
    for (const k of ['year', 'km', 'power_kw', 'doors', 'seats', 'price', 'rate_day', 'rate_week', 'rate_month'] as const) {
      const n = parseNumber(form[k]);
      if (n === undefined) next[k] = 'Inserisci solo un numero.';
      else nums[k] = n;
    }
    if (nums.year !== null && nums.year !== undefined && (nums.year < 1950 || nums.year > new Date().getFullYear() + 1)) {
      next.year = 'Anno non valido.';
    }
    const sale = form.service_type !== 'noleggio';
    const rent = form.service_type !== 'vendita';
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    const int = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n));
    return {
      id: carId,
      title: form.title.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      version: form.version.trim() || null,
      year: int(nums.year),
      km: int(nums.km),
      fuel: form.fuel.trim() || null,
      gearbox: form.gearbox.trim() || null,
      power_kw: int(nums.power_kw),
      color: form.color.trim() || null,
      body_type: form.body_type.trim() || null,
      doors: int(nums.doors),
      seats: int(nums.seats),
      service_type: form.service_type,
      price: sale ? nums.price : null,
      rate_day: rent ? nums.rate_day : null,
      rate_week: rent ? nums.rate_week : null,
      rate_month: rent ? nums.rate_month : null,
      status: form.status,
      description: form.description.trim() || null,
      features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      photos,
      featured: form.featured,
      plate: form.plate.trim().toUpperCase(),
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const input = validate();
    if (!input) {
      setMessage('Controlla i campi evidenziati.');
      return;
    }
    setSaving(true);
    try {
      await api.adminSaveCar(input, isNew);
      const removed = original.filter((p) => !photos.includes(p));
      if (removed.length) await api.adminRemovePhotos(removed).catch(() => undefined);
      navigate('/admin/auto');
    } catch (err) {
      setMessage(errorMessage(err));
      setSaving(false);
    }
  }

  if (!isNew && loaded.loading) return <Loading />;
  if (loaded.error) return <ErrorNotice error={loaded.error} onRetry={loaded.reload} />;
  if (!isNew && !loaded.data) {
    return (
      <div>
        <p className="font-semibold">Auto non trovata.</p>
        <Link to="/admin/auto" className="text-brand-blue">← Torna all’elenco</Link>
      </div>
    );
  }

  const sale = form.service_type !== 'noleggio';
  const rent = form.service_type !== 'vendita';

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-4xl space-y-8">
      <div>
        <Link to="/admin/auto" className="text-sm text-brand-blue">← Torna all’elenco</Link>
        <h1 className="mt-1 font-display text-3xl font-bold">{isNew ? 'Aggiungi auto' : 'Modifica auto'}</h1>
      </div>

      <section className="card space-y-4 p-5" aria-labelledby="f-base">
        <h2 id="f-base" className="font-display text-xl font-semibold">Dati principali</h2>
        <TextField label="Titolo (appare nel catalogo)" required placeholder="Fiat Panda 1.0 Hybrid" {...field('title')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Marca" {...field('brand')} />
          <TextField label="Modello" {...field('model')} />
          <TextField label="Versione" {...field('version')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Disponibile per" value={form.service_type} onChange={(e) => set('service_type', e.target.value as CarServiceType)}>
            <option value="vendita">Vendita</option>
            <option value="noleggio">Noleggio</option>
            <option value="entrambi">Vendita e noleggio</option>
          </SelectField>
          <SelectField label="Stato" value={form.status} onChange={(e) => set('status', e.target.value as CarStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{CAR_STATUS_LABEL[s]}</option>
            ))}
          </SelectField>
          <div className="flex items-end pb-2">
            <CheckField checked={form.featured} onChange={(e) => set('featured', e.target.checked)}>Mostra in evidenza nella Home</CheckField>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="f-price">
        <h2 id="f-price" className="font-display text-xl font-semibold">Prezzo</h2>
        {sale && <TextField label="Prezzo di vendita (€)" inputMode="numeric" hint="Lascia vuoto per mostrare “Prezzo su richiesta”." {...field('price')} />}
        {rent && (
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Noleggio al giorno (€)" inputMode="numeric" {...field('rate_day')} />
            <TextField label="Noleggio a settimana (€)" inputMode="numeric" {...field('rate_week')} />
            <TextField label="Noleggio al mese (€)" inputMode="numeric" {...field('rate_month')} />
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="f-tech">
        <h2 id="f-tech" className="font-display text-xl font-semibold">Scheda tecnica</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Anno" inputMode="numeric" {...field('year')} />
          <TextField label="Chilometri" inputMode="numeric" {...field('km')} />
          <TextField label="Potenza (kW)" inputMode="numeric" {...field('power_kw')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <TextField label="Alimentazione" list="fuels" {...field('fuel')} />
            <datalist id="fuels">{FUELS.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
          <SelectField label="Cambio" value={form.gearbox} onChange={(e) => set('gearbox', e.target.value)}>
            <option value="">Non indicato</option>
            <option value="Manuale">Manuale</option>
            <option value="Automatico">Automatico</option>
          </SelectField>
          <TextField label="Carrozzeria" placeholder="City car, Berlina, SUV…" {...field('body_type')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Colore" {...field('color')} />
          <TextField label="Porte" inputMode="numeric" {...field('doors')} />
          <TextField label="Posti" inputMode="numeric" {...field('seats')} />
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="f-desc">
        <h2 id="f-desc" className="font-display text-xl font-semibold">Descrizione</h2>
        <TextAreaField label="Descrizione" rows={5} {...field('description')} />
        <TextAreaField label="Dotazioni (una per riga)" rows={5} placeholder={'Climatizzatore\nBluetooth\nSensori di parcheggio'} {...field('features')} />
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="f-photo">
        <h2 id="f-photo" className="font-display text-xl font-semibold">Foto</h2>
        <p className="text-brand-muted">La prima foto è la copertina. Le foto vengono ridotte automaticamente prima del caricamento.</p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p} className="overflow-hidden rounded-xl border border-brand-line">
                <div className="relative">
                  <img src={api.photoUrl(p, 480)} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-brand-yellow px-2 py-0.5 text-xs font-bold text-brand-navy">Copertina</span>}
                </div>
                <div className="flex items-center justify-between gap-1 p-1.5">
                  <button type="button" className="btn btn-outline btn-sm !min-h-9 !px-2" onClick={() => movePhoto(i, -1)} disabled={i === 0} aria-label={`Sposta la foto ${i + 1} a sinistra`}><Icon name="chevronLeft" size={16} /></button>
                  <button type="button" className="btn btn-outline btn-sm !min-h-9 !px-2" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} aria-label={`Sposta la foto ${i + 1} a destra`}><Icon name="chevronRight" size={16} /></button>
                  <button type="button" className="btn btn-danger btn-sm !min-h-9 !px-2" onClick={() => removePhoto(p)} aria-label={`Elimina la foto ${i + 1}`}><Icon name="trash" size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div>
          <input ref={fileRef} id="photo-input" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
          <label htmlFor="photo-input" className={`btn btn-outline cursor-pointer ${uploading ? 'opacity-60' : ''}`}>
            <Icon name="upload" size={18} />
            {uploading ? 'Caricamento…' : 'Aggiungi foto'}
          </label>
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-labelledby="f-int">
        <h2 id="f-int" className="font-display text-xl font-semibold">Uso interno</h2>
        <TextField label="Targa" hint="Non viene mai mostrata sul sito." {...field('plate')} />
      </section>

      {message && <p role="alert" className="rounded-xl border border-[#F2B8B5] bg-[#FDECEA] p-3 font-semibold text-[#8A1C13]">{message}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-blue" disabled={saving || uploading}>{saving ? 'Salvataggio…' : 'Salva'}</button>
        <button type="button" className="btn btn-outline" onClick={cancel} disabled={saving}>Annulla</button>
      </div>
    </form>
  );
}
