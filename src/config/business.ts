// =====================================================================
// DATI DELL'AZIENDA - da completare prima della pubblicazione.
// I valori tra parentesi quadre sono segnaposto: sostituiscili con quelli reali.
// =====================================================================

export const business = {
  name: 'MONFALCAR',
  tagline: 'Officina meccanica, vendita e acquisto di auto, noleggio.',

  /** Telefono come si legge sul sito */
  phone: '[+39 000 000 0000]',
  /** Telefono per il link "Chiama": solo cifre, con prefisso (es. +390481123456) */
  phoneLink: '',
  /** Numero WhatsApp: solo cifre, con prefisso internazionale e senza + (es. 390481123456) */
  whatsapp: '',
  email: '[info@dominio.it]',

  address: '[Via e numero civico]',
  city: '[CAP Città]',
  vat: '[P.IVA 00000000000]',

  /** Coordinate per la mappa (da Google Maps: tasto destro sul punto). Lascia null per nascondere la mappa. */
  map: { lat: null as number | null, lon: null as number | null },

  /** Tempo di risposta mostrato nei messaggi del sito */
  replyTime: 'entro il giorno lavorativo successivo',
};

export interface Testimonial {
  quote: string;
  name: string;
  service: string;
}

// Testimonianze: aggiungi solo recensioni reali, con il consenso dei clienti.
// Finché l'elenco è vuoto la sezione non compare sul sito. Esempio:
//   { quote: 'Servizio rapido e prezzo chiaro.', name: 'Mario R.', service: 'Officina' },
export const testimonials: Testimonial[] = [];

/** Link "Chiama": undefined finché il numero non è stato inserito (il link resta inattivo). */
export const phoneHref = (): string | undefined => (business.phoneLink ? `tel:${business.phoneLink}` : undefined);
export const whatsappHref = (text?: string): string | undefined =>
  business.whatsapp
    ? `https://wa.me/${business.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
    : undefined;

// Punti di forza mostrati nella Home. Modificali in modo che raccontino solo cose vere per MONFALCAR.
export const strengths: { title: string; text: string }[] = [
  { title: 'Un solo posto per tutto', text: 'Officina, auto in vendita, acquisto della tua auto usata e noleggio: ti seguiamo noi dall’inizio alla fine.' },
  { title: 'Prezzi chiari prima di iniziare', text: 'Ti spieghiamo cosa serve e quanto costa prima di toccare l’auto, senza sorprese sul conto.' },
  { title: 'Prenoti quando vuoi', text: 'Scegli giorno e ora online, anche di sera dal telefono. Ti rispondiamo con una conferma.' },
  { title: 'Parli con persone vere', text: 'Telefono, WhatsApp o di persona: nessun call center, sempre lo stesso interlocutore.' },
];

// Testo della sezione finale della Home
export const ctaBand = {
  title: 'Hai bisogno di una mano con la tua auto?',
  text: 'Prenota online in due minuti oppure chiamaci: ti rispondiamo noi.',
};
