import type {
  AdminCar,
  AdminUser,
  Booking,
  BookingStatus,
  Car,
  CarInput,
  CarPrices,
  Closure,
  NotificationSettings,
  InfoRequest,
  NewBooking,
  NewInfoRequest,
  OpeningHour,
  Service,
  SiteInfo,
  Slot,
} from '../../types';

/**
 * Tutto ciò che il sito chiede ai dati passa da qui.
 * Esistono due implementazioni: Google (Foglio + Apps Script, reale) e demo (dati di esempio in memoria).
 */
export interface Api {
  mode: 'demo' | 'google';

  /** Indirizzo pubblico di una foto salvata; width = larghezza utile in pixel (le miniature pesano meno) */
  photoUrl(path: string, width?: number): string;

  // ----- Pubblico -----
  listServices(): Promise<Service[]>;
  listCars(): Promise<Car[]>;
  getCar(id: string): Promise<Car | null>;
  getOpeningHours(): Promise<OpeningHour[]>;
  /** Telefono, indirizzo ecc. modificati dai gestori; null se non ancora salvati */
  getSiteInfo(): Promise<SiteInfo | null>;
  /** day = "YYYY-MM-DD" */
  getSlots(day: string, serviceId: string): Promise<Slot[]>;
  createBooking(input: NewBooking): Promise<void>;
  createInfoRequest(input: NewInfoRequest): Promise<void>;

  // ----- Accesso -----
  getSession(): Promise<AdminUser | null>;
  signIn(email: string, password: string): Promise<AdminUser>;
  signOut(): Promise<void>;
  /** Invia l'email per scegliere una nuova password (non rivela se l'indirizzo esiste) */
  requestPasswordReset(email: string): Promise<void>;
  /** Entra con il codice del link "password dimenticata" ricevuto per email */
  redeemResetToken(token: string): Promise<AdminUser>;
  /** true se il gestore è entrato con la password provvisoria o dal link "password dimenticata": deve sceglierne una nuova */
  isRecoverySession(): boolean;

  // ----- Area gestori -----
  adminListCars(): Promise<Car[]>;
  adminGetCar(id: string): Promise<AdminCar | null>;
  adminSaveCar(input: CarInput, isNew: boolean): Promise<void>;
  adminDeleteCar(id: string): Promise<void>;
  adminSetCarStatus(id: string, status: Car['status']): Promise<void>;
  adminSetCarPrices(id: string, prices: CarPrices): Promise<void>;
  adminUploadPhoto(carId: string, file: Blob, ext: string): Promise<string>;
  adminRemovePhotos(paths: string[]): Promise<void>;
  adminListBookings(): Promise<Booking[]>;
  /** email: esito dell'avviso al cliente ('none' = nessuna email prevista per questo stato) */
  adminSetBookingStatus(
    id: string,
    status: BookingStatus,
    reason?: string,
  ): Promise<{ email: 'sent' | 'failed' | 'none' }>;
  adminListRequests(): Promise<InfoRequest[]>;
  adminSetRequestHandled(id: string, handled: boolean): Promise<void>;
  adminSaveOpeningHours(hours: OpeningHour[]): Promise<void>;
  /** Chiusure da oggi in poi */
  adminListClosures(): Promise<Closure[]>;
  adminAddClosures(days: string[], reason: string): Promise<void>;
  adminDeleteClosure(day: string): Promise<void>;
  /** Tutti i servizi, anche quelli non attivi */
  adminListServices(): Promise<Service[]>;
  adminSaveService(id: string, changes: { duration_min: number; capacity: number }): Promise<void>;
  adminSaveSiteInfo(info: SiteInfo): Promise<void>;
  adminGetNotifications(): Promise<NotificationSettings>;
  adminSaveNotifications(settings: NotificationSettings): Promise<void>;
  /** Manda un'email di prova agli indirizzi indicati; restituisce quante ne sono partite */
  adminSendTestEmail(to: string[]): Promise<{ sent: number }>;
  /** currentPassword = null solo per chi è arrivato dal link "password dimenticata" */
  adminChangePassword(currentPassword: string | null, newPassword: string): Promise<void>;
}
