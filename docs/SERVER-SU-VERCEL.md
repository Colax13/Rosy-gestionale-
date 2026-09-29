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

## 2-bis. L'SMS dal telefono del salone · 15 minuti · CONSIGLIATO OGGI

Invece dell'email, l'SMS. Serve **un telefono Android** lasciato acceso in
salone: ci sta sopra un'app che fa da ponte, il server le dice che cosa
scrivere e a chi, e l'SMS parte dalla SIM del salone.

**Perché conviene:**
- Non si paga niente a messaggio: si consuma il piano che il salone ha già.
- Alla cliente arriva **dal numero del salone**. Se risponde, risponde lì.
- L'SMS lo leggono tutte. L'email finisce fra le promozioni.
- Non serve nessun dominio, quindi si può fare **oggi**.

**Il prezzo da pagare, detto chiaro:**
- Quel telefono deve restare **acceso, connesso e con l'app viva**. Se si
  spegne, l'SMS non parte — il programma lo dice, ma nessuno lo manda al posto
  suo.
- Gli "illimitati" hanno quasi sempre un limite di uso corretto. Venti messaggi
  al giorno non sono un problema; trecento sì.
- Funziona **solo con Android**. Da iPhone non si può, è il sistema che non lo
  permette.
- Un telefono vecchio va benissimo, purché prenda la rete e abbia una SIM con
  gli SMS.

### 2-bis a. Installare l'app

1. Sul telefono Android del salone, apri il Play Store e cerca
   **SMS Gateway for Android** (di *capcom6*). In alternativa si scarica da
   https://sms-gate.app
2. Installa e apri l'app.
3. Dà i permessi che chiede: **invio SMS** e, se lo chiede, **avvio
   automatico** e **batteria senza restrizioni**. Senza l'ultimo, Android
   spegne l'app dopo qualche ora e i messaggi smettono di partire senza dire
   niente.

### 2-bis b. Accenderla in modalità Cloud

L'app può funzionare in tre modi. A noi serve **Cloud**, perché il nostro
server sta su internet e il telefono sta dietro il router del salone: da fuori
non lo si raggiunge.

1. Nell'app, sezione **Cloud server** (o *Server mode → Cloud*)
2. Attiva l'interruttore
3. L'app mostra **un nome utente e una password**. Sono quelli che servono a
   noi. Scrivili da qualche parte adesso, che poi non si rivedono.

### 2-bis c. Metterli su Vercel

Vercel → Settings → Environment Variables, due variabili nuove:

| Key | Value |
|-----|-------|
| `SMS_GATEWAY_USER` | il nome utente che mostra l'app |
| `SMS_GATEWAY_PASSWORD` | la password che mostra l'app |

Spunta tutti e tre gli ambienti → **Save**, e poi rifai il deploy (passo 3).

> Se un domani preferisci non passare dal loro server, si può far girare il
> ponte per conto proprio: basta aggiungere `SMS_GATEWAY_URL` con il proprio
> indirizzo. Il codice è già pronto per questo, non cambia altro.

### 2-bis d. La prova

Nell'app c'è un tasto per mandare un SMS di prova: mandalo al tuo numero. Se
arriva, il ponte funziona e il resto lo fa il programma.

---

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
{ "servizio": "rosy", "chiave": "a posto", "sms": "a posto", "email": "spenta" }
```

`"email": "spenta"` va benissimo finché l'email è rimandata: quello che conta
oggi è `"chiave": "a posto"` e `"sms": "a posto"`.

| Cosa leggi | Cosa è successo |
|---|---|
| `"chiave": "manca"` | La variabile non c'è, o il deploy è ancora quello vecchio. Rifai il passo 3. |
| `"chiave": "non valida"` | Il JSON è incollato a metà, o è il file sbagliato: serve quello dell'**Account di servizio**. |
| `"email": "spenta"` | Manca `RESEND_API_KEY`. Normale finché l'email è rimandata. |
| `"email": "manca il mittente"` | C'è la chiave ma non `MITTENTE_EMAIL`. |
| `"sms": "spento"` | Mancano `SMS_GATEWAY_USER` e `SMS_GATEWAY_PASSWORD`. |
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
- **SMS dal telefono del salone.** Un Android acceso in salone fa da ponte e
  l'SMS parte dal piano illimitato: costo zero a messaggio. Da valutare
  insieme, perché il telefono deve restare acceso e connesso.
- **Verifica del numero** in prenotazione: stesso motore, appena c'è un canale
  che arriva sul telefono.
