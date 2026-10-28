// Prove di Code.gs con servizi Google simulati. Avvio:  node google/tests/run.mjs
// Non servono librerie. Controllano regole, sicurezza, email e comportamento dei Fogli.
import { createEnv } from './gas-mock.mjs';

const results = [];
let fails = 0;
process.on('uncaughtException', (e) => { console.log(results.join('\n')); console.error('\nECCEZIONE NEL TEST:', e.stack.split('\n').slice(0, 4).join('\n')); process.exit(2); });
const ok = (name, cond, extra = '') => {
  results.push(`${cond ? 'OK  ' : 'FAIL'} ${name}${!cond && extra ? ' — ' + extra : ''}`);
  if (!cond) fails++;
};
const section = (t) => results.push(`\n== ${t}`);

const env = createEnv({ ownerEmail: 'titolare@gmail.com' });
const { ctx, state, call, setNow, sheetByName, dump } = env;

// Mercoledì 28 ottobre 2026, 10:00 a Roma (ora solare, UTC+1)
const NOW = '2026-10-28T09:00:00Z';
setNow(NOW);
const MONDAY = '2026-11-02';
const SATURDAY = '2026-10-31';
const iso = (day, hm) => ctx.romeToDate_(day, hm).toISOString();
const code = (r) => (r.ok ? 'ok' : r.e);
const fresh = () => { state.outbox.length = 0; };

/* ===================== Prima configurazione ===================== */
section('Prima configurazione');
const res = ctx.setup_({ adminEmail: 'titolare@gmail.com', adminName: 'Mario', siteUrl: 'nomeutente.github.io/monfalcar' });
const names = state.sheets.map((s) => s.name);
ok('setup: creati tutti i fogli', ['Auto', 'Prenotazioni', 'Richieste', 'Servizi', 'Orari', 'Chiusure', 'Dati attività', 'Impostazioni', 'Gestori', 'Sessioni', 'Registro email'].every((n) => names.includes(n)), names.join());
ok('setup: il foglio vuoto iniziale è stato tolto', !names.includes('Foglio1'));
ok('setup: foglio Sessioni nascosto (contiene solo codici cifrati)', sheetByName('Sessioni').hidden === true);
ok('setup: password provvisoria creata e leggibile', /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/.test(res.tempPassword || ''), String(res.tempPassword));
const TEMP = res.tempPassword;
ok('setup: 4 servizi, 7 giorni di orari', dump('Servizi').length === 5 && dump('Orari').length === 8);
ok('setup: indirizzo del sito normalizzato con https e barra finale', ctx.setting_('site_url', '') === 'https://nomeutente.github.io/monfalcar/', ctx.setting_('site_url', ''));
ok('setup: cartella foto su Drive creata', !!state.props.PHOTO_FOLDER_ID && state.folders.length === 1);
ok('setup: promemoria orario installato una volta', state.triggers.length === 1 && state.triggers[0].fn === 'sendReminders' && state.triggers[0].every === 1);
const adminsBefore = JSON.stringify(dump('Gestori'));
const again = ctx.setup_({ adminEmail: 'altro@gmail.com' });
ok('setup rilanciato: non cambia i gestori né crea altre password', again.tempPassword === null && JSON.stringify(dump('Gestori')) === adminsBefore);
ok('setup rilanciato: non duplica servizi, orari, cartella e promemoria', dump('Servizi').length === 5 && dump('Orari').length === 8 && state.folders.length === 1 && state.triggers.length === 1);
ok('setup: la password non è scritta in chiaro in nessun foglio', !state.sheets.some((s) => JSON.stringify(dump(s.name)).includes(TEMP)));

/* ===================== Dati pubblici ===================== */
section('Dati pubblici');
const services = call('services').d;
ok('servizi: 4, in ordine', services.length === 4 && services.map((s) => s.slug).join() === 'officina,valutazione,test-drive,noleggio');
const svc = Object.fromEntries(services.map((s) => [s.slug, s]));
ok('servizi: officina 30 min, 2 appuntamenti contemporanei', svc.officina.duration_min === 30 && svc.officina.capacity === 2 && svc.officina.active === true);
const hours = call('hours').d;
ok('orari: 7 giorni; sabato e domenica chiusi', hours.length === 7 && hours[0].closed && hours[6].closed && !hours[1].closed);
ok('orari: lunedì 08:30-18:30 con pausa 12:30-14:30', hours[1].opens === '08:30' && hours[1].closes === '18:30' && hours[1].break_start === '12:30' && hours[1].break_end === '14:30');
ok('orari: giorno chiuso senza orari', hours[6].opens === null && hours[6].break_start === null);
const info0 = call('siteInfo').d;
ok('dati attività: all’inizio vuoti', info0.phone === '' && info0.map_lat === null);
ok('auto: elenco vuoto', call('cars').d.length === 0);

section('Orari prenotabili');
let slots = call('slots', { day: MONDAY, serviceId: svc.officina.id }).d;
ok('lunedì: 16 orari', slots.length === 16, String(slots.length));
ok('lunedì: nessun orario che tocca la pausa 12:30-14:30', slots.every((s) => { const t = ctx.Utilities.formatDate(new env.D(s.start), 'Europe/Rome', 'HH:mm'); return !(t > '12:00' && t < '14:30'); }));
ok('lunedì: primo 08:30, ultimo 18:00', ctx.Utilities.formatDate(new env.D(slots[0].start), 'Europe/Rome', 'HH:mm') === '08:30' && ctx.Utilities.formatDate(new env.D(slots[15].start), 'Europe/Rome', 'HH:mm') === '18:00');
ok('lunedì: tutti prenotabili', slots.every((s) => s.available));
ok('sabato: chiuso, nessun orario', call('slots', { day: SATURDAY, serviceId: svc.officina.id }).d.length === 0);
ok('domenica: chiuso', call('slots', { day: '2026-11-01', serviceId: svc.officina.id }).d.length === 0);
ok('giorno passato: nessun orario', call('slots', { day: '2026-10-20', serviceId: svc.officina.id }).d.length === 0);
ok('oltre 60 giorni: nessun orario', call('slots', { day: '2027-03-01', serviceId: svc.officina.id }).d.length === 0);
ok('servizio inesistente: nessun orario', call('slots', { day: MONDAY, serviceId: 'nope' }).d.length === 0);
ok('giorno non valido: nessun orario, nessun errore', call('slots', { day: '2026-13-45', serviceId: svc.officina.id }).d.length === 0 && call('slots', { day: 'abc', serviceId: svc.officina.id }).ok);
slots = call('slots', { day: '2026-10-28', serviceId: svc.officina.id }).d;
ok('oggi: gli orari entro 12 ore sono non prenotabili', slots.length > 0 && slots.every((s) => !s.available));
slots = call('slots', { day: '2026-10-29', serviceId: svc.officina.id }).d;
ok('domani: orari oltre le 12 ore prenotabili', slots.length === 16 && slots.every((s) => s.available));
ok('test drive 45 min: ultimo orario alle 17:30 (finisce 18:15)', (() => { const s = call('slots', { day: MONDAY, serviceId: svc['test-drive'].id }).d; return ctx.Utilities.formatDate(new env.D(s[s.length - 1].start), 'Europe/Rome', 'HH:mm') === '17:30'; })());
ok('cambio ora legale: lunedì 30 marzo 08:30 = 06:30 UTC, lunedì 2 novembre 08:30 = 07:30 UTC', ctx.romeToDate_('2026-03-30', '08:30').toISOString() === '2026-03-30T06:30:00.000Z' && ctx.romeToDate_('2026-11-02', '08:30').toISOString() === '2026-11-02T07:30:00.000Z');

/* ===================== Prenotazioni ===================== */
section('Nuova prenotazione');
const base = (over = {}) => ({
  serviceId: svc.officina.id, carId: null, start: iso(MONDAY, '09:00'), name: 'Mario Rossi', email: 'Mario@Cliente.it', phone: '333 1234567',
  note: '', details: { problema: 'Rumore dai freni', veicolo: 'Fiat Panda 2016' }, consentPrivacy: true, consentMarketing: false, ...over,
});
const book = (over) => call('createBooking', base(over));
ok('senza consenso privacy: respinta', code(book({ consentPrivacy: false })) === 'consent_required');
ok('nome troppo corto: respinta', code(book({ name: 'M' })) === 'invalid_input');
ok('email non valida: respinta', code(book({ email: 'mario@' })) === 'invalid_input');
ok('telefono troppo corto: respinta', code(book({ phone: '123' })) === 'invalid_input');
ok('nota troppo lunga: respinta', code(book({ note: 'x'.repeat(1001) })) === 'invalid_input');
ok('dettagli non validi (elenco): respinta', code(book({ details: ['a'] })) === 'invalid_input');
ok('servizio inesistente: respinta', code(book({ serviceId: 'nope' })) === 'invalid_input');
ok('auto inesistente: respinta', code(book({ carId: 'nessuna-auto' })) === 'invalid_input');
ok('orario che non è uno degli orari proposti: respinta', code(book({ start: iso(MONDAY, '09:10') })) === 'slot_not_available');
ok('sabato: respinta', code(book({ start: iso(SATURDAY, '09:00') })) === 'slot_not_available');
ok('in pausa pranzo: respinta', code(book({ start: iso(MONDAY, '13:00') })) === 'slot_not_available');
ok('troppo vicina (entro 12 ore): respinta', code(book({ start: iso('2026-10-28', '14:30') })) === 'slot_not_available');
ok('data non valida: respinta', code(book({ start: 'domani' })) === 'invalid_input');
ok('nessuna di queste ha salvato qualcosa', dump('Prenotazioni').length === 1 && state.outbox.length === 0);

fresh();
const lockBefore = state.lockAcquisitions;
ok('prenotazione valida accettata', code(book()) === 'ok');
const rowsB = dump('Prenotazioni');
ok('salvata come in attesa, email in minuscolo, orario locale leggibile', rowsB.length === 2 && rowsB[1][2] === 'in_attesa' && rowsB[1][6] === 'mario@cliente.it' && rowsB[1][8] === '2026-11-02 09:00:00' && rowsB[1][9] === '2026-11-02 09:30:00', JSON.stringify(rowsB[1]));
ok('il blocco è stato preso e rilasciato', state.lockAcquisitions > lockBefore && state.lockHeld === false);
ok('2 email: ricevuta al cliente + avviso ai gestori (alla Gmail del titolare)', state.outbox.length === 2 && state.outbox[0].toList[0] === 'mario@cliente.it' && state.outbox[1].toList[0] === 'titolare@gmail.com', JSON.stringify(state.outbox.map((m) => m.to)));
ok('ricevuta: oggetto e nota "non è la prenotazione del lavoro"', /Abbiamo ricevuto la tua richiesta/.test(state.outbox[0].subject) && /non è la prenotazione del lavoro/.test(state.outbox[0].body));
ok('ricevuta: data in italiano', /lunedì 2 novembre 2026 alle 09:00/.test(state.outbox[0].body), state.outbox[0].body);
ok('avviso gestori: rispondendo si scrive al cliente', state.outbox[1].replyTo === 'mario@cliente.it' && /Mario Rossi/.test(state.outbox[1].body) && /333 1234567/.test(state.outbox[1].body) && /Rumore dai freni/.test(state.outbox[1].body));
ok('ricevuta: mittente con il nome dell’attività', state.outbox[0].name === 'MONFALCAR');
ok('ricevuta: risposte al titolare', state.outbox[0].replyTo === 'titolare@gmail.com');
ok('avviso: link al pannello con l’indirizzo del sito', /nomeutente\.github\.io\/monfalcar\/admin\/prenotazioni/.test(state.outbox[1].body), state.outbox[1].body);
ok('email in formato HTML con nome attività', /MONFALCAR/.test(state.outbox[0].htmlBody) && /<table/.test(state.outbox[1].htmlBody));

section('Capacità, sovrapposizioni, limiti');
ok('2º cliente stesso orario officina (capacità 2): accettato', code(book({ name: 'Anna Bianchi', email: 'anna@cliente.it' })) === 'ok');
ok('3º cliente stesso orario officina: orario esaurito', code(book({ name: 'Luca Verdi', email: 'luca@cliente.it' })) === 'slot_not_available');
ok('l’orario risulta non disponibile nell’elenco', call('slots', { day: MONDAY, serviceId: svc.officina.id }).d.find((s) => s.start === iso(MONDAY, '09:00')).available === false);
ok('l’orario vicino (09:30) resta libero', call('slots', { day: MONDAY, serviceId: svc.officina.id }).d.find((s) => s.start === iso(MONDAY, '09:30')).available === true);
ok('test drive (capacità 1, 45 min): primo cliente 09:00 accettato', code(book({ serviceId: svc['test-drive'].id, email: 't1@cliente.it', name: 'Test Uno' })) === 'ok');
ok('test drive: 08:30 (finisce 09:15) si sovrappone → non disponibile', code(book({ serviceId: svc['test-drive'].id, start: iso(MONDAY, '08:30'), email: 't2@cliente.it', name: 'Test Due' })) === 'slot_not_available');
ok('test drive: 09:30 (inizia durante) → non disponibile', code(book({ serviceId: svc['test-drive'].id, start: iso(MONDAY, '09:30'), email: 't2@cliente.it', name: 'Test Due' })) === 'slot_not_available');
ok('test drive: 10:00 libero', code(book({ serviceId: svc['test-drive'].id, start: iso(MONDAY, '10:00'), email: 't2@cliente.it', name: 'Test Due' })) === 'ok');
// annullare libera l'orario
const adminToken = call('login', { email: 'titolare@gmail.com', password: TEMP }).d.token;
let list = call('a.bookings', {}, adminToken).d;
const luca = list.find((b) => b.customer.email === 'anna@cliente.it');
call('a.setBookingStatus', { id: luca.id, status: 'annullata' }, adminToken);
ok('annullata: libera di nuovo l’orario', code(book({ name: 'Luca Verdi', email: 'luca@cliente.it' })) === 'ok');
const rej = list.find((b) => b.customer.email === 't1@cliente.it');
call('a.setBookingStatus', { id: rej.id, status: 'rifiutata', reason: 'Siamo al completo' }, adminToken);
ok('rifiutata: libera di nuovo l’orario', code(book({ serviceId: svc['test-drive'].id, start: iso(MONDAY, '09:00'), email: 't3@cliente.it', name: 'Test Tre' })) === 'ok');

ok('limite 3 prenotazioni in attesa per cliente (anche maiuscole)', (() => {
  const e = 'Fedele@Cliente.IT';
  const r = [1, 2, 3].map((i) => code(book({ email: e, name: 'Fedele Cliente', start: iso('2026-11-0' + (2 + i > 6 ? 6 : 2 + i), '16:00') })));
  const fourth = code(book({ email: 'fedele@cliente.it', name: 'Fedele Cliente', start: iso('2026-11-09', '16:00') }));
  return r.every((x) => x === 'ok') && fourth === 'too_many_pending';
})());
ok('limite generale 30 prenotazioni all’ora', (() => {
  for (let i = 0; i < 30; i++) {
    ctx.appendRow_('bookings', { id: 'x' + i, created_at: ctx.now_().toISOString(), status: 'annullata', service_id: svc.officina.id, customer_email: `flood${i}@x.it`, start_at: iso('2026-12-01', '09:00'), end_at: iso('2026-12-01', '09:30'), details: {} });
  }
  return code(book({ email: 'nuovo@cliente.it', name: 'Nuovo Cliente', start: iso('2026-11-10', '09:00') })) === 'too_many_requests';
})());
// pulizia: via le righe finte, per non disturbare i controlli successivi
{
  const rows = ctx.readAll_('bookings').filter((b) => /^x\d+$/.test(b.id)).sort((a, b) => b._row - a._row);
  rows.forEach((r) => ctx.deleteRow_('bookings', r._row));
}
ok('limite generale: ripulito, si prenota di nuovo', code(book({ email: 'nuovo@cliente.it', name: 'Nuovo Cliente', start: iso('2026-11-10', '09:00') })) === 'ok');
ok('chiusura straordinaria: il giorno non ha più orari', (() => {
  call('a.addClosures', { days: ['2026-11-11'], reason: 'Ferie' }, adminToken);
  return call('slots', { day: '2026-11-11', serviceId: svc.officina.id }).d.length === 0 && code(book({ start: iso('2026-11-11', '09:00'), email: 'f@c.it', name: 'Ferie Test' })) === 'slot_not_available';
})());

section('Foglio: nessuna conversione, nessuna formula');
ok('nota con formula salvata come testo', (() => {
  fresh();
  const r = book({ start: iso('2026-11-12', '09:00'), email: 'formula@c.it', name: 'Formula Test', note: '=HYPERLINK("http://x.it","clic")', details: { problema: '=1+1' } });
  const row = dump('Prenotazioni').find((x) => x[6] === 'formula@c.it');
  return code(r) === 'ok' && row[12] === '=HYPERLINK("http://x.it","clic")' && state.formulaEvals === 0;
})());
ok('telefono tipo "0481 123456" e nome con apostrofo restano testo', (() => {
  const r = book({ start: iso('2026-11-12', '10:00'), email: 'apos@c.it', name: "Nicolò D'Angelo", phone: '0481 123456' });
  const row = dump('Prenotazioni').find((x) => x[6] === 'apos@c.it');
  return code(r) === 'ok' && row[5] === "Nicolò D'Angelo" && row[7] === '0481 123456';
})());
ok('nessuna scrittura fuori dai limiti del foglio', state.outOfBounds === 0);
ok('oltre 1000 righe: il foglio si allarga e tutto funziona', (() => {
  for (let i = 0; i < 1100; i++) ctx.appendRow_('log', { at: ctx.now_().toISOString(), kind: 'prova', to: 'a@b.it', subject: 's' + i, result: 'inviata', detail: '' });
  const ok1 = ctx.readAll_('log').length > 1100;
  const sh = sheetByName('Registro email');
  return ok1 && sh.getMaxRows() > 1100 && state.outOfBounds === 0;
})());
ok('registro email ridotto dal promemoria orario (conserva le ultime 500)', (() => {
  ctx.sendReminders();
  return ctx.readAll_('log').length <= 520;
})());

/* ===================== Richieste di informazioni ===================== */
section('Richieste di informazioni');
const reqIn = (over = {}) => ({ carId: null, name: 'Anna Bianchi', email: 'Anna@Cliente.it', phone: '320 1112233', message: 'Fate la revisione?', consent: true, ...over });
ok('senza consenso: respinta', code(call('createInfoRequest', reqIn({ consent: false }))) === 'consent_required');
ok('nome o email non validi: respinta', code(call('createInfoRequest', reqIn({ name: 'A' }))) === 'invalid_input' && code(call('createInfoRequest', reqIn({ email: 'x' }))) === 'invalid_input');
ok('messaggio troppo lungo: respinta', code(call('createInfoRequest', reqIn({ message: 'x'.repeat(2001) }))) === 'invalid_input');
fresh();
ok('richiesta valida accettata', code(call('createInfoRequest', reqIn())) === 'ok');
ok('avviso ai gestori con il messaggio, il "rispondi" va al cliente', state.outbox.length === 1 && /Nuova richiesta di informazioni - Anna Bianchi/.test(state.outbox[0].subject) && /Fate la revisione\?/.test(state.outbox[0].body) && state.outbox[0].replyTo === 'anna@cliente.it');
ok('limite 5 richieste al giorno per email', (() => {
  const r = [1, 2, 3, 4].map(() => code(call('createInfoRequest', reqIn())));
  return r.every((x) => x === 'ok') && code(call('createInfoRequest', reqIn())) === 'too_many_requests';
})());
ok('altra email non è bloccata dal limite di Anna', code(call('createInfoRequest', reqIn({ email: 'bruno@cliente.it', name: 'Bruno' }))) === 'ok');
ok('limite generale 30 richieste all’ora', (() => {
  for (let i = 0; i < 30; i++) ctx.appendRow_('requests', { id: 'q' + i, created_at: ctx.now_().toISOString(), name: 'x', email: `q${i}@x.it`, handled: true });
  return code(call('createInfoRequest', reqIn({ email: 'ultimo@cliente.it', name: 'Ultimo' }))) === 'too_many_requests';
})());
{
  const rows = ctx.readAll_('requests').filter((r) => /^q\d+$/.test(r.id)).sort((a, b) => b._row - a._row);
  rows.forEach((r) => ctx.deleteRow_('requests', r._row));
}

/* ===================== Accesso gestori ===================== */
section('Accesso gestori');
ok('password sbagliata: respinta', code(call('login', { email: 'titolare@gmail.com', password: 'sbagliata' })) === 'invalid_credentials');
ok('email sconosciuta: stesso messaggio', code(call('login', { email: 'ignoto@x.it', password: TEMP })) === 'invalid_credentials');
ok('campi vuoti: respinto', code(call('login', { email: '', password: '' })) === 'invalid_credentials');
const lg = call('login', { email: ' Titolare@Gmail.com ', password: TEMP });
ok('password provvisoria: entra (email in maiuscolo/con spazi ok)', lg.ok && lg.d.user.email === 'titolare@gmail.com' && lg.d.user.role === 'admin' && lg.d.mustChange === true);
ok('il codice di accesso non è salvato in chiaro', !JSON.stringify(dump('Sessioni')).includes(lg.d.token));
ok('sessione valida: restituisce utente e stato "da cambiare password"', (() => { const s = call('session', {}, lg.d.token).d; return s.user.email === 'titolare@gmail.com' && s.recovery === true; })());
ok('sessione con codice sbagliato: nessun utente', call('session', {}, 'x'.repeat(40)).d === null && call('session').d === null);
const adminActions = Object.keys(ctx.ADMIN_ACTIONS);
ok(`tutte le ${adminActions.length} azioni dei gestori respingono chi non ha fatto l’accesso`, adminActions.every((a) => call(a, {}).e === 'unauthorized' && call(a, {}, 'x'.repeat(40)).e === 'unauthorized'), adminActions.filter((a) => call(a, {}).e !== 'unauthorized').join());
ok('azione dei gestori con codice di un altro tipo (reset) respinta', (() => {
  call('requestReset', { email: 'titolare@gmail.com' });
  const mail = state.outbox[state.outbox.length - 1];
  const token = /reset=([a-f0-9]+)/.exec(mail.body)[1];
  const r = call('a.cars', {}, token);
  // il codice del link va usato solo per il riscatto, poi si riscatta e basta
  return r.e === 'unauthorized';
})());
ok('azioni sconosciute o "furbe" respinte', code(call('nulla')) === 'invalid_input' && code(call('constructor')) === 'invalid_input' && code(call('__proto__')) === 'invalid_input' && code(call('toString')) === 'invalid_input');
ok('corpo non valido: errore generico, nessun crash', (() => { const o = JSON.parse(ctx.doPost({ postData: { contents: '{non json' } }).getContent()); return o.ok === false && o.e === 'unknown'; })());
ok('doGet risponde (controllo manuale dell’indirizzo)', JSON.parse(ctx.doGet().getContent()).service === 'MONFALCAR');

section('Blocco dopo troppi tentativi');
{
  const e = 'blocco@gmail.com';
  const t = ctx.createAdmin_(e, 'Blocco', 'operatore');
  for (let i = 0; i < 5; i++) call('login', { email: e, password: 'no' + i });
  ok('dopo 5 errori anche la password giusta è bloccata', code(call('login', { email: e, password: t })) === 'locked');
  setNow('2026-10-28T09:16:00Z');
  ok('dopo 15 minuti si può riprovare', call('login', { email: e, password: t }).ok);
  setNow(NOW);
  ok('un accesso riuscito azzera i tentativi', (() => {
    call('login', { email: e, password: 'x1' }); call('login', { email: e, password: 'x2' });
    call('login', { email: e, password: t });
    for (let i = 0; i < 4; i++) call('login', { email: e, password: 'y' + i });
    return call('login', { email: e, password: t }).ok;
  })());
}

section('Cambio password');
const tk = lg.d.token;
ok('password attuale sbagliata: respinto', code(call('a.changePassword', { current: 'sbagliata', next: 'NuovaPassword1' }, tk)) === 'wrong_password');
ok('password troppo corta: respinto', code(call('a.changePassword', { current: TEMP, next: 'corta' }, tk)) === 'weak_password');
ok('chi è entrato con la provvisoria può scegliere la nuova senza riscriverla', (() => {
  const r = call('a.changePassword', { current: null, next: 'NuovaPassword1' }, tk);
  return r.ok;
})());
ok('la vecchia password non funziona più, la nuova sì', code(call('login', { email: 'titolare@gmail.com', password: TEMP })) === 'invalid_credentials' && call('login', { email: 'titolare@gmail.com', password: 'NuovaPassword1' }).ok);
const lg2 = call('login', { email: 'titolare@gmail.com', password: 'NuovaPassword1' });
ok('ora non deve più cambiarla', lg2.d.mustChange === false && call('session', {}, lg2.d.token).d.recovery === false);
ok('accesso normale: senza password attuale non si cambia', code(call('a.changePassword', { current: null, next: 'AltraPassword22' }, lg2.d.token)) === 'wrong_password');
ok('con la password attuale giusta si cambia e si chiudono gli altri accessi', (() => {
  const other = call('login', { email: 'titolare@gmail.com', password: 'NuovaPassword1' }).d.token;
  const r = call('a.changePassword', { current: 'NuovaPassword1', next: 'AltraPassword22' }, lg2.d.token);
  return r.ok && call('session', {}, other).d === null && call('session', {}, lg2.d.token).d !== null;
})());
ok('nessuna password (né vecchia né nuova) è scritta in chiaro nei fogli', !state.sheets.some((s) => /NuovaPassword1|AltraPassword22/.test(JSON.stringify(dump(s.name)))));
const T = call('login', { email: 'titolare@gmail.com', password: 'AltraPassword22' }).d.token;
ok('uscita: il codice non vale più', (() => { call('logout', {}, T); return call('session', {}, T).d === null; })());
const T2 = call('login', { email: 'titolare@gmail.com', password: 'AltraPassword22' }).d.token;
ok('accesso scaduto dopo 14 giorni', (() => { setNow('2026-11-12T09:00:00Z'); const r = call('a.cars', {}, T2); setNow(NOW); return r.e === 'unauthorized'; })());
let TOK = call('login', { email: 'titolare@gmail.com', password: 'AltraPassword22' }).d.token;

section('Password dimenticata');
fresh();
ok('indirizzo sconosciuto: risposta uguale, nessuna email', code(call('requestReset', { email: 'ignoto@x.it' })) === 'ok' && state.outbox.length === 0);
ok('indirizzo noto: una email con il link al sito salvato', (() => {
  call('requestReset', { email: 'Titolare@gmail.com' });
  return state.outbox.length === 1 && state.outbox[0].toList[0] === 'titolare@gmail.com' && /https:\/\/nomeutente\.github\.io\/monfalcar\/admin\/login\?reset=[a-f0-9]{40,}/.test(state.outbox[0].body);
})());
ok('il link porta SEMPRE al sito impostato (non a un indirizzo scelto da chi chiama)', (() => {
  fresh();
  call('requestReset', { email: 'titolare@gmail.com', origin: 'https://evil.example', siteUrl: 'https://evil.example/' });
  return !/evil/.test(state.outbox[0].body);
})());
const resetToken = (() => { fresh(); call('requestReset', { email: 'titolare@gmail.com' }); return /reset=([a-f0-9]+)/.exec(state.outbox[0].body)[1]; })();
ok('il codice del link non è salvato in chiaro', !JSON.stringify(dump('Sessioni')).includes(resetToken));
ok('limite 3 richieste all’ora (la 4ª non manda email)', (() => { fresh(); call('requestReset', { email: 'titolare@gmail.com' }); call('requestReset', { email: 'titolare@gmail.com' }); return state.outbox.length === 0; })());
const redeemed = call('redeemReset', { token: resetToken });
ok('il link fa entrare (una sola volta)', redeemed.ok && redeemed.d.user.email === 'titolare@gmail.com' && code(call('redeemReset', { token: resetToken })) === 'invalid_credentials');
ok('con l’accesso da link si sceglie la nuova password senza quella vecchia', code(call('a.changePassword', { current: null, next: 'DopoReset333' }, redeemed.d.token)) === 'ok' && call('login', { email: 'titolare@gmail.com', password: 'DopoReset333' }).ok);
ok('link scaduto dopo 30 minuti', (() => {
  setNow('2026-10-28T09:00:00Z'); fresh();
  // si azzerano le richieste recenti spostando avanti l'orologio di un'ora
  setNow('2026-10-28T11:00:00Z');
  call('requestReset', { email: 'titolare@gmail.com' });
  const t = /reset=([a-f0-9]+)/.exec(state.outbox[0].body)[1];
  setNow('2026-10-28T11:31:00Z');
  const r = call('redeemReset', { token: t });
  setNow(NOW);
  return r.e === 'invalid_credentials';
})());
ok('senza indirizzo del sito salvato: nessuna email (non si inventano link)', (() => {
  ctx.setKv_('settings', { site_url: '' });
  setNow('2026-10-28T14:00:00Z'); fresh();
  call('requestReset', { email: 'titolare@gmail.com' });
  const n = state.outbox.length;
  setNow(NOW);
  ctx.setKv_('settings', { site_url: 'https://nomeutente.github.io/monfalcar/' });
  return n === 0;
})());
ok('codice inventato o vuoto: respinto', code(call('redeemReset', { token: 'abc' })) === 'invalid_credentials' && code(call('redeemReset', {})) === 'invalid_credentials');

ok('dopo il cambio password da link, gli altri accessi aperti sono chiusi', call('session', {}, TOK).d === null);
TOK = call('login', { email: 'titolare@gmail.com', password: 'DopoReset333' }).d.token;

/* ===================== Auto ===================== */
section('Auto');
const carIn = (over = {}) => ({
  id: 'car-golf-0001', title: 'Volkswagen Golf 2.0 TDI', brand: 'Volkswagen', model: 'Golf', version: '', year: 2019, km: 72000, fuel: 'Diesel',
  gearbox: 'Manuale', power_kw: 110, color: 'Grigio', body_type: 'Berlina', doors: 5, seats: 5, service_type: 'vendita', price: 17500,
  rate_day: null, rate_week: null, rate_month: null, status: 'disponibile', description: 'Berlina compatta.', features: ['Navigatore', 'Cruise control'],
  photos: [], featured: true, plate: 'AB123CD', ...over,
});
ok('nuova auto salvata', code(call('a.saveCar', { car: carIn(), isNew: true }, TOK)) === 'ok');
ok('stesso id come nuova: respinta', code(call('a.saveCar', { car: carIn(), isNew: true }, TOK)) === 'invalid_input');
ok('modifica di auto inesistente: respinta', code(call('a.saveCar', { car: carIn({ id: 'altra-auto-1' }), isNew: false }, TOK)) === 'invalid_input');
const bad = (over) => code(call('a.saveCar', { car: carIn({ id: 'tmp-auto-9999', ...over }), isNew: true }, TOK));
ok('titolo vuoto, stato o tipo strani, prezzo negativo, anno assurdo: respinti', bad({ title: ' ' }) === 'invalid_input' && bad({ status: 'boh' }) === 'invalid_input' && bad({ service_type: 'x' }) === 'invalid_input' && bad({ price: -5 }) === 'invalid_input' && bad({ year: 1900 }) === 'invalid_input' && bad({ km: 'molti' }) === 'invalid_input');
ok('id con caratteri strani respinto', bad({ id: 'a b/../c' }) === 'invalid_input');
ok('foto con indirizzo strano respinta', bad({ photos: ['javascript:alert(1)'] }) === 'invalid_input');
ok('pubblico: vede l’auto con prezzo e dotazioni, senza targa', (() => { const c = call('cars').d[0]; return c.title.includes('Golf') && c.price === 17500 && c.features.length === 2 && !('plate' in c) && c.year === 2019; })());
ok('pubblico: dettaglio auto', call('car', { id: 'car-golf-0001' }).d.title.includes('Golf') && call('car', { id: 'nessuna' }).d === null);
ok('gestore: vede anche la targa', call('a.car', { id: 'car-golf-0001' }, TOK).d.plate === 'AB123CD');
ok('gestore: elenco auto senza targa', !('plate' in call('a.cars', {}, TOK).d[0]));
ok('modifica del titolo e della targa', (() => { call('a.saveCar', { car: carIn({ title: 'Golf 2.0 TDI Highline', plate: 'ZZ999ZZ' }), isNew: false }, TOK); return call('car', { id: 'car-golf-0001' }).d.title === 'Golf 2.0 TDI Highline' && call('a.car', { id: 'car-golf-0001' }, TOK).d.plate === 'ZZ999ZZ'; })());
ok('cambio rapido del prezzo: subito sul sito', (() => { call('a.setCarPrices', { id: 'car-golf-0001', prices: { price: 16900, rate_day: null, rate_week: null, rate_month: null } }, TOK); return call('car', { id: 'car-golf-0001' }).d.price === 16900; })());
ok('prezzi negativi o non numerici respinti', code(call('a.setCarPrices', { id: 'car-golf-0001', prices: { price: -1 } }, TOK)) === 'invalid_input' && code(call('a.setCarPrices', { id: 'car-golf-0001', prices: { price: 'tanto' } }, TOK)) === 'invalid_input');
ok('prezzo su richiesta (vuoto) accettato', (() => { call('a.setCarPrices', { id: 'car-golf-0001', prices: { price: null, rate_day: null, rate_week: null, rate_month: null } }, TOK); const p = call('car', { id: 'car-golf-0001' }).d.price === null; call('a.setCarPrices', { id: 'car-golf-0001', prices: { price: 16900 } }, TOK); return p; })());
ok('prezzo scritto a mano nel Foglio come "12.500" letto come 12500', (() => {
  const row = ctx.findBy_('cars', 'id', 'car-golf-0001');
  const sh = sheetByName('Auto'); const col = ctx.SHEETS.cars.cols.findIndex((c) => c[0] === 'price') + 1;
  sh.fmt.set(`${row._row},${col}`, '@'); sh.cells.set(`${row._row},${col}`, '12.500');
  delete ctx.tableCache_.cars;
  const v = call('car', { id: 'car-golf-0001' }).d.price;
  sh.cells.set(`${row._row},${col}`, '16900'); delete ctx.tableCache_.cars;
  return v === 12500;
})());
ok('stato "non disponibile": sparisce dal pubblico ma non dal gestore', (() => {
  call('a.setCarStatus', { id: 'car-golf-0001', status: 'non_disponibile' }, TOK);
  const hidden = call('cars').d.length === 0 && call('car', { id: 'car-golf-0001' }).d === null && call('a.cars', {}, TOK).d.length === 1;
  call('a.setCarStatus', { id: 'car-golf-0001', status: 'venduta' }, TOK);
  const sold = call('cars').d[0].status === 'venduta';
  call('a.setCarStatus', { id: 'car-golf-0001', status: 'disponibile' }, TOK);
  return hidden && sold;
})());
ok('stato non valido respinto', code(call('a.setCarStatus', { id: 'car-golf-0001', status: 'boh' }, TOK)) === 'invalid_input');
ok('auto in evidenza davanti alle altre, poi le più recenti', (() => {
  setNow('2026-10-28T09:05:00Z');
  call('a.saveCar', { car: carIn({ id: 'car-panda-0002', title: 'Fiat Panda', featured: false, price: 11900 }), isNew: true }, TOK);
  setNow('2026-10-28T09:10:00Z');
  call('a.saveCar', { car: carIn({ id: 'car-yaris-0003', title: 'Toyota Yaris', featured: false, price: 14000 }), isNew: true }, TOK);
  setNow(NOW);
  return call('cars').d.map((c) => c.id).join() === 'car-golf-0001,car-yaris-0003,car-panda-0002';
})());
ok('prenotazione collegata a un’auto: l’auto compare nell’avviso', (() => {
  fresh();
  const r = book({ carId: 'car-golf-0001', serviceId: svc['test-drive'].id, start: iso('2026-11-13', '09:00'), email: 'auto@c.it', name: 'Auto Test' });
  return code(r) === 'ok' && state.outbox.some((m) => /Auto di interesse: Golf 2\.0 TDI Highline/.test(m.body));
})());
ok('richiesta info su un’auto: titolo salvato', (() => {
  call('createInfoRequest', reqIn({ carId: 'car-golf-0001', email: 'inforichiesta@c.it', name: 'Info Test' }));
  return dump('Richieste').some((r) => r[3] === 'Golf 2.0 TDI Highline');
})());

section('Foto delle auto');
const PNG = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(300, 7)]).toString('base64');
const up = call('a.uploadPhoto', { carId: 'car-golf-0001', mime: 'image/png', data: PNG }, TOK);
ok('foto caricata su Drive e restituita come "drive:ID"', up.ok && /^drive:file-/.test(up.d) && state.files.length === 1 && state.files[0].folder === state.props.PHOTO_FOLDER_ID, JSON.stringify(up));
ok('foto visibile a chiunque abbia il link', JSON.stringify(state.files[0].sharing) === '["ANYONE_WITH_LINK","VIEW"]');
ok('tipo di file non ammesso respinto', code(call('a.uploadPhoto', { carId: 'car-golf-0001', mime: 'application/pdf', data: PNG }, TOK)) === 'invalid_input' && code(call('a.uploadPhoto', { carId: 'car-golf-0001', mime: 'text/html', data: PNG }, TOK)) === 'invalid_input');
ok('file vuoto o troppo grande respinto', code(call('a.uploadPhoto', { carId: 'car-golf-0001', mime: 'image/png', data: '' }, TOK)) === 'invalid_input' && code(call('a.uploadPhoto', { carId: 'car-golf-0001', mime: 'image/png', data: 'A'.repeat(12 * 1024 * 1024) }, TOK)) === 'invalid_input');
ok('foto collegata all’auto e visibile nel catalogo', (() => { call('a.saveCar', { car: carIn({ photos: [up.d] }), isNew: false }, TOK); return call('car', { id: 'car-golf-0001' }).d.photos[0] === up.d; })());
ok('eliminazione auto: riga tolta e foto spostate nel cestino di Drive', (() => {
  const r = call('a.deleteCar', { id: 'car-golf-0001' }, TOK);
  return r.ok && call('car', { id: 'car-golf-0001' }).d === null && state.files[0].trashed === true;
})());
ok('rimozione foto singola', (() => {
  const u2 = call('a.uploadPhoto', { carId: 'car-panda-0002', mime: 'image/webp', data: PNG }, TOK).d;
  call('a.removePhotos', { paths: [u2, 'drive:inesistente', 'https://esterno'] }, TOK);
  return state.files.find((f) => `drive:${f.id}` === u2).trashed === true;
})());

/* ===================== Prenotazioni lato gestori ===================== */
section('Prenotazioni lato gestori');
list = call('a.bookings', {}, TOK).d;
ok('elenco con servizio, cliente, auto e dettagli', list.length > 5 && list.every((b) => b.service.name && b.customer.email && typeof b.details === 'object') && list.some((b) => b.car && b.car.title.includes('Golf')));
ok('elenco ordinato per data', list.every((b, i) => i === 0 || list[i - 1].start_at <= b.start_at));
const target = list.find((b) => b.customer.email === 'mario@cliente.it' && b.status === 'in_attesa');
fresh();
const acc = call('a.setBookingStatus', { id: target.id, status: 'confermata' }, TOK);
ok('accetta: email di conferma al cliente e esito "sent"', acc.ok && acc.d.email === 'sent' && state.outbox.length === 1 && state.outbox[0].toList[0] === 'mario@cliente.it' && /Appuntamento confermato/.test(state.outbox[0].subject));
ok('conferma officina: ricorda che è per vedere l’auto e cosa portare', /non è la prenotazione del lavoro/.test(state.outbox[0].body) && /libretto di circolazione/.test(state.outbox[0].body));
ok('registrato chi e quando ha gestito', (() => { const r = dump('Prenotazioni').find((x) => x[0] === target.id); return r[15] === 'titolare@gmail.com' && /^2026-10-28 10:00/.test(r[16]); })());
fresh();
ok('stesso stato di nuovo: nessuna seconda email', call('a.setBookingStatus', { id: target.id, status: 'confermata' }, TOK).d.email === 'none' && state.outbox.length === 0);
const target2 = list.find((b) => b.customer.email === 'luca@cliente.it');
fresh();
const rj = call('a.setBookingStatus', { id: target2.id, status: 'rifiutata', reason: 'Quel giorno siamo chiusi per formazione' }, TOK);
ok('rifiuta: email al cliente con il motivo', rj.d.email === 'sent' && /Quel giorno siamo chiusi per formazione/.test(state.outbox[0].body) && /Non riusciamo a confermare/.test(state.outbox[0].subject));
ok('rifiuta: il motivo è visibile nell’elenco', call('a.bookings', {}, TOK).d.find((b) => b.id === target2.id).reject_reason === 'Quel giorno siamo chiusi per formazione');
fresh();
const target3 = list.find((b) => b.customer.email === 'nuovo@cliente.it');
ok('completata o annullata: nessuna email', call('a.setBookingStatus', { id: target3.id, status: 'completata' }, TOK).d.email === 'none' && state.outbox.length === 0);
ok('stato non valido o prenotazione inesistente: respinto', code(call('a.setBookingStatus', { id: target.id, status: 'boh' }, TOK)) === 'invalid_input' && code(call('a.setBookingStatus', { id: 'no', status: 'confermata' }, TOK)) === 'invalid_input');
const target4 = list.find((b) => b.customer.email === 'f@c.it' || b.customer.email === 'formula@c.it');
state.mailFail = 'Service invoked too many times for one day: email';
const noMail = call('a.setBookingStatus', { id: target4.id, status: 'confermata' }, TOK);
state.mailFail = null;
ok('email non partita: la conferma resta salvata e il gestore è avvisato ("failed")', noMail.ok && noMail.d.email === 'failed' && call('a.bookings', {}, TOK).d.find((b) => b.id === target4.id).status === 'confermata');
ok('l’errore è scritto nel Registro email', dump('Registro email').some((r) => r[4] === 'non inviata' && /too many times/.test(r[5])));
ok('prenotazione salvata anche se le email non partono', (() => {
  state.mailFail = 'boom';
  const r = book({ start: iso('2026-11-16', '09:00'), email: 'senzamail@c.it', name: 'Senza Mail' });
  state.mailFail = null;
  return code(r) === 'ok' && dump('Prenotazioni').some((x) => x[6] === 'senzamail@c.it');
})());
ok('limite giornaliero Gmail: nessun errore, scritto nel Registro', (() => {
  state.mailQuota = state.mailSent;
  fresh();
  const r = book({ start: iso('2026-11-16', '10:00'), email: 'quota@c.it', name: 'Quota Test' });
  state.mailQuota = 100;
  return code(r) === 'ok' && state.outbox.length === 0 && dump('Registro email').some((x) => /Limite giornaliero/.test(x[5]));
})());

section('Richieste lato gestori');
const reqs = call('a.requests', {}, TOK).d;
ok('elenco richieste, la più recente prima', reqs.length >= 6 && reqs.every((r, i) => i === 0 || reqs[i - 1].created_at >= r.created_at) && reqs[0].handled === false);
ok('segna come gestita e di nuovo da gestire', (() => { call('a.setRequestHandled', { id: reqs[0].id, handled: true }, TOK); const a = call('a.requests', {}, TOK).d.find((r) => r.id === reqs[0].id).handled; call('a.setRequestHandled', { id: reqs[0].id, handled: false }, TOK); return a === true && call('a.requests', {}, TOK).d.find((r) => r.id === reqs[0].id).handled === false; })());

section('Orari, chiusure, servizi');
const ALL = (over = {}) => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ weekday: d, closed: d === 0 || d === 6, opens: '08:30', closes: '18:30', break_start: '12:30', break_end: '14:30', ...(d === 0 || d === 6 ? { opens: null, closes: null, break_start: null, break_end: null } : {}), ...over[d] }));
ok('orario incoerente (apre dopo la chiusura) respinto', code(call('a.saveHours', { hours: ALL({ 1: { opens: '19:00' } }) }, TOK)) === 'invalid_input');
ok('pausa a metà respinta', code(call('a.saveHours', { hours: ALL({ 1: { break_end: null } }) }, TOK)) === 'invalid_input');
ok('giorno doppio o fuori scala respinto', code(call('a.saveHours', { hours: [{ weekday: 1, closed: true }, { weekday: 1, closed: true }] }, TOK)) === 'invalid_input' && code(call('a.saveHours', { hours: [{ weekday: 9, closed: true }] }, TOK)) === 'invalid_input');
ok('nuovi orari: lunedì apre alle 07:30 e senza pausa', (() => {
  call('a.saveHours', { hours: ALL({ 1: { opens: '07:30:00', break_start: null, break_end: null } }) }, TOK);
  const h = call('hours').d[1];
  const s = call('slots', { day: MONDAY, serviceId: svc.officina.id }).d;
  call('a.saveHours', { hours: ALL() }, TOK);
  return h.opens === '07:30' && h.break_start === null && s.length === 22 && ctx.Utilities.formatDate(new env.D(s[0].start), 'Europe/Rome', 'HH:mm') === '07:30';
})());
ok('sabato aperto: compaiono gli orari del sabato', (() => {
  call('a.saveHours', { hours: ALL({ 6: { closed: false, opens: '09:00', closes: '12:00', break_start: null, break_end: null } }) }, TOK);
  const n = call('slots', { day: SATURDAY, serviceId: svc.officina.id }).d.length;
  call('a.saveHours', { hours: ALL() }, TOK);
  return n === 6 && call('slots', { day: SATURDAY, serviceId: svc.officina.id }).d.length === 0;
})());
ok('chiusure: elenco solo da oggi, aggiunta, rimozione', (() => {
  call('a.addClosures', { days: ['2026-10-20', '2026-12-24', '2026-12-25'], reason: 'Festività' }, TOK);
  const l = call('a.closures', {}, TOK).d;
  const names = l.map((c) => c.day).join();
  call('a.deleteClosure', { day: '2026-12-24' }, TOK);
  return names.includes('2026-12-24') && !names.includes('2026-10-20') && l.find((c) => c.day === '2026-12-25').reason === 'Festività' && !call('a.closures', {}, TOK).d.some((c) => c.day === '2026-12-24');
})());
ok('giorno di chiusura non valido respinto', code(call('a.addClosures', { days: ['2026-02-31'], reason: '' }, TOK)) === 'invalid_input' && code(call('a.addClosures', { days: ['domani'], reason: '' }, TOK)) === 'invalid_input');
ok('stessa chiusura due volte: una sola riga (aggiorna il motivo)', (() => { call('a.addClosures', { days: ['2026-12-25'], reason: 'Natale' }, TOK); return call('a.closures', {}, TOK).d.filter((c) => c.day === '2026-12-25').length === 1 && call('a.closures', {}, TOK).d.find((c) => c.day === '2026-12-25').reason === 'Natale'; })());
ok('durata e capacità del servizio', (() => {
  call('a.saveService', { id: svc.officina.id, duration_min: 60, capacity: 3 }, TOK);
  const n = call('slots', { day: MONDAY, serviceId: svc.officina.id }).d.length;
  const s = call('a.services', {}, TOK).d.find((x) => x.slug === 'officina');
  call('a.saveService', { id: svc.officina.id, duration_min: 30, capacity: 2 }, TOK);
  return s.duration_min === 60 && s.capacity === 3 && n < 16;
})());
ok('durata o capacità non valide respinte', code(call('a.saveService', { id: svc.officina.id, duration_min: 5, capacity: 2 }, TOK)) === 'invalid_input' && code(call('a.saveService', { id: svc.officina.id, duration_min: 30, capacity: 0 }, TOK)) === 'invalid_input' && code(call('a.saveService', { id: 'no', duration_min: 30, capacity: 2 }, TOK)) === 'invalid_input');

section('Dati dell’attività');
const infoIn = { phone: '0481 123456', whatsapp: '333 1234567', email: 'info@monfalcar.it', address: 'Via Timavo 24', city: '34074 Monfalcone (GO)', vat: 'IT01234567890', reply_time: 'Rispondiamo entro un giorno', map_lat: 45.8056, map_lon: 13.5326 };
ok('salvataggio dati attività', code(call('a.saveSiteInfo', { info: infoIn }, TOK)) === 'ok');
const info1 = call('siteInfo').d;
ok('il pubblico li legge subito (anche coordinate come numeri)', info1.phone === '0481 123456' && info1.address === 'Via Timavo 24' && info1.map_lat === 45.8056 && info1.map_lon === 13.5326 && info1.vat === 'IT01234567890');
ok('solo una coordinata: respinto', code(call('a.saveSiteInfo', { info: { ...infoIn, map_lon: null } }, TOK)) === 'invalid_input');
ok('coordinate fuori scala o testi troppo lunghi: respinti', code(call('a.saveSiteInfo', { info: { ...infoIn, map_lat: 95 } }, TOK)) === 'invalid_input' && code(call('a.saveSiteInfo', { info: { ...infoIn, phone: '1'.repeat(41) } }, TOK)) === 'invalid_input');
ok('coordinate svuotate: tornano a null', (() => { call('a.saveSiteInfo', { info: { ...infoIn, map_lat: null, map_lon: null } }, TOK); const i = call('siteInfo').d; call('a.saveSiteInfo', { info: infoIn }, TOK); return i.map_lat === null && i.map_lon === null; })());
ok('le email usano il telefono e l’indirizzo salvati', (() => {
  fresh(); book({ start: iso('2026-11-17', '09:00'), email: 'dati@c.it', name: 'Dati Test' });
  const m = state.outbox[0].body;
  return /0481 123456/.test(m) && /Via Timavo 24, 34074 Monfalcone \(GO\)/.test(m);
})());

/* ===================== Notifiche email ===================== */
section('Notifiche email');
ok('di partenza: avvisi attivi, indirizzo = quello del primo gestore', (() => { const n = call('a.getNotifications', {}, TOK).d; return n.emails === 'titolare@gmail.com' && n.on_booking === true && n.on_request === true; })());
ok('salvataggio indirizzi e scelte', code(call('a.saveNotifications', { settings: { emails: 'Officina@Esempio.it, titolare@esempio.it', on_booking: true, on_request: true } }, TOK)) === 'ok');
ok('riletti uguali', (() => { const n = call('a.getNotifications', {}, TOK).d; return n.emails === 'Officina@Esempio.it, titolare@esempio.it' && n.on_booking === true; })());
ok('lista troppo lunga respinta', code(call('a.saveNotifications', { settings: { emails: 'x'.repeat(601), on_booking: true, on_request: true } }, TOK)) === 'invalid_input');
ok('prenotazione: avviso ai due indirizzi scelti in un solo invio, risposte al cliente', (() => {
  fresh(); book({ start: iso('2026-11-18', '09:00'), email: 'notifica@c.it', name: 'Notifica Test' });
  const staff = state.outbox.find((m) => /Nuova richiesta/.test(m.subject));
  return state.outbox.length === 2 && staff.toList.join() === 'officina@esempio.it,titolare@esempio.it' && staff.replyTo === 'notifica@c.it';
})());
ok('le email al cliente rispondono al primo indirizzo della lista', (() => { fresh(); book({ start: iso('2026-11-18', '10:00'), email: 'notifica2@c.it', name: 'Notifica Due' }); return state.outbox[0].replyTo === 'officina@esempio.it'; })());
ok('avvisi prenotazioni spenti: parte solo l’email al cliente', (() => {
  call('a.saveNotifications', { settings: { emails: 'officina@esempio.it', on_booking: false, on_request: true } }, TOK);
  fresh(); book({ start: iso('2026-11-18', '11:00'), email: 'spento@c.it', name: 'Spento Test' });
  return state.outbox.length === 1 && state.outbox[0].toList[0] === 'spento@c.it';
})());
ok('avvisi richieste: attivi anche con avvisi prenotazioni spenti', (() => { fresh(); call('createInfoRequest', reqIn({ email: 'rich1@c.it', name: 'Rich Uno' })); return state.outbox.length === 1 && state.outbox[0].toList[0] === 'officina@esempio.it'; })());
ok('avvisi richieste spenti: nessuna email', (() => {
  call('a.saveNotifications', { settings: { emails: 'officina@esempio.it', on_booking: true, on_request: false } }, TOK);
  fresh(); call('createInfoRequest', reqIn({ email: 'rich2@c.it', name: 'Rich Due' }));
  return state.outbox.length === 0;
})());
ok('lista vuota: si usa la Gmail del titolare', (() => {
  call('a.saveNotifications', { settings: { emails: '', on_booking: true, on_request: true } }, TOK);
  fresh(); book({ start: iso('2026-11-19', '09:00'), email: 'vuoto@c.it', name: 'Vuoto Test' });
  return state.outbox.some((m) => m.toList[0] === 'titolare@gmail.com' && /Nuova richiesta/.test(m.subject));
})());
ok('indirizzi non validi nella lista vengono ignorati', (() => {
  call('a.saveNotifications', { settings: { emails: 'sbagliato, ok@esempio.it ;; altro', on_booking: true, on_request: true } }, TOK);
  fresh(); book({ start: iso('2026-11-19', '10:00'), email: 'ignora@c.it', name: 'Ignora Test' });
  return state.outbox.find((m) => /Nuova richiesta/.test(m.subject)).toList.join() === 'ok@esempio.it';
})());
call('a.saveNotifications', { settings: { emails: 'officina@esempio.it, titolare@esempio.it', on_booking: true, on_request: true } }, TOK);

section('Email di prova');
ok('senza indirizzi: respinta', code(call('a.testEmail', { to: [] }, TOK)) === 'no_recipients' && code(call('a.testEmail', { to: ['non-valido'] }, TOK)) === 'no_recipients');
ok('invio a più indirizzi (massimo 5, senza doppioni)', (() => {
  fresh();
  const r = call('a.testEmail', { to: ['a@x.it', 'b@x.it', 'A@x.it', 'c@x.it', 'd@x.it', 'e@x.it', 'f@x.it', 'g@x.it'] }, TOK);
  return r.ok && r.d.sent === 5 && state.outbox.length === 1 && state.outbox[0].toList.length === 5 && /Email di prova - MONFALCAR/.test(state.outbox[0].subject);
})());
ok('Gmail rifiuta: errore chiaro per il sito', (() => { state.mailFail = 'Authorization is required to perform that action.'; const r = call('a.testEmail', { to: ['a@x.it'] }, TOK); state.mailFail = null; return r.e === 'email_rejected'; })());
ok('un indirizzo scorretto in mezzo non rompe l’invio agli altri', call('a.testEmail', { to: ['a@x.it', 'rotto'] }, TOK).d.sent === 1);

/* ===================== Promemoria ===================== */
section('Promemoria del giorno prima');
{
  // si usa una prenotazione confermata il 2026-11-02 alle 09:00 (08:00 UTC)
  const b = ctx.readAll_('bookings').find((x) => x.customer_email === 'mario@cliente.it' && x.status === 'confermata');
  setNow('2026-11-01T08:30:00Z'); // 23,5 ore prima
  fresh();
  const n1 = ctx.sendReminders();
  ok('promemoria inviato 24 ore prima', n1 >= 1 && state.outbox.some((m) => m.toList[0] === 'mario@cliente.it' && /Promemoria: domani/.test(m.subject)), String(n1));
  ok('il promemoria dell’officina ricorda di portare l’auto', /Porta l'auto/.test(state.outbox.find((m) => /Promemoria/.test(m.subject)).body));
  ok('segnato come inviato nel Foglio', !!ctx.findBy_('bookings', 'id', b.id).reminder_sent_at);
  fresh();
  ok('secondo giro: nessun doppione', ctx.sendReminders() === 0 && state.outbox.length === 0);
  setNow('2026-10-30T09:00:00Z'); fresh();
  ok('troppo presto: nessun promemoria', ctx.sendReminders() === 0 && state.outbox.length === 0);
  // email che fallisce: non si segna come inviato e si riprova dopo
  const c = ctx.readAll_('bookings').find((x) => x.customer_email === 'formula@c.it');
  ctx.updateRow_('bookings', { ...c, status: 'confermata', reminder_sent_at: null });
  setNow('2026-11-11T08:30:00Z'); // 2026-11-12 09:00 locale = 08:00Z => 23,5 ore
  state.mailFail = 'boom';
  const f1 = ctx.sendReminders();
  state.mailFail = null;
  ok('email non partita: non segnato, si riprova al giro dopo', f1 === 0 && !ctx.findBy_('bookings', 'id', c.id).reminder_sent_at && ctx.sendReminders() === 1);
  setNow(NOW);
  ok('in attesa o rifiutate: niente promemoria', (() => { setNow('2026-11-02T08:30:00Z'); fresh(); const n = ctx.sendReminders(); setNow(NOW); return state.outbox.every((m) => !/in attesa/.test(m.body)) && n >= 0; })());
}

/* ===================== Concorrenza ===================== */
section('Blocco contro le richieste contemporanee');
ok('se il blocco è occupato la richiesta non passa e non salva nulla', (() => {
  const before = dump('Prenotazioni').length;
  state.lockHeld = true;
  const r = book({ start: iso('2026-11-20', '09:00'), email: 'lock@c.it', name: 'Lock Test' });
  state.lockHeld = false;
  return r.e === 'too_many_requests' && dump('Prenotazioni').length === before;
})());
ok('il blocco viene rilasciato anche dopo un errore', (() => { book({ start: iso('2026-11-20', '09:05'), email: 'lock2@c.it', name: 'Lock Due' }); return state.lockHeld === false; })());

/* ===================== Menu del Foglio ===================== */
section('Menu del Foglio');
ctx.onOpen();
ok('menu MONFALCAR creato', state.menus.length === 1 && state.menus[0].name === 'MONFALCAR' && state.menus[0].items.length >= 6);
ok('ogni voce del menu punta a una funzione che esiste', state.menus[0].items.every(([, fn]) => typeof ctx[fn] === 'function'), state.menus[0].items.map((i) => i[1]).join());
state.alerts.length = 0;
state.prompts.push('nuovo@gmail.com', 'Giulia');
ctx.menuAddAdmin();
const pwMatch = /Password provvisoria: (\S+)/.exec(state.alerts[0].message);
ok('menu: aggiungi gestore mostra la password provvisoria e il nuovo gestore entra', !!pwMatch && call('login', { email: 'nuovo@gmail.com', password: pwMatch[1] }).d.mustChange === true);
state.alerts.length = 0;
state.prompts.push('nuovo@gmail.com');
ctx.menuResetAdmin();
const pw2 = /\n\n(\S+)\n\nAl prossimo/.exec(state.alerts[0].message);
ok('menu: reimposta password: la vecchia non vale più, la nuova provvisoria sì', !!pw2 && code(call('login', { email: 'nuovo@gmail.com', password: pwMatch[1] })) === 'invalid_credentials' && call('login', { email: 'nuovo@gmail.com', password: pw2[1] }).ok);
ok('menu: indirizzo non valido segnalato', (() => { state.alerts.length = 0; state.prompts.push('non-email', 'X'); ctx.menuAddAdmin(); return /non valido/.test(state.alerts[0].message); })());
ok('menu: rimuovi gestore (non può più entrare)', (() => {
  const tkn = call('login', { email: 'nuovo@gmail.com', password: pw2[1] }).d.token;
  state.prompts.push('nuovo@gmail.com'); ctx.menuRemoveAdmin();
  return code(call('login', { email: 'nuovo@gmail.com', password: pw2[1] })) === 'invalid_credentials' && call('session', {}, tkn).d === null;
})());
ok('menu: non si può rimuovere l’ultimo gestore', (() => {
  state.alerts.length = 0;
  ctx.menuRemoveAdmin(); // finora ne restano 2 (titolare + blocco): si tolgono finché ne resta uno
  const rest = ctx.readAll_('admins').map((a) => a.email).filter((e) => e !== 'titolare@gmail.com');
  rest.forEach((e) => { state.prompts.push(e); ctx.menuRemoveAdmin(); });
  state.alerts.length = 0; state.prompts.push('titolare@gmail.com'); ctx.menuRemoveAdmin();
  return /ultimo gestore/.test(state.alerts[0].message) && ctx.readAll_('admins').length === 1;
})());
ok('menu: indirizzo dell’app web mostrato se pubblicata', (() => { state.alerts.length = 0; ctx.menuShowUrl(); return /AKfycbxEXAMPLE\/exec/.test(state.alerts[0].message); })());
ok('menu: se non pubblicata spiega cosa fare', (() => { state.alerts.length = 0; const u = state.webAppUrl; state.webAppUrl = ''; ctx.menuShowUrl(); state.webAppUrl = u; return /non risulta ancora pubblicata/.test(state.alerts[0].message); })());
ok('menu: email di prova a me', (() => { fresh(); state.alerts.length = 0; ctx.menuTestEmail(); return state.outbox.length === 1 && state.outbox[0].toList[0] === 'titolare@gmail.com' && /inviata/.test(state.alerts[0].message); })());
ok('menu: controllo generale', (() => { state.alerts.length = 0; ctx.menuCheck(); const m = state.alerts[0].message; return /Tutti i fogli ci sono/.test(m) && /Promemoria automatici attivi/.test(m) && /App web pubblicata/.test(m) && !/DA FARE/.test(m.replace(/Telefono[^\n]*/, '')); })());
ok('menu: prima configurazione guidata da finestre', (() => {
  const e2 = createEnv({ ownerEmail: 'altro@gmail.com' });
  e2.state.prompts.push('', '', 'https://x.github.io/sito');
  e2.ctx.menuSetup();
  const msg = e2.state.alerts[0].message;
  return /Configurazione completata/.test(msg) && /Email: altro@gmail\.com/.test(msg) && /Password provvisoria: \S+/.test(msg) && e2.ctx.setting_('site_url', '') === 'https://x.github.io/sito/';
})());
ok('menu: prima configurazione annullata non crea nulla', (() => { const e3 = createEnv(); e3.state.prompts.push(null); e3.ctx.menuSetup(); return e3.state.sheets.length === 1 && e3.state.alerts.length === 0; })());

section('Casella aziendale non Gmail (es. Libero)');
{
  const e4 = createEnv({ ownerEmail: 'monfalcar.officina@gmail.com' });
  e4.setNow(NOW);
  const r4 = e4.ctx.setup_({ adminEmail: 'Officina@Libero.it', adminName: 'Officina', siteUrl: 'https://x.github.io/sito/' });
  ok('gestore con email Libero creato, avvisi impostati su quell’indirizzo', r4.adminEmail === 'officina@libero.it' && e4.ctx.setting_('notif_emails', '') === 'officina@libero.it');
  const login4 = e4.call('login', { email: 'officina@libero.it', password: r4.tempPassword });
  ok('si entra con l’email Libero', login4.ok);
  const sv4 = e4.call('services').d.find((x) => x.slug === 'officina');
  e4.state.outbox.length = 0;
  const b4 = e4.call('createBooking', { serviceId: sv4.id, carId: null, start: iso(MONDAY, '09:00'), name: 'Mario Rossi', email: 'mario@cliente.it', phone: '333 1234567', note: '', details: {}, consentPrivacy: true, consentMarketing: false });
  const staff4 = e4.state.outbox.find((m) => /Nuova richiesta/.test(m.subject));
  const cust4 = e4.state.outbox.find((m) => m.toList[0] === 'mario@cliente.it');
  ok('prenotazione: avviso alla casella Libero, non alla Gmail che ospita il Foglio', b4.ok && !!staff4 && staff4.toList.join() === 'officina@libero.it');
  ok('le risposte del cliente arrivano alla casella Libero', !!cust4 && cust4.replyTo === 'officina@libero.it');
  e4.state.outbox.length = 0;
  e4.call('requestReset', { email: 'officina@libero.it' });
  ok('link "password dimenticata" alla casella Libero', e4.state.outbox.length === 1 && e4.state.outbox[0].toList[0] === 'officina@libero.it');
  ok('rilanciando la configurazione gli avvisi scelti non vengono cambiati', (() => { e4.call('a.saveNotifications', { settings: { emails: 'altra@libero.it', on_booking: true, on_request: true } }, login4.d.token); e4.ctx.setup_({ adminEmail: 'x@libero.it' }); return e4.ctx.setting_('notif_emails', '') === 'altra@libero.it'; })());
}

section('Controlli finali');
ok('nessuna formula valutata e nessuna scrittura fuori dal foglio', state.formulaEvals === 0 && state.outOfBounds === 0);
ok('nessun errore imprevisto scritto nei log (a parte quelli provocati dai test)', state.consoleErrors.every((e) => /Invio email fallito|Email|boom|Service invoked|Authorization|Errore imprevisto: SyntaxError/.test(e)), state.consoleErrors.filter((e) => !/Invio email fallito|Email|boom|Service invoked|Authorization|Errore imprevisto: SyntaxError/.test(e)).join(' | '));
ok('il blocco è libero alla fine', state.lockHeld === false);

console.log(results.join('\n'));
console.log(fails ? `\n${fails} CONTROLLI FALLITI` : `\nTutti i controlli superati (${results.filter((r) => r.startsWith('OK')).length})`);
process.exit(fails ? 1 : 0);
