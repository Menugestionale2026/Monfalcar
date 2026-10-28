/**
 * MONFALCAR - servizio dati su Google
 * ===================================
 * Fogli Google (archivio) + Apps Script (questo file) + Gmail (email) + Drive (foto delle auto).
 * Tutto gratuito, con un solo account Google. Le istruzioni passo passo sono nel README del progetto.
 *
 * Come funziona: il sito (su GitHub Pages) chiama l'indirizzo "app web" di questo script.
 * Le azioni pubbliche (elenco auto, orari liberi, nuova prenotazione) non richiedono accesso;
 * tutto il resto richiede l'accesso di un gestore (email + password).
 *
 * Dopo aver incollato questo file: ricarica il Foglio e usa il menu MONFALCAR > "1. Prima configurazione".
 */

/* ============================== Costanti ============================== */

var TZ = 'Europe/Rome';
var SESSION_DAYS = 14;        // durata dell'accesso dei gestori
var RESET_MINUTES = 30;       // validità del link "password dimenticata"
var LOGIN_MAX_FAILS = 5;      // tentativi sbagliati prima del blocco
var LOGIN_LOCK_MINUTES = 15;  // durata del blocco
var PW_ITERATIONS = 1200;     // ripetizioni dell'hash della password
var MIN_PASSWORD = 8;
var MAX_RECIPIENTS = 5;
var MAX_PHOTO_BYTES = 8 * 1024 * 1024;
var LOG_KEEP = 500;           // righe massime del Registro email

var WEEKDAYS_IT = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
var MONTHS_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

var CAR_STATUSES = ['disponibile', 'venduta', 'a_noleggio', 'non_disponibile'];
var CAR_TYPES = ['vendita', 'noleggio', 'entrambi'];
var BOOKING_STATUSES = ['in_attesa', 'confermata', 'rifiutata', 'completata', 'annullata'];
var SERVICE_CATEGORIES = ['officina', 'vendita', 'acquisto', 'noleggio'];

/* ============================== Struttura dei fogli ==============================
 * Per ogni foglio: [campo, titolo della colonna, tipo, valore di riserva]
 * Tipi: s testo, n numero, b sì/no, j elenco/oggetto (JSON), t data e ora (ora di Roma)
 */
var SHEETS = {
  cars: {
    name: 'Auto',
    cols: [
      ['id', 'ID (non modificare)', 's'],
      ['title', 'Titolo', 's'],
      ['brand', 'Marca', 's'],
      ['model', 'Modello', 's'],
      ['version', 'Versione', 's'],
      ['year', 'Anno', 'n'],
      ['km', 'Km', 'n'],
      ['fuel', 'Carburante', 's'],
      ['gearbox', 'Cambio', 's'],
      ['power_kw', 'Potenza kW', 'n'],
      ['color', 'Colore', 's'],
      ['body_type', 'Carrozzeria', 's'],
      ['doors', 'Porte', 'n'],
      ['seats', 'Posti', 'n'],
      ['service_type', 'Tipo (vendita / noleggio / entrambi)', 's'],
      ['price', 'Prezzo di vendita €', 'n'],
      ['rate_day', 'Noleggio €/giorno', 'n'],
      ['rate_week', 'Noleggio €/settimana', 'n'],
      ['rate_month', 'Noleggio €/mese', 'n'],
      ['status', 'Stato (disponibile / venduta / a_noleggio / non_disponibile)', 's'],
      ['description', 'Descrizione', 's'],
      ['features', 'Dotazioni', 'j', []],
      ['photos', 'Foto', 'j', []],
      ['featured', 'In evidenza', 'b'],
      ['plate', 'Targa (privata)', 's'],
      ['created_at', 'Creata il', 't'],
      ['updated_at', 'Modificata il', 't']
    ]
  },
  bookings: {
    name: 'Prenotazioni',
    cols: [
      ['id', 'ID (non modificare)', 's'],
      ['created_at', 'Ricevuta il', 't'],
      ['status', 'Stato', 's'],
      ['service_id', 'ID servizio', 's'],
      ['service_name', 'Servizio', 's'],
      ['customer_name', 'Cliente', 's'],
      ['customer_email', 'Email', 's'],
      ['customer_phone', 'Telefono', 's'],
      ['start_at', 'Inizio', 't'],
      ['end_at', 'Fine', 't'],
      ['car_id', 'ID auto', 's'],
      ['car_title', 'Auto', 's'],
      ['note', 'Nota del cliente', 's'],
      ['details', 'Dettagli', 'j', {}],
      ['reject_reason', 'Motivo del rifiuto', 's'],
      ['handled_by', 'Gestita da', 's'],
      ['handled_at', 'Gestita il', 't'],
      ['reminder_sent_at', 'Promemoria inviato il', 't'],
      ['consent_marketing', 'Consenso marketing', 'b']
    ]
  },
  requests: {
    name: 'Richieste',
    cols: [
      ['id', 'ID (non modificare)', 's'],
      ['created_at', 'Ricevuta il', 't'],
      ['car_id', 'ID auto', 's'],
      ['car_title', 'Auto', 's'],
      ['name', 'Nome', 's'],
      ['email', 'Email', 's'],
      ['phone', 'Telefono', 's'],
      ['message', 'Messaggio', 's'],
      ['handled', 'Gestita', 'b']
    ]
  },
  services: {
    name: 'Servizi',
    cols: [
      ['id', 'ID (non modificare)', 's'],
      ['slug', 'Codice', 's'],
      ['name', 'Nome', 's'],
      ['category', 'Categoria', 's'],
      ['description', 'Descrizione', 's'],
      ['duration_min', 'Durata (minuti)', 'n'],
      ['capacity', 'Appuntamenti contemporanei', 'n'],
      ['active', 'Attivo', 'b'],
      ['sort', 'Ordine', 'n']
    ]
  },
  hours: {
    name: 'Orari',
    cols: [
      ['weekday', 'Giorno (0 = domenica ... 6 = sabato)', 'n'],
      ['day_name', 'Nome del giorno', 's'],
      ['closed', 'Chiuso', 'b'],
      ['opens', 'Apre', 's'],
      ['closes', 'Chiude', 's'],
      ['break_start', 'Pausa dalle', 's'],
      ['break_end', 'Pausa alle', 's']
    ]
  },
  closures: {
    name: 'Chiusure',
    cols: [
      ['day', 'Giorno (AAAA-MM-GG)', 's'],
      ['reason', 'Motivo', 's']
    ]
  },
  siteinfo: {
    name: 'Dati attività',
    kv: true,
    cols: [['key', 'Campo', 's'], ['value', 'Valore', 's'], ['label', 'Descrizione', 's']]
  },
  settings: {
    name: 'Impostazioni',
    kv: true,
    cols: [['key', 'Impostazione', 's'], ['value', 'Valore', 's'], ['label', 'Descrizione', 's']]
  },
  admins: {
    name: 'Gestori',
    cols: [
      ['id', 'ID', 's'],
      ['email', 'Email', 's'],
      ['name', 'Nome', 's'],
      ['role', 'Ruolo (admin / operatore)', 's'],
      ['salt', 'Sale (non modificare)', 's'],
      ['hash', 'Password cifrata (non modificare)', 's'],
      ['must_change', 'Deve cambiare la password', 'b'],
      ['fails', 'Tentativi sbagliati', 'n'],
      ['locked_until', 'Bloccato fino a', 't'],
      ['created_at', 'Creato il', 't']
    ]
  },
  sessions: {
    name: 'Sessioni',
    hidden: true, // contiene solo codici cifrati: meglio non averli sotto gli occhi
    cols: [
      ['token_hash', 'Codice cifrato', 's'],
      ['kind', 'Tipo', 's'],
      ['admin_id', 'ID gestore', 's'],
      ['expires_at', 'Scade il', 't'],
      ['recovery', 'Da password dimenticata', 'b'],
      ['created_at', 'Creata il', 't']
    ]
  },
  log: {
    name: 'Registro email',
    cols: [
      ['at', 'Quando', 't'],
      ['kind', 'Tipo', 's'],
      ['to', 'A', 's'],
      ['subject', 'Oggetto', 's'],
      ['result', 'Esito', 's'],
      ['detail', 'Dettaglio', 's']
    ]
  }
};

var SETTINGS_SEED = [
  ['slot_minutes', '30', 'Ogni quanti minuti parte un orario prenotabile'],
  ['min_notice_hours', '12', 'Preavviso minimo per prenotare (ore)'],
  ['max_days_ahead', '60', 'Quanti giorni in anticipo si può prenotare'],
  ['business_name', 'MONFALCAR', 'Nome dell\'attività nelle email'],
  ['site_url', '', 'Indirizzo del sito, per i link nelle email (es. https://nome.github.io/sito/)'],
  ['notif_emails', '', 'Indirizzi che ricevono gli avvisi: si cambiano dal sito, pagina Notifiche'],
  ['notif_on_booking', 'sì', 'Avviso per ogni nuova prenotazione'],
  ['notif_on_request', 'sì', 'Avviso per ogni nuova richiesta di informazioni']
];

var SITEINFO_SEED = [
  ['phone', 'Telefono'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email di contatto'],
  ['address', 'Indirizzo'],
  ['city', 'CAP e città'],
  ['vat', 'Partita IVA'],
  ['reply_time', 'Frase sui tempi di risposta'],
  ['map_lat', 'Latitudine della mappa'],
  ['map_lon', 'Longitudine della mappa']
];

var SERVICES_SEED = [
  ['officina', 'Appuntamento in officina', 'officina', 'Appuntamento per vedere l\'auto e concordare il lavoro', 30, 2, 1],
  ['valutazione', 'Valutazione della tua auto', 'acquisto', 'Valutazione per vendere la tua auto', 30, 1, 2],
  ['test-drive', 'Test drive / Acquisto', 'vendita', 'Prova e acquisto di un\'auto', 45, 1, 3],
  ['noleggio', 'Noleggio', 'noleggio', 'Noleggio auto', 30, 1, 4]
];

// 0 = domenica ... 6 = sabato. Sabato e domenica chiuso; orari feriali di esempio da adattare.
var HOURS_SEED = [
  [0, true, '', '', '', ''],
  [1, false, '08:30', '18:30', '12:30', '14:30'],
  [2, false, '08:30', '18:30', '12:30', '14:30'],
  [3, false, '08:30', '18:30', '12:30', '14:30'],
  [4, false, '08:30', '18:30', '12:30', '14:30'],
  [5, false, '08:30', '18:30', '12:30', '14:30'],
  [6, true, '', '', '', '']
];

/* ============================== Utilità ============================== */

function now_() {
  return new Date();
}

function fail_(code, detail) {
  var e = new Error(detail || code);
  e.code = code;
  throw e;
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Testo ripulito; se supera la lunghezza massima la richiesta è respinta. */
function str_(v, max) {
  var s = v === null || v === undefined ? '' : String(v);
  s = s.replace(/^\s+|\s+$/g, '');
  if (max && s.length > max) fail_('invalid_input');
  return s;
}

function parseNum_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var t = String(v).replace(/[€\s]/g, '');
  if (t === '') return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
  else t = t.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

function parseBool_(v) {
  if (typeof v === 'boolean') return v;
  return /^(s|sì|si|true|vero|yes|y|x|1)$/i.test(String(v === null || v === undefined ? '' : v).trim());
}

function sha256hex_(s) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var v = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    out += (v < 16 ? '0' : '') + v.toString(16);
  }
  return out;
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function safeEqual_(a, b) {
  a = String(a);
  b = String(b);
  var diff = a.length ^ b.length;
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function hashPassword_(password, salt) {
  var h = salt + '|' + password;
  for (var i = 0; i < PW_ITERATIONS; i++) h = sha256hex_(h + '|' + salt);
  return h;
}

var EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Da un testo con indirizzi separati da virgola, punto e virgola, spazi o a capo: solo quelli validi, senza doppioni. */
function parseRecipients_(text, max) {
  var out = [];
  var parts = String(text === null || text === undefined ? '' : text).split(/[\s,;]+/);
  for (var i = 0; i < parts.length; i++) {
    var e = parts[i].trim().toLowerCase();
    if (e && EMAIL_RE.test(e) && out.indexOf(e) < 0) out.push(e);
    if (out.length >= (max || MAX_RECIPIENTS)) break;
  }
  return out;
}

/* ---------- Date e ore (sempre all'ora di Roma) ---------- */

function tzOffsetMs_(date) {
  var s = Utilities.formatDate(date, TZ, 'yyyy-MM-dd HH:mm:ss');
  var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  var asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Istante corrispondente a un giorno ("2026-11-09") e un'ora ("08:30") di Roma. */
function romeToDate_(day, hm, seconds) {
  var d = day.split('-');
  var t = hm.split(':');
  var guess = Date.UTC(+d[0], +d[1] - 1, +d[2], +t[0], +t[1], seconds || 0);
  var off1 = tzOffsetMs_(new Date(guess));
  var ms = guess - off1;
  var off2 = tzOffsetMs_(new Date(ms));
  if (off2 !== off1) ms = guess - off2;
  return new Date(ms);
}

function dayKey_(date) {
  return Utilities.formatDate(date, TZ, 'yyyy-MM-dd');
}

function todayKey_() {
  return dayKey_(now_());
}

function addDays_(key, days) {
  var d = new Date(key + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf_(key) {
  return new Date(key + 'T12:00:00Z').getUTCDay();
}

function validDay_(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key))) return false;
  var d = new Date(key + 'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/** Orario "HH:mm" da un testo (o da una data, se il Foglio l'ha convertita). Vuoto se non valido. */
function normTime_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  var m = /^(\d{1,2}):(\d{2})/.exec(String(v).trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return '';
  return pad2_(+m[1]) + ':' + m[2];
}

function minutes_(hm) {
  var t = hm.split(':');
  return +t[0] * 60 + +t[1];
}

function clock_(mins) {
  return pad2_(Math.floor(mins / 60)) + ':' + pad2_(mins % 60);
}

/** Testo per il Foglio: "2026-11-09 08:30:00" (ora di Roma). */
function fmtLocal_(v) {
  if (v === null || v === undefined || v === '') return '';
  var d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd HH:mm:ss');
}

/** Legge una data dal Foglio: testo locale "2026-11-09 08:30[:00]", testo ISO oppure data. */
function parseLocal_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  var s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    var iso = new Date(s);
    return isNaN(iso.getTime()) ? null : iso;
  }
  var m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  return romeToDate_(m[1], m[2], m[3] ? +m[3] : 0);
}

function dateIt_(iso) {
  var d = new Date(iso);
  var key = dayKey_(d);
  var p = key.split('-');
  return WEEKDAYS_IT[weekdayOf_(key)] + ' ' + +p[2] + ' ' + MONTHS_IT[+p[1] - 1] + ' ' + p[0];
}

function timeIt_(iso) {
  return Utilities.formatDate(new Date(iso), TZ, 'HH:mm');
}

/* ============================== Accesso ai fogli ============================== */

var tableCache_ = {};
var lockDepth_ = 0;

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function spreadsheet_() {
  var id = prop_('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) fail_('unknown', 'Foglio non collegato: usa il menu MONFALCAR > Prima configurazione');
  return active;
}

function sheet_(key) {
  var sh = spreadsheet_().getSheetByName(SHEETS[key].name);
  if (!sh) fail_('unknown', 'Manca il foglio "' + SHEETS[key].name + '": usa il menu MONFALCAR > Prima configurazione');
  return sh;
}

function withLock_(fn) {
  if (lockDepth_ > 0) return fn();
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {
    fail_('too_many_requests');
  }
  lockDepth_++;
  tableCache_ = {}; // dopo aver ottenuto il blocco si rileggono i dati: nel frattempo un'altra richiesta può averli cambiati
  try {
    return fn();
  } finally {
    lockDepth_--;
    lock.releaseLock();
  }
}

function fromCell_(col, v) {
  switch (col[2]) {
    case 'n':
      return parseNum_(v);
    case 'b':
      return parseBool_(v);
    case 'j':
      try {
        var x = JSON.parse(String(v === null || v === undefined ? '' : v));
        return x === null || x === undefined ? col[3] : x;
      } catch (e) {
        return col[3] === undefined ? null : JSON.parse(JSON.stringify(col[3]));
      }
    case 't':
      var d = parseLocal_(v);
      return d ? d.toISOString() : null;
    default:
      if (v === null || v === undefined) return '';
      if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
      return String(v);
  }
}

function toCell_(col, v) {
  if (v === null || v === undefined) return '';
  switch (col[2]) {
    case 'n':
      return String(v);
    case 'b':
      return v ? 'sì' : 'no';
    case 'j':
      return JSON.stringify(v);
    case 't':
      return fmtLocal_(v);
    default:
      return String(v);
  }
}

/** Tutte le righe di un foglio come oggetti (con _row = numero di riga). */
function readAll_(key) {
  if (tableCache_[key]) return tableCache_[key];
  var spec = SHEETS[key];
  var sh = sheet_(key);
  var last = sh.getLastRow();
  var rows = [];
  if (last >= 2) {
    var values = sh.getRange(2, 1, last - 1, spec.cols.length).getValues();
    for (var i = 0; i < values.length; i++) {
      var first = values[i][0];
      var blank = true;
      for (var c = 0; c < values[i].length; c++) {
        if (values[i][c] !== '' && values[i][c] !== null) {
          blank = false;
          break;
        }
      }
      if (blank || (first === '' && !spec.kv && key !== 'log')) continue;
      var o = { _row: i + 2 };
      for (var k = 0; k < spec.cols.length; k++) o[spec.cols[k][0]] = fromCell_(spec.cols[k], values[i][k]);
      rows.push(o);
    }
  }
  tableCache_[key] = rows;
  return rows;
}

function ensureSize_(sh, rows, cols) {
  if (sh.getMaxRows() < rows) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows() + 200);
  if (sh.getMaxColumns() < cols) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
}

function rowValues_(key, obj) {
  var cols = SHEETS[key].cols;
  var out = [];
  for (var i = 0; i < cols.length; i++) out.push(toCell_(cols[i], obj[cols[i][0]]));
  return out;
}

function writeRow_(key, rowNumber, obj) {
  var sh = sheet_(key);
  var values = rowValues_(key, obj);
  ensureSize_(sh, rowNumber, values.length);
  var rng = sh.getRange(rowNumber, 1, 1, values.length);
  rng.setNumberFormat('@'); // tutto come testo: il Foglio non converte date, numeri o formule
  rng.setValues([values]);
  delete tableCache_[key];
}

function appendRow_(key, obj) {
  var sh = sheet_(key);
  writeRow_(key, Math.max(sh.getLastRow(), 1) + 1, obj);
}

function updateRow_(key, obj) {
  writeRow_(key, obj._row, obj);
}

function deleteRow_(key, rowNumber) {
  sheet_(key).deleteRow(rowNumber);
  delete tableCache_[key];
}

function findBy_(key, field, value) {
  var rows = readAll_(key);
  for (var i = 0; i < rows.length; i++) if (rows[i][field] === value) return rows[i];
  return null;
}

/* ---------- Fogli chiave/valore (Impostazioni, Dati attività) ---------- */

function kv_(key) {
  var out = {};
  var rows = readAll_(key);
  for (var i = 0; i < rows.length; i++) out[rows[i].key] = rows[i].value;
  return out;
}

function setKv_(key, values) {
  withLock_(function () {
    var rows = readAll_(key);
    Object.keys(values).forEach(function (k) {
      var found = null;
      for (var i = 0; i < rows.length; i++) if (rows[i].key === k) found = rows[i];
      if (found) {
        found.value = String(values[k]);
        updateRow_(key, found);
      } else {
        appendRow_(key, { key: k, value: String(values[k]), label: '' });
      }
      rows = readAll_(key);
    });
  });
}

function setting_(name, fallback) {
  var v = kv_('settings')[name];
  return v === undefined || v === '' ? fallback : v;
}

function intSetting_(name, fallback, min, max) {
  var n = parseNum_(setting_(name, ''));
  if (n === null || n < min || n > max) return fallback;
  return Math.round(n);
}

/* ============================== Prima configurazione ============================== */

function createSheetIfMissing_(ss, key) {
  var spec = SHEETS[key];
  var sh = ss.getSheetByName(spec.name);
  if (sh) return sh;
  sh = ss.insertSheet(spec.name);
  ensureSize_(sh, 1000, spec.cols.length);
  var headers = [];
  for (var i = 0; i < spec.cols.length; i++) headers.push(spec.cols[i][1]);
  var head = sh.getRange(1, 1, 1, headers.length);
  head.setNumberFormat('@');
  head.setValues([headers]);
  head.setFontWeight('bold');
  head.setBackground('#01427F');
  head.setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  // Dalla seconda riga in giù tutto è testo: il Foglio non converte date, numeri o formule.
  sh.getRange(2, 1, sh.getMaxRows() - 1, spec.cols.length).setNumberFormat('@');
  if (spec.hidden) sh.hideSheet();
  return sh;
}

function randomPassword_() {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  var u = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  var out = '';
  for (var i = 0; i < 12; i++) {
    out += alphabet.charAt(parseInt(u.substr(i * 2, 2), 16) % alphabet.length);
    if (i === 3 || i === 7) out += '-';
  }
  return out;
}

/** Aggiunge un gestore con una password provvisoria (da cambiare al primo accesso). Restituisce la password. */
function createAdmin_(email, name, role) {
  var mail = str_(email, 200).toLowerCase();
  if (!EMAIL_RE.test(mail)) fail_('invalid_input');
  var temp = randomPassword_();
  var salt = newToken_().slice(0, 24);
  withLock_(function () {
    var existing = findBy_('admins', 'email', mail);
    var row = existing || { id: Utilities.getUuid(), created_at: now_().toISOString(), fails: 0 };
    row.email = mail;
    row.name = str_(name, 100) || mail;
    row.role = role === 'operatore' ? 'operatore' : 'admin';
    row.salt = salt;
    row.hash = hashPassword_(temp, salt);
    row.must_change = true;
    row.fails = 0;
    row.locked_until = null;
    if (existing) updateRow_('admins', row);
    else appendRow_('admins', row);
    removeSessionsOf_(row.id);
  });
  return temp;
}

function removeSessionsOf_(adminId, exceptHash) {
  var rows = readAll_('sessions');
  for (var i = rows.length - 1; i >= 0; i--) {
    if (rows[i].admin_id === adminId && rows[i].token_hash !== exceptHash) deleteRow_('sessions', rows[i]._row);
  }
}

function ownerEmail_() {
  var saved = prop_('OWNER_EMAIL');
  if (saved) return saved;
  var mail = '';
  try {
    mail = Session.getEffectiveUser().getEmail();
  } catch (e) {
    mail = '';
  }
  return mail ? mail.toLowerCase() : '';
}

/**
 * Crea fogli, dati iniziali, cartella foto, primo gestore e promemoria automatici. Si può rilanciare senza perdere dati.
 * opts = { adminEmail, adminName, siteUrl }
 */
function setup_(opts) {
  opts = opts || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet() || spreadsheet_();
  setProp_('SHEET_ID', ss.getId());
  tableCache_ = {};

  var order = ['cars', 'bookings', 'requests', 'services', 'hours', 'closures', 'siteinfo', 'settings', 'admins', 'sessions', 'log'];
  order.forEach(function (key) {
    createSheetIfMissing_(ss, key);
  });
  // Il foglio vuoto iniziale non serve più
  var blank = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() <= 1 && blank.getLastColumn() <= 1) {
    try {
      ss.deleteSheet(blank);
    } catch (e) {
      /* pazienza */
    }
  }

  var owner = ownerEmail_() || str_(opts.adminEmail, 200).toLowerCase();
  if (owner) setProp_('OWNER_EMAIL', owner);

  withLock_(function () {
    if (readAll_('services').length === 0) {
      SERVICES_SEED.forEach(function (s) {
        appendRow_('services', {
          id: Utilities.getUuid(), slug: s[0], name: s[1], category: s[2], description: s[3],
          duration_min: s[4], capacity: s[5], active: true, sort: s[6]
        });
      });
    }
    if (readAll_('hours').length === 0) {
      HOURS_SEED.forEach(function (h) {
        appendRow_('hours', {
          weekday: h[0], day_name: WEEKDAYS_IT[h[0]], closed: h[1], opens: h[2], closes: h[3], break_start: h[4], break_end: h[5]
        });
      });
    }
    var have = kv_('settings');
    SETTINGS_SEED.forEach(function (s) {
      if (have[s[0]] === undefined) appendRow_('settings', { key: s[0], value: s[1], label: s[2] });
    });
    var haveInfo = kv_('siteinfo');
    SITEINFO_SEED.forEach(function (s) {
      if (haveInfo[s[0]] === undefined) appendRow_('siteinfo', { key: s[0], value: '', label: s[1] });
    });
  });

  if (opts.siteUrl) setKv_('settings', { site_url: normalizeSiteUrl_(opts.siteUrl) });

  // Cartella per le foto delle auto
  if (!prop_('PHOTO_FOLDER_ID')) {
    var folder = DriveApp.createFolder('MONFALCAR - foto delle auto');
    setProp_('PHOTO_FOLDER_ID', folder.getId());
  }

  // Primo gestore
  var result = { tempPassword: null, adminEmail: null };
  if (readAll_('admins').length === 0) {
    var email = str_(opts.adminEmail, 200).toLowerCase() || owner;
    if (!EMAIL_RE.test(email)) fail_('invalid_input', 'Serve l\'indirizzo email del primo gestore');
    result.tempPassword = createAdmin_(email, str_(opts.adminName, 100) || 'Titolare', 'admin');
    result.adminEmail = email;
    // Gli avvisi di nuove prenotazioni arrivano alla casella che il gestore legge davvero (anche se non è Gmail,
    // per esempio una casella aziendale Libero): la Gmail che ospita il Foglio potrebbe non essere letta da nessuno.
    if (!setting_('notif_emails', '')) setKv_('settings', { notif_emails: email });
  }

  installTriggers_();
  return result;
}

function normalizeSiteUrl_(url) {
  var u = str_(url, 300);
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/*$/, '/');
}

function installTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendReminders') return;
  }
  ScriptApp.newTrigger('sendReminders').timeBased().everyHours(1).create();
}

/* ============================== Endpoint web ============================== */

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'MONFALCAR' })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  tableCache_ = {};
  lockDepth_ = 0;
  var out;
  try {
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, d: dispatch_(req) };
  } catch (err) {
    var code = err && err.code ? err.code : 'unknown';
    if (code === 'unknown') {
      console.error('Errore imprevisto: ' + (err && err.stack ? err.stack : err));
    }
    out = { ok: false, e: code };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function own_(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function dispatch_(req) {
  var action = String(req.a || '');
  var p = req.p && typeof req.p === 'object' ? req.p : {};
  if (own_(PUBLIC_ACTIONS, action)) return PUBLIC_ACTIONS[action](p);
  if (own_(AUTH_ACTIONS, action)) return AUTH_ACTIONS[action](p, req.t);
  if (own_(ADMIN_ACTIONS, action)) {
    var who = authenticate_(req.t);
    return ADMIN_ACTIONS[action](p, who);
  }
  fail_('invalid_input');
}

/* ============================== Dati pubblici ============================== */

function toPublicCar_(c) {
  return {
    id: c.id, title: c.title, brand: c.brand || null, model: c.model || null, version: c.version || null,
    year: c.year, km: c.km, fuel: c.fuel || null, gearbox: c.gearbox || null, power_kw: c.power_kw,
    color: c.color || null, body_type: c.body_type || null, doors: c.doors, seats: c.seats,
    service_type: CAR_TYPES.indexOf(c.service_type) >= 0 ? c.service_type : 'vendita',
    price: c.price, rate_day: c.rate_day, rate_week: c.rate_week, rate_month: c.rate_month,
    status: CAR_STATUSES.indexOf(c.status) >= 0 ? c.status : 'disponibile',
    description: c.description || null,
    features: Array.isArray(c.features) ? c.features : [],
    photos: Array.isArray(c.photos) ? c.photos : [],
    featured: !!c.featured,
    created_at: c.created_at || new Date(0).toISOString()
  };
}

function toService_(s) {
  return {
    id: s.id, slug: s.slug, name: s.name, category: SERVICE_CATEGORIES.indexOf(s.category) >= 0 ? s.category : 'officina',
    description: s.description || null, duration_min: s.duration_min || 30, capacity: s.capacity || 1,
    active: !!s.active, sort: s.sort || 0
  };
}

function sortedServices_(onlyActive) {
  return readAll_('services')
    .filter(function (s) { return !onlyActive || s.active; })
    .map(toService_)
    .sort(function (a, b) { return a.sort - b.sort; });
}

function findService_(id, onlyActive) {
  var rows = sortedServices_(onlyActive);
  for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
  return null;
}

function hoursList_() {
  var rows = readAll_('hours');
  var out = [];
  for (var wd = 0; wd <= 6; wd++) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].weekday === wd) r = rows[i];
    var closed = r ? !!r.closed : true;
    var opens = r ? normTime_(r.opens) : '';
    var closes = r ? normTime_(r.closes) : '';
    var bs = r ? normTime_(r.break_start) : '';
    var be = r ? normTime_(r.break_end) : '';
    out.push({
      weekday: wd, closed: closed || !opens || !closes,
      opens: closed ? null : opens || null, closes: closed ? null : closes || null,
      break_start: closed || !bs || !be ? null : bs, break_end: closed || !bs || !be ? null : be
    });
  }
  return out;
}

function siteInfoObject_() {
  var v = kv_('siteinfo');
  var lat = parseNum_(v.map_lat);
  var lon = parseNum_(v.map_lon);
  return {
    phone: v.phone || '', whatsapp: v.whatsapp || '', email: v.email || '', address: v.address || '', city: v.city || '',
    vat: v.vat || '', reply_time: v.reply_time || '',
    map_lat: lat !== null && lon !== null ? lat : null, map_lon: lat !== null && lon !== null ? lon : null
  };
}

function slotsFor_(day, serviceId) {
  if (!validDay_(day)) return [];
  var svc = findService_(serviceId, true);
  if (!svc) return [];
  var today = todayKey_();
  var maxAhead = intSetting_('max_days_ahead', 60, 1, 365);
  if (day < today || day > addDays_(today, maxAhead)) return [];
  var closures = readAll_('closures');
  for (var c = 0; c < closures.length; c++) if (closures[c].day === day) return [];
  var oh = hoursList_()[weekdayOf_(day)];
  if (!oh || oh.closed || !oh.opens || !oh.closes) return [];

  var step = intSetting_('slot_minutes', 30, 5, 240);
  var notice = intSetting_('min_notice_hours', 12, 0, 1000);
  var minStart = now_().getTime() + notice * 3600000;
  var closeMin = minutes_(oh.closes);
  var breakStart = oh.break_start ? minutes_(oh.break_start) : null;
  var breakEnd = oh.break_end ? minutes_(oh.break_end) : null;
  var bookings = readAll_('bookings').filter(function (b) {
    return b.service_id === serviceId && (b.status === 'in_attesa' || b.status === 'confermata') && b.start_at && b.end_at;
  });

  var out = [];
  for (var t = minutes_(oh.opens); t + svc.duration_min <= closeMin; t += step) {
    var end = t + svc.duration_min;
    if (breakStart !== null && t < breakEnd && end > breakStart) continue;
    var start = romeToDate_(day, clock_(t));
    var endDate = new Date(start.getTime() + svc.duration_min * 60000);
    var used = 0;
    for (var i = 0; i < bookings.length; i++) {
      if (new Date(bookings[i].start_at) < endDate && new Date(bookings[i].end_at) > start) used++;
    }
    out.push({ start: start.toISOString(), available: used < svc.capacity && start.getTime() >= minStart });
  }
  return out;
}

var PUBLIC_ACTIONS = {
  services: function () {
    return sortedServices_(true);
  },
  cars: function () {
    return readAll_('cars')
      .filter(function (c) { return c.status !== 'non_disponibile'; })
      .map(toPublicCar_)
      .sort(function (a, b) {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return String(b.created_at).localeCompare(String(a.created_at));
      });
  },
  car: function (p) {
    var c = findBy_('cars', 'id', String(p.id || ''));
    return c && c.status !== 'non_disponibile' ? toPublicCar_(c) : null;
  },
  hours: function () {
    return hoursList_();
  },
  siteInfo: function () {
    return siteInfoObject_();
  },
  slots: function (p) {
    return slotsFor_(String(p.day || ''), String(p.serviceId || ''));
  },
  createBooking: function (p) {
    return createBooking_(p);
  },
  createInfoRequest: function (p) {
    return createInfoRequest_(p);
  }
};

/* ============================== Prenotazioni e richieste ============================== */

function countSince_(rows, field, ms) {
  var from = now_().getTime() - ms;
  var n = 0;
  for (var i = 0; i < rows.length; i++) {
    var t = rows[i][field] ? new Date(rows[i][field]).getTime() : 0;
    if (t > from) n++;
  }
  return n;
}

function cleanDetails_(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) fail_('invalid_input');
  var out = {};
  Object.keys(details).forEach(function (k) {
    var v = details[k];
    if (v === null || v === undefined) return;
    if (k.length > 40) fail_('invalid_input');
    out[k] = str_(v, 1000);
  });
  if (JSON.stringify(out).length > 4000) fail_('invalid_input');
  return out;
}

function createBooking_(p) {
  if (p.consentPrivacy !== true) fail_('consent_required');
  var name = str_(p.name, 100);
  var email = str_(p.email, 200).toLowerCase();
  var phone = str_(p.phone, 30);
  var note = str_(p.note, 1000);
  if (name.length < 2) fail_('invalid_input');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail_('invalid_input');
  if (phone.length < 6) fail_('invalid_input');
  var details = cleanDetails_(p.details === undefined ? {} : p.details);
  var start = new Date(String(p.start || ''));
  if (isNaN(start.getTime())) fail_('invalid_input');

  var booking = withLock_(function () {
    var all = readAll_('bookings');
    // tetto generale: protegge la casella dei gestori da raffiche di messaggi
    if (countSince_(all, 'created_at', 3600000) >= 30) fail_('too_many_requests');

    var svc = findService_(String(p.serviceId || ''), true);
    if (!svc) fail_('invalid_input');
    var car = null;
    if (p.carId) {
      car = findBy_('cars', 'id', String(p.carId));
      if (!car) fail_('invalid_input');
    }

    var slots = slotsFor_(dayKey_(start), svc.id);
    var ok = false;
    for (var i = 0; i < slots.length; i++) {
      if (new Date(slots[i].start).getTime() === start.getTime() && slots[i].available) ok = true;
    }
    if (!ok) fail_('slot_not_available');

    var pending = 0;
    var nowMs = now_().getTime();
    for (var j = 0; j < all.length; j++) {
      if (all[j].customer_email === email && all[j].status === 'in_attesa' && all[j].start_at && new Date(all[j].start_at).getTime() >= nowMs) pending++;
    }
    if (pending >= 3) fail_('too_many_pending');

    var row = {
      id: Utilities.getUuid(), created_at: now_().toISOString(), status: 'in_attesa',
      service_id: svc.id, service_name: svc.name, customer_name: name, customer_email: email, customer_phone: phone,
      start_at: start.toISOString(), end_at: new Date(start.getTime() + svc.duration_min * 60000).toISOString(),
      car_id: car ? car.id : '', car_title: car ? car.title : '', note: note, details: details,
      reject_reason: '', handled_by: '', handled_at: null, reminder_sent_at: null,
      consent_marketing: p.consentMarketing === true
    };
    appendRow_('bookings', row);
    return row;
  });

  // Le email partono dopo il salvataggio: se falliscono la prenotazione resta valida (e c'è il Registro email).
  try {
    notifyNewBooking_(booking, findService_(booking.service_id, false));
  } catch (err) {
    console.error('Email per nuova prenotazione non inviate: ' + err);
  }
  return null;
}

function createInfoRequest_(p) {
  if (p.consent !== true) fail_('consent_required');
  var name = str_(p.name, 100);
  var email = str_(p.email, 200).toLowerCase();
  var phone = str_(p.phone, 30);
  var message = str_(p.message, 2000);
  if (name.length < 2) fail_('invalid_input');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail_('invalid_input');

  var row = withLock_(function () {
    var all = readAll_('requests');
    var sameEmail = all.filter(function (r) { return String(r.email).toLowerCase() === email; });
    if (countSince_(sameEmail, 'created_at', 86400000) >= 5) fail_('too_many_requests');
    if (countSince_(all, 'created_at', 3600000) >= 30) fail_('too_many_requests');
    var car = p.carId ? findBy_('cars', 'id', String(p.carId)) : null;
    var r = {
      id: Utilities.getUuid(), created_at: now_().toISOString(), car_id: car ? car.id : '', car_title: car ? car.title : '',
      name: name, email: email, phone: phone, message: message, handled: false
    };
    appendRow_('requests', r);
    return r;
  });

  try {
    notifyNewRequest_(row);
  } catch (err) {
    console.error('Email per nuova richiesta non inviata: ' + err);
  }
  return null;
}

/* ============================== Accesso gestori ============================== */

function adminUser_(a) {
  return { id: a.id, email: a.email, displayName: a.name || a.email, role: a.role === 'operatore' ? 'operatore' : 'admin' };
}

function newSession_(adminId, kind, minutesValid, recovery) {
  var token = newToken_();
  appendRow_('sessions', {
    token_hash: sha256hex_(token), kind: kind, admin_id: adminId,
    expires_at: new Date(now_().getTime() + minutesValid * 60000).toISOString(),
    recovery: !!recovery, created_at: now_().toISOString()
  });
  return token;
}

/** Controlla il codice di accesso e restituisce { admin, session }; altrimenti errore "unauthorized". */
function authenticate_(token) {
  if (!token || typeof token !== 'string' || token.length < 20) fail_('unauthorized');
  var hash = sha256hex_(token);
  var nowMs = now_().getTime();
  var rows = readAll_('sessions');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].kind === 'sessione' && rows[i].token_hash === hash) {
      if (!rows[i].expires_at || new Date(rows[i].expires_at).getTime() <= nowMs) fail_('unauthorized');
      var admin = findBy_('admins', 'id', rows[i].admin_id);
      if (!admin) fail_('unauthorized');
      return { admin: admin, session: rows[i], hash: hash };
    }
  }
  fail_('unauthorized');
}

function cleanupSessions_() {
  var nowMs = now_().getTime();
  var rows = readAll_('sessions');
  for (var i = rows.length - 1; i >= 0; i--) {
    if (!rows[i].expires_at || new Date(rows[i].expires_at).getTime() <= nowMs) deleteRow_('sessions', rows[i]._row);
  }
}

var AUTH_ACTIONS = {
  login: function (p) {
    var email = str_(p.email, 200).toLowerCase();
    var password = typeof p.password === 'string' ? p.password : '';
    if (!email || !password || password.length > 200) fail_('invalid_credentials');
    var admin = findBy_('admins', 'email', email);
    var nowMs = now_().getTime();
    if (admin && admin.locked_until && new Date(admin.locked_until).getTime() > nowMs) fail_('locked');
    var good = admin ? safeEqual_(hashPassword_(password, admin.salt), admin.hash) : (hashPassword_(password, 'x'), false);
    return withLock_(function () {
      if (!good) {
        if (admin) {
          var fresh = findBy_('admins', 'id', admin.id);
          if (fresh) {
            fresh.fails = (fresh.fails || 0) + 1;
            if (fresh.fails >= LOGIN_MAX_FAILS) {
              fresh.fails = 0;
              fresh.locked_until = new Date(nowMs + LOGIN_LOCK_MINUTES * 60000).toISOString();
            }
            updateRow_('admins', fresh);
          }
        }
        fail_('invalid_credentials');
      }
      var cur = findBy_('admins', 'id', admin.id);
      if (!cur) fail_('invalid_credentials');
      if (cur.fails || cur.locked_until) {
        cur.fails = 0;
        cur.locked_until = null;
        updateRow_('admins', cur);
      }
      cleanupSessions_();
      var token = newSession_(cur.id, 'sessione', SESSION_DAYS * 24 * 60, !!cur.must_change);
      return { token: token, user: adminUser_(cur), mustChange: !!cur.must_change };
    });
  },

  session: function (p, token) {
    try {
      var who = authenticate_(token);
      return { user: adminUser_(who.admin), recovery: !!who.session.recovery };
    } catch (err) {
      if (err && err.code === 'unauthorized') return null;
      throw err;
    }
  },

  logout: function (p, token) {
    if (typeof token !== 'string' || token.length < 20) return null;
    var hash = sha256hex_(token);
    withLock_(function () {
      var rows = readAll_('sessions');
      for (var i = 0; i < rows.length; i++) if (rows[i].token_hash === hash) deleteRow_('sessions', rows[i]._row);
    });
    return null;
  },

  // Non rivela se l'indirizzo esiste. Il link va sempre all'indirizzo del sito salvato in Impostazioni (mai a uno scelto da chi chiama).
  requestReset: function (p) {
    var email = str_(p.email, 200).toLowerCase();
    var admin = email ? findBy_('admins', 'email', email) : null;
    var site = normalizeSiteUrl_(setting_('site_url', ''));
    if (!admin || !site) return null;
    var token = withLock_(function () {
      var recent = readAll_('sessions').filter(function (s) { return s.kind === 'reset' && s.admin_id === admin.id; });
      if (countSince_(recent, 'created_at', 3600000) >= 3) return null;
      return newSession_(admin.id, 'reset', RESET_MINUTES, true);
    });
    if (!token) return null;
    var link = site + 'admin/login?reset=' + token;
    var blocks = [
      { p: 'Ciao ' + (admin.name || '') + ',' },
      { p: 'hai chiesto di scegliere una nuova password per l\'area riservata di ' + business_().name + '.' },
      { p: 'Apri questo link entro ' + RESET_MINUTES + ' minuti: ' + link },
      { p: 'Se non sei stato tu, ignora questa email: la tua password resta quella di prima.' }
    ];
    sendMail_([admin.email], 'Scegli una nuova password - ' + business_().name, blocks, null, 'password');
    return null;
  },

  redeemReset: function (p) {
    var token = typeof p.token === 'string' ? p.token : '';
    if (token.length < 20) fail_('invalid_credentials');
    var hash = sha256hex_(token);
    return withLock_(function () {
      var rows = readAll_('sessions');
      var found = null;
      for (var i = 0; i < rows.length; i++) if (rows[i].kind === 'reset' && rows[i].token_hash === hash) found = rows[i];
      if (!found) fail_('invalid_credentials');
      deleteRow_('sessions', found._row); // il link vale una volta sola
      if (!found.expires_at || new Date(found.expires_at).getTime() <= now_().getTime()) fail_('invalid_credentials');
      var admin = findBy_('admins', 'id', found.admin_id);
      if (!admin) fail_('invalid_credentials');
      var session = newSession_(admin.id, 'sessione', SESSION_DAYS * 24 * 60, true);
      return { token: session, user: adminUser_(admin) };
    });
  }
};

/* ============================== Area gestori ============================== */

function optNum_(v, min, max, integer, decimals) {
  if (v === null || v === undefined || v === '') return null;
  var n = typeof v === 'number' ? v : parseNum_(v);
  if (n === null || !isFinite(n) || n < min || n > max) fail_('invalid_input');
  if (integer) return Math.round(n);
  var f = Math.pow(10, decimals === undefined ? 2 : decimals);
  return Math.round(n * f) / f;
}

function optPhoto_(v) {
  var s = str_(v, 300);
  if (!/^(drive:[A-Za-z0-9_-]+|https?:\/\/\S+)$/.test(s)) fail_('invalid_input');
  return s;
}

function cleanCar_(input) {
  if (!input || typeof input !== 'object') fail_('invalid_input');
  var id = str_(input.id, 80);
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(id)) fail_('invalid_input');
  var title = str_(input.title, 200);
  if (!title) fail_('invalid_input');
  var status = str_(input.status, 30);
  var type = str_(input.service_type, 30);
  if (CAR_STATUSES.indexOf(status) < 0 || CAR_TYPES.indexOf(type) < 0) fail_('invalid_input');
  var features = Array.isArray(input.features) ? input.features : [];
  var photos = Array.isArray(input.photos) ? input.photos : [];
  if (features.length > 40 || photos.length > 30) fail_('invalid_input');
  var feats = [];
  features.forEach(function (f) {
    var t = str_(f, 100);
    if (t) feats.push(t);
  });
  return {
    id: id, title: title, brand: str_(input.brand, 100), model: str_(input.model, 100), version: str_(input.version, 100),
    year: optNum_(input.year, 1950, 2100, true), km: optNum_(input.km, 0, 5000000, true),
    fuel: str_(input.fuel, 100), gearbox: str_(input.gearbox, 100), power_kw: optNum_(input.power_kw, 0, 5000, true),
    color: str_(input.color, 100), body_type: str_(input.body_type, 100),
    doors: optNum_(input.doors, 0, 20, true), seats: optNum_(input.seats, 0, 100, true),
    service_type: type, price: optNum_(input.price, 0, 100000000, false),
    rate_day: optNum_(input.rate_day, 0, 100000000, false), rate_week: optNum_(input.rate_week, 0, 100000000, false),
    rate_month: optNum_(input.rate_month, 0, 100000000, false),
    status: status, description: str_(input.description, 5000), features: feats, photos: photos.map(optPhoto_),
    featured: input.featured === true, plate: str_(input.plate, 20)
  };
}

function cleanPrices_(prices) {
  if (!prices || typeof prices !== 'object') fail_('invalid_input');
  return {
    price: optNum_(prices.price, 0, 100000000, false),
    rate_day: optNum_(prices.rate_day, 0, 100000000, false),
    rate_week: optNum_(prices.rate_week, 0, 100000000, false),
    rate_month: optNum_(prices.rate_month, 0, 100000000, false)
  };
}

function trashPhotos_(paths) {
  (paths || []).forEach(function (path) {
    var m = /^drive:([A-Za-z0-9_-]+)$/.exec(String(path));
    if (!m) return;
    try {
      DriveApp.getFileById(m[1]).setTrashed(true);
    } catch (err) {
      console.warn('Foto non rimossa da Drive: ' + path);
    }
  });
}

function toBooking_(b) {
  var svc = findService_(b.service_id, false);
  return {
    id: b.id, start_at: b.start_at, end_at: b.end_at, status: BOOKING_STATUSES.indexOf(b.status) >= 0 ? b.status : 'in_attesa',
    customer_note: b.note || null, details: b.details && typeof b.details === 'object' ? b.details : {},
    reject_reason: b.reject_reason || null, created_at: b.created_at,
    service: {
      id: b.service_id, name: svc ? svc.name : b.service_name, slug: svc ? svc.slug : '',
      category: svc ? svc.category : 'officina'
    },
    customer: { full_name: b.customer_name, email: b.customer_email, phone: b.customer_phone },
    car: b.car_id ? { id: b.car_id, title: b.car_title } : null
  };
}

function cleanHours_(hours) {
  if (!Array.isArray(hours) || hours.length > 7) fail_('invalid_input');
  var seen = {};
  return hours.map(function (h) {
    var wd = Number(h.weekday);
    if (!(wd >= 0 && wd <= 6) || Math.floor(wd) !== wd || seen[wd]) fail_('invalid_input');
    seen[wd] = true;
    if (h.closed === true) return { weekday: wd, day_name: WEEKDAYS_IT[wd], closed: true, opens: '', closes: '', break_start: '', break_end: '' };
    var opens = normTime_(h.opens);
    var closes = normTime_(h.closes);
    if (!opens || !closes || opens >= closes) fail_('invalid_input');
    var bs = normTime_(h.break_start);
    var be = normTime_(h.break_end);
    if ((bs === '') !== (be === '') || (bs && bs >= be)) fail_('invalid_input');
    return { weekday: wd, day_name: WEEKDAYS_IT[wd], closed: false, opens: opens, closes: closes, break_start: bs, break_end: be };
  });
}

var ADMIN_ACTIONS = {
  'a.cars': function () {
    return readAll_('cars')
      .map(toPublicCar_)
      .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
  },

  'a.car': function (p) {
    var c = findBy_('cars', 'id', String(p.id || ''));
    if (!c) return null;
    var car = toPublicCar_(c);
    car.plate = c.plate || '';
    return car;
  },

  'a.saveCar': function (p) {
    var car = cleanCar_(p.car);
    withLock_(function () {
      var existing = findBy_('cars', 'id', car.id);
      if (p.isNew === true) {
        if (existing) fail_('invalid_input');
        car.created_at = now_().toISOString();
        car.updated_at = car.created_at;
        appendRow_('cars', car);
      } else {
        if (!existing) fail_('invalid_input');
        car.created_at = existing.created_at;
        car.updated_at = now_().toISOString();
        car._row = existing._row;
        updateRow_('cars', car);
      }
    });
    return null;
  },

  'a.deleteCar': function (p) {
    var photos = [];
    withLock_(function () {
      var c = findBy_('cars', 'id', String(p.id || ''));
      if (!c) return;
      photos = Array.isArray(c.photos) ? c.photos : [];
      deleteRow_('cars', c._row);
    });
    trashPhotos_(photos);
    return null;
  },

  'a.setCarStatus': function (p) {
    if (CAR_STATUSES.indexOf(p.status) < 0) fail_('invalid_input');
    withLock_(function () {
      var c = findBy_('cars', 'id', String(p.id || ''));
      if (!c) fail_('invalid_input');
      c.status = p.status;
      c.updated_at = now_().toISOString();
      updateRow_('cars', c);
    });
    return null;
  },

  'a.setCarPrices': function (p) {
    var prices = cleanPrices_(p.prices);
    withLock_(function () {
      var c = findBy_('cars', 'id', String(p.id || ''));
      if (!c) fail_('invalid_input');
      c.price = prices.price;
      c.rate_day = prices.rate_day;
      c.rate_week = prices.rate_week;
      c.rate_month = prices.rate_month;
      c.updated_at = now_().toISOString();
      updateRow_('cars', c);
    });
    return null;
  },

  'a.uploadPhoto': function (p) {
    var carId = str_(p.carId, 80);
    var mime = str_(p.mime, 40);
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(carId) || ['image/jpeg', 'image/png', 'image/webp'].indexOf(mime) < 0) fail_('invalid_input');
    var data = typeof p.data === 'string' ? p.data : '';
    if (!data || data.length > MAX_PHOTO_BYTES * 1.4) fail_('invalid_input');
    var bytes = Utilities.base64Decode(data);
    if (bytes.length > MAX_PHOTO_BYTES || bytes.length < 100) fail_('invalid_input');
    var ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    var blob = Utilities.newBlob(bytes, mime, carId + '-' + Utilities.getUuid().slice(0, 8) + '.' + ext);
    var folder = DriveApp.getFolderById(prop_('PHOTO_FOLDER_ID'));
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return 'drive:' + file.getId();
  },

  'a.removePhotos': function (p) {
    trashPhotos_(Array.isArray(p.paths) ? p.paths.slice(0, 50) : []);
    return null;
  },

  'a.bookings': function () {
    var from = now_().getTime() - 45 * 24 * 3600 * 1000;
    return readAll_('bookings')
      .filter(function (b) { return b.start_at && new Date(b.start_at).getTime() >= from; })
      .sort(function (a, b) { return String(a.start_at).localeCompare(String(b.start_at)); })
      .slice(0, 1000)
      .map(toBooking_);
  },

  'a.setBookingStatus': function (p, who) {
    var status = String(p.status || '');
    if (BOOKING_STATUSES.indexOf(status) < 0) fail_('invalid_input');
    var reason = str_(p.reason, 500);
    var change = withLock_(function () {
      var b = findBy_('bookings', 'id', String(p.id || ''));
      if (!b) fail_('invalid_input');
      var before = b.status;
      b.status = status;
      b.reject_reason = status === 'rifiutata' ? reason : '';
      if (status !== before) {
        b.handled_by = who.admin.email;
        b.handled_at = now_().toISOString();
      }
      updateRow_('bookings', b);
      return { row: b, changed: status !== before };
    });
    var email = 'none';
    if (change.changed && (status === 'confermata' || status === 'rifiutata')) {
      email = 'failed';
      try {
        var res = notifyCustomer_(change.row, status === 'confermata' ? 'confirmed' : 'rejected');
        email = res && res.ok ? 'sent' : 'failed';
      } catch (err) {
        console.error('Email al cliente non inviata: ' + err);
      }
    }
    return { email: email };
  },

  'a.requests': function () {
    return readAll_('requests')
      .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
      .slice(0, 300)
      .map(function (r) {
        return {
          id: r.id, car_id: r.car_id || null, car_title: r.car_title || null, name: r.name, email: r.email,
          phone: r.phone || null, message: r.message || null, handled: !!r.handled, created_at: r.created_at
        };
      });
  },

  'a.setRequestHandled': function (p) {
    withLock_(function () {
      var r = findBy_('requests', 'id', String(p.id || ''));
      if (!r) fail_('invalid_input');
      r.handled = p.handled === true;
      updateRow_('requests', r);
    });
    return null;
  },

  'a.saveHours': function (p) {
    var hours = cleanHours_(p.hours);
    withLock_(function () {
      var rows = readAll_('hours');
      hours.forEach(function (h) {
        var found = null;
        for (var i = 0; i < rows.length; i++) if (rows[i].weekday === h.weekday) found = rows[i];
        if (found) {
          h._row = found._row;
          updateRow_('hours', h);
        } else {
          appendRow_('hours', h);
        }
        rows = readAll_('hours');
      });
    });
    return null;
  },

  'a.closures': function () {
    var today = todayKey_();
    return readAll_('closures')
      .filter(function (c) { return c.day >= today; })
      .sort(function (a, b) { return a.day < b.day ? -1 : 1; })
      .map(function (c) { return { day: c.day, reason: c.reason || null }; });
  },

  'a.addClosures': function (p) {
    var days = Array.isArray(p.days) ? p.days : [];
    if (days.length > 400) fail_('invalid_input');
    var reason = str_(p.reason, 200);
    days.forEach(function (d) {
      if (!validDay_(d)) fail_('invalid_input');
    });
    withLock_(function () {
      days.forEach(function (d) {
        var found = findBy_('closures', 'day', d);
        if (found) {
          found.reason = reason;
          updateRow_('closures', found);
        } else {
          appendRow_('closures', { day: d, reason: reason });
        }
      });
    });
    return null;
  },

  'a.deleteClosure': function (p) {
    withLock_(function () {
      var found = findBy_('closures', 'day', String(p.day || ''));
      if (found) deleteRow_('closures', found._row);
    });
    return null;
  },

  'a.services': function () {
    return sortedServices_(false);
  },

  'a.saveService': function (p) {
    var duration = optNum_(p.duration_min, 10, 480, true);
    var capacity = optNum_(p.capacity, 1, 100, true);
    if (duration === null || capacity === null) fail_('invalid_input');
    withLock_(function () {
      var s = findBy_('services', 'id', String(p.id || ''));
      if (!s) fail_('invalid_input');
      s.duration_min = duration;
      s.capacity = capacity;
      updateRow_('services', s);
    });
    return null;
  },

  'a.saveSiteInfo': function (p) {
    var i = p.info;
    if (!i || typeof i !== 'object') fail_('invalid_input');
    var lat = optNum_(i.map_lat, -90, 90, false, 6);
    var lon = optNum_(i.map_lon, -180, 180, false, 6);
    if ((lat === null) !== (lon === null)) fail_('invalid_input');
    setKv_('siteinfo', {
      phone: str_(i.phone, 40), whatsapp: str_(i.whatsapp, 40), email: str_(i.email, 200), address: str_(i.address, 200),
      city: str_(i.city, 120), vat: str_(i.vat, 60), reply_time: str_(i.reply_time, 120),
      map_lat: lat === null ? '' : lat, map_lon: lon === null ? '' : lon
    });
    return null;
  },

  'a.getNotifications': function () {
    var s = kv_('settings');
    return {
      emails: s.notif_emails || '',
      on_booking: s.notif_on_booking === undefined || s.notif_on_booking === '' ? true : parseBool_(s.notif_on_booking),
      on_request: s.notif_on_request === undefined || s.notif_on_request === '' ? true : parseBool_(s.notif_on_request)
    };
  },

  'a.saveNotifications': function (p) {
    var n = p.settings;
    if (!n || typeof n !== 'object') fail_('invalid_input');
    setKv_('settings', {
      notif_emails: str_(n.emails, 600),
      notif_on_booking: n.on_booking === false ? 'no' : 'sì',
      notif_on_request: n.on_request === false ? 'no' : 'sì'
    });
    return null;
  },

  'a.testEmail': function (p) {
    var to = Array.isArray(p.to) ? parseRecipients_(p.to.join(','), MAX_RECIPIENTS) : [];
    if (to.length === 0) fail_('no_recipients');
    var mail = buildTestEmail_();
    var res = sendMail_(to, mail.subject, mail.blocks, null, 'prova');
    if (!res.ok) fail_('email_rejected', res.detail || res.reason);
    return { sent: to.length };
  },

  'a.changePassword': function (p, who) {
    var next = typeof p.next === 'string' ? p.next : '';
    if (next.length < MIN_PASSWORD || next.length > 200) fail_('weak_password');
    var admin = who.admin;
    if (p.current === null || p.current === undefined) {
      // senza password attuale solo se si è entrati dal link "password dimenticata" o con la password provvisoria
      if (!who.session.recovery) fail_('wrong_password');
    } else if (!safeEqual_(hashPassword_(String(p.current), admin.salt), admin.hash)) {
      fail_('wrong_password');
    }
    var salt = newToken_().slice(0, 24);
    var hash = hashPassword_(next, salt);
    withLock_(function () {
      var cur = findBy_('admins', 'id', admin.id);
      if (!cur) fail_('unauthorized');
      cur.salt = salt;
      cur.hash = hash;
      cur.must_change = false;
      cur.fails = 0;
      cur.locked_until = null;
      updateRow_('admins', cur);
      removeSessionsOf_(cur.id, who.hash); // chiude gli altri accessi
      var sess = findBy_('sessions', 'token_hash', who.hash);
      if (sess) {
        sess.recovery = false;
        updateRow_('sessions', sess);
      }
    });
    return null;
  }
};

/* ============================== Email ============================== */

function business_() {
  var s = kv_('settings');
  var info = kv_('siteinfo');
  var notif = parseRecipients_(s.notif_emails || '', MAX_RECIPIENTS);
  var city = [info.address, info.city].map(function (v) { return String(v || '').trim(); }).filter(Boolean).join(', ');
  return {
    name: s.business_name || 'MONFALCAR',
    phone: String(info.phone || '').trim() || '[telefono]',
    address: city || '[indirizzo]',
    siteUrl: normalizeSiteUrl_(s.site_url || '').replace(/\/$/, ''),
    // le risposte dei clienti arrivano al primo indirizzo dei gestori
    replyTo: notif[0] || ownerEmail_() || null
  };
}

/** A chi mandare l'avviso per una nuova prenotazione o richiesta (vuoto = avviso disattivato). */
function staffRecipients_(topic) {
  var s = kv_('settings');
  var flag = topic === 'booking' ? s.notif_on_booking : s.notif_on_request;
  if (flag !== undefined && flag !== '' && !parseBool_(flag)) return [];
  var list = parseRecipients_(s.notif_emails || '', MAX_RECIPIENTS);
  if (list.length === 0 && ownerEmail_()) list = [ownerEmail_()];
  return list;
}

var OFFICINA_NOTE =
  'Questo appuntamento serve a vedere l\'auto, non è la prenotazione del lavoro: dopo averla vista ti diciamo di cosa c\'è bisogno, quanto tempo serve e quando riportarla.';

var BRING = {
  officina: 'Cosa portare: libretto di circolazione e chiavi dell\'auto.',
  valutazione: 'Cosa portare: libretto di circolazione, documento d\'identità e, se li hai, i documenti dei tagliandi.',
  'test-drive': 'Cosa portare: patente in corso di validità.',
  noleggio: 'Cosa portare: patente, documento d\'identità e codice fiscale.'
};

var DETAIL_LABELS = {
  problema: 'Problema o lavoro', targa: 'Targa', veicolo: 'Auto del cliente', marca_modello: 'Auto del cliente',
  anno: 'Anno', km: 'Chilometri', data_ritiro: 'Ritiro', data_riconsegna: 'Riconsegna'
};

function mailContext_(b) {
  var svc = findService_(b.service_id, false);
  return {
    customerName: b.customer_name, customerEmail: b.customer_email, customerPhone: b.customer_phone,
    serviceName: svc ? svc.name : b.service_name, serviceSlug: svc ? svc.slug : '',
    startAt: b.start_at, carTitle: b.car_title || null, details: b.details || {}, customerNote: b.note || null,
    rejectReason: b.reject_reason || null
  };
}

function detailFacts_(c) {
  var out = [];
  if (c.carTitle) out.push(['Auto di interesse', c.carTitle]);
  Object.keys(c.details || {}).forEach(function (k) {
    var v = c.details[k];
    if (v === null || v === undefined || String(v).trim() === '') return;
    out.push([DETAIL_LABELS[k] || k, String(v)]);
  });
  if (c.customerNote) out.push(['Nota del cliente', c.customerNote]);
  return out;
}

function buildEmail_(kind, c) {
  var b = business_();
  var date = dateIt_(c.startAt);
  var time = timeIt_(c.startAt);
  var first = String(c.customerName || '').split(' ')[0] || c.customerName;
  var officina = c.serviceSlug === 'officina';
  var sign = { p: 'A presto,\n' + b.name };

  if (kind === 'received') {
    var blocks = [
      { p: 'Ciao ' + first + ',' },
      { p: 'abbiamo ricevuto la tua richiesta per ' + c.serviceName + ' il ' + date + ' alle ' + time + '.' },
      { p: 'L\'appuntamento non è ancora confermato: lo controlliamo e ti rispondiamo appena possibile. Riceverai un\'altra email con l\'esito.' }
    ];
    if (officina) blocks.push({ p: OFFICINA_NOTE });
    blocks.push({ p: 'Se hai bisogno di parlarci subito, chiamaci al ' + b.phone + ' o scrivici su WhatsApp.' });
    blocks.push(sign);
    blocks.push({ p: b.address });
    return { subject: 'Abbiamo ricevuto la tua richiesta - ' + b.name, blocks: blocks };
  }

  if (kind === 'confirmed') {
    var cb = [
      { p: 'Ciao ' + first + ',' },
      { p: 'il tuo appuntamento è confermato.' },
      { facts: [['Servizio', c.serviceName], ['Quando', date + ' alle ' + time], ['Dove', b.address]] }
    ];
    if (BRING[c.serviceSlug]) cb.push({ p: BRING[c.serviceSlug] });
    if (officina) cb.push({ p: OFFICINA_NOTE });
    cb.push({ p: 'Se non puoi venire, rispondi a questa email o chiamaci al ' + b.phone + ': spostiamo l\'appuntamento senza problemi.' });
    cb.push(sign);
    return { subject: 'Appuntamento confermato: ' + c.serviceName + ', ' + date + ' alle ' + time, blocks: cb };
  }

  if (kind === 'rejected') {
    var rb = [
      { p: 'Ciao ' + first + ',' },
      { p: 'purtroppo non riusciamo a confermare la tua richiesta per ' + c.serviceName + ' il ' + date + ' alle ' + time + '.' }
    ];
    if (c.rejectReason) rb.push({ p: c.rejectReason });
    rb.push({
      p: 'Vorremmo trovare insieme un\'alternativa: puoi scegliere un altro giorno' +
        (b.siteUrl ? ' su ' + b.siteUrl + '/prenota' : ' sul nostro sito') +
        ' oppure rispondere a questa email indicando le fasce orarie che preferisci.'
    });
    rb.push({ p: 'Ci dispiace per l\'inconveniente e grazie per averci scelto.' });
    rb.push({ p: b.name });
    return { subject: 'Non riusciamo a confermare l\'appuntamento del ' + date, blocks: rb };
  }

  if (kind === 'reminder') {
    var mb = [
      { p: 'Ciao ' + first + ',' },
      { p: 'ti ricordiamo il tuo appuntamento di domani, ' + date + ', alle ' + time + ' da ' + b.name + ', in ' + b.address + '.' }
    ];
    if (officina) mb.push({ p: 'Porta l\'auto: la vediamo insieme e poi ti diciamo quando riportarla per il lavoro.' });
    mb.push({ p: 'Se non puoi venire, avvisaci al ' + b.phone + ' così liberiamo l\'orario per altri clienti.' });
    mb.push({ p: 'A domani,\n' + b.name });
    return { subject: 'Promemoria: domani ' + c.serviceName + ' alle ' + time, blocks: mb };
  }

  // staff
  var sb = [
    { p: 'È arrivata una nuova richiesta di prenotazione, in attesa di risposta.' },
    {
      facts: [
        ['Cliente', c.customerName + ', ' + c.customerPhone + ', ' + c.customerEmail],
        ['Servizio', c.serviceName],
        ['Quando', date + ' alle ' + time]
      ].concat(detailFacts_(c))
    }
  ];
  if (officina) sb.push({ p: 'È un appuntamento per vedere l\'auto: dopo la visita comunica al cliente tempi, costo e giorno in cui riportarla.' });
  sb.push({
    p: 'Accetta o rifiuta dal pannello' + (b.siteUrl ? ': ' + b.siteUrl + '/admin/prenotazioni' : '') +
      '. Il cliente riceve l\'esito in automatico. Se vuoi scrivergli prima, rispondi a questa email: il messaggio arriva a lui.'
  });
  return { subject: 'Nuova richiesta: ' + c.serviceName + ' - ' + c.customerName, blocks: sb };
}

function buildRequestEmail_(r) {
  var b = business_();
  var facts = [['Cliente', r.name], ['Email', r.email]];
  if (r.phone) facts.push(['Telefono', r.phone]);
  if (r.car_title) facts.push(['Auto di interesse', r.car_title]);
  if (r.message) facts.push(['Messaggio', r.message]);
  return {
    subject: 'Nuova richiesta di informazioni - ' + r.name,
    blocks: [
      { p: 'È arrivata una nuova richiesta di informazioni dal sito.' },
      { facts: facts },
      {
        p: 'Per rispondere basta rispondere a questa email: il messaggio arriva al cliente.' +
          (b.siteUrl ? ' Le richieste sono anche nel pannello: ' + b.siteUrl + '/admin/richieste' : '')
      }
    ]
  };
}

function buildTestEmail_() {
  var b = business_();
  return {
    subject: 'Email di prova - ' + b.name,
    blocks: [
      { p: 'Questa è un\'email di prova inviata dall\'area gestori.' },
      { p: 'Se la stai leggendo, gli avvisi per le nuove prenotazioni e per le richieste di informazioni arriveranno a questo indirizzo.' },
      { p: b.name }
    ]
  };
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderText_(blocks) {
  return blocks
    .map(function (blk) {
      if (blk.p !== undefined) return blk.p;
      return blk.facts.map(function (f) { return f[0] + ': ' + f[1]; }).join('\n');
    })
    .join('\n\n');
}

function renderHtml_(blocks) {
  var body = blocks
    .map(function (blk) {
      if (blk.p !== undefined) return '<p style="margin:0 0 14px 0">' + esc_(blk.p).replace(/\n/g, '<br>') + '</p>';
      return (
        '<table style="margin:0 0 14px 0;border-collapse:collapse">' +
        blk.facts
          .map(function (f) {
            return '<tr><td style="padding:4px 14px 4px 0;color:#4A5A78;vertical-align:top">' + esc_(f[0]) +
              '</td><td style="padding:4px 0;font-weight:bold">' + esc_(f[1]) + '</td></tr>';
          })
          .join('') +
        '</table>'
      );
    })
    .join('');
  return '<div style="font-family:Arial,Helvetica,sans-serif;background:#F4F7FB;padding:24px"><div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:#01427F;color:#ffffff;padding:18px 24px;font-size:20px;font-weight:bold">' +
    esc_(business_().name) + '</div><div style="padding:24px;color:#0B2A5B;line-height:1.55;font-size:15px">' + body + '</div></div></div>';
}

function logMail_(kind, to, subject, result, detail) {
  try {
    withLock_(function () {
      appendRow_('log', { at: now_().toISOString(), kind: kind, to: to, subject: subject, result: result, detail: String(detail || '').slice(0, 300) });
    });
  } catch (err) {
    console.warn('Registro email non scritto: ' + err);
  }
}

/** Invia un'email; non lancia errori: restituisce { ok, reason, detail }. */
function sendMail_(to, subject, blocks, replyTo, kind) {
  var list = parseRecipients_(Array.isArray(to) ? to.join(',') : to, 20);
  if (list.length === 0) return { ok: false, reason: 'no_recipients' };
  try {
    var left = MailApp.getRemainingDailyQuota();
    if (left < list.length) {
      logMail_(kind, list.join(', '), subject, 'non inviata', 'Limite giornaliero di Gmail raggiunto');
      return { ok: false, reason: 'quota', detail: 'Limite giornaliero di Gmail raggiunto' };
    }
    var b = business_();
    var options = { to: list.join(','), subject: subject, body: renderText_(blocks), htmlBody: renderHtml_(blocks), name: b.name };
    var reply = replyTo || b.replyTo;
    if (reply) options.replyTo = reply;
    MailApp.sendEmail(options);
    logMail_(kind, list.join(', '), subject, 'inviata', '');
    return { ok: true };
  } catch (err) {
    var detail = String(err && err.message ? err.message : err);
    console.error('Invio email fallito: ' + detail);
    logMail_(kind, list.join(', '), subject, 'non inviata', detail);
    return { ok: false, reason: 'rejected', detail: detail };
  }
}

function notifyNewBooking_(row) {
  var ctx = mailContext_(row);
  var received = buildEmail_('received', ctx);
  sendMail_([row.customer_email], received.subject, received.blocks, null, 'ricevuta');
  var to = staffRecipients_('booking');
  if (to.length > 0) {
    var staff = buildEmail_('staff', ctx);
    sendMail_(to, staff.subject, staff.blocks, row.customer_email, 'avviso gestori');
  }
}

function notifyNewRequest_(row) {
  var to = staffRecipients_('request');
  if (to.length === 0) return;
  var mail = buildRequestEmail_(row);
  sendMail_(to, mail.subject, mail.blocks, row.email, 'avviso richiesta');
}

function notifyCustomer_(row, kind) {
  var mail = buildEmail_(kind, mailContext_(row));
  return sendMail_([row.customer_email], mail.subject, mail.blocks, null, kind === 'confirmed' ? 'conferma' : 'rifiuto');
}

/** Promemoria del giorno prima: parte da sola ogni ora (vedi "Prima configurazione"). */
function sendReminders() {
  tableCache_ = {};
  lockDepth_ = 0;
  var from = now_().getTime() + 23 * 3600000;
  var to = now_().getTime() + 25 * 3600000;
  var due = readAll_('bookings').filter(function (b) {
    if (b.status !== 'confermata' || b.reminder_sent_at || !b.start_at) return false;
    var t = new Date(b.start_at).getTime();
    return t >= from && t < to;
  });
  var sent = 0;
  due.forEach(function (b) {
    var mail = buildEmail_('reminder', mailContext_(b));
    var res = sendMail_([b.customer_email], mail.subject, mail.blocks, null, 'promemoria');
    if (res.ok) {
      withLock_(function () {
        var fresh = findBy_('bookings', 'id', b.id);
        if (fresh) {
          fresh.reminder_sent_at = now_().toISOString();
          updateRow_('bookings', fresh);
        }
      });
      sent++;
    }
  });
  trimLog_();
  return sent;
}

function trimLog_() {
  try {
    withLock_(function () {
      var sh = sheet_('log');
      var last = sh.getLastRow();
      if (last - 1 > LOG_KEEP + 100) {
        sh.deleteRows(2, last - 1 - LOG_KEEP);
        delete tableCache_.log;
      }
    });
  } catch (err) {
    console.warn('Registro non ridotto: ' + err);
  }
}

/* ============================== Menu del Foglio ============================== */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('MONFALCAR')
      .addItem('1. Prima configurazione', 'menuSetup')
      .addSeparator()
      .addItem('Mostra l\'indirizzo da inserire su GitHub', 'menuShowUrl')
      .addItem('Aggiungi un gestore', 'menuAddAdmin')
      .addItem('Reimposta la password di un gestore', 'menuResetAdmin')
      .addItem('Rimuovi un gestore', 'menuRemoveAdmin')
      .addItem('Invia un\'email di prova a me', 'menuTestEmail')
      .addItem('Controlla che sia tutto a posto', 'menuCheck')
      .addToUi();
  } catch (err) {
    /* fuori dal Foglio non c'è un menu */
  }
}

function ask_(title, message, defaultValue) {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  var text = String(r.getResponseText() || '').trim();
  return text === '' && defaultValue ? defaultValue : text;
}

function say_(title, message) {
  SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuSetup() {
  var ui = SpreadsheetApp.getUi();
  var guess = ownerEmail_() || (function () { try { return Session.getActiveUser().getEmail(); } catch (e) { return ''; } })();
  var adminEmail = ask_('Primo gestore (1/3)', 'Email con cui entrerai nell\'area riservata del sito. Puoi usare la tua casella aziendale (anche Libero, non serve che sia Gmail): qui arriveranno anche gli avvisi di nuove prenotazioni e il link "password dimenticata". Lascia vuoto per usare ' + (guess || 'questo account Google') + '.', guess);
  if (adminEmail === null) return;
  var adminName = ask_('Primo gestore (2/3)', 'Nome da mostrare (es. il tuo nome). Puoi lasciarlo vuoto.', 'Titolare');
  if (adminName === null) return;
  var siteUrl = ask_('Indirizzo del sito (3/3)', 'Indirizzo del sito su GitHub, per i link nelle email (es. https://nomeutente.github.io/monfalcar/). Se ancora non lo conosci, lascia vuoto: lo scriverai poi nel foglio "Impostazioni".', '');
  if (siteUrl === null) return;
  try {
    var res = setup_({ adminEmail: adminEmail, adminName: adminName, siteUrl: siteUrl });
    var msg = 'Configurazione completata.\n\n';
    if (res.tempPassword) {
      msg += 'Per entrare nell\'area riservata del sito:\n  Email: ' + res.adminEmail + '\n  Password provvisoria: ' + res.tempPassword +
        '\n\nAl primo accesso il sito ti chiederà di scegliere una nuova password. Copia questa password adesso: non verrà mostrata di nuovo.\n\n';
    } else {
      msg += 'I gestori c\'erano già: nessuna nuova password creata.\n\n';
    }
    msg += 'Prossimo passo: Implementa > Nuova implementazione > App web (vedi la guida), poi usa "Mostra l\'indirizzo da inserire su GitHub".';
    ui.alert('MONFALCAR', msg, ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('MONFALCAR', 'Qualcosa non è andato a buon fine: ' + (err && err.message ? err.message : err), ui.ButtonSet.OK);
  }
}

function menuShowUrl() {
  var url = '';
  try {
    url = ScriptApp.getService().getUrl() || '';
  } catch (err) {
    url = '';
  }
  if (!url || !/\/exec$/.test(url)) {
    say_('MONFALCAR', 'L\'app web non risulta ancora pubblicata.\n\nVai su Implementa > Nuova implementazione > tipo "App web", "Esegui come: me", "Chi ha accesso: Chiunque", poi riprova.' + (url ? '\n\n(Indirizzo di prova trovato: ' + url + ' - non va bene, deve finire con /exec.)' : ''));
    return;
  }
  say_('MONFALCAR', 'Copia questo indirizzo e incollalo su GitHub come variabile VITE_API_URL:\n\n' + url);
}

function menuAddAdmin() {
  var email = ask_('Nuovo gestore', 'Email del nuovo gestore:', '');
  if (!email) return;
  var name = ask_('Nuovo gestore', 'Nome da mostrare:', '');
  if (name === null) return;
  try {
    var temp = createAdmin_(email, name, 'admin');
    say_('MONFALCAR', 'Gestore aggiunto.\n\nEmail: ' + email.toLowerCase() + '\nPassword provvisoria: ' + temp + '\n\nComunicala alla persona: al primo accesso dovrà sceglierne una nuova.');
  } catch (err) {
    say_('MONFALCAR', 'Indirizzo email non valido.');
  }
}

function menuResetAdmin() {
  var email = ask_('Reimposta password', 'Email del gestore:', '');
  if (!email) return;
  var admin = findBy_('admins', 'email', email.toLowerCase());
  if (!admin) {
    say_('MONFALCAR', 'Nessun gestore con questo indirizzo.');
    return;
  }
  var temp = createAdmin_(admin.email, admin.name, admin.role);
  say_('MONFALCAR', 'Nuova password provvisoria per ' + admin.email + ':\n\n' + temp + '\n\nAl prossimo accesso dovrà sceglierne una nuova.');
}

function menuRemoveAdmin() {
  var email = ask_('Rimuovi gestore', 'Email del gestore da rimuovere:', '');
  if (!email) return;
  var removed = withLock_(function () {
    var admin = findBy_('admins', 'email', email.toLowerCase());
    if (!admin) return false;
    if (readAll_('admins').length <= 1) return 'last';
    removeSessionsOf_(admin.id);
    deleteRow_('admins', admin._row);
    return true;
  });
  say_('MONFALCAR', removed === true ? 'Gestore rimosso: non può più entrare.' : removed === 'last' ? 'Non si può rimuovere l\'ultimo gestore.' : 'Nessun gestore con questo indirizzo.');
}

function menuTestEmail() {
  var to = ownerEmail_();
  if (!to) {
    say_('MONFALCAR', 'Non riesco a leggere il tuo indirizzo Gmail.');
    return;
  }
  var mail = buildTestEmail_();
  var res = sendMail_([to], mail.subject, mail.blocks, null, 'prova');
  say_('MONFALCAR', res.ok ? 'Email di prova inviata a ' + to + '. Controlla la posta (anche tra la posta indesiderata).' : 'Invio non riuscito: ' + (res.detail || res.reason) + '\n\nLeggi il foglio "Registro email" per i dettagli.');
}

function menuCheck() {
  var lines = [];
  var ok = function (good, text) { lines.push((good ? 'OK   ' : 'DA FARE  ') + text); };
  var missing = [];
  Object.keys(SHEETS).forEach(function (k) {
    if (!spreadsheet_().getSheetByName(SHEETS[k].name)) missing.push(SHEETS[k].name);
  });
  ok(missing.length === 0, missing.length ? 'Fogli mancanti: ' + missing.join(', ') + ' (usa "Prima configurazione")' : 'Tutti i fogli ci sono');
  if (missing.length === 0) {
    ok(readAll_('admins').length > 0, 'Almeno un gestore (' + readAll_('admins').length + ')');
    ok(!!setting_('site_url', ''), 'Indirizzo del sito in "Impostazioni" (serve per i link nelle email)');
    ok(!!siteInfoObject_().phone, 'Telefono salvato (si imposta dal sito, pagina "Dati dell\'attività")');
    ok(readAll_('hours').length === 7, 'Orari di apertura');
  }
  ok(!!prop_('PHOTO_FOLDER_ID'), 'Cartella delle foto su Drive');
  var hasTrigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sendReminders'; });
  ok(hasTrigger, 'Promemoria automatici attivi');
  var url = '';
  try { url = ScriptApp.getService().getUrl() || ''; } catch (e) { url = ''; }
  ok(/\/exec$/.test(url), 'App web pubblicata');
  try { lines.push('Email ancora inviabili oggi: ' + MailApp.getRemainingDailyQuota()); } catch (e2) { /* non disponibile */ }
  say_('Controllo MONFALCAR', lines.join('\n'));
}
