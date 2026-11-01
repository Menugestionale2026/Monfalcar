import type { ReactNode } from 'react';
import { legal } from '../config/business';
import { useBusiness } from '../lib/siteInfo';
import { usePageMeta } from '../lib/usePageMeta';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-brand-navy">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

/**
 * Informativa ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR).
 * Se cambiano fornitori, tempi di conservazione o funzioni del sito, va aggiornata qui.
 */
export function PrivacyPage() {
  const biz = useBusiness();
  usePageMeta('Informativa privacy');
  return (
    <div className="container-page max-w-3xl py-12 md:py-16">
      <p className="eyebrow">Privacy</p>
      <h1 className="h2 mt-2">Informativa sul trattamento dei dati personali</h1>
      <p className="mt-3 text-brand-muted">
        Ai sensi dell’art. 13 del Regolamento (UE) 2016/679 (GDPR). Ultimo aggiornamento: novembre 2026.
      </p>

      <div className="mt-8 space-y-8 text-[17px] leading-relaxed text-brand-ink">
        <Section title="Chi tratta i tuoi dati">
          <p>
            Il titolare del trattamento è <strong>{legal.companyName}</strong>, con sede legale in {legal.seat}, {biz.vat},
            iscritta al Registro delle Imprese ({legal.registryOffice}) con numero REA {legal.rea}.
          </p>
          <p>
            Per qualsiasi domanda sui tuoi dati puoi scriverci a{' '}
            <a href={`mailto:${biz.email}`} className="font-semibold text-brand-blue">{biz.email}</a>, alla PEC{' '}
            <a href={`mailto:${legal.pec}`} className="font-semibold text-brand-blue">{legal.pec}</a> o chiamare il {biz.phone}.
          </p>
        </Section>

        <Section title="Quali dati raccogliamo e perché">
          <ul className="list-disc space-y-3 pl-6">
            <li>
              <strong>Prenotazioni</strong>: nome, email, telefono, giorno e ora scelti, motivo della visita e le informazioni
              che ci dai sull’auto (marca e modello, anno, chilometri, targa se la scrivi, per il noleggio le date) e le
              eventuali note. Li usiamo per gestire l’appuntamento, scriverti la conferma o il rifiuto e mandarti un
              promemoria. <em>Base giuridica</em>: esecuzione di misure precontrattuali adottate su tua richiesta (art. 6,
              par. 1, lett. b GDPR).
            </li>
            <li>
              <strong>Richieste di informazioni</strong> (scheda dell’auto e pagina Contatti): nome, email, telefono se lo
              indichi e il tuo messaggio, per risponderti. <em>Base giuridica</em>: la tua richiesta (art. 6, par. 1, lett. b).
            </li>
            <li>
              <strong>Novità e promozioni via email</strong>: solo se spunti la casella facoltativa. <em>Base giuridica</em>:
              il tuo consenso (art. 6, par. 1, lett. a). Puoi revocarlo quando vuoi, senza conseguenze sulla prenotazione e
              senza che questo cancelli quanto fatto finora: basta scriverci.
            </li>
            <li>
              <strong>Protezione del sito</strong>: per evitare abusi contiamo quante richieste arrivano dallo stesso indirizzo
              email in un breve periodo. <em>Base giuridica</em>: legittimo interesse a tenere il sito sicuro (art. 6, par. 1,
              lett. f).
            </li>
          </ul>
          <p>
            I dati contrassegnati con * sono necessari: senza di essi non possiamo gestire la prenotazione o rispondere alla
            richiesta. Gli altri sono facoltativi. Non facciamo profilazione né prendiamo decisioni automatizzate su di te.
          </p>
          <p>
            Se poi diventi nostro cliente (lavori in officina, acquisto, vendita o noleggio di un’auto), i dati del contratto
            e dei documenti fiscali sono trattati secondo le norme civili e fiscali, di norma per 10 anni. Questa parte non
            passa da questo sito.
          </p>
        </Section>

        <Section title="Per quanto tempo li conserviamo">
          <ul className="list-disc space-y-2 pl-6">
            <li>Prenotazioni e richieste di informazioni: 24 mesi dall’ultimo contatto, poi le cancelliamo.</li>
            <li>Consenso alle promozioni: fino a quando lo revochi.</li>
          </ul>
        </Section>

        <Section title="Chi può vedere i dati">
          <p>
            Solo il nostro personale autorizzato, che accede con una password personale. Non vendiamo i tuoi dati e non li
            usiamo per scopi diversi da quelli indicati qui sopra.
          </p>
          <p>Per far funzionare il sito ci appoggiamo a fornitori che trattano i dati per nostro conto:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <strong>Google</strong> (Fogli per conservare prenotazioni e richieste, Drive per le foto delle auto, Gmail per
              inviarti le email, Apps Script per collegare il sito ai Fogli);
            </li>
            <li>
              <strong>GitHub Pages</strong> (GitHub, Inc., gruppo Microsoft), che ospita le pagine del sito.
            </li>
          </ul>
          <p>
            Se ci scrivi su WhatsApp, il messaggio passa da WhatsApp (Meta), che lo gestisce con la propria informativa.
          </p>
        </Section>

        <Section title="Dati di navigazione">
          <p>
            Quando visiti il sito, GitHub (che ospita le pagine) e Google (da cui il sito legge orari, auto e disponibilità)
            ricevono necessariamente il tuo indirizzo IP e alcune informazioni tecniche del browser. Servono a far funzionare
            il servizio e a proteggerlo; noi non li vediamo né li usiamo. Il loro trattamento segue le informative di quei
            fornitori.
          </p>
        </Section>

        <Section title="Trasferimenti fuori dall’Unione europea">
          <p>
            Google e GitHub sono società statunitensi e possono trattare dati negli Stati Uniti. Il trasferimento avviene sulla
            base della decisione di adeguatezza UE-USA (Data Privacy Framework) per i fornitori che vi aderiscono, oppure delle
            clausole contrattuali standard approvate dalla Commissione europea.
          </p>
        </Section>

        <Section title="Cookie e mappa">
          <p>
            Questo sito non usa cookie di profilazione, non ha strumenti di statistica o pubblicità e non incorpora social
            network. I caratteri delle pagine sono ospitati sul sito stesso. Il browser conserva solo una memoria tecnica
            necessaria al funzionamento, per esempio il collegamento di chi accede all’area riservata: per questo non serve
            alcun banner.
          </p>
          <p>
            La mappa della pagina Contatti, quando c’è, si carica solo se premi «Mostra la mappa»: da quel momento
            OpenStreetMap, servizio esterno, riceve il tuo indirizzo IP. I link «Indicazioni stradali» (Google Maps) e
            «WhatsApp» ti portano su servizi esterni solo se li apri.
          </p>
        </Section>

        <Section title="I tuoi diritti">
          <p>
            Puoi chiederci in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l’uso, riceverli in un
            formato leggibile e opporti al trattamento (artt. 15-22 GDPR). Scrivici a {biz.email} o alla PEC: rispondiamo di
            norma entro un mese.
          </p>
          <p>
            Se ritieni che i tuoi dati non siano trattati correttamente puoi presentare reclamo al Garante per la protezione dei
            dati personali (
            <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue">
              garanteprivacy.it
            </a>
            ).
          </p>
        </Section>
      </div>
    </div>
  );
}
