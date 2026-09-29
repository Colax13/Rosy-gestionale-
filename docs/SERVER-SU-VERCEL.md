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

1. Play Store → cerca **SMS Gateway for Android** (dello sviluppatore
   *capcom6*). Se non la trovi, si scarica dal sito ufficiale https://sms-gate.app
2. Installala e aprila
3. Dai **tutti** i permessi che chiede, in particolare **invio SMS**

### 2c. Tenerla sveglia · 5 minuti

Android spegne da solo le app che non usi, per risparmiare batteria. Se spegne
questa, i messaggi smettono di partire **e nessuno se ne accorge**. Quindi:

1. Impostazioni del tablet → **App** → **SMS Gateway** → **Batteria** →
   **Senza restrizioni** (a volte si chiama *Non ottimizzare*)
2. Se c'è la voce **Avvio automatico**, accendila
3. Il tablet sta **sempre attaccato alla corrente** e **sempre connesso** (Wi-Fi
   del salone o dati della SIM)
4. Dentro l'app, se c'è un'impostazione per **l'intervallo fra un messaggio e
   l'altro**, mettila a qualche secondo (5-10): così il giro dei promemoria
   non parte tutto in un colpo e l'operatore non si insospettisce

Nomi e posizioni cambiano un po' da marca a marca: se non trovi qualcosa,
mandami una foto della schermata.

### 2d. Accendere la modalità Cloud · 3 minuti

L'app può lavorare in tre modi. Serve **Cloud**: il nostro server sta su
internet, il tablet sta dietro il router del salone, e da fuori non lo si
raggiunge direttamente. Il loro cloud fa da passaggio.

1. Nell'app: sezione **Cloud server**
2. Accendi l'interruttore
3. L'app mostra un **nome utente** e una **password**. Scrivili subito.

### 2e. Metterli su Vercel · 3 minuti

Vercel → Settings → Environment Variables, due variabili:

| Key | Value |
|-----|-------|
| `SMS_GATEWAY_USER` | il nome utente che mostra l'app |
| `SMS_GATEWAY_PASSWORD` | la password che mostra l'app |

Tutti e tre gli ambienti → **Save**.

**Come controlli:** nell'app c'è un modo per mandare un SMS di prova. Mandalo
al tuo numero.

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
{ "chiave": "a posto", "sms": "a posto (telefono in salone)", "promemoria": "acceso", "email": "spenta" }
```

`"email": "spenta"` va bene: l'email aspetta `rdsalon.com` (vedi in fondo).

| Cosa leggi | Cosa manca |
|---|---|
| `"chiave": "manca"` | `FIREBASE_SERVICE_ACCOUNT`, o il deploy è ancora vecchio |
| `"chiave": "non valida"` | JSON incollato a metà, o file sbagliato |
| `"sms": "spento"` | `SMS_GATEWAY_USER` e `SMS_GATEWAY_PASSWORD` |
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
