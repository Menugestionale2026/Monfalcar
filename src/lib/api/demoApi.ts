import { ApiError } from '../errors';
import { uuid } from '../uuid';
import { addDaysKey, hm, romeToDate, todayKey, weekdayOf } from '../format';
import type { Api } from './types';
import type { AdminCar, Booking, Car, Closure, InfoRequest, NotificationSettings, SiteInfo, Slot } from '../../types';
import {
  DEMO_LOGIN,
  DEMO_SETTINGS,
  demoHours,
  demoServices,
  makeDemoBookings,
  makeDemoCars,
  makeDemoRequests,
} from './demoData';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const toPublicCar = (c: AdminCar): Car => {
  const { plate: _plate, ...car } = c;
  void _plate;
  return car;
};

/** Dati in memoria: si azzerano ricaricando la pagina. Nessuna email viene inviata. */
export function createDemoApi(): Api {
  const cars: AdminCar[] = makeDemoCars();
  const bookings: Booking[] = makeDemoBookings();
  const requests: InfoRequest[] = makeDemoRequests();
  let hours = clone(demoHours);
  let closures: Closure[] = [];
  const services = clone(demoServices);
  let signedIn = false;
  let demoPassword = DEMO_LOGIN.password;
  let siteInfo: SiteInfo | null = null;
  let notifications: NotificationSettings = { emails: '', on_booking: true, on_request: true };

  const minutes = (t: string): number => {
    const [h, m] = hm(t).split(':').map(Number);
    return h * 60 + m;
  };
  const clock = (mins: number): string =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  function slotsFor(day: string, serviceId: string): Slot[] {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return [];
    const today = todayKey();
    if (day < today || day > addDaysKey(today, DEMO_SETTINGS.maxDaysAhead)) return [];
    if (closures.some((c) => c.day === day)) return [];
    const oh = hours.find((h) => h.weekday === weekdayOf(day));
    if (!oh || oh.closed || !oh.opens || !oh.closes) return [];

    const out: Slot[] = [];
    const closes = minutes(oh.closes);
    const minStart = Date.now() + DEMO_SETTINGS.minNoticeHours * 3600000;
    for (let t = minutes(oh.opens); t + svc.duration_min <= closes; t += DEMO_SETTINGS.slotMinutes) {
      const end = t + svc.duration_min;
      if (oh.break_start && oh.break_end && t < minutes(oh.break_end) && end > minutes(oh.break_start)) continue;
      const start = romeToDate(day, clock(t));
      const endDate = new Date(start.getTime() + svc.duration_min * 60000);
      const used = bookings.filter(
        (b) =>
          b.service.id === serviceId &&
          (b.status === 'in_attesa' || b.status === 'confermata') &&
          new Date(b.start_at) < endDate &&
          new Date(b.end_at) > start,
      ).length;
      out.push({ start: start.toISOString(), available: used < svc.capacity && start.getTime() >= minStart });
    }
    return out;
  }

  return {
    mode: 'demo',

    photoUrl: (path) => path,

    async listServices() {
      return clone(services.filter((s) => s.active));
    },
    async listCars() {
      return clone(cars.filter((c) => c.status !== 'non_disponibile').map(toPublicCar));
    },
    async getCar(id) {
      const car = cars.find((c) => c.id === id && c.status !== 'non_disponibile');
      return car ? clone(toPublicCar(car)) : null;
    },
    async getOpeningHours() {
      return clone(hours);
    },
    async getSiteInfo() {
      return siteInfo ? clone(siteInfo) : null;
    },
    async getSlots(day, serviceId) {
      return slotsFor(day, serviceId);
    },
    async createBooking(input) {
      if (!input.consentPrivacy) throw new ApiError('consent_required');
      const svc = services.find((s) => s.id === input.serviceId);
      // controllo disponibilità sul giorno di Roma
      const dayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(input.start));
      const ok = slotsFor(dayStr, input.serviceId).find((s) => new Date(s.start).getTime() === new Date(input.start).getTime());
      if (!svc || !ok || !ok.available) throw new ApiError('slot_not_available');
      const car = cars.find((c) => c.id === input.carId);
      bookings.push({
        id: `b-${uuid()}`,
        start_at: input.start,
        end_at: new Date(new Date(input.start).getTime() + svc.duration_min * 60000).toISOString(),
        status: 'in_attesa',
        customer_note: input.note || null,
        details: input.details,
        reject_reason: null,
        created_at: new Date().toISOString(),
        service: { id: svc.id, name: svc.name, slug: svc.slug, category: svc.category },
        customer: { full_name: input.name, email: input.email, phone: input.phone },
        car: car ? { id: car.id, title: car.title } : null,
      });
    },
    async createInfoRequest(input) {
      if (!input.consent) throw new ApiError('consent_required');
      const car = cars.find((c) => c.id === input.carId);
      requests.unshift({
        id: `r-${uuid()}`,
        car_id: car?.id ?? null,
        car_title: car?.title ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        message: input.message || null,
        handled: false,
        created_at: new Date().toISOString(),
      });
    },

    async getSession() {
      return signedIn ? { id: 'demo', email: DEMO_LOGIN.email, displayName: 'Gestore demo', role: 'admin' } : null;
    },
    async signIn(email, password) {
      if (email.trim().toLowerCase() !== DEMO_LOGIN.email || password !== demoPassword) {
        throw new ApiError('invalid_credentials');
      }
      signedIn = true;
      return { id: 'demo', email: DEMO_LOGIN.email, displayName: 'Gestore demo', role: 'admin' };
    },
    async signOut() {
      signedIn = false;
    },
    async requestPasswordReset() {
      /* in anteprima non parte nessuna email */
    },
    async redeemResetToken() {
      throw new ApiError('invalid_credentials');
    },
    isRecoverySession() {
      return false;
    },

    async adminListCars() {
      return clone(cars.map(toPublicCar));
    },
    async adminGetCar(id) {
      const car = cars.find((c) => c.id === id);
      return car ? clone(car) : null;
    },
    async adminSaveCar(input, isNew) {
      if (isNew) {
        cars.unshift({ ...input, created_at: new Date().toISOString() });
      } else {
        const i = cars.findIndex((c) => c.id === input.id);
        if (i >= 0) cars[i] = { ...cars[i], ...input };
      }
    },
    async adminDeleteCar(id) {
      const i = cars.findIndex((c) => c.id === id);
      if (i >= 0) cars.splice(i, 1);
    },
    async adminSetCarStatus(id, status) {
      const car = cars.find((c) => c.id === id);
      if (car) car.status = status;
    },
    async adminSetCarPrices(id, prices) {
      const car = cars.find((c) => c.id === id);
      if (car) Object.assign(car, prices);
    },
    async adminUploadPhoto(_carId, file) {
      return URL.createObjectURL(file);
    },
    async adminRemovePhotos() {
      /* nulla da fare in demo */
    },
    async adminListBookings() {
      return clone([...bookings].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    },
    async adminSetBookingStatus(id, status, reason) {
      const b = bookings.find((x) => x.id === id);
      if (!b) return { email: 'none' };
      b.status = status;
      b.reject_reason = status === 'rifiutata' ? reason?.trim() || null : null;
      return { email: 'none' }; // in anteprima non parte nessuna email
    },
    async adminListRequests() {
      return clone(requests);
    },
    async adminSetRequestHandled(id, handled) {
      const r = requests.find((x) => x.id === id);
      if (r) r.handled = handled;
    },
    async adminSaveOpeningHours(next) {
      hours = clone(next);
    },
    async adminListClosures() {
      const today = todayKey();
      return clone(closures.filter((c) => c.day >= today).sort((a, b) => a.day.localeCompare(b.day)));
    },
    async adminAddClosures(days, reason) {
      for (const day of days) {
        closures = closures.filter((c) => c.day !== day);
        closures.push({ day, reason: reason.trim() || null });
      }
    },
    async adminDeleteClosure(day) {
      closures = closures.filter((c) => c.day !== day);
    },
    async adminListServices() {
      return clone(services);
    },
    async adminSaveService(id, changes) {
      const svc = services.find((s) => s.id === id);
      if (svc) Object.assign(svc, changes);
    },
    async adminSaveSiteInfo(info) {
      siteInfo = clone(info);
    },
    async adminGetNotifications() {
      return clone(notifications);
    },
    async adminSaveNotifications(settings) {
      notifications = clone(settings);
    },
    async adminSendTestEmail(to) {
      if (to.length === 0) throw new ApiError('no_recipients');
      return { sent: to.length }; // in anteprima non parte nessuna email
    },
    async adminChangePassword(currentPassword, newPassword) {
      if (currentPassword !== null && currentPassword !== demoPassword) throw new ApiError('wrong_password');
      if (newPassword.length < 8) throw new ApiError('weak_password');
      demoPassword = newPassword;
    },
  };
}
