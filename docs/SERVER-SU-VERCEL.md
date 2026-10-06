# Accendere i messaggi alle clienti, passo per passo

Alla fine di questa guida:

- quando il salone **conferma** una richiesta arrivata dal sito, alla cliente
  arriva un SMS da sola;
- ogni giorno a mezzogiorno, a chi ha appuntamento **domani** arriva il
  promemoria.

Gli SMS partono da **un tablet Android in salone**, con una SIM con i messaggi
illimitati: non si paga niente a messaggio. Il gestionale decide quando, a chi
e che cosa scrivere; il tablet fa solo il postino.

Falle una alla volta. Dopo ognuna c'è scritto come si controlla che sia andata.

> **Tempo:** circa un'ora in tutto.
> **Costo:** zero oltre al tablet e alla SIM. Vercel è gratuito.

---

## 0. Ripubblicare le regole del database · 5 minuti

1. Apri https://github.com/Colax13/rosy-gestionale-/blob/main/firestore.rules
2. Premi **Copy raw file** (l'icona dei due fogli, in alto a destra). Copia tutto.
3. console.firebase.google.com → progetto **gestionaliparrucchieri**
4. **Firestore Database**. In alto c'è un menù a tendina col nome del database:
   **non è quello predefinito**, scegli `ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074`
5. Linguetta **Sicurezza** → seleziona tutto → **incolla sopra** → **Pubblica**

**Come controlli:** Ctrl+F in quella pagina, cerca `haIBuoni`. Se c'è, sei a posto.

---

## 1. La chiave di Firebase su Vercel · 10 minuti

Serve al server per leggere gli appuntamenti e riconoscere chi usa il
programma. Senza, non parte niente.

1. console.firebase.google.com → **gestionaliparrucchieri** → rotellina →
   **Impostazioni progetto** → linguetta **Account di servizio**
2. **Genera nuova chiave privata** → conferma → si scarica un file `.json`
3. Aprilo col Blocco note
4. vercel.com → progetto di Rosy → **Settings** → **Environment Variables**
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** tutto il file, dalla prima `{` all'ultima `}`
   - spunta tutti e tre gli ambienti → **Save**

> **Quel file è la chiave di casa.** Chi ce l'ha può leggere e cancellare tutto
> il database. Non va nel repository, non va per email, non va in chat —
> nemmeno a me. Se ti sfugge, dalla stessa pagina la revochi e ne fai un'altra.

---

## 2. Il tablet che manda gli SMS · 30 minuti

### 2a. Prima di tutto: il tablet sa mandare SMS? · 2 minuti

**È il passo che si salta e poi si paga.** Molti tablet con la SIM fanno solo
**internet**: prendono la rete dati ma non mandano SMS, perché il produttore
non ha messo la parte telefonica. Da fuori non si vede.

1. Metti la SIM nel tablet
2. Apri l'app **Messaggi** del tablet (se non c'è, è già un brutto segno)
3. Manda un SMS al tuo telefono

- **Ti arriva** → perfetto, vai avanti.
- **Non c'è l'app Messaggi, o l'SMS non parte** → quel tablet non serve. Ci
  vuole un telefono Android, anche vecchio, anche da 40 euro: il resto della
  guida è identico.

Due cose ancora:
- **Deve essere Android.** Un iPad non può, è il sistema che non lo permette.
- **Controlla l'offerta della SIM.** Gli "illimitati" di solito escludono
  l'invio automatico *massivo*. Venti messaggi al giorno per i propri clienti
  non sono massivi, ma se l'offerta lo vieta espressamente, meglio saperlo.

### 2b. Installare l'app · 5 minuti

L'app è **Traccar SMS Gateway**. Si installa dal Play Store, è gratuita.

1. Dal tablet apri:
   **https://play.google.com/store/apps/details?id=org.traccar.gateway**
   (il pezzo `org.traccar.gateway` è il codice unico dell'app: con questo link
   il Play Store apre lei e non una copia)
2. **Installa** e aprila
3. Dai **tutti** i permessi che chiede, in particolare gli **SMS**. Se ti chiede
   di diventare l'app per i messaggi predefinita, puoi dire di sì: è un'app di
   messaggi completa, con in più la parte che ci serve.

### 2c. Tenerla sveglia · 5 minuti

Android spegne da solo le app che non usi, per risparmiare batteria. Se spegne
questa, i messaggi smettono di partire **e nessuno se ne accorge**. Quindi:

1. Impostazioni del tablet → **App** → **Traccar SMS Gateway** → **Batteria** →
   **Senza restrizioni** (a volte si chiama *Non ottimizzare*)
2. Il tablet sta **sempre attaccato alla corrente** e **sempre connesso** (Wi-Fi
   del salone o dati della SIM)

Nomi e posizioni cambiano un po' da marca a marca: se non trovi qualcosa,
mandami una foto della schermata.

### 2d. Prendere il gettone · 2 minuti

Il nostro server sta su internet, il tablet sta dietro il router del salone:
da fuori non lo si raggiunge. Traccar fa da passaggio. Per sapere a quale
tablet consegnare, usa un **gettone** (token) che l'app ti mostra.

1. Nell'app: menù (le tre linee o i tre puntini) → **Gateway** o **Impostazioni
   gateway**
2. Accendi il servizio
3. Compare un **Cloud token**: una sequenza lunga di lettere e numeri. Copialo
   (tienilo premuto → Copia) e mandatelo per email a te stesso, così lo incolli
   dal computer

### 2e. Metterlo su Vercel · 2 minuti

Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `TRACCAR_SMS_TOKEN` | il Cloud token dell'app |

Tutti e tre gli ambienti → **Save**.

> **Se Traccar non va** c'è l'altra app, *SMS Gateway for Android* (di
> capcom6), che si scarica da https://github.com/capcom6/android-sms-gateway/releases
> e dà utente e password invece del gettone: si mettono come
> `SMS_GATEWAY_USER` e `SMS_GATEWAY_PASSWORD`. Il programma usa quella che
> trova configurata, non serve cambiare niente nel codice.

### Le risposte delle clienti

Gli SMS arrivano dal **numero del tablet**. Se una cliente risponde, la
risposta arriva lì. Il messaggio contiene già il numero del salone ("Tel …")
quando ci sta, ma conviene che qualcuno dia un'occhiata al tablet una volta al
giorno. Più avanti si possono far arrivare le risposte dentro il gestionale.

---

## 3. Accendere il promemoria · 3 minuti

Il promemoria parte da solo ogni giorno. Per evitare che chiunque conosca
l'indirizzo possa far partire un giro di SMS, serve una parola segreta che
conosce solo Vercel.

1. Genera una password lunga, **almeno 32 caratteri**: va bene il generatore di
   password dell'iPhone o di qualsiasi gestore di password. Non serve
   ricordarla, non la dovrai mai scrivere da nessun'altra parte.
2. Vercel → Settings → Environment Variables:
   - **Key:** `CRON_SECRET`
   - **Value:** quella password
   - tutti e tre gli ambienti → **Save**

Vercel la allega da solo quando fa partire il giro: non devi fare altro.

**A che ora parte:** ogni giorno tra le 12 e le 13 d'estate, tra le 11 e le 12
d'inverno (Vercel lo fa partire in un momento qualsiasi dentro quell'ora).
Mezzogiorno è scelto apposta: se una cliente disdice, c'è ancora mezza giornata
per riempire il posto. Se preferite un'altra ora, si cambia una riga in
`vercel.json`.

---

## 4. Rifare il deploy · 2 minuti

Le variabili valgono **solo dai deploy nuovi**. Dopo averle messe tutte:

1. Vercel → **Deployments**
2. Sul primo della lista: `⋯` → **Redeploy** → **Redeploy**
3. Aspetta che diventi **Ready**

---

## 5. Controllare che funzioni

### La spia

Apri `https://gestionalerosy.colasantiludovico.it/api/salute`. Deve dire:

```json
{ "chiave": "a posto", "sms": "a posto (tablet con Traccar)", "promemoria": "acceso", "email": "spenta" }
```

`"email": "spenta"` va bene: l'email aspetta `rdsalon.com` (vedi in fondo).

| Cosa leggi | Cosa manca |
|---|---|
| `"chiave": "manca"` | `FIREBASE_SERVICE_ACCOUNT`, o il deploy è ancora vecchio |
| `"chiave": "non valida"` | JSON incollato a metà, o file sbagliato |
| `"sms": "spento"` | `TRACCAR_SMS_TOKEN` |
| `"promemoria": "spento…"` | `CRON_SECRET` |

### La prova della conferma

1. Dal telefono, in incognito, prenota dalla pagina pubblica del salone
   **col tuo numero**
2. Nel gestionale, **Agenda** → la richiesta in attesa → **Conferma**
3. Deve succedere:
   - in alto: *"Confermato. Conferma inviata per SMS a +39…"*
   - ti arriva l'SMS dal numero del tablet
   - in **Clienti** c'è la scheda nuova

Se in alto leggi *"…non è partito niente — …"*, dopo il trattino c'è scritto
esattamente cosa manca.

### La prova del promemoria

Senza aspettare mezzogiorno:

1. Dall'**agenda interna** del gestionale, prendi un appuntamento **per
   domani** a una cliente di prova **col tuo numero** di telefono.
   Va preso da dentro, non dal sito: un appuntamento confermato dal sito ha
   appena ricevuto la conferma, e il promemoria lo salta apposta (vedi sotto).
2. Vercel → progetto → **Settings** → **Cron Jobs** → accanto a
   `/api/promemoria` premi **Run**
3. Ti arriva il promemoria. Nei **Logs** di Vercel trovi una riga tipo
   *"Promemoria per il 2026-10-01: 1 mandati su 1"*

Se lo rilanci, **non parte di nuovo**: ogni appuntamento riceve il promemoria
una volta sola. Vale anche se il giro dovesse partire due volte per sbaglio.

---

## Chi riceve cosa, in breve

| Quando | A chi | Cosa |
|---|---|---|
| Il salone preme **Conferma** su una richiesta dal sito | quella cliente | la conferma |
| Ogni giorno a mezzogiorno | chi ha un appuntamento **confermato** per domani | il promemoria |

Non ricevono niente: le richieste ancora in attesa, gli appuntamenti annullati,
le pause dell'agenda, chi ha già avuto il promemoria, e chi ha avuto la
conferma da meno di dodici ore (ha prenotato stamattina per domani: un secondo
SMS sarebbe un doppione).

I messaggi partono **solo per RD Salon**: il tablet è vostro, e un altro salone
che usa il gestionale non deve mandare SMS dal vostro numero. L'elenco sta in
`salone-app/frontend/lib/funzioni.ts`, alla voce `messaggi_automatici`.

---

## Appendice A — L'email · in attesa di rdsalon.com

Serve accedere ai DNS di `rdsalon.com`. Quando si può:

1. https://resend.com → **Sign up**
2. **Domains** → **Add Domain** → `rdsalon.com`
3. Resend mostra tre o quattro righe DNS: vanno aggiunte **identiche** nel
   pannello dove si gestisce `rdsalon.com`
4. **Verify** (se dice *pending*, aspetta dieci minuti e riprova)
5. **API Keys** → **Create API Key** (permesso *Sending access*) → copia la
   chiave che comincia per `re_` (si vede una volta sola)
6. Su Vercel: `RESEND_API_KEY` = la chiave, `MITTENTE_EMAIL` =
   `RD Salon <prenotazioni@rdsalon.com>` → Save → Redeploy

Da lì in poi, chi lascia l'email riceve anche quella. Non sostituisce l'SMS:
si aggiunge.

## Appendice B — Skebby, se il tablet non va

Se il tablet non manda SMS e non si vuole comprare un Android, c'è Skebby: niente
hardware, ma si paga a messaggio (circa 9 centesimi sul pacchetto più piccolo:
con 200 appuntamenti al mese sono ~€36 al mese fra conferme e promemoria).

1. Account su https://www.skebby.it, registrazione del mittente `RD SALON`
   (massimo 11 caratteri), acquisto di un pacchetto **SMS Classic Plus**
2. Su Vercel: `SKEBBY_USER`, `SKEBBY_PASSWORD` (quelli del pannello),
   `SKEBBY_MITTENTE` = `RD SALON` → Save → Redeploy

Se ci sono le chiavi di Skebby il programma usa quelle, altrimenti il tablet.
Il codice è lo stesso.

## Buoni online letti dal foglio Google

Make scrive ogni buono pagato con Stripe in un foglio Google. Il gestionale
legge quel foglio da solo ogni volta che si apre la pagina **Buoni** (e con
il pulsante **Aggiorna**), e aggiunge i buoni che non ha mai visto: prezzo,
piega, chi regala, per chi è, segnati come *Online*.

Una volta sola:

1. **L'email del robot**: Firebase Console → ⚙️ Impostazioni progetto →
   Account di servizio. È l'indirizzo che finisce in
   `@….iam.gserviceaccount.com`.
2. **Condividi il foglio** con quell'indirizzo, come *Visualizzatore*.
3. **Abilita Google Sheets API** nel progetto:
   https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=gestionaliparrucchieri
4. **Su Vercel** aggiungi `BUONI_FOGLIO_ID`: il pezzo del link tra `/d/` e
   `/edit` (va bene anche il link intero).

Il foglio ha due schede: quella con "salone" nel nome va ai **Buoni Salone**,
la prima delle altre ai **Buoni Spa**. Se i nomi non si riconoscono, si
dicono su Vercel con `BUONI_FOGLIO_SCHEDA` (spa) e
`BUONI_FOGLIO_SCHEDA_SALONE` (salone).

La pagina Buoni è **in diretta**: un buono venduto, usato o arrivato dal
foglio compare da solo, senza ricaricare. Il foglio si ricontrolla da solo
ogni 2 minuti finché la pagina è aperta, e ogni volta che si torna sulla
scheda del browser.

Poi un **Redeploy**, perché le variabili nuove valgono solo dal deploy dopo.

Cosa non fa, apposta:
- un buono cancellato dal gestionale **non ricompare**: il server si ricorda i
  codici già letti (`buoni_foglio_visti`, che dal browser non si legge);
- un buono modificato o usato in salone **non viene riscritto** con i dati
  del foglio;
- vale **solo per RD Salon** (funzione `buoni_dal_foglio`): il foglio è suo.

Se qualcosa non va, la pagina Buoni lo dice in una riga gialla: foglio non
condiviso, Sheets API spenta, ID sbagliato. `/api/salute` dice se
`BUONI_FOGLIO_ID` c'è.

## Promemoria 24 ore e 1 ora prima: cron-job.org

Vercel gratis fa partire il giro dei promemoria una volta al giorno. Per il
promemoria di un'ora prima serve un giro ogni 15 minuti: lo fa cron-job.org,
gratis.

1. Registrati su **cron-job.org** → **Create cronjob**.
2. **URL**: `https://rosygestionale.rdsalon.com/api/promemoria`
3. **Execution schedule**: ogni **15 minuti**.
4. **Advanced** → **Headers** → aggiungi:
   - Key: `Authorization`
   - Value: `Bearer ` seguito dal valore di `CRON_SECRET` che hai su Vercel
     (con lo spazio dopo "Bearer").
5. Salva, poi **Test run**: deve rispondere **200**. Un **401** vuol dire che
   il valore dopo "Bearer " non è uguale a `CRON_SECRET`.

Ogni promemoria parte una volta sola: il giro di cron-job.org e quello di
riserva di Vercel non mandano mai doppioni.

## Regole di Firestore da ripubblicare

Le regole nuove aprono in lettura il **registro SMS** (`registro_sms`) e il
documento privato con il **cellulare per gli avvisi** (`impostazioni_private`).
Senza ripubblicarle, la pagina Automazioni dice che non riesce a leggere il
registro e il cellulare per gli avvisi non si salva.
