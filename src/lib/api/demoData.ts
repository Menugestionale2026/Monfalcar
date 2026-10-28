// Dati di esempio usati quando il sito non è ancora collegato a Google (modalità demo).
import type { AdminCar, Booking, InfoRequest, OpeningHour, Service } from '../../types';
import { addDaysKey, romeToDate, todayKey } from '../format';

export const demoServices: Service[] = [
  { id: 's-officina', slug: 'officina', name: 'Appuntamento in officina', category: 'officina', description: "Appuntamento per vedere l'auto e concordare il lavoro", duration_min: 30, capacity: 2, active: true, sort: 1 },
  { id: 's-valutazione', slug: 'valutazione', name: 'Valutazione della tua auto', category: 'acquisto', description: 'Valutazione per vendere la tua auto', duration_min: 30, capacity: 1, active: true, sort: 2 },
  { id: 's-test-drive', slug: 'test-drive', name: 'Test drive / Acquisto', category: 'vendita', description: "Prova e acquisto di un'auto", duration_min: 45, capacity: 1, active: true, sort: 3 },
  { id: 's-noleggio', slug: 'noleggio', name: 'Noleggio', category: 'noleggio', description: 'Noleggio auto', duration_min: 30, capacity: 1, active: true, sort: 4 },
];

const weekday = (weekdayNo: number, closed: boolean, opens: string | null, closes: string | null, bs: string | null, be: string | null): OpeningHour => ({
  weekday: weekdayNo, closed, opens, closes, break_start: bs, break_end: be,
});

export const demoHours: OpeningHour[] = [
  weekday(0, true, null, null, null, null),
  weekday(1, false, '08:30', '18:30', '12:30', '14:30'),
  weekday(2, false, '08:30', '18:30', '12:30', '14:30'),
  weekday(3, false, '08:30', '18:30', '12:30', '14:30'),
  weekday(4, false, '08:30', '18:30', '12:30', '14:30'),
  weekday(5, false, '08:30', '18:30', '12:30', '14:30'),
  weekday(6, true, null, null, null, null),
];

/** Credenziali dell'anteprima: servono solo a provare l'area gestori, non danno accesso a nulla di reale. */
export const DEMO_LOGIN = { email: 'gestore@monfalcar.it', password: 'Monfalcar2026' };

export const DEMO_SETTINGS = { slotMinutes: 30, minNoticeHours: 12, maxDaysAhead: 60 };

type CarSeed = Omit<AdminCar, 'id' | 'created_at' | 'photos' | 'plate'> & { plate?: string };

const base = {
  version: null, power_kw: null, color: null, body_type: null, doors: 5, seats: 5,
  rate_day: null, rate_week: null, rate_month: null, description: null, features: [] as string[],
  featured: false, status: 'disponibile' as const,
};

const seeds: CarSeed[] = [
  { ...base, title: 'Fiat Panda 1.0 Hybrid', brand: 'Fiat', model: 'Panda', year: 2021, km: 38000, fuel: 'Ibrida', gearbox: 'Manuale', service_type: 'vendita', price: 11900, featured: true, body_type: 'City car', power_kw: 51, color: 'Bianco', description: 'Auto in ottime condizioni, tagliandi regolari, ideale per la città.', features: ['Climatizzatore', 'Bluetooth', 'Sensori di parcheggio', 'Cerchi in lega'] },
  { ...base, title: 'Volkswagen Golf 2.0 TDI', brand: 'Volkswagen', model: 'Golf', year: 2019, km: 72000, fuel: 'Diesel', gearbox: 'Manuale', service_type: 'vendita', price: 17500, featured: true, body_type: 'Berlina', power_kw: 110, color: 'Grigio', description: 'Berlina compatta, comoda anche sui lunghi viaggi.', features: ['Navigatore', 'Cruise control', 'Fari LED'] },
  { ...base, title: 'Toyota Yaris Hybrid', brand: 'Toyota', model: 'Yaris', year: 2022, km: 25000, fuel: 'Ibrida', gearbox: 'Automatico', service_type: 'noleggio', price: null, rate_day: 45, rate_week: 270, rate_month: 850, featured: true, body_type: 'City car', power_kw: 85, color: 'Blu', description: 'Consumi ridotti e cambio automatico: perfetta per il noleggio.', features: ['Cambio automatico', 'Retrocamera', 'Apple CarPlay'] },
  { ...base, title: 'Peugeot 208 PureTech', brand: 'Peugeot', model: '208', year: 2020, km: 54000, fuel: 'Benzina', gearbox: 'Manuale', service_type: 'entrambi', price: 12800, rate_day: 39, rate_week: 230, rate_month: 720, body_type: 'City car', power_kw: 60, color: 'Rosso', features: ['Climatizzatore', 'Schermo touch'] },
  { ...base, title: 'BMW Serie 1 118d', brand: 'BMW', model: 'Serie 1', year: 2018, km: 98000, fuel: 'Diesel', gearbox: 'Automatico', service_type: 'vendita', price: 16200, status: 'venduta', body_type: 'Berlina', power_kw: 110, color: 'Nero', features: ['Navigatore', 'Sedili sportivi'] },
  { ...base, title: 'Renault Clio 1.0 TCe GPL', brand: 'Renault', model: 'Clio', year: 2021, km: 41000, fuel: 'GPL', gearbox: 'Manuale', service_type: 'vendita', price: 12400, body_type: 'City car', power_kw: 74, color: 'Arancione', features: ['Climatizzatore', 'Cruise control'] },
  { ...base, title: 'Ford Focus SW 1.5 EcoBlue', brand: 'Ford', model: 'Focus', year: 2020, km: 66000, fuel: 'Diesel', gearbox: 'Manuale', service_type: 'noleggio', price: null, rate_day: 49, rate_week: 290, rate_month: 890, body_type: 'Station wagon', power_kw: 88, color: 'Grigio', description: 'Station wagon spaziosa, ottima per famiglie e per chi viaggia con bagagli.', features: ['Bagagliaio ampio', 'Sensori di parcheggio'] },
  { ...base, title: 'Fiat 500e', brand: 'Fiat', model: '500', year: 2022, km: 18000, fuel: 'Elettrica', gearbox: 'Automatico', service_type: 'entrambi', price: 17900, rate_day: 59, rate_week: 350, rate_month: 1050, doors: 3, seats: 4, body_type: 'City car', power_kw: 87, color: 'Verde', features: ['Cambio automatico', 'Schermo touch', 'Cerchi in lega'] },
];

export function makeDemoCars(): AdminCar[] {
  const now = Date.now();
  return seeds.map((s, i) => ({
    ...s,
    id: `car-${i + 1}`,
    plate: s.plate ?? '',
    photos: [],
    created_at: new Date(now - i * 86400000).toISOString(),
  }));
}

export function makeDemoBookings(): Booking[] {
  const today = todayKey();
  const mk = (
    id: string, dayOffset: number, hm: string, service: Service, name: string, email: string, phone: string,
    status: Booking['status'], details: Record<string, string>, carId: string | null = null, carTitle: string | null = null,
    note: string | null = null,
  ): Booking => {
    const start = romeToDate(addDaysKey(today, dayOffset), hm);
    return {
      id, start_at: start.toISOString(), end_at: new Date(start.getTime() + service.duration_min * 60000).toISOString(),
      status, customer_note: note, details, reject_reason: null, created_at: new Date().toISOString(),
      service: { id: service.id, name: service.name, slug: service.slug, category: service.category },
      customer: { full_name: name, email, phone },
      car: carId && carTitle ? { id: carId, title: carTitle } : null,
    };
  };
  const [off, val, td, noleg] = demoServices;
  return [
    mk('b1', 1, '09:00', off, 'Giulia Moretti', 'giulia@example.com', '333 1234567', 'in_attesa', { problema: 'Rumore dai freni anteriori', targa: 'GM123AB', veicolo: 'Fiat Punto' }),
    mk('b2', 2, '15:00', td, 'Paolo Ferri', 'paolo@example.com', '347 7654321', 'in_attesa', {}, 'car-2', 'Volkswagen Golf 2.0 TDI', 'Posso venire con mia moglie?'),
    mk('b3', 0, '10:30', off, 'Elena Conti', 'elena@example.com', '320 1112233', 'confermata', { problema: 'Tagliando', targa: 'EC456CD', veicolo: 'Renault Clio' }),
    mk('b4', 0, '16:00', val, 'Marco Gallo', 'marco@example.com', '339 9988776', 'confermata', { marca_modello: 'Audi A3', anno: '2016', km: '120000' }),
    mk('b5', 3, '09:30', noleg, 'Sara Villa', 'sara@example.com', '340 5554433', 'in_attesa', { data_ritiro: addDaysKey(today, 4), data_riconsegna: addDaysKey(today, 9) }, 'car-3', 'Toyota Yaris Hybrid'),
    mk('b6', -3, '11:00', off, 'Luca Neri', 'luca@example.com', '338 2223344', 'completata', { problema: 'Cambio olio', targa: 'LN789EF', veicolo: 'Ford Fiesta' }),
  ];
}

export function makeDemoRequests(): InfoRequest[] {
  return [
    { id: 'r1', car_id: 'car-1', car_title: 'Fiat Panda 1.0 Hybrid', name: 'Anna Rizzo', email: 'anna@example.com', phone: '331 0001122', message: "È possibile avere più foto dell'interno?", handled: false, created_at: new Date().toISOString() },
    { id: 'r2', car_id: null, car_title: null, name: 'Davide Bruno', email: 'davide@example.com', phone: null, message: 'Fate il noleggio a lungo termine per le aziende?', handled: true, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ];
}
