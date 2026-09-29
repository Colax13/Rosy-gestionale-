# Accendere il server, passo per passo

Sono quattro cose, in quest'ordine. Falle una alla volta e dopo ognuna c'è
scritto come si controlla che sia andata.

Quando hai finito, la cliente che prenota dal sito riceve **la conferma da
sola**, senza che nessuno scriva niente. Da lì poi si aggancia il promemoria
del giorno prima, e più avanti l'SMS.

> **Tempo:** circa 40 minuti in tutto, di cui una ventina di attesa (i DNS).
> **Costo:** zero. Vercel e Resend hanno tutti e due un piano gratuito che per
> un salone basta e avanza.

---

## 0. Ripubblicare le regole del database · 5 minuti

Questa è rimasta indietro dall'ultima volta ed è la più veloce.

1. Apri https://github.com/Colax13/rosy-gestionale-/blob/main/firestore.rules
2. Premi **Copy raw file** (l'icona dei due fogli, in alto a destra del
   riquadro). Copia tutto.
3. console.firebase.google.com → progetto **gestionaliparrucchieri**
4. **Firestore Database**. In alto c'è un menù a tendina con il nome del
   database: **questo progetto non usa quello predefinito**, scegli
   `ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074`
5. Linguetta **Sicurezza** → seleziona tutto quello che c'è scritto e
   **incolla sopra** → **Pubblica**

**Come controlli:** nella stessa pagina, Ctrl+F e cerca `haIBuoni`. Se la
trovi, sei a posto.

---

## 1. La chiave di Firebase su Vercel · 10 minuti

Serve al server per riconoscere chi sta usando il programma e per leggere gli
appuntamenti. Senza, non parte nessun messaggio.

### 1a. Prendere la chiave

1. console.firebase.google.com → progetto **gestionaliparrucchieri**
2. Rotellina in alto a sinistra → **Impostazioni progetto**
3. Linguetta **Account di servizio**
4. **Genera nuova chiave privata** → conferma
5. Il browser scarica un file `.json`. Aprilo con il Blocco note.

> **Questo file è la chiave di casa.** Chi ce l'ha può leggere e cancellare
> tutto il database. Non va nel repository, non va per email, non va in chat —
> nemmeno a me. Se ti esce di mano, dalla stessa pagina la revochi e ne generi
> un'altra.

### 1b. Metterla su Vercel

1. vercel.com → il progetto di Rosy → **Settings**
2. Menù a sinistra: **Environment Variables**
3. **Key:** `FIREBASE_SERVICE_ACCOUNT`
   **Value:** tutto il contenuto del file, dalla prima graffa `{` all'ultima
   `}`. Copia e incolla in blocco: non togliere gli a capo, non fermarti a metà.
   **Environments:** spunta tutte e tre.
4. **Save**

**Come controlli:** dopo il passo 3 (il deploy), aprendo
`https://gestionalerosy.colasantiludovico.it/api/salute` deve leggersi
`"chiave": "a posto"`.

---

## 2. L'email: Resend · 20 minuti, di cui 15 di attesa · IN ATTESA

> **Rimandato.** Il mittente deve stare su **rdsalon.com**, che è il dominio del
> salone, e oggi non c'è modo di toccarne i DNS. Si fa appena arrivano le
> credenziali. Nel frattempo i messaggi partono per **SMS** (passo 2-bis), che
> per una cliente funziona anche meglio.

Serve per mandare davvero il messaggio. Resend regala 3.000 email al mese: un
salone ne manda sì e no trecento.

### 2a. Aprire l'account

1. https://resend.com → **Sign up** (va bene entrare con GitHub o con Google)
2. Conferma l'email

### 2b. Dire a Resend che il dominio è tuo

Questo è il passo che richiede attenzione, ed è anche quello che fa arrivare le
email nella posta in arrivo invece che nello spam.

1. Dentro Resend: **Domains** → **Add Domain**
2. Scrivi `rdsalon.com` → **Add**
3. Resend ti mostra **tre o quattro righe** da aggiungere ai DNS. Quelle vere
   te le dà lui sullo schermo: **copia le sue, non queste**, che sono solo per
   farti capire che forma hanno.

   | Type | Name | Value |
   |------|------|-------|
   | MX   | send | feedback-smtp.eu-west-1.amazonses.com |
   | TXT  | send | v=spf1 include:amazonses.com ~all |
   | TXT  | resend._domainkey | p=MIGfMA0GCSqG… |

4. Vai dove gestisci i DNS di `rdsalon.com` e **aggiungi quelle righe una per
   una**, copiandole esattamente.
5. Torna su Resend e premi **Verify**. Se dice ancora "pending", aspetta dieci
   minuti e riprova: i DNS ci mettono un po' a girare.

> **Se non puoi toccare i DNS:** salta questo passo. Il resto funziona lo
> stesso — l'SMS del passo 2-bis, o WhatsApp a mano da **Ricontatta**. Non si
> rompe niente: il programma dice in chiaro che l'email non è accesa.

### 2c. La chiave e il mittente

1. Dentro Resend: **API Keys** → **Create API Key** → nome a piacere,
   permesso **Sending access** → copia la chiave (comincia per `re_`).
   **Si vede una volta sola**: se la perdi ne fai un'altra.
2. Su Vercel → Settings → Environment Variables, aggiungi **due** variabili:

   | Key | Value |
   |-----|-------|
   | `RESEND_API_KEY` | la chiave che comincia per `re_` |
   | `MITTENTE_EMAIL` | `RD Salon <prenotazioni@rdsalon.com>` |

   Il mittente deve stare **sul dominio verificato al passo 2b**, altrimenti
   Resend rifiuta l'invio. Il nome davanti alle parentesi è quello che la
   cliente vede come mittente: scrivilo come vuoi che lo legga.
3. **Save**, spuntando tutti e tre gli ambienti.

---

## 2-bis. Gli SMS con Skebby · 20 minuti · DA FARE OGGI

Il canale che arriva a tutte. Nessun telefono, nessun hardware, niente da
tenere acceso: Skebby è solo il postino, riceve "manda questo testo a questo
numero" e lo manda. **Quando mandarlo, a chi e che cosa c'è scritto lo decide
il gestionale** — Skebby di appuntamenti non sa niente.

### 2-bis a. Aprire l'account

1. https://www.skebby.it → **Registrati**
2. Conferma l'email e completa i dati dell'azienda (servono per il passo dopo)

### 2-bis b. Registrare il mittente "RD SALON"

È il passo che fa la differenza fra un SMS che sembra del salone e uno che
sembra spam. Il mittente scritto a lettere va autorizzato: Skebby è abilitato
a farlo per AGCOM, ma serve la richiesta.

1. Nel pannello: **Mittenti** (o *Alias mittente*) → **Nuovo mittente**
2. Scrivi `RD SALON` — **massimo 11 caratteri**, solo lettere, numeri e spazi
3. Carica i documenti che chiedono (visura o documento del titolare) e manda
4. L'approvazione richiede in genere **qualche ora, al massimo un giorno**

> Finché non è approvato l'SMS parte lo stesso, ma da un numero generico.
> Funziona: è solo meno bello.

### 2-bis c. Comprare i messaggi

1. **Acquista** → prendi il **pacchetto più piccolo** per la prova
2. Scegli **SMS Classic Plus** (nel nostro codice è il tipo `GP`): è quello con
   il mittente a lettere e la conferma di consegna

> Se compri un tipo diverso, dimmelo: si cambia una variabile su Vercel
> (`SKEBBY_TIPO`), non una riga di codice. `TI` = Classic, `SI` = Basic.

### 2-bis d. Le chiavi su Vercel

Non serve nessuna chiave API da generare: bastano l'utente e la password con
cui entri nel loro pannello.

Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `SKEBBY_USER` | l'utente Skebby |
| `SKEBBY_PASSWORD` | la password Skebby |
| `SKEBBY_MITTENTE` | `RD SALON` |

Spunta tutti e tre gli ambienti → **Save**, poi rifai il deploy (passo 3).

> **Non mandarmele in chat.** Le metti tu su Vercel, come tutte le altre.

### 2-bis e. Quanto costa davvero un messaggio

Un SMS non è "un messaggio": è un pezzo da **160 caratteri** — ma solo se tutte
le lettere stanno nell'alfabeto che i telefoni usano da sempre. Basta un
trattino lungo o un'emoji e si passa all'alfabeto largo, dove i pezzi sono da
**70 caratteri**: lo stesso messaggio può costare 1 credito o 3.

Per questo il testo dell'SMS **non è l'email accorciata**: è un'altra frase,
scritta per starci dentro una volta sola.

```
RD Salon: appuntamento confermato gio 1/10 alle 15:30 (Colore e Piega)
con Rosanna. Se non puoi venire avvisaci. Tel 0775123456
```
127 caratteri, **1 credito**.

Se il nome del salone o l'elenco dei servizi fanno sforare, il programma lascia
per strada da solo il superfluo — prima il telefono, poi il nome
dell'operatrice, poi accorcia i servizi in "Colore e altro" — **ma quando e chi
manda il messaggio non si perdono mai**. Meglio un messaggio asciutto che due
crediti.

### 2-bis f. Il conto della serva

Conferma + promemoria = **2 crediti per appuntamento**. Moltiplica per gli
appuntamenti del mese e hai la bolletta. Se un domani diventa troppa, si mette
il telefono Android come postino (vedi in fondo) e si scende a zero: si
cambiano due variabili, il codice è lo stesso.

## 3. Rifare il deploy · 2 minuti

Le variabili entrano in funzione **solo nei deploy nuovi**: quello già in linea
non le vede. Vale per tutte, ogni volta che ne aggiungi una.

1. Vercel → linguetta **Deployments**
2. Sul primo della lista: i tre puntini `⋯` → **Redeploy** → **Redeploy**
3. Aspetta che diventi **Ready**

---

## 4. Controllare che funzioni · 5 minuti

### La spia

Apri nel browser:

```
https://gestionalerosy.colasantiludovico.it/api/salute
```

Deve rispondere così:

```json
{ "servizio": "rosy", "chiave": "a posto", "sms": "a posto (Skebby)", "email": "spenta" }
```

`"email": "spenta"` va benissimo finché l'email è rimandata: quello che conta
oggi è `"chiave": "a posto"` e `"sms": "a posto"`.

| Cosa leggi | Cosa è successo |
|---|---|
| `"chiave": "manca"` | La variabile non c'è, o il deploy è ancora quello vecchio. Rifai il passo 3. |
| `"chiave": "non valida"` | Il JSON è incollato a metà, o è il file sbagliato: serve quello dell'**Account di servizio**. |
| `"email": "spenta"` | Manca `RESEND_API_KEY`. Normale finché l'email è rimandata. |
| `"email": "manca il mittente"` | C'è la chiave ma non `MITTENTE_EMAIL`. |
| `"sms": "spento"` | Mancano `SKEBBY_USER` e `SKEBBY_PASSWORD`. |
| Pagina bianca o 404 | Il deploy non ha preso la cartella `api/`: mandami lo screenshot del log di Vercel. |

La pagina non mostra mai le chiavi né un pezzo di esse: dice solo se funzionano.

### La prova vera

1. Apri la pagina di prenotazione del salone da un altro telefono o in
   incognito, e prenota **mettendo la tua email**.
2. Entra nel gestionale, **Agenda**: la richiesta è lì in attesa. Premi
   **Conferma**.
3. Devono succedere tre cose:
   - in alto compare *"Confermato. Conferma inviata a …"*
   - ti arriva l'email
   - in **Clienti** c'è la scheda nuova, con canale "Prenotazione online"

Se in alto leggi *"Confermato, ma alla cliente non è partito niente: …"*, il
messaggio dopo i due punti dice esattamente cosa manca.

---

## Quello che viene dopo

- **Promemoria il giorno prima.** Il testo è già scritto, va solo deciso a che
  ora parte e acceso il timer.
- **Verifica del numero** in prenotazione: adesso che c'è un canale che arriva
  sul telefono, si può fare.
- **WhatsApp**, se il salone prende un numero dedicato o passa da un
  intermediario. Si aggiunge come terzo canale, non sostituisce niente.

---

## Appendice: l'SMS a costo zero, con un telefono

Alternativa a Skebby, per quando i messaggi diventano tanti. Serve **un
Android** (anche vecchio, anche da 40 euro) acceso in salone con una SIM con
gli SMS: l'app *SMS Gateway for Android* (di *capcom6*, da
https://sms-gate.app) fa da ponte, e il messaggio parte dalla SIM del salone.

Zero a messaggio, e alla cliente arriva **dal numero del salone**, così se
risponde risponde lì. In cambio quel telefono deve restare acceso, connesso e
con l'app viva — e va tolta la restrizione della batteria, altrimenti Android
la spegne dopo qualche ora senza dirlo a nessuno. **Da iPhone non si può**: è
il sistema che non lo permette.

Si accende in modalità **Cloud**, si copiano le due credenziali che mostra
l'app, e si mettono su Vercel come `SMS_GATEWAY_USER` e
`SMS_GATEWAY_PASSWORD`. Il codice sceglie da sé: se ci sono le chiavi di
Skebby usa quelle, altrimenti il telefono.
