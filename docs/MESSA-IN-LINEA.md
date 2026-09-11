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

Le regole nuove — quelle che fanno valere i permessi delle operatrici — sono
nel repository ma **non sono ancora attive**. Vanno pubblicate.

Dal computer, dentro la cartella del progetto:

```bash
npm install -g firebase-tools     # solo la prima volta
firebase login                    # solo la prima volta
firebase use gestionaliparrucchieri
firebase deploy --only firestore:rules,firestore:indexes
```

Se `firebase deploy` si lamenta del database, è perché questo progetto non usa
quello predefinito ma `ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074`: è già
scritto in `firebase.json`, quindi basta lanciare il comando dalla cartella del
progetto.

**In alternativa, senza installare niente:** console Firebase → Firestore
Database → scheda **Regole** → incollare il contenuto di `firestore.rules` →
**Pubblica**. Attenzione a scegliere il database giusto nel menù in alto.

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
