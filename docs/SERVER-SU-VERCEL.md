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

## 2. L'email: Resend · 20 minuti, di cui 15 di attesa

Serve per mandare davvero il messaggio. Resend regala 3.000 email al mese: un
salone ne manda sì e no trecento.

### 2a. Aprire l'account

1. https://resend.com → **Sign up** (va bene entrare con GitHub o con Google)
2. Conferma l'email

### 2b. Dire a Resend che il dominio è tuo

Questo è il passo che richiede attenzione, ed è anche quello che fa arrivare le
email nella posta in arrivo invece che nello spam.

1. Dentro Resend: **Domains** → **Add Domain**
2. Scrivi `colasantiludovico.it` (il tuo dominio, quello che usi già per il
   gestionale) → **Add**
3. Resend ti mostra **tre o quattro righe** da aggiungere ai DNS. Quelle vere
   te le dà lui sullo schermo: **copia le sue, non queste**, che sono solo per
   farti capire che forma hanno.

   | Type | Name | Value |
   |------|------|-------|
   | MX   | send | feedback-smtp.eu-west-1.amazonses.com |
   | TXT  | send | v=spf1 include:amazonses.com ~all |
   | TXT  | resend._domainkey | p=MIGfMA0GCSqG… |

4. Vai dove gestisci i DNS di `colasantiludovico.it` — lo stesso posto dove hai
   creato `gestionalerosy` per farlo puntare a Vercel — e **aggiungi quelle
   righe una per una**, copiandole esattamente.
5. Torna su Resend e premi **Verify**. Se dice ancora "pending", aspetta dieci
   minuti e riprova: i DNS ci mettono un po' a girare.

> **Se oggi non riesci a toccare i DNS:** salta questo passo. Il resto
> funziona lo stesso, solo che la conferma non parte da sola e la mandi tu da
> **Ricontatta** su WhatsApp, come adesso. Non si rompe niente.

### 2c. La chiave e il mittente

1. Dentro Resend: **API Keys** → **Create API Key** → nome a piacere,
   permesso **Sending access** → copia la chiave (comincia per `re_`).
   **Si vede una volta sola**: se la perdi ne fai un'altra.
2. Su Vercel → Settings → Environment Variables, aggiungi **due** variabili:

   | Key | Value |
   |-----|-------|
   | `RESEND_API_KEY` | la chiave che comincia per `re_` |
   | `MITTENTE_EMAIL` | `RD Salon <prenotazioni@colasantiludovico.it>` |

   Il mittente deve stare **sul dominio verificato al passo 2b**, altrimenti
   Resend rifiuta l'invio. Il nome davanti alle parentesi è quello che la
   cliente vede come mittente: scrivilo come vuoi che lo legga.
3. **Save**, spuntando tutti e tre gli ambienti.

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
{ "servizio": "rosy", "chiave": "a posto", "progetto": "gestionaliparrucchieri", "email": "a posto" }
```

| Cosa leggi | Cosa è successo |
|---|---|
| `"chiave": "manca"` | La variabile non c'è, o il deploy è ancora quello vecchio. Rifai il passo 3. |
| `"chiave": "non valida"` | Il JSON è incollato a metà, o è il file sbagliato: serve quello dell'**Account di servizio**. |
| `"email": "spenta"` | Manca `RESEND_API_KEY`. Il resto funziona, ma le conferme non partono. |
| `"email": "manca il mittente"` | C'è la chiave ma non `MITTENTE_EMAIL`. |
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
