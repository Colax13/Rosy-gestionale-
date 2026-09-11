# Mettere Rosy in linea

Quattro cose, in quest'ordine. Sono da fare una volta sola.

---

## 1. Vercel: collegare il repository giusto

Il progetto su Vercel punta ancora al repository vecchio: è per questo che i
push arrivano ma non si vede cambiare niente.

**Consiglio: fare un progetto nuovo**, invece di cambiare quello vecchio.
Così se qualcosa non va, il vecchio indirizzo resta in piedi e non si resta
senza niente in mano.

1. vercel.com → **Add New… → Project**
2. **Import** da GitHub: `Colax13/rosy-gestionale-`
3. Impostazioni (dovrebbe già proporle così, sono scritte in `vercel.json`):
   - Framework Preset: **Vite**
   - Build Command: `vite build`
   - Output Directory: `dist`
   - Install Command: lasciare quello predefinito
4. Variabili d'ambiente: **nessuna**, per ora. La configurazione di Firebase
   sta dentro il repository (`firebase-applet-config.json`) e non è un
   segreto: sono chiavi pubbliche, quello che protegge i dati sono le regole
   del database.
5. **Deploy**.

Alla fine Vercel dà un indirizzo tipo `rosy-gestionale.vercel.app`.
**Segnarselo: serve al passo 2.**

> Se il deploy fallisce con un errore che parla di `api/index.ts`: quella
> cartella è il pezzo lato server, che oggi non serve a nessuno — il
> programma parla direttamente con Firestore. Si risolve cancellando la
> cartella `api/` e rifacendo il deploy; quando arriveremo agli SMS e ai
> pagamenti la rimettiamo su come si deve.

---

## 2. Firebase: autorizzare il nuovo indirizzo

**Senza questo passo l'accesso con Google non funziona** e dà
"unauthorized-domain".

1. console.firebase.google.com → progetto **gestionaliparrucchieri**
2. **Authentication → Settings → Authorized domains**
3. **Add domain**: incollare l'indirizzo del passo 1
   (solo il dominio: `rosy-gestionale.vercel.app`, senza `https://`)

> **Se usi un dominio tuo** (per esempio
> `gestionalerosy.colasantiludovico.it`), va aggiunto **anche quello**,
> come riga a parte. Vale la regola semplice: ogni indirizzo da cui si apre
> Rosy deve stare in questo elenco, altrimenti da lì l'accesso con Google non
> parte. Se l'accesso funziona già, vuol dire che c'è.

---

## 3. Firebase: accendere l'accesso con la password

Serve per far entrare le operatrici. Senza, la creazione dell'accesso
fallisce (il programma lo dice con parole chiare).

1. **Authentication → Sign-in method**
2. **Add new provider → Email/Password**
3. Attivare il primo interruttore (**Email/Password**). Il secondo
   (*Email link*) lasciarlo spento.
4. Salva.

---

## 4. Pubblicare le regole del database

### Cos'è, in parole povere

Le **regole** sono la serratura del database. Dicono chi può leggere e chi può
scrivere che cosa. Non stanno dentro il programma: stanno su Firebase, e si
pubblicano a parte.

Quelle pubblicate oggi sono **la versione vecchia**, scritta quando nel
programma entrava una persona sola. Dicono in sostanza: *"puoi leggere solo i
dati che hai creato tu"*.

Il file `firestore.rules` nel repository è invece **la versione nuova**, che
conosce le operatrici: *"puoi leggere i dati del salone in cui lavori, e solo
le pagine che ti hanno concesso"*.

### Perché non si può saltare

Finché non le pubblichi, **la parte delle operatrici non funziona**: ne crei
una, lei entra, e non vede niente — perché per il database è un'estranea.
Tutto il resto (agenda, clienti, servizi, buoni) continua a funzionare come
prima, perché tu sei sempre la stessa persona di prima. Quindi non è urgente
per te, ma è obbligatorio prima di far entrare qualcun altro.

### Come si fa, senza installare niente

1. Apri il file delle regole su GitHub:
   https://github.com/Colax13/rosy-gestionale-/blob/main/firestore.rules
2. Premi il tasto **Copy raw file** (l'icona dei due fogli, in alto a destra
   del riquadro del codice). Copia tutte e 245 le righe.
3. Vai su console.firebase.google.com → progetto **gestionaliparrucchieri**
4. Menù a sinistra: **Firestore Database**
5. **ATTENZIONE, è il punto dove si sbaglia:** in alto c'è un menù a tendina
   con il nome del database. Questo progetto **non usa quello predefinito**.
   Scegli:
   `ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074`
6. Linguetta **Sicurezza** (in alcune versioni della console si chiama
   *Regole* / *Rules*; se dentro Sicurezza ci sono più voci, scegli *Regole*).
   Riconosci il posto giusto perché il testo comincia per `rules_version = '2';`
7. Seleziona tutto quello che c'è scritto e **incolla sopra** quello che hai
   copiato da GitHub
8. **Pubblica** (Publish)

Se Firebase segnala un errore di sintassi, non pubblicare: mandami il
messaggio e lo sistemo.

### Come capisci quale versione è pubblicata

Nella linguetta Sicurezza, cerca la parola **`membri`** (Ctrl+F nella pagina).
- La trovi → sono già quelle nuove, hai finito.
- Non la trovi → sono ancora quelle vecchie, vanno incollate.

### In alternativa, da riga di comando

```bash
npm install -g firebase-tools     # solo la prima volta
firebase login                    # solo la prima volta
firebase use gestionaliparrucchieri
firebase deploy --only firestore:rules,firestore:indexes
```

Il database giusto è già scritto in `firebase.json`, quindi basta lanciarlo
dalla cartella del progetto.

---

## Come si controlla che sia andato tutto bene

1. Aprire il nuovo indirizzo ed **entrare con Google**.
   → se dà "unauthorized-domain", manca il passo 2.
2. Andare in **Operatori → Accessi → Dai l'accesso** e crearne uno di prova.
   → se dice che Email/Password non è acceso, manca il passo 3.
3. Uscire, rientrare con quell'indirizzo e password.
   → si deve vedere solo quello che è stato concesso.
   → se si vede tutto, o non si vede niente, manca il passo 4.
4. Rientrare come titolare e **togliere l'accesso di prova**.

---

## Quello che NON serve fare

- Non servono variabili d'ambiente su Vercel.
- Non serve toccare `GEMINI_API_KEY`: riguarda solo Rosie, che per ora è ferma.
- Non serve cancellare il progetto Vercel vecchio: si tiene finché il nuovo
  non è collaudato, poi si spegne con calma.
