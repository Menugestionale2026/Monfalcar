# MONFALCAR – sito web con prenotazioni e area gestori

Sito completo per officina, vendita/acquisto auto e noleggio:

- **Sito pubblico**: Home, Servizi, catalogo auto con filtri, scheda auto, prenotazione online in 4 passi
  (Appuntamento in officina / Vendi la tua auto / Test drive / Noleggio), Contatti con mappa e modulo, Privacy.
- **Area riservata con password** (`/admin`): riepilogo, prenotazioni (calendario, Accetta / Rifiuta con email
  automatica al cliente), gestione auto con foto e **cambio rapido dei prezzi**, richieste di informazioni, orari di
  apertura e giorni di chiusura, **dati dell'attività** (telefono, indirizzo, ecc.), **cambio password**.
- **Email automatiche**: richiesta ricevuta, conferma, rifiuto con motivo, promemoria il giorno prima,
  avviso a voi (a uno o più indirizzi scelti da **/admin → Notifiche**) per ogni nuova prenotazione o richiesta
  di informazioni.

Colori: blu, giallo, bianco. Tutto il testo è in italiano.

> **Vuoi solo vedere il sito? Fai doppio clic su `MONFALCAR-anteprima.html`** (si apre nel browser, serve internet
> solo per i caratteri). È una versione dimostrativa con dati di esempio: nulla viene salvato.
> **Il file `index.html` non si apre da solo**: è il modello da cui il sito viene "costruito" (con `npm run build`
> o, più semplice, automaticamente da GitHub quando carichi il progetto, vedi il punto 5). Aperto con doppio clic
> mostra una pagina vuota: è normale.

**Officina: si prenota un appuntamento, non il lavoro.** Il cliente non può riservarsi da solo un tagliando o un
lavoro di ore: sceglie un appuntamento breve (30 minuti, in modo che possiate vedere l'auto) e racconta il problema.
Le email e le pagine del sito lo spiegano chiaramente ("dopo averla vista ti diciamo noi quanto tempo serve e quando
riportarla"). Il giorno e la durata del lavoro li decidete voi, parlando col cliente. La durata dell'appuntamento e
quanti se ne possono svolgere insieme si cambiano da **/admin → Orari e chiusure**. **Il sabato l'officina è chiusa**
(e la domenica): non compare tra i giorni prenotabili.

---

## Come è fatto (in parole semplici)

GitHub Pages ospita solo pagine "statiche": non può salvare prenotazioni né gestire un login. Per restare **tutto
gratuito e senza servizi esterni a pagamento** il sito usa GitHub più un normale **account Google** (quello della
Gmail dell'attività):

| Parte | Dove vive | A cosa serve |
|---|---|---|
| Il sito (React) | **GitHub Pages** | Le pagine che vedono clienti e gestori |
| I dati | **Foglio Google** (privato) | Auto, prenotazioni, richieste, orari, gestori: ogni cosa è un foglio che puoi anche leggere |
| Il "cervello" | **Google Apps Script** (`google/Code.gs`, dentro il Foglio) | Regole delle prenotazioni, accesso gestori, invio email |
| Le email | **Gmail** dell'account | Partono dall'indirizzo dell'attività, nessun dominio da comprare |
| Le foto delle auto | **Google Drive** (cartella creata da sola) | Foto pubbliche delle auto |

Costo: **zero**. Non serve carta di credito, né un dominio proprio (che resta facoltativo). Supabase e Resend, usati
nelle versioni precedenti, non servono più.

**Senza configurare nulla il sito parte in "modalità demo"** con auto e prenotazioni di esempio: serve a vederlo e
provarlo. In demo nulla viene salvato davvero e l'area gestori si apre con dati di prova che la pagina di accesso
mostra (email `gestore@monfalcar.it`, password `Monfalcar2026`): anche in anteprima l'accesso chiede davvero
email e password e si può provare a cambiare la password. Il sito diventa "vero" quando gli dai l'indirizzo
dell'app Google (punto 3).

---

## 1. Provarlo sul proprio computer

Serve [Node.js](https://nodejs.org) 20 o più recente.

```bash
npm install
npm run dev
```

Apri l'indirizzo mostrato (di solito http://localhost:5173). Area gestori: http://localhost:5173/admin/login
(in demo usa i dati di prova scritti nella pagina, oppure il pulsante "Compila i dati per me"). In alto compare
una guida "Come provarla" per chi vede l'anteprima per la prima volta.

---

## 2. Personalizzare i dati dell'azienda

**Telefono, WhatsApp, email, indirizzo, partita IVA e mappa non vanno più scritti nel codice**: dopo il collegamento a Google
(punto 3) si inseriscono da **/admin → Dati dell'attività** e il sito (e le email) si aggiornano subito. Il link
"Chiama" e quello WhatsApp si ricavano dal numero (senza prefisso si presume Italia).
I valori in **`src/config/business.ts`** (`business`) sono solo di riserva: compaiono nei primi istanti di
caricamento o se il servizio Google non risponde. I **dati legali** (ragione sociale, sede legale, numero REA,
PEC: oggetto `legal` nello stesso file) cambiano di rado e si modificano lì; compaiono nel piè di pagina di ogni
pagina e nell'informativa privacy.

In `src/config/business.ts` restano da rivedere i testi:

- `strengths` (i quattro punti di forza in Home) e `ctaBand`: riscrivili con cose **vere** per MONFALCAR;
- `testimonials`: aggiungi solo recensioni reali con il consenso dei clienti. Finché è vuoto la sezione non compare.

Da rivedere anche:

- **`src/pages/Services.tsx`**: gli elenchi puntati dei servizi sono testi di esempio; correggili in base a ciò
  che offrite davvero (es. permuta, finanziamento, ritiro in sede).
- **`src/pages/Privacy.tsx`**: informativa ai sensi dell'art. 13 GDPR, già completata con i dati dell'impresa
  e con conservazione di 24 mesi. Va aggiornata se cambiano fornitori, tempi o funzioni del sito (e riletta ogni
  tanto con un consulente privacy). I dati dei clienti stanno nel Foglio Google dell'attività e le email passano da
  Gmail: la pagina lo dice. Il Foglio non cancella nulla da solo: i dati più vecchi di 24 mesi vanno tolti a mano.
- **Orari e durate**: vedi il punto 3.8.
- **Logo e foto**: il logo è in `src/assets/logo.png` (blu, per le pagine chiare) e `src/assets/logo-white.png`
  (bianco, per il fondo scuro del piè di pagina); la foto della Home è `src/assets/hero.webp`; l'icona della
  scheda del browser è `public/favicon.png` (la "M" del logo). Per cambiarli basta sostituire i file mantenendo il
  nome. La foto ricevuta è piccola (680 px di larghezza): su uno schermo largo si vedrebbero i pixel, quindi è stata
  ingrandita e leggermente sfocata apposta, per ottenere uno sfondo morbido e pulito sotto la velatura blu. Con
  l'originale (meglio una foto scattata con il telefono, almeno 1920 px di larghezza) lo sfondo può restare nitido:
  basta sostituire `hero.webp` e, se serve, ridurre la sfocatura.

---

## 3. Collegare Google (dati, accesso gestori, foto, email)

Ci vogliono circa 15 minuti, una volta sola. Serve un **account Google gratuito** che sarà il proprietario del Foglio
e da cui partiranno le email.

**La vostra mail aziendale è Libero (o un altro fornitore che non è Gmail)?** Nessun problema: crea un account Gmail
nuovo solo per questo scopo (per esempio `monfalcar.officina@gmail.com`, gratis, senza dominio) e usalo per tutto il
punto 3. La casella Libero resta quella che usate ogni giorno: nella prima configurazione (punto 3.2) la scrivi come
email del gestore e da quel momento **gli avvisi di nuove prenotazioni, il link "password dimenticata" e le risposte
dei clienti arrivano a Libero**. I clienti ricevono le email da quell'indirizzo Gmail con il nome "MONFALCAR"; se
rispondono, la risposta va alla Libero. La Gmail serve solo da "postino" e non va letta.

### 3.1 Creare il Foglio e incollare il codice
1. Su [sheets.google.com](https://sheets.google.com) crea un **foglio vuoto** e chiamalo, ad esempio, "MONFALCAR - dati".
   **Non condividerlo con nessuno**: contiene i dati dei clienti.
2. Menu **Estensioni → Apps Script**. Si apre l'editor del codice.
3. Cancella tutto il contenuto del file `Codice.gs`, apri `google/Code.gs` di questo progetto, copia tutto e incollalo.
   Premi **Salva** (icona del dischetto) e, se vuoi, dai un nome al progetto (es. "MONFALCAR").

### 3.2 Prima configurazione
1. Torna al Foglio e **ricarica la pagina** (F5): compare il menu **MONFALCAR** accanto a "Guida".
2. **MONFALCAR → 1. Prima configurazione**. Google chiede il permesso di eseguire lo script:
   *Continua → scegli il tuo account → "Google non ha verificato questa app" → **Avanzate** → **Vai a MONFALCAR
   (non sicuro)** → **Consenti**.* L'avviso compare perché lo script è tuo e non è stato "pubblicato" da Google:
   lo script legge e scrive solo questo Foglio e la sua cartella foto, e manda email dal tuo Gmail. Se dopo
   l'autorizzazione non succede nulla, richiama **1. Prima configurazione**.
3. Rispondi alle tre finestre: l'email con cui entrerai nell'area gestori (**anche la vostra Libero**: lì arriveranno
   gli avvisi e il link per la password), il nome e l'indirizzo del sito su GitHub
   (es. `https://nomeutente.github.io/monfalcar/`; se non lo sai ancora lascia vuoto e scrivilo dopo nel foglio
   **Impostazioni**, riga `site_url`).
4. Compare una finestra con la **password provvisoria**: **copiala subito**, non viene mostrata di nuovo. Al primo
   accesso il sito ti chiede di scegliere la tua password.

Cosa ha creato: i fogli (Auto, Prenotazioni, Richieste, Servizi, Orari, Chiusure, Dati attività, Impostazioni,
Gestori, Registro email, e uno nascosto per gli accessi), i 4 servizi di partenza, gli orari (lunedì-venerdì
08:30-12:30 e 14:30-18:30, **sabato e domenica chiuso**: correggili da `/admin → Orari e chiusure` se sono diversi),
la cartella "MONFALCAR - foto delle auto" su Drive e il promemoria automatico del giorno prima.
Puoi rilanciare la configurazione quando vuoi: non cancella nulla.

### 3.3 Pubblicare l'app web
1. In Apps Script: **Implementa → Nuova implementazione**. Accanto a "Seleziona il tipo" (ingranaggio) scegli **App web**.
2. **Esegui come: Me** e **Chi ha accesso: Chiunque** (serve perché i clienti possano prenotare; i dati riservati
   restano protetti dal login dei gestori, vedi il punto 7). Premi **Implementa**.
3. Torna al Foglio: **MONFALCAR → Mostra l'indirizzo da inserire su GitHub** e copia l'indirizzo (finisce con `/exec`).

### 3.4 Dire al sito dove sono i dati
Il sito legge la variabile `VITE_API_URL`:

- in locale: copia `.env.example` in `.env.local` e incolla l'indirizzo;
- su GitHub: vedi il punto 5.

### 3.5 Controllo
1. **MONFALCAR → Controlla che sia tutto a posto**: elenca cosa manca (fogli, promemoria, app web, indirizzo del sito).
2. **MONFALCAR → Invia un'email di prova a me**: arriva alla Gmail che ospita il Foglio e serve a verificare che l'invio
   funzioni (guarda anche la posta indesiderata). Per provare la casella Libero usa poi **/admin → Notifiche → Invia
   email di prova**.
3. Apri il sito, fai una prenotazione di prova, entra in `/admin`, accettala e controlla che arrivi la conferma.

### 3.6 Aggiornare il codice in futuro
Se in seguito cambi `Code.gs` (o ne ricevi una versione nuova), dopo averlo incollato e salvato vai su **Implementa →
Gestisci implementazioni → matita → Versione: Nuova versione → Implementa**. L'indirizzo resta lo stesso. Senza
questo passaggio il sito continua a usare la versione vecchia.

### 3.7 Gestori: aggiungere, togliere, password dimenticata
- **Aggiungere o togliere una persona**: dal Foglio, menu **MONFALCAR → Aggiungi un gestore / Rimuovi un gestore**.
  Chi viene aggiunto riceve una password provvisoria da scegliere di nuovo al primo accesso.
- **Password dimenticata**: da `/admin/login` → "Password dimenticata?" arriva un'email con un link (vale 30 minuti e
  una volta sola; viene sempre costruito con l'indirizzo scritto in `site_url`). In alternativa, dal Foglio:
  **MONFALCAR → Reimposta la password di un gestore**.
- Il cambio password normale si fa da **/admin → Account**.

### 3.8 Orari, durate, giorni di chiusura
Si cambiano da **/admin → Orari e chiusure**, senza toccare il Foglio:
- orario di apertura per ogni giorno, con pausa pranzo opzionale;
- giorni di chiusura (ferie, festivi): un giorno o un intervallo, con motivo;
- durata di ogni tipo di appuntamento e quanti ne possono svolgersi insieme (l'appuntamento in officina è di 30
  minuti e ne accetta 2 alla volta: cambiate il numero se in officina accogliete i clienti in modo diverso).

Restano nel foglio **Impostazioni** (da cambiare raramente): ogni quanti minuti parte un orario (`slot_minutes`),
il preavviso minimo in ore (`min_notice_hours`) e quanti giorni in anticipo si può prenotare (`max_days_ahead`). Il
selettore della data nel sito arriva a 60 giorni: se cambi `max_days_ahead` aggiorna anche `MAX_DAYS_AHEAD` in
`src/pages/Booking.tsx`. Non modificare a mano le colonne degli identificativi, delle password e delle date: si
possono invece correggere a mano testi, prezzi e stati delle auto, ma è più comodo e sicuro farlo da `/admin`.

---

## 4. Email automatiche (Gmail)

Le email partono dalla Gmail dell'account Google (quella del punto 3), con il nome "MONFALCAR" (nessun dominio da
verificare). **Non possono partire direttamente dalla casella Libero**: Apps Script manda email solo dall'account
Google; Gmail permette di "inviare come" un altro indirizzo, ma secondo la sua guida dal gennaio 2027 questa funzione
non sarà più supportata per gli indirizzi di altri fornitori, e le email "a nome" di Libero finirebbero più
facilmente tra la posta indesiderata. Con la soluzione scelta, avvisi e risposte arrivano comunque a Libero. Cosa succede:
- **Nuova prenotazione** → al cliente l'email "richiesta ricevuta"; a voi un avviso con nome, telefono, servizio,
  data e ora e il collegamento a `/admin/prenotazioni`.
- **Nuova richiesta di informazioni** (scheda auto o Contatti) → avviso a voi con i dati e il messaggio del cliente.
- Premete **Accetta** → email di conferma al cliente; **Rifiuta** → email con il motivo che avete scritto; il giorno
  prima dell'appuntamento → promemoria (parte da solo, controllo ogni ora).
- Negli avvisi per voi, **rispondere all'email scrive direttamente al cliente**. Nelle email al cliente, la risposta
  arriva al primo indirizzo della lista Notifiche (se vuota, alla Gmail che ospita il Foglio).
- Per gli appuntamenti in officina ogni email ricorda che serve a vedere l'auto e che giorno e tempi del lavoro si
  concordano dopo.

**Scegliere chi riceve gli avvisi**: in **/admin → Notifiche** scrivete fino a 5 indirizzi (separati da virgola o a
capo; maiuscole e doppioni vengono sistemati) e decidete se volete l'avviso per le prenotazioni, per le richieste di
informazioni o per entrambe. Le modifiche valgono dalla prossima email. Con **Invia email di prova** arriva subito un
messaggio agli indirizzi scritti (anche prima di salvarli). All'inizio la lista contiene l'email del primo gestore (per
esempio la Libero). Se la svuotate, gli avvisi arrivano alla Gmail che ospita il Foglio. Le email ai clienti partono comunque, anche se spegnete gli avvisi per voi.

**Limite di Gmail**: un account Gmail gratuito può mandare circa **100 destinatari al giorno** tramite Apps Script
(un account Google Workspace molto di più; controlla le quote attuali). Una prenotazione "completa" usa 3 email al
cliente (ricevuta, conferma, promemoria) più l'avviso a ciascun indirizzo dei gestori: con due indirizzi sono 5
destinatari, cioè circa **20 prenotazioni al giorno**, più che sufficiente per decine di richieste a settimana. Se il limite finisce, **le prenotazioni vengono
salvate lo stesso**; se accettate una prenotazione e l'email non parte, il gestionale vi avvisa a schermo ("Avvisalo
tu: telefono") e l'errore resta scritto nel foglio **Registro email**.

I testi delle email sono in `google/Code.gs`, funzione `buildEmail_`.

---

## 5. Pubblicare su GitHub Pages

1. Crea un repository su GitHub e carica questo progetto (ramo `main`).
2. *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. *Settings → Secrets and variables → Actions → **Variables***: crea
   - `VITE_API_URL`: l'indirizzo dell'app Google (punto 3.3, finisce con `/exec`);
   - `VITE_BASE`: `/` se usi un dominio tuo oppure un repository chiamato `utente.github.io`;
     se non la imposti viene usato `/nome-del-repository/` (indirizzo `utente.github.io/nome-del-repository`).
4. Fai un push su `main`: il workflow `.github/workflows/deploy.yml` costruisce e pubblica il sito (scheda *Actions*).
5. Scrivi l'indirizzo finale del sito nel foglio **Impostazioni**, riga `site_url` (o nella prima configurazione):
   serve per i link nelle email, compreso quello di "password dimenticata".
6. **Dominio personalizzato** (facoltativo): *Settings → Pages → Custom domain*, poi crea il record DNS indicato da
   GitHub. Metti anche un file `public/CNAME` con il nome del dominio, imposta `VITE_BASE=/` e aggiorna `site_url`.

Note:
- GitHub Pages sul piano gratuito richiede un repository **pubblico** (verifica le condizioni attuali). Nel
  repository non c'è nulla di riservato: i dati stanno nel Foglio Google (che resta privato) e l'accesso gestori è
  protetto da password. L'indirizzo `/exec` dell'app finisce nel sito pubblico: è normale, serve a tutti i browser;
  da solo non dà accesso a nulla di riservato. Non condividere mai il Foglio né caricare file `.env.local`.
- Essendo un sito a pagina unica, Google vede titolo e descrizione di ogni pagina solo dopo l'esecuzione del
  JavaScript. Funziona, ma per un posizionamento molto curato si può in futuro passare a una soluzione con pagine
  pre-generate.

---

## 6. Uso quotidiano dell'area gestori

Indirizzo: `https://tuo-sito/admin/login`.

- **Riepilogo**: prenotazioni da gestire, appuntamenti di oggi e dei prossimi 7 giorni, richieste da leggere.
- **Prenotazioni**: calendario mensile (puntino giallo = in attesa, blu = confermata), filtro per stato, **Accetta
  e invia conferma** / **Rifiuta** (con motivo suggerito o scritto da te), poi **Segna come completata** o
  **Annulla**. Il cliente riceve l'email automatica; se l'email non riesce a partire compare un avviso rosso con il
  telefono del cliente, così potete avvisarlo voi.
- **Auto**: elenco con foto, stato cambiabile al volo (Disponibile / A noleggio / Venduta / Non disponibile),
  pulsante **Prezzo** per cambiare in pochi secondi il prezzo di vendita o le tariffe di noleggio (si possono scrivere
  anche come `12.500`),
  **Aggiungi auto** con titolo, descrizione, prezzo o tariffe di noleggio, scheda tecnica, dotazioni, targa interna
  (mai pubblica) e foto. Le foto vengono ridotte automaticamente prima del caricamento su Drive; la prima è la
  copertina. Un'auto "Venduta" resta nel catalogo in fondo con il cartellino; "Non disponibile" la nasconde.
  Eliminando un'auto le sue foto vanno nel cestino di Drive.
- **Richieste**: messaggi arrivati dalle schede auto e da Contatti, con telefono/email/WhatsApp cliccabili.
- **Orari e chiusure**: orari di apertura, ferie e festivi, durata e capacità degli appuntamenti (vedi 3.8).
- **Dati dell'attività**: telefono, WhatsApp, email, indirizzo, partita IVA, coordinate della mappa, frase sul tempo
  di risposta. Le modifiche compaiono subito nel sito e nelle email.
- **Notifiche**: a quali indirizzi arrivano gli avvisi per nuove prenotazioni e richieste, e pulsante **Invia email
  di prova** (vedi punto 4).
- **Account**: cambio della propria password. Se la dimenticate, dalla pagina di accesso "Password dimenticata?".

**Cosa cambia subito dal gestionale e cosa no.** Tutto ciò che si modifica in `/admin` compare sul sito pubblico
appena si preme Salva (il sito legge i dati dal Foglio ogni volta, senza copie da aggiornare; al massimo una pagina
già aperta può restare indietro di una trentina di secondi): prezzi e tariffe, stato delle auto (Venduta / Non
disponibile), nuove auto e foto, orari, ferie e chiusure (cambiano anche gli orari prenotabili), telefono,
WhatsApp, indirizzo, mappa, partita IVA e indirizzi per gli avvisi. Invece i **testi delle pagine** (Home, Servizi,
Privacy), il **logo** e la **foto di sfondo** sono nel codice: per cambiarli si modifica il file e si ripubblica su
GitHub (punto 5).

**Velocità**: Google "addormenta" lo script quando nessuno lo usa; la prima richiesta dopo una pausa può impiegare
qualche secondo. Il sito mostra comunque l'attesa e poi i dati.

**Come appaiono le prenotazioni in officina**: nell'elenco compare "Appuntamento in officina" con il problema
descritto dal cliente. Dopo aver visto l'auto, comunicate al cliente tempi, costo e giorno in cui riportarla (per ora
questo passaggio avviene fuori dal sito, per telefono o WhatsApp).

---

## 7. Sicurezza: cosa è già previsto, e i limiti

- I dati stanno in un Foglio Google **privato**; il pubblico può solo leggere il catalogo e inviare prenotazioni o
  richieste attraverso azioni controllate dallo script. Dati dei clienti, prenotazioni, targhe e indirizzi email degli
  avvisi sono leggibili solo da chi ha fatto l'accesso come gestore.
- Le password dei gestori non sono scritte in chiaro: nel Foglio c'è solo un "codice cifrato" (SHA-256 con sale
  casuale, ripetuto 1.200 volte). Gli accessi durano 14 giorni e si chiudono da soli quando si cambia la password.
  Dopo 5 password sbagliate l'account si blocca 15 minuti. Il link "password dimenticata" vale 30 minuti, una volta sola.
- Limiti anti-abuso: massimo 3 prenotazioni in attesa per cliente, massimo 30 prenotazioni e 30 richieste all'ora
  in totale, massimo 5 richieste al giorno per email, controllo che impedisce di prenotare lo stesso orario due
  volte (anche con più persone contemporaneamente), campo trappola contro i robot.
- Quanto scritto dai clienti viene salvato sempre come testo: anche se qualcuno scrive una "formula" nel messaggio,
  il Foglio non la esegue.
- Nessun caricamento di file da parte dei clienti (le foto per le valutazioni arrivano su WhatsApp).
- **Limiti da conoscere**: la protezione delle password è fatta in casa con gli strumenti disponibili in Apps Script
  (non esiste bcrypt): usate password lunghe, uniche e fidatevi del blocco dopo i tentativi. Chiunque abbia accesso
  al Foglio (il proprietario dell'account Google) vede i dati e i codici cifrati: **tenete il Foglio privato** e attivate
  la verifica in due passaggi sull'account Google e su GitHub. Il codice dello script è pubblico nel repository: non
  contiene segreti, ma non scrivete mai password o chiavi dentro `Code.gs`.

---

## 8. Cosa è stato verificato e cosa no

**Verificato**
- **Il codice dello script Google** (`google/Code.gs`): 225 controlli automatici (`node google/tests/run.mjs`) con
  una simulazione rigorosa dei servizi Google (Fogli, Gmail, Drive, blocchi, promemoria, menu). Coprono configurazione
  iniziale ripetibile, orari prenotabili (sabato e domenica chiusi, pausa pranzo, ora legale, preavviso, chiusure,
  capacità, appuntamenti sovrapposti), validazioni e limiti anti-abuso di prenotazioni e richieste, accesso gestori
  (blocco, scadenza, cambio password, link di recupero), tutte le azioni dei gestori (auto con foto, prezzi, stati,
  prenotazioni con email, orari, chiusure, servizi, dati attività, notifiche, email di prova), testi delle email,
  promemoria, email che non partono, più di mille righe, richieste contemporanee e il menu del Foglio.
- **Il sito vero contro lo script vero**: 75 controlli nel browser (Chromium) con il sito compilato per parlare con lo
  script (`VITE_API_URL`) attraverso un finto "indirizzo Google" che imita anche il reindirizzamento 302 di Google:
  prenotazione dal pubblico → arrivo nel gestionale → accetta → email di conferma; accesso con password
  provvisoria e obbligo di sceglierne una; "password dimenticata" con link a uso singolo; auto con foto,
  prezzo e stato che cambiano subito sul sito pubblico; chiusure; dati dell'attività; notifiche; email che non parte →
  avviso al gestore; accesso scaduto o password cambiata altrove → ritorno al login; rete assente → messaggio chiaro.
- Modalità demo: 95 controlli nel browser, schermate controllate su desktop e telefono, nessun errore in console.

**Non verificato (non era possibile in questo ambiente)**
- **Google vero**: nessuna prova è stata fatta con un Foglio, Gmail o Drive reali. I comportamenti di cui il sito
  dipende sono quelli documentati da Google e usati comunemente, ma vanno controllati la prima volta. I punti più
  delicati: (1) che il browser riceva la risposta dell'app web dopo il reindirizzamento di Google; (2) che le foto
  su Drive si vedano nel sito (indirizzo `lh3.googleusercontent.com/d/ID`); (3) che le email arrivino e non finiscano
  nella posta indesiderata; (4) le autorizzazioni al primo avvio ("app non verificata"). Il punto 3.5 serve a
  controllare tutto in pochi minuti; se qualcosa non va, si corregge `Code.gs` e non il sito.
- I limiti attuali di Google (email al giorno, tempi di risposta) possono cambiare: controlla le quote ufficiali di
  Apps Script prima di contare su numeri alti.
- L'installazione delle librerie (`npm install`) e la compilazione con le librerie ufficiali (React Router, Tailwind
  via Vite): in questo ambiente non era raggiungibile il registro dei pacchetti. La prova è stata fatta con
  sostituti locali; la prima compilazione vera avviene in GitHub Actions, dove il passaggio "typecheck" è segnalato
  ma non blocca la pubblicazione. Se la prima esecuzione mostra errori, vanno corretti prima di mettere il sito online.
- Accessibilità e prestazioni misurate con strumenti dedicati (la struttura è stata curata: etichette, focus,
  contrasti, tastiera, ma non c'è un audit formale).

Consiglio: prima di pubblicare, fai una prenotazione di prova completa dal sito pubblico, accettala da `/admin` e
controlla che le email arrivino (anche nella posta indesiderata).

---

## 9. Struttura delle cartelle

```
MONFALCAR-anteprima.html      versione dimostrativa da aprire con doppio clic (dati di esempio)
src/
  config/business.ts     dati dell'azienda e testi da personalizzare
  pages/                 pagine pubbliche (Home, Servizi, Auto, Prenota, Contatti, Privacy)
  pages/admin/           area riservata (prenotazioni, auto, orari, dati attività, notifiche, account)
  components/            componenti condivisi
  lib/api/               accesso ai dati: appsScriptApi.ts (Google) e demoApi.ts (dimostrativo)
  lib/siteInfo.tsx       telefono/indirizzo salvati dai gestori, con valori di riserva
google/
  Code.gs                lo script da incollare in Apps Script: regole, accesso gestori, email
  tests/run.mjs          225 controlli sullo script (node google/tests/run.mjs)
  tests/gas-mock.mjs     simulatore dei servizi Google usato dai controlli
  tests/gas-server.mjs   finta "app web Google" locale per provare il sito contro lo script vero
.github/workflows/deploy.yml  pubblicazione su GitHub Pages
```
