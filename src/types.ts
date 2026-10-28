export type ServiceCategory = 'officina' | 'vendita' | 'acquisto' | 'noleggio';

export interface Service {
  id: string;
  slug: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  duration_min: number;
  capacity: number;
  active: boolean;
  sort: number;
}

export type CarServiceType = 'vendita' | 'noleggio' | 'entrambi';
export type CarStatus = 'disponibile' | 'venduta' | 'a_noleggio' | 'non_disponibile';

export interface Car {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  km: number | null;
  fuel: string | null;
  gearbox: string | null;
  power_kw: number | null;
  color: string | null;
  body_type: string | null;
  doors: number | null;
  seats: number | null;
  service_type: CarServiceType;
  price: number | null;
  rate_day: number | null;
  rate_week: number | null;
  rate_month: number | null;
  status: CarStatus;
  description: string | null;
  features: string[];
  photos: string[];
  featured: boolean;
  created_at: string;
}

/** Auto come la vede il gestore: include la targa interna. */
export interface AdminCar extends Car {
  plate: string;
}

/** Dati salvati dal modulo auto (l'id è generato dal sito). */
export type CarInput = Omit<AdminCar, 'created_at'>;

export type BookingStatus = 'in_attesa' | 'confermata' | 'rifiutata' | 'completata' | 'annullata';

export interface Booking {
  id: string;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  customer_note: string | null;
  details: Record<string, string>;
  reject_reason: string | null;
  created_at: string;
  service: { id: string; name: string; slug: string; category: ServiceCategory };
  customer: { full_name: string; email: string; phone: string };
  car: { id: string; title: string } | null;
}

export interface InfoRequest {
  id: string;
  car_id: string | null;
  car_title: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  handled: boolean;
  created_at: string;
}

/** weekday: 0 = domenica ... 6 = sabato. Gli orari sono "HH:mm". */
export interface OpeningHour {
  weekday: number;
  closed: boolean;
  opens: string | null;
  closes: string | null;
  break_start: string | null;
  break_end: string | null;
}

/** Giorno di chiusura straordinaria (ferie, festivi). day = "YYYY-MM-DD" */
export interface Closure {
  day: string;
  reason: string | null;
}

export interface Slot {
  /** Istante di inizio, ISO 8601 */
  start: string;
  available: boolean;
}

export interface NewBooking {
  serviceId: string;
  carId: string | null;
  start: string;
  name: string;
  email: string;
  phone: string;
  note: string;
  details: Record<string, string>;
  consentPrivacy: boolean;
  consentMarketing: boolean;
}

export interface NewInfoRequest {
  carId: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operatore';
}

/** Dati dell'attività modificabili dall'area gestori. Un campo vuoto = si usa il valore di riserva del sito. */
export interface SiteInfo {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  vat: string;
  reply_time: string;
  map_lat: number | null;
  map_lon: number | null;
}

/** A chi arrivano gli avvisi email e per cosa. `emails` = indirizzi separati da virgola o a capo. */
export interface NotificationSettings {
  emails: string;
  on_booking: boolean;
  on_request: boolean;
}

/** Prezzi modificabili dall'elenco auto. */
export interface CarPrices {
  price: number | null;
  rate_day: number | null;
  rate_week: number | null;
  rate_month: number | null;
}
