export type ApiErrorCode =
  | 'slot_not_available'
  | 'too_many_pending'
  | 'too_many_requests'
  | 'consent_required'
  | 'invalid_input'
  | 'invalid_credentials'
  | 'locked'
  | 'session_expired'
  | 'network'
  | 'wrong_password'
  | 'weak_password'
  | 'email_rejected'
  | 'no_recipients'
  | 'unknown';

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}

const MESSAGES: Record<ApiErrorCode, string> = {
  slot_not_available: "Questo orario non è più disponibile. Scegline un altro.",
  too_many_pending:
    'Hai già diverse richieste in attesa di risposta. Attendi la nostra conferma oppure chiamaci.',
  too_many_requests: 'Ci sono troppe richieste in questo momento. Riprova tra un po’ oppure chiamaci.',
  consent_required: 'Per continuare conferma di aver letto l’informativa privacy.',
  invalid_input: 'Controlla i dati inseriti: qualcosa non è corretto.',
  invalid_credentials: 'Email o password non corrette.',
  locked: 'Troppi tentativi sbagliati. Riprova tra 15 minuti oppure usa “Password dimenticata?”.',
  session_expired: 'L’accesso è scaduto. Accedi di nuovo per continuare.',
  network:
    'Non riesco a collegarmi ai dati del sito. Controlla la connessione e riprova; se il problema resta, chiamaci.',
  wrong_password: 'La password attuale non è corretta.',
  weak_password: 'La nuova password è troppo debole: usa almeno 8 caratteri, meglio se con lettere e numeri.',
  email_rejected:
    'Gmail non ha accettato l’invio. Controlla che gli indirizzi siano scritti bene; se continua, apri il Foglio Google e guarda il “Registro email”.',
  no_recipients: 'Scrivi almeno un indirizzo email valido.',
  unknown: 'Qualcosa non ha funzionato. Riprova tra poco oppure chiamaci.',
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code];
  return MESSAGES.unknown;
}

const KNOWN = Object.keys(MESSAGES) as ApiErrorCode[];

/** Trasforma il codice d'errore scritto dal servizio Google in un errore del sito. */
export function fromServerCode(code: unknown): ApiError {
  if (code === 'unauthorized') return new ApiError('session_expired');
  const c = typeof code === 'string' && (KNOWN as string[]).includes(code) ? (code as ApiErrorCode) : 'unknown';
  return new ApiError(c, typeof code === 'string' ? code : undefined);
}
