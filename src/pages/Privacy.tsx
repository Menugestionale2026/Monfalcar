import { business } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { usePageMeta } from '../lib/usePageMeta';

/**
 * MODELLO di informativa: va fatto controllare da un consulente prima della pubblicazione
 * e completato con i dati reali (titolare, tempi di conservazione, fornitori).
 */
export function PrivacyPage() {
  const biz = useBusiness();
  usePageMeta('Informativa privacy');
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <p className="eyebrow">Privacy</p>
      <h1 className="h2 mt-2">Informativa sul trattamento dei dati personali</h1>
      <p className="mt-3 rounded-xl bg-brand-yellow/30 p-3 text-sm">
        Modello da verificare con il proprio consulente privacy prima della pubblicazione.
      </p>

      <div className="mt-8 space-y-8 text-[17px] leading-relaxed text-brand-ink">
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">Chi tratta i tuoi dati</h2>
          <p className="mt-2">
            Titolare del trattamento è {business.name}, {biz.address}, {biz.city} ({biz.vat}). Puoi
            scriverci a {biz.email} o chiamare il {biz.phone}.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">Quali dati raccogliamo e perché</h2>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>
              <strong>Prenotazioni</strong>: nome, email, telefono, data e ora richieste, descrizione dell’auto o del problema,
              eventuali note. Li usiamo per gestire l’appuntamento e scriverti la conferma o il rifiuto, anche con un
              promemoria. Base giuridica: esecuzione di misure precontrattuali richieste da te.
            </li>
            <li>
              <strong>Richieste di informazioni</strong> (scheda auto e pagina Contatti): nome, email, telefono facoltativo e
              messaggio, per risponderti. Base giuridica: tua richiesta.
            </li>
            <li>
              <strong>Novità e promozioni</strong>: solo se spunti la casella facoltativa. Puoi revocare il consenso in
              qualsiasi momento.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">Per quanto tempo li conserviamo</h2>
          <p className="mt-2">
            [Da completare: ad esempio, le prenotazioni e le richieste per 24 mesi dall’ultimo contatto, salvo obblighi di legge
            legati ai lavori eseguiti o alle vendite.]
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">Chi può vedere i dati</h2>
          <p className="mt-2">
            Solo il nostro personale autorizzato. Ci appoggiamo a fornitori che trattano i dati per nostro conto:
            Google (Fogli e Drive per conservare prenotazioni, richieste e foto; Gmail per inviare le email) e il servizio
            che ospita il sito (GitHub Pages). [Da completare: sede dei server e garanzie per eventuali trasferimenti fuori
            dallo Spazio Economico Europeo.] Non vendiamo i tuoi dati.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">Cookie e mappa</h2>
          <p className="mt-2">
            Questo sito non usa cookie di profilazione né strumenti di analisi. La pagina Contatti può mostrare una mappa di
            OpenStreetMap, che è un servizio esterno.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-brand-navy">I tuoi diritti</h2>
          <p className="mt-2">
            Puoi chiedere di accedere ai tuoi dati, correggerli, cancellarli, limitarne l’uso o riceverli in un formato
            leggibile, scrivendo a {biz.email}. Puoi anche presentare reclamo al Garante per la protezione dei dati
            personali (garanteprivacy.it).
          </p>
        </section>
      </div>
    </div>
  );
}
