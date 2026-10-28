import { Link } from 'react-router-dom';
import { business } from '../config/business';
import { REASONS } from '../lib/bookingFields';
import { usePageMeta } from '../lib/usePageMeta';
import { Icon } from '../components/Icon';

const DETAILS: Record<string, { points: string[]; note: string }> = {
  officina: {
    points: [
      'Prenoti un appuntamento breve per far vedere l’auto',
      'Guardiamo insieme il problema o il lavoro che ti serve',
      'Ti diciamo cosa serve, quanto costa e quanto tempo richiede',
      'Concordiamo poi il giorno in cui riportarla, anche per lavori lunghi',
    ],
    note: 'Non prenoti il lavoro: l’appuntamento serve a vedere l’auto, poi ti diciamo noi quando tornare.',
  },
  valutazione: {
    points: ['Valutazione della tua auto usata', 'Ti diciamo subito cosa guardiamo e perché', 'Nessun obbligo di vendere dopo la valutazione', 'Puoi portare i documenti o mandarci le foto su WhatsApp'],
    note: 'Prenota un appuntamento: l’offerta definitiva dipende dalla visione dell’auto.',
  },
  'test-drive': {
    points: ['Provi l’auto che ti interessa', 'Ti mostriamo documenti e storia della vettura', 'Informazioni su finanziamento e passaggio di proprietà', 'Possibile permuta della tua auto'],
    note: 'Dalla scheda di ogni auto puoi prenotare direttamente il test drive.',
  },
  noleggio: {
    points: ['Noleggio per un giorno, una settimana o un mese', 'Tariffe indicate nella scheda dell’auto', 'Disponibilità confermata da noi', 'Ritiro e riconsegna in sede'],
    note: 'Indica le date desiderate: ti confermiamo la disponibilità appena possibile.',
  },
};

export function ServicesPage() {
  usePageMeta('Servizi', `Officina, valutazione dell’auto usata, vendita e noleggio: i servizi di ${business.name}.`);
  return (
    <div className="container-page py-12 md:py-16">
      <p className="eyebrow">Servizi</p>
      <h1 className="h2 mt-2">Tutto quello che serve alla tua auto</h1>
      <p className="mt-3 max-w-2xl text-lg text-brand-ink">Quattro servizi, un unico referente. Scegli quello che ti serve e prenota.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {REASONS.map((r) => {
          const d = DETAILS[r.key];
          return (
            <section key={r.key} className="card p-6 md:p-8" aria-labelledby={`s-${r.key}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand-blue">
                <Icon name={r.icon} size={26} />
              </span>
              <h2 id={`s-${r.key}`} className="mt-4 font-display text-2xl font-semibold">
                {r.title}
              </h2>
              <p className="mt-2 text-brand-muted">{r.text}</p>
              <ul className="mt-4 space-y-2">
                {d.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Icon name="check" size={20} strokeWidth={2.4} className="mt-0.5 shrink-0 text-brand-blue" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-brand-muted">{d.note}</p>
              <Link to={`/prenota?motivo=${r.key}`} className="btn btn-primary mt-5 no-underline">
                {r.cta}
              </Link>
            </section>
          );
        })}
      </div>
    </div>
  );
}
