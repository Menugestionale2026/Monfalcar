import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { business } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { hoursRows } from '../lib/hours';
import { useAsync } from '../lib/useAsync';
import { usePageMeta } from '../lib/usePageMeta';
import { Icon } from '../components/Icon';
import type { IconName } from '../components/Icon';
import { InfoRequestForm } from '../components/InfoRequestForm';

function mapSrc(lat: number, lon: number): string {
  const d = 0.004;
  const bbox = [lon - d, lat - d, lon + d, lat + d].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
}

/** La mappa è di OpenStreetMap (servizio esterno): si carica solo dopo il clic, così non trasmette l'IP a chi non la vuole. */
function MapEmbed({ lat, lon, title }: { lat: number; lon: number; title: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-brand-line">
      {show ? (
        <iframe title={title} src={mapSrc(lat, lon)} className="h-72 w-full border-0" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-72 flex-col items-center justify-center gap-3 bg-brand-soft p-6 text-center">
          <button type="button" className="btn btn-blue" onClick={() => setShow(true)}>
            Mostra la mappa
          </button>
          <p className="max-w-sm text-sm text-brand-muted">
            Caricando la mappa ti colleghi a OpenStreetMap, un servizio esterno che vede il tuo indirizzo IP.{' '}
            <Link to="/privacy" className="font-semibold text-brand-blue underline">Informativa privacy</Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Item({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-blue">
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <div className="mt-0.5 text-brand-ink">{children}</div>
      </div>
    </li>
  );
}

export function ContactsPage() {
  const biz = useBusiness();
  usePageMeta('Contatti', `Dove siamo, orari, telefono e WhatsApp di ${business.name}.`);
  const hours = useAsync(() => api.getOpeningHours(), []);
  const { lat, lon } = biz.map;
  const rows = hours.data ? hoursRows(hours.data) : [];
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.address} ${biz.city}`)}`;

  return (
    <div className="container-page py-12 md:py-16">
      <p className="eyebrow">Contatti</p>
      <h1 className="h2 mt-2">Vieni a trovarci o scrivici</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <ul className="space-y-6">
            <Item icon="pin" title="Dove siamo">
              <p>{biz.address}</p>
              <p>{biz.city}</p>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-semibold text-brand-blue">
                Apri indicazioni stradali
              </a>
            </Item>
            <Item icon="phone" title="Telefono">
              <a href={biz.phoneHref} className="font-semibold text-brand-blue">{biz.phone}</a>
            </Item>
            <Item icon="chat" title="WhatsApp">
              <a href={biz.whatsappHref('Buongiorno, vorrei informazioni.')} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue">
                Scrivici su WhatsApp
              </a>
              <p className="text-sm text-brand-muted">Puoi mandarci anche le foto dell’auto.</p>
            </Item>
            <Item icon="mail" title="Email">
              <a href={`mailto:${biz.email}`} className="font-semibold text-brand-blue">{biz.email}</a>
            </Item>
            <Item icon="clock" title="Orari">
              <table className="mt-1 text-[15px]">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row" className="pr-6 text-left font-medium">{r.label}</th>
                      <td className={r.closed ? 'text-brand-muted' : ''}>{r.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Item>
          </ul>

          {lat !== null && lon !== null && <MapEmbed lat={lat} lon={lon} title={`Mappa: ${biz.address}, ${biz.city}`} />}
        </div>

        <section aria-labelledby="scrivici-t" className="card h-fit p-5 md:p-7">
          <h2 id="scrivici-t" className="font-display text-xl font-semibold">Scrivici un messaggio</h2>
          <p className="mb-5 mt-1 text-brand-muted">Ti rispondiamo {biz.replyTime}.</p>
          <InfoRequestForm messageLabel="Come possiamo aiutarti?" />
        </section>
      </div>
    </div>
  );
}
