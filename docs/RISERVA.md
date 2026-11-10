# Il paracadute e il gestionale di riserva

Rosy è in uso in salone: se si ferma, si ferma il lavoro. Qui c'è scritto che
cosa succede adesso quando qualcosa si rompe, e come si prepara — una volta
sola, in una decina di minuti — il **gestionale di riserva**.

---

## Che cosa c'è già, senza fare niente

Queste protezioni sono nel programma e valgono dal momento in cui è pubblicato.

| Se succede questo… | …adesso succede questo |
|---|---|
| Una pagina va in errore (un dato scritto strano, una svista in una versione nuova) | Si ferma **solo quella pagina**. Menu, agenda e le altre pagine restano. Compaiono *Riprova*, *Ricarica*, *Vai all'agenda* |
| Si rompe un riquadro (il riepilogo del report, la chat di Rosy, lo stato del sistema) | Si spegne solo il riquadro, con *Riprova*. Il resto della pagina funziona |
| Cade tutto il programma | Niente schermo bianco: una schermata dice che i dati sono al sicuro e propone *Ricarica* |
| Il programma non parte proprio (un file che non si scarica) | Interviene una sentinella che sta fuori dal programma (`index.html`) e lo dice |
| La linea è lenta | Dopo 15 secondi compare un avviso gentile, che sparisce da solo appena il programma arriva |

In tutti questi casi **i dati non c'entrano**: clienti e appuntamenti stanno sul
database, e un errore di schermo non li tocca.

Ogni problema resta annotato sul computer dove è capitato. Si legge in
**Impostazioni → Stato del sistema → Problemi capitati su questo computer**, e
con **Copia per l'assistenza** si incolla tutto a chi segue il programma.

---

## Il gestionale di riserva

### Cos'è

Una **seconda copia del programma, su un altro indirizzo**, ferma all'ultima
versione collaudata. Legge e scrive **lo stesso database**: stessi clienti,
stessa agenda, in diretta. Un appuntamento preso sulla riserva compare sul
principale, e viceversa.

Serve nel caso più probabile: **una versione nuova che rompe qualcosa**. Il
principale riceve le novità; la riserva no, finché non sono state provate. Se
il principale si blocca, il programma **manda da solo alla riserva** dopo un
conto alla rovescia di 12 secondi (con il tasto *Resta qui* per fermarlo), e
in salone si continua a lavorare mentre il principale viene sistemato.

Sulla riserva si entra di nuovo con il proprio accesso: è un altro indirizzo,
e il browser non porta con sé l'accesso da uno all'altro.

### Come si prepara · 10 minuti, una volta sola

Nel repository c'è il ramo **`stabile`**: è la versione collaudata. La riserva
pubblica quello.

**1. Vercel: un secondo progetto**

1. vercel.com → **Add New… → Project**
2. **Import** lo stesso repository: `Colax13/rosy-gestionale-`
3. Nome del progetto: `rosy-riserva`. Le altre impostazioni vanno bene così
   (sono scritte in `vercel.json`).
4. **Deploy**. Questa prima volta pubblica `main`: si corregge al passo dopo.
5. Nel progetto nuovo: **Settings → Environments → Production → Branch
   Tracking** e scrivi `stabile`. (In alcune versioni di Vercel la stessa
   voce sta in *Settings → Git → Production Branch*.)
6. **Settings → Environment Variables**, aggiungi:
   - **Key:** `VITE_RISERVA_DI`
   - **Value:** l'indirizzo del gestionale principale, con `https://` davanti
     (quello che si apre ogni giorno in salone)
7. **Deployments** → sul ramo `stabile` → `⋯` → **Redeploy** (oppure aspetta
   il prossimo aggiornamento del ramo).

Alla fine Vercel dà un indirizzo tipo `rosy-riserva.vercel.app`. **Segnatelo.**

**2. Firebase: autorizzare l'indirizzo della riserva**

Senza questo passo, sulla riserva l'accesso con Google dà
"unauthorized-domain".

1. console.firebase.google.com → progetto **gestionaliparrucchieri**
2. **Authentication → Settings → Authorized domains → Add domain**
3. Incolla l'indirizzo della riserva, senza `https://`

**3. Vercel, progetto principale: dirgli dov'è la riserva**

1. Progetto principale → **Settings → Environment Variables**
   - **Key:** `VITE_URL_RISERVA`
   - **Value:** l'indirizzo della riserva, con `https://` davanti
2. **Deployments** → `⋯` → **Redeploy**

**4. Controllo**

- Sul principale: **Impostazioni → Stato del sistema**. La riga *Gestionale di
  riserva* deve dire *"Pronto su rosy-riserva.vercel.app…"*.
- Apri l'indirizzo della riserva ed entra. In basso deve comparire la fascetta
  gialla **"Gestionale di riserva · i dati sono gli stessi"**, e in agenda gli
  stessi appuntamenti del principale.

### Che cosa funziona sulla riserva

Agenda, clienti, servizi, operatori, prodotti, buoni, report: **tutto quello
che parla direttamente con il database**, cioè il lavoro di ogni giorno.

Non funzionano, finché non si copiano le variabili del principale: SMS, Rosy
IA, numero progressivo del preconto. Se si vogliono anche quelli, sul progetto
`rosy-riserva` si copiano `FIREBASE_SERVICE_ACCOUNT`, `TRACCAR_SMS_TOKEN` e
`GEMINI_API_KEY`. **Non copiare `CRON_SECRET`**: i promemoria li manda già il
principale, e due giri non servono.

La **prenotazione online delle clienti resta sul principale**: la riserva è
per chi lavora in salone, non per chi prenota.

### Come si aggiorna la riserva

La riserva vale qualcosa solo se resta indietro apposta. La regola:

1. le novità si pubblicano sul principale (`main`);
2. si lavora qualche giorno e si vede che va tutto bene;
3. **solo allora** si porta `stabile` alla stessa versione di `main`.

Il passo 3 si chiede a chi segue il programma ("porta stabile alla versione
di oggi"), oppure su GitHub: **Pull requests → New** con base `stabile` e
compare `main` → **Merge**.

### La strada ancora più rapida: tornare indietro di una versione

Se subito dopo una pubblicazione qualcosa non va, senza aspettare nessuno:
Vercel → progetto principale → **Deployments** → sulla versione precedente
(quella che funzionava) `⋯` → **Promote to Production** (o **Instant
Rollback**). In un minuto il principale torna com'era ieri.

---

## Quello che la riserva NON copre

La riserva usa lo stesso database. Quindi non aiuta se il problema è lì.

### Il limite gratuito del database · consigliato

Sul piano gratuito Firebase concede 50.000 letture al giorno. **Se finiscono,
il gestionale non legge più niente fino al mattino dopo (verso le 9)** — e
succede anche sulla riserva. È già capitato, prima che il programma venisse
alleggerito nelle letture.

Il rimedio è passare al piano a consumo (**Blaze**): le soglie gratuite
restano le stesse, ma superandole il gestionale non si ferma più — si paga la
differenza, che per un salone sono centesimi.

1. console.firebase.google.com → **gestionaliparrucchieri** → in basso a
   sinistra **Upgrade** → **Blaze**
2. Nella stessa procedura si imposta un **avviso di spesa** (per esempio
   5 €): arriva un'email se il conto supera quella cifra. È un avviso, non un
   blocco.

### I backup automatici · consigliato

Oggi il backup è manuale (**Impostazioni → Backup dei dati → Scarica
backup**) e protegge solo se qualcuno si ricorda di farlo. Con il piano Blaze
si accendono quelli automatici di Google:

1. console.firebase.google.com → **Firestore Database** → scegli il database
   `ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074` (non quello predefinito)
2. Linguetta **Disaster recovery** (ripristino di emergenza)
3. Accendi i **backup pianificati** giornalieri, e se c'è il **ripristino a un
   momento preciso** (point-in-time recovery): permette di tornare a com'era
   il database un'ora fa, dopo una cancellazione per sbaglio.

Finché non si passa a Blaze: **scarica il backup una volta alla settimana** e
tienilo su Google Drive.

### Internet che non va in salone

Senza linea non si arriva né al principale né alla riserva. Il rimedio è
l'hotspot di un telefono. Rendere l'agenda leggibile anche senza linea è
possibile, ma è una modifica più profonda: da fare a parte, con calma e con
le sue prove.

---

## Per chi mette mano al codice

| Cosa | Dove |
|---|---|
| Paracadute (riquadro / pagina / programma) | `salone-app/frontend/components/Paracadute.tsx` |
| Dove è montato | `src/main.tsx` (programma), `src/components/Layout.tsx` (pagina, chat) |
| Sentinella che sta fuori dal programma | `index.html` |
| Indirizzi della riserva e registro dei problemi | `salone-app/frontend/lib/riserva.ts` |
| Spie di Impostazioni | `salone-app/frontend/lib/stato-sistema.ts`, `components/StatoSistema.tsx` |
| Prove | `npm run prova:riserva`, `npm run prova:stato-sistema` |

Per vedere il paracadute dal vero senza rompere niente: si compila con
`VITE_URL_RISERVA=https://…`, si serve la cartella `dist` e nel browser si
blocca il file `/assets/index-….js` (strumenti per sviluppatori → Rete →
*Block request URL*).
