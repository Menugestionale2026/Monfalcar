import type { Service } from '../types';

export type ReasonKey = 'officina' | 'valutazione' | 'test-drive' | 'noleggio';

export interface Reason {
  key: ReasonKey;
  title: string;
  text: string;
  icon: 'wrench' | 'banknote' | 'car' | 'key';
  cta: string;
}

export const REASONS: Reason[] = [
  { key: 'officina', title: 'Officina', text: 'Prenota un appuntamento: vediamo l’auto e ti diciamo quando riportarla per il lavoro.', icon: 'wrench', cta: 'Prenota un appuntamento' },
  { key: 'valutazione', title: 'Vendi la tua auto', text: 'Valutiamo la tua auto e ti facciamo un’offerta.', icon: 'banknote', cta: 'Richiedi valutazione' },
  { key: 'test-drive', title: 'Test drive / Acquisto', text: 'Prova l’auto che ti piace, senza impegno.', icon: 'car', cta: 'Prenota test drive' },
  { key: 'noleggio', title: 'Noleggio', text: 'Auto a noleggio per un giorno, una settimana o più.', icon: 'key', cta: 'Chiedi disponibilità' },
];

export function isReasonKey(v: string | null): v is ReasonKey {
  return v === 'officina' || v === 'valutazione' || v === 'test-drive' || v === 'noleggio';
}

export interface DetailField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date';
  required: boolean;
  placeholder?: string;
  hint?: string;
}

/** Campi aggiuntivi chiesti per ogni motivo: finiscono in `details` della prenotazione. */
export const DETAIL_FIELDS: Record<ReasonKey, DetailField[]> = {
  officina: [
    { key: 'problema', label: 'Di cosa ha bisogno la tua auto?', type: 'textarea', required: true, placeholder: 'Es. tagliando, spia accesa, rumore dalle ruote anteriori…', hint: 'Racconta cosa succede: dopo aver visto l’auto ti diciamo noi tempi e costi.' },
    { key: 'veicolo', label: 'Marca e modello', type: 'text', required: true, placeholder: 'Es. Fiat Panda 2016' },
    { key: 'targa', label: 'Targa (facoltativa)', type: 'text', required: false, placeholder: 'AB123CD' },
  ],
  valutazione: [
    { key: 'marca_modello', label: 'Marca e modello', type: 'text', required: true, placeholder: 'Es. Volkswagen Golf 1.6 TDI' },
    { key: 'anno', label: 'Anno di immatricolazione', type: 'number', required: true, placeholder: '2018' },
    { key: 'km', label: 'Chilometri percorsi', type: 'number', required: true, placeholder: '85000' },
  ],
  'test-drive': [],
  noleggio: [
    { key: 'data_ritiro', label: 'Data di ritiro desiderata', type: 'date', required: false },
    { key: 'data_riconsegna', label: 'Data di riconsegna', type: 'date', required: false },
  ],
};

export function serviceForReason(services: Service[], key: ReasonKey): Service | undefined {
  return services.find((s) => s.slug === key);
}

/** Spiegazione mostrata al cliente prima di scegliere il giorno, per motivo. */
export const SLOT_INTRO: Partial<Record<ReasonKey, string>> = {
  officina:
    'Questo è un appuntamento per vedere l’auto, non la prenotazione del lavoro. Dopo averla vista ti diciamo noi quanto tempo serve e quando riportarla.',
};

export const DETAIL_LABELS: Record<string, string> = {
  problema: 'Richiesta',
  veicolo: 'Veicolo',
  targa: 'Targa',
  marca_modello: 'Auto da valutare',
  anno: 'Anno',
  km: 'Chilometri',
  data_ritiro: 'Ritiro',
  data_riconsegna: 'Riconsegna',
  auto: 'Auto',
};
