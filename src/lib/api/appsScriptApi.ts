import { ApiError, fromServerCode } from '../errors';
import type { Api } from './types';
import type {
  AdminCar,
  AdminUser,
  Booking,
  Car,
  CarInput,
  Closure,
  InfoRequest,
  NotificationSettings,
  OpeningHour,
  Service,
  SiteInfo,
  Slot,
} from '../../types';

const TOKEN_KEY = 'mf-admin-token';
const RECOVERY_KEY = 'mf-recovery';
const TIMEOUT_MS = 45_000;
const PUBLIC_CACHE_MS = 30_000;

/** Evento lanciato quando il server dice che l'accesso non vale più (scaduto, password cambiata altrove...). */
export const AUTH_LOST_EVENT = 'mf-auth-lost';

function readStore(store: 'local' | 'session', key: string): string | null {
  try {
    return (store === 'local' ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}
function writeStore(store: 'local' | 'session', key: string, value: string | null): void {
  try {
    const s = store === 'local' ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* archivio del browser non disponibile: l'accesso dura solo finché la pagina resta aperta */
  }
}

// Se il browser non permette di salvare, il codice resta almeno in memoria.
let memoryToken: string | null = null;
const getToken = (): string | null => readStore('local', TOKEN_KEY) ?? memoryToken;
const setToken = (t: string | null): void => {
  memoryToken = t;
  writeStore('local', TOKEN_KEY, t);
};
let memoryRecovery = false;
const getRecovery = (): boolean => readStore('session', RECOVERY_KEY) === '1' || memoryRecovery;
const setRecovery = (on: boolean): void => {
  memoryRecovery = on;
  writeStore('session', RECOVERY_KEY, on ? '1' : null);
};

const blank = (s: string | null | undefined): string => (s ?? '').trim();

/**
 * Il sito parla con un Foglio Google tramite uno script (Google Apps Script).
 * Ogni richiesta è un POST con corpo in testo semplice: così il browser non fa la richiesta di controllo preliminare
 * (che Google non gestisce). La risposta è sempre JSON: {ok:true,d:...} oppure {ok:false,e:"codice"}.
 */
export function createAppsScriptApi(endpoint: string): Api {
  const cache = new Map<string, { at: number; value: Promise<unknown> }>();

  async function rawCall<T>(action: string, params: unknown, authenticated: boolean): Promise<T> {
    const token = authenticated ? getToken() : null;
    if (authenticated && !token) {
      throw new ApiError('session_expired');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let body: { ok: boolean; d?: unknown; e?: string };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ a: action, p: params ?? {}, t: token }),
        redirect: 'follow',
        credentials: 'omit',
        signal: controller.signal,
      });
      body = (await res.json()) as typeof body;
    } catch {
      throw new ApiError('network');
    } finally {
      clearTimeout(timer);
    }
    if (!body || typeof body !== 'object' || typeof body.ok !== 'boolean') throw new ApiError('network');
    if (!body.ok) {
      const err = fromServerCode(body.e);
      if (body.e === 'unauthorized') {
        setToken(null);
        setRecovery(false);
        cache.clear();
        window.dispatchEvent(new Event(AUTH_LOST_EVENT));
      }
      throw err;
    }
    return body.d as T;
  }

  /** Letture pubbliche: stessa richiesta fatta due volte in 30 secondi = una sola chiamata. */
  function publicRead<T>(action: string, params?: unknown): Promise<T> {
    const key = action + JSON.stringify(params ?? {});
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < PUBLIC_CACHE_MS) return hit.value as Promise<T>;
    const value = rawCall<T>(action, params, false);
    cache.set(key, { at: Date.now(), value });
    value.catch(() => {
      if (cache.get(key)?.value === value) cache.delete(key);
    });
    return value;
  }

  const adminCall = async <T>(action: string, params?: unknown): Promise<T> => {
    // Dopo una modifica le letture pubbliche si rifanno: chi modifica deve subito vedere il risultato.
    cache.clear();
    return rawCall<T>(action, params, true);
  };
  const adminRead = <T>(action: string, params?: unknown): Promise<T> => rawCall<T>(action, params, true);

  const unwrapUser = (u: AdminUser): AdminUser => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName || u.email,
    role: u.role === 'admin' ? 'admin' : 'operatore',
  });

  return {
    mode: 'google',

    photoUrl(path, width = 1200) {
      if (path.startsWith('drive:')) {
        return `https://lh3.googleusercontent.com/d/${encodeURIComponent(path.slice(6))}=w${Math.round(width)}`;
      }
      return path;
    },

    // ----- Pubblico -----
    listServices: () => publicRead<Service[]>('services'),
    listCars: () => publicRead<Car[]>('cars'),
    getCar: (id) => publicRead<Car | null>('car', { id }),
    getOpeningHours: () => publicRead<OpeningHour[]>('hours'),
    getSiteInfo: () => publicRead<SiteInfo | null>('siteInfo'),
    getSlots: (day, serviceId) => rawCall<Slot[]>('slots', { day, serviceId }, false),
    async createBooking(input) {
      await rawCall('createBooking', input, false);
      cache.clear();
    },
    async createInfoRequest(input) {
      await rawCall('createInfoRequest', input, false);
    },

    // ----- Accesso -----
    async getSession() {
      if (!getToken()) return null;
      try {
        const s = await rawCall<{ user: AdminUser; recovery: boolean } | null>('session', {}, true);
        if (!s) {
          setToken(null);
          setRecovery(false);
          return null;
        }
        setRecovery(!!s.recovery);
        return unwrapUser(s.user);
      } catch (err) {
        // Se il servizio non risponde l'accesso resta salvato: si riprova al prossimo caricamento.
        if (err instanceof ApiError && err.code === 'network') throw err;
        return null;
      }
    },

    async signIn(email, password) {
      const r = await rawCall<{ token: string; user: AdminUser; mustChange: boolean }>(
        'login',
        { email: email.trim(), password },
        false,
      );
      setToken(r.token);
      setRecovery(!!r.mustChange);
      return unwrapUser(r.user);
    },

    async signOut() {
      const had = getToken();
      setToken(null);
      setRecovery(false);
      cache.clear();
      if (had) {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ a: 'logout', p: {}, t: had }),
            credentials: 'omit',
          });
        } catch {
          /* il codice locale è già stato cancellato: va bene lo stesso */
        }
      }
    },

    async requestPasswordReset(email) {
      await rawCall('requestReset', { email: email.trim() }, false);
    },

    async redeemResetToken(token) {
      const r = await rawCall<{ token: string; user: AdminUser }>('redeemReset', { token }, false);
      setToken(r.token);
      setRecovery(true);
      return unwrapUser(r.user);
    },

    isRecoverySession: () => getRecovery(),

    // ----- Area gestori -----
    adminListCars: () => adminRead<Car[]>('a.cars'),
    adminGetCar: (id) => adminRead<AdminCar | null>('a.car', { id }),
    async adminSaveCar(input: CarInput, isNew: boolean) {
      await adminCall('a.saveCar', { car: input, isNew });
    },
    async adminDeleteCar(id) {
      await adminCall('a.deleteCar', { id });
    },
    async adminSetCarStatus(id, status) {
      await adminCall('a.setCarStatus', { id, status });
    },
    async adminSetCarPrices(id, prices) {
      await adminCall('a.setCarPrices', { id, prices });
    },
    async adminUploadPhoto(carId, file) {
      const data = await blobToBase64(file);
      return adminCall<string>('a.uploadPhoto', { carId, mime: file.type || 'image/jpeg', data });
    },
    async adminRemovePhotos(paths) {
      if (paths.length === 0) return;
      await adminCall('a.removePhotos', { paths });
    },
    adminListBookings: () => adminRead<Booking[]>('a.bookings'),
    async adminSetBookingStatus(id, status, reason) {
      const r = await adminCall<{ email: 'sent' | 'failed' | 'none' }>('a.setBookingStatus', {
        id,
        status,
        reason: blank(reason),
      });
      return { email: r?.email ?? 'none' };
    },
    adminListRequests: () => adminRead<InfoRequest[]>('a.requests'),
    async adminSetRequestHandled(id, handled) {
      await adminCall('a.setRequestHandled', { id, handled });
    },
    async adminSaveOpeningHours(hours) {
      await adminCall('a.saveHours', { hours });
    },
    adminListClosures: () => adminRead<Closure[]>('a.closures'),
    async adminAddClosures(days, reason) {
      await adminCall('a.addClosures', { days, reason: blank(reason) });
    },
    async adminDeleteClosure(day) {
      await adminCall('a.deleteClosure', { day });
    },
    adminListServices: () => adminRead<Service[]>('a.services'),
    async adminSaveService(id, changes) {
      await adminCall('a.saveService', { id, ...changes });
    },
    async adminSaveSiteInfo(info) {
      await adminCall('a.saveSiteInfo', { info });
    },
    adminGetNotifications: () => adminRead<NotificationSettings>('a.getNotifications'),
    async adminSaveNotifications(settings) {
      await adminCall('a.saveNotifications', { settings });
    },
    async adminSendTestEmail(to) {
      const r = await adminCall<{ sent: number }>('a.testEmail', { to });
      return { sent: Number(r?.sent ?? 0) };
    },
    async adminChangePassword(currentPassword, newPassword) {
      await adminCall('a.changePassword', { current: currentPassword, next: newPassword });
      setRecovery(false);
    },
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError('unknown'));
    reader.onload = () => {
      const s = String(reader.result ?? '');
      const comma = s.indexOf(',');
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.readAsDataURL(blob);
  });
}
