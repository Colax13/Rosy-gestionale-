# Gestionale Salone — Lista modifiche (dagli audio)

> Documento di lavoro. Raccoglie **tutto** quello che è stato detto negli audio, diviso in:
> **A)** modifiche richieste · **B)** decisioni da prendere insieme · **C)** cose da controllare (verifiche tecniche già emerse leggendo il codice).
> Nessuna modifica è stata ancora implementata: prima si controlla insieme, punto per punto.

---

## A. Modifiche richieste

### A1 — Agenda: schermata piena, tutti gli operatori visibili
**Priorità: ALTA**

- La pagina di default deve essere **solo l'agenda**, a tutto schermo, con pochissime impostazioni intorno.
- Un punto/pulsante dedicato apre la **dashboard** con tutto il resto (report, impostazioni, ecc.).
- Devono vedersi **tutte le colonne di tutti gli operatori contemporaneamente**, tutte della **stessa larghezza**, senza scroll orizzontale.
- Oggi se ne vedono solo ~4 e poi bisogna scorrere.

*Stato nel codice:* `salone-app/frontend/app/(dashboard)/agenda/page.tsx` — ogni colonna operatore ha `min-w-[240px]` e il contenitore `min-w-[1000px]` (righe ~478 e ~485/575). Oltre 4 operatori parte lo scroll orizzontale. Va sostituito con una griglia a larghezza proporzionale (`1fr` per operatore).

---

### A2 — Barra superiore ridotta + colonna sinistra
**Priorità: MEDIA**

- Solo **una colonna a sinistra** e una **barra piccola in alto** con: **Clienti · Prodotti · Buoni**.
- Tutto il resto va spostato dentro la dashboard.

---

### A3 — Calendario mensile sempre visibile
**Priorità: ALTA**

- Un **calendario del mese** fisso in un angolo (in alto a sinistra o nella colonna laterale), con scritto il mese (es. "Settembre") e tutti i giorni.
- Clic su un giorno → si apre direttamente l'agenda di **quel giorno**.
- Serve per non dover scorrere giorno per giorno mentre si è al telefono con la cliente.

*Stato nel codice:* un mini-calendario esiste già ma è nascosto dentro un menù a tendina (agenda/page.tsx righe ~892-935). Va estratto e reso sempre visibile.

---

### A4 — Tempo di posa nei servizi
**Priorità: ALTA**

- Nella **creazione del servizio** devono esserci **due campi separati e fissi per tutti i servizi**:
  - **tempo di applicazione / lavorazione** (es. 15 min)
  - **tempo di posa** (es. 45 min)
- Devono comparire su **ogni tipo di servizio**, anche sulla piega. Se il tempo di posa è **0**, semplicemente non viene calcolato.

*Stato nel codice:* i campi `tempo_lavorazione_minuti` e `tempo_posa_minuti` **esistono già** nel form catalogo (`catalogo/page.tsx` righe 32-34, 73-74, 103-106) ma **non vengono usati** dall'agenda.

---

### A5 — La posa deve creare un buco prenotabile in agenda
**Priorità: ALTA — è il cuore della richiesta**

- Se metto colore (15 min applicazione + 45 min posa) e poi piega, durante la posa deve crearsi un **buco nell'agenda** in cui posso inserire un'altra cliente.
- Oggi l'appuntamento è un **blocco unico**: il tempo di posa risulta occupato e non si può prenotare nessun altro.

*Stato nel codice:*
- `agenda/page.tsx` righe 1288-1301: la posa viene **indovinata dal nome del servizio** (se contiene "colore", "sole", "schiariture", "permanente") con lavorazione fissa a 15 minuti. Non legge `tempo_posa_minuti`.
- Il "buco" è solo **grafico dentro la card**: la durata totale dell'appuntamento resta la somma piena, quindi lo slot resta occupato.
- Il controllo sovrapposizioni (`AggiungiCalendarioSidebar.tsx` righe 324-400) blocca comunque l'inserimento in quella fascia.

---

### A6 — Appuntamenti sovrapposti non devono impilarsi a colonne
**Priorità: MEDIA**

- Inserendo più appuntamenti si crea una specie di colonna/pacco unico: non va bene, va rivista la resa grafica delle sovrapposizioni.

*Stato nel codice:* `agenda/page.tsx` righe ~540-575 (`colIndex` / `colTotal`) — le sovrapposizioni si dividono lo spazio della colonna.

---

### A7 — Spostare gli appuntamenti trascinandoli (drag & drop)
**Priorità: ALTA**

- Poter **trascinare** un appuntamento per spostarlo di orario o cambiare operatore ("switcharlo").

*Stato nel codice:* **non esiste alcun drag & drop** in agenda. Da costruire da zero.

---

### A8 — Disponibilità operatore: giorni oscurati ma comunque utilizzabili
**Priorità: ALTA**

- Creando il team imposto ad es. Rossella disponibile solo **martedì, giovedì, sabato**.
- Negli altri giorni la sua colonna **c'è comunque**, ma **oscurata / grigia**.
- Deve restare **possibile inserire appuntamenti** anche nei giorni oscurati (capita che venga lo stesso).

*Stato nel codice:*
- I turni per dipendente esistono già (`dipendenti/TurniCalendario.tsx`, campo `turni` con lunedì-domenica, orario base e permessi).
- Ma l'agenda **li ignora**: c'è un orario lavorativo **fisso 9:00-18:00 hardcoded** (`agenda/page.tsx` riga ~584, commento nel codice: *"Fake scheduling logic assuming default works from 9 to 18"*).

---

### A9 — Tema chiaro
**Priorità: MEDIA**

- Lo sfondo nero è troppo pesante → **bianco** (eventualmente leggermente caldo, ma preferenza: bianco).
- Appuntamenti e **nomi devono leggersi bene**.

*Stato nel codice:* `index.html` è già impostato su tema chiaro di default, ma le pagine hanno i colori **scuri scritti fissi** (`bg-zinc-900`, `bg-zinc-950`, `text-zinc-100`) senza varianti chiare. Serve una passata su tutte le pagine, agenda per prima.

---

### A10 — Sezione Buoni
**Priorità: MEDIA**

- Voce **Buoni** nella barra in alto → si apre una **tabella con tutti i buoni**.
- Si inserisce il buono dal gestionale invece di scriverlo sul foglio.

*Stato nel codice:* **non esiste**. La pagina `prodotti/page.tsx` è un segnaposto ("Pagine in via di sviluppo").

---

### A11 — Importazione clienti già esistenti
**Priorità: ALTA (blocca la partenza)**

- I clienti già in lista devono poter essere **trasferiti in blocco**, senza copiarli uno per uno.
- Da capire da che formato partiamo (Excel, CSV, foto/PDF dell'elenco, export dal gestionale attuale).

*Stato nel codice:* esiste una funzione di import con AI nel backend (`backend/src/routes/import.ts`, legge PDF/immagini con Gemini) ma **non è collegata**: nel frontend `clientiApi.importAi` lancia *"Not implemented on frontend yet"* (`lib/api-client.ts` riga 51).

---

### A12 — Creazione cliente senza numero ed email
**Priorità: ALTA — è un blocco quotidiano**

- Deve essere possibile creare una cliente **anche senza telefono e senza email** (cliente anziana che non li ha).
- Oggi dice che non è possibile creare.

*Causa probabile trovata:* in `AggiungiCalendarioSidebar.tsx` righe 221-222 i campi vuoti vengono inviati come `telefono: undefined` / `email: undefined`, e Firestore **rifiuta i valori `undefined`** se non è attivo `ignoreUndefinedProperties` (in `src/lib/firebase.ts` non lo è). Da verificare insieme riproducendo l'errore.

---

### A13 — Messaggi automatici al cliente
**Priorità: ALTA**

- Alla **creazione dell'appuntamento** → messaggio automatico al numero di telefono.
- Il **giorno prima** → messaggio di promemoria.
- Se facciamo l'app, meglio **notifiche push** al posto degli SMS: notifica alla prenotazione, notifica il giorno prima, notifica in caso di annullamento. Così si evitano i costi e la gestione degli SMS.

*Stato nel codice:* il cron dei promemoria esiste ma è **tutto commentato / mock** (`backend/src/cron/promemoria.ts`: Twilio e Resend commentati). Non gira nulla in produzione.

---

### A14 — Flusso "richiesta di appuntamento" con conferma
**Priorità: ALTA**

- Il cliente prenota → **non è subito confermato**: gli compare *"Richiesta di appuntamento inviata"*.
- Sul gestionale arriva una **notifica** con le azioni: **Conferma · Rifiuta · Modifica · Ricontatta la cliente**.
- Solo dopo la conferma al cliente arriva *"Appuntamento confermato"*.
- Vantaggio doppio: filtro sugli appuntamenti presi a caso, e possibilità di rielaborare o richiamare.

*Stato nel codice:* la prenotazione pubblica crea l'appuntamento **già come `stato: 'prenotato'`** (`(public)/[salonId]/prenota/page.tsx` riga 237), senza passaggio di approvazione. In più la schermata finale dice *"Abbiamo inviato un SMS di conferma al numero…"* (riga 744) ma **nessun SMS viene inviato**: messaggio da correggere.

---

### A15 — Stabilità e semplicità
**Priorità: MASSIMA — la cosa più importante di tutte**

- Una volta inserito tutto, **non si deve bloccare**, niente bug.
- Le ragazze del salone non hanno dimestichezza con il computer: tutto deve essere **il più semplice possibile**.
- Da fare: giro di test su tutte le operazioni quotidiane prima di metterlo in mano al personale.

---

## B. Decisioni da prendere insieme

| # | Domanda | Note |
|---|---------|------|
| B1 | **App vera o sito?** I clienti scaricano un'app o vanno sul sito per prenotare? | Nel repo c'è già un `manifest.json`: si può partire con una **web-app installabile (PWA)** — si aggiunge alla schermata home come un'app, supporta le notifiche, costi vicini a zero, nessun passaggio dagli store. L'app nativa su App Store/Play Store è il passo successivo (Apple: 99$/anno + tempi di revisione). Proposta: **si parte dal sito/PWA**, l'app si valuta dopo. |
| B2 | **Notifiche push o SMS?** | Le push richiedono l'app/PWA installata dalla cliente. Gli SMS funzionano con chiunque ma si pagano a messaggio. Probabile scelta: **push a chi ha installato, SMS/WhatsApp come riserva**. |
| B3 | **Costi ricorrenti** — budget indicato: intorno ai 100€, anche 50€/anno va bene, purché la somma non esploda. | Da preparare una **stima scritta**: hosting, database, eventuali SMS, eventuale account Apple. |
| B4 | **Formato dei clienti da importare** | Excel / CSV / foto dell'agenda / export dal gestionale attuale: cambia parecchio il lavoro. |
| B5 | **Due progetti nello stesso repo** | C'è l'app root (Vite + Firebase, "Rosy") e la cartella `salone-app` con un backend Express che usa **dati finti in memoria** e Supabase commentato. Il frontend ormai parla **direttamente con Firestore**. Va deciso se cancellare il backend vecchio: oggi è codice morto che confonde. |
| B6 | **Call con schermo condiviso** | Da fissare, per vedere insieme le cose difficili da spiegare a voce. iPhone di lavoro disponibile per i test nel weekend. |

---

## C. Cose da controllare (verifiche tecniche)

Trovate leggendo il codice, **da verificare insieme una per una**. Le prime tre sono le candidate principali dietro ai blocchi.

- [x] **C1 — CORRETTO: gli update parziali passano.** Verificato: nelle regole Firestore, su un aggiornamento `request.resource.data` è il documento **risultante** (vecchi campi + nuovi), non solo i campi inviati. Quindi `hasAll([...])` è soddisfatto e `clientiApi.update`, `dipendentiApi.update` e `appuntamentiApi.update` non vengono rifiutati. Il sospetto era infondato.
  **Quello che invece era rotto davvero, ed è stato sistemato:**
  - `salons` rifiutava il salvataggio quando l'onboarding veniva rifatto, perché riscriveva `createdAt` con un timestamp nuovo mentre le regole lo vogliono immutabile (`src/components/Onboarding.tsx`).
  - il salvataggio delle impostazioni falliva se il documento salone non era ancora stato creato: mancavano `ownerEmail`, `plan` e `createdAt` richiesti in creazione (`lib/api-client.ts`).
- [x] **C2 — RISOLTO: creazione cliente senza telefono/email** → vedi A12. Attivato `ignoreUndefinedProperties` in `src/lib/firebase.ts`.
- [ ] **C3 — Dati leggibili da chiunque.** In `firestore.rules` le collezioni `appuntamenti`, `dipendenti` e `catalogo` hanno `allow get, list: if true`: **chiunque conosca l'indirizzo può leggere tutti gli appuntamenti, con nomi e telefoni delle clienti.** Da chiudere (questione privacy/GDPR, non solo tecnica).
- [ ] **C4 — Agenda lenta col tempo.** `appuntamentiApi.getAgenda` scarica **tutti** gli appuntamenti dell'utente e filtra sul computer. Con qualche migliaio di appuntamenti diventa lenta e pesante. Da sistemare prima che il salone accumuli storico.
- [ ] **C5 — Orario 9:00-18:00 fisso** nell'agenda, ignora i turni configurati → vedi A8.
- [ ] **C6 — Posa indovinata dal nome del servizio** invece che dal campo → vedi A4/A5.
- [ ] **C7 — Il cron dei promemoria non gira.** Codice commentato, e comunque su hosting serverless un `node-cron` non resta attivo: serve uno scheduler esterno.
- [ ] **C8 — Pagina Report con numeri finti.** `reportApi.getOverview` restituisce zeri hardcoded (`api-client.ts` righe 14-23).
- [ ] **C9 — Pagine Prodotti e Automazioni** sono segnaposto vuoti.
- [ ] **C10 — Backend Express con dati finti** (`salone-app/backend/src/routes/*`): catalogo e clienti in memoria, Supabase commentato. Ogni riavvio azzera tutto. Non è collegato al frontend → vedi B5.
- [ ] **C11 — Messaggio "SMS di conferma inviato"** mostrato al cliente ma nessun SMS parte → vedi A14.
- [ ] **C12 — Manifest PWA incompleto**: manca il service worker e ci sono solo icone segnaposto. Da completare se si va sulla strada dell'app installabile (B1).

---

## D. Ordine di lavoro proposto

1. **Prima i blocchi** (C1, C2, C3) — finché il salvataggio fallisce, ogni altra modifica è inutile.
2. **Poi l'agenda**: schermo pieno con tutti gli operatori (A1), calendario mensile fisso (A3), tema chiaro (A9).
3. **Poi la posa**: campi nel servizio (A4) + buco prenotabile in agenda (A5) + turni reali con colonne oscurate (A8).
4. **Poi il drag & drop** (A7) e la resa delle sovrapposizioni (A6).
5. **Poi l'import clienti** (A11) e i Buoni (A10).
6. **Infine** flusso richiesta/conferma (A14) e messaggi/notifiche (A13), dopo aver deciso B1 e B2.
7. **Sempre**: giro di test di stabilità prima di ogni consegna al salone (A15).


---

## E. Stato dei lavori

Aggiornato dopo il passaggio sul repository `rosy-gestionale-`.

### Fatto e pushato

| # | Cosa |
|---|------|
| A1 | Colonne operatori a larghezza uguale, tutte visibili |
| A2 | Colonna sinistra con Clienti · Prodotti · Buoni e accesso alla dashboard |
| A3 | Calendario del mese sempre visibile, clic sul giorno |
| A4 | Tre tempi nel servizio: lavorazione, posa, finitura |
| A5 | Durante la posa la fascia è libera e prenotabile |
| A6 | Colonne affiancate calcolate sulle sole lavorazioni |
| A7 | Appuntamenti trascinabili, con controllo conflitti |
| A8 | Turni veri: giorni non lavorativi oscurati ma utilizzabili |
| A9 | Tema chiaro su tutte le pagine |
| A10 | Sezione Buoni: registro, ricerca per codice, utilizzo anche parziale |
| A11 | Import clienti da Excel e CSV, con anteprima e controllo doppioni |
| A12 | Cliente creabile senza telefono ed email |
| A14 | Richiesta di appuntamento con Conferma / Modifica / Ricontatta / Rifiuta |
| C1 | Verificato: era una diagnosi sbagliata. Corretti i due salvataggi rotti davvero |
| C2 | Risolto insieme ad A12 |
| C4 | L'agenda chiede solo i giorni che servono, non più tutto lo storico |
| C5 | Via l'orario fisso 9-18 |
| C6 | La posa non si indovina più dal nome del servizio |
| C8 | Report con numeri veri |
| C11 | Tolto il messaggio "ti abbiamo inviato un SMS" che era falso |
| F1 | Le tre fasi si leggono a colpo d'occhio + avviso di sforamento |
| F2 | Pulsanti che non rispondevano, giro completo su tutte le pagine |

### Bloccate: serve prima il pezzo lato server su Vercel

Tre lavori diversi, **un solo prerequisito**: un endpoint sul server con
`FIREBASE_SERVICE_ACCOUNT` configurata. Conviene farlo una volta sola.

| # | Cosa | Perché serve il server |
|---|------|------------------------|
| C3 | Chiudere le regole del database | Il sito di prenotazione deve leggere le disponibilità senza vedere i dati delle clienti |
| A13, C7 | SMS e promemoria | L'invio non si può fare dal browser: la chiave del fornitore sarebbe visibile a tutti |
| F3 | Buoni pagati online | Make ha bisogno di un indirizzo a cui scrivere il buono |
| F4 | Acconto sulla prenotazione | Stripe deve confermare il pagamento a un endpoint fidato |

### Ancora aperte, senza prerequisiti

| # | Cosa | Nota |
|---|------|------|
| C9 | Prodotti e Automazioni | Oggi sono pagine oneste ma vuote: da decidere cosa ci va dentro |
| C10, B5 | Backend vecchio con dati finti | In `salone-app/backend` sei file su otto non sono collegati a niente. Da cancellare |
| — | `fix-gap.js` e `patch.js` in radice | Script usa e getta finiti nel repository per sbaglio |
| C12 | App installabile | Dipende da B1: si fa quando si parte con le notifiche |
| A15 | Stabilità | Continuo: giro di prova prima di ogni consegna al salone |

---

## E2. Quanto costa tenerlo acceso (B3)

Budget indicato: intorno ai 100 €, anche 50 € l'anno vanno bene, purché la
somma non esploda.

### Quello che serve per forza

| Voce | Costo | Note |
|------|-------|------|
| Hosting su Vercel | **0 €** | Il piano gratuito basta per un salone. Si paga solo se il sito diventa molto trafficato |
| Database Firebase | **0 €** fino a ~50.000 letture al giorno | Un salone ne fa qualche centinaio. Oltre la soglia si passa al consumo, ordine di pochi euro l'anno |
| Dominio | **10-15 € l'anno** | Solo se volete un indirizzo vostro invece di quello di Vercel |

**Totale minimo: 0-15 € l'anno.**

### Quello che si paga a consumo

| Voce | Costo | Con che volumi |
|------|-------|----------------|
| SMS (Twilio) | **~0,07 € a messaggio** | 100 promemoria al mese ≈ **7 € al mese, 84 € l'anno** |
| WhatsApp Business | ~0,04 € a messaggio | Più economico degli SMS ma serve l'approvazione di Meta e i modelli di messaggio |
| Notifiche dell'app | **0 €** | Solo per chi installa l'app |
| Stripe (buoni e acconti) | 1,5% + 0,25 € a incasso | Lo pagate già oggi sui buoni |

### Quello che si paga solo se si fa l'app vera

| Voce | Costo |
|------|-------|
| Account sviluppatore Apple | **99 $ l'anno** |
| Account Google Play | 25 $ una tantum |

### In pratica

- **Partendo da sito installabile + SMS solo per i promemoria**: circa **7-10 € al mese**, cioè **85-120 € l'anno**. Dentro il budget.
- **Se si riducono gli SMS** mandandoli solo il giorno prima e non anche alla prenotazione, si dimezza.
- **Se le clienti installano l'app**, per loro le notifiche costano zero e gli SMS restano solo per chi non ce l'ha. Più cresce chi la installa, meno si spende.
- **L'account Apple da 99 $ l'anno si evita** finché restiamo sul sito installabile.

La cosa importante: **non ci sono costi fissi che esplodono**. La parte che cresce
sono gli SMS, ed è proporzionale ai messaggi mandati, quindi controllabile.

## F. Nuove richieste (giro successivo)

Raccolte dopo la prima consegna, prima del push del codice da Google AI Studio.

### F1 — Lettura delle tempistiche in agenda
**Priorità: ALTA**

Non è ancora leggibile come serve. Per un parrucchiere le tre fasi vanno distinte a colpo d'occhio:

1. **rettangolo pieno** = prima lavorazione (operatore occupato)
2. **trattini** = tempo di posa, operatore **libero**, ci si possono fissare altri appuntamenti
3. **rettangolo pieno** = lavorazione finale

In più: quando si sfora o ci si sovrappone, deve comparire un avviso del tipo
*«Stai andando fuori tempo, vuoi inserire comunque l'appuntamento?»* con conferma esplicita.

*Stato:* la logica c'è (`lib/servizi.ts` divide lavorazione e posa e la fascia di posa è già prenotabile), ma la resa grafica va rifatta perché si legga davvero. La conferma sulle sovrapposizioni esiste già nella sidebar; manca il caso "fuori orario / fuori turno".

### F2 — Debug dei pulsanti dell'agenda
**Priorità: ALTA**

Diversi pulsanti non rispondono. Caso segnalato: menù tre puntini → **Completato** e **Modifica** funzionano, **Elimina** no.

*Causa probabile individuata:* il menù si chiude su `onMouseLeave` invece che su clic fuori. "Elimina" non cancella subito, apre la conferma Sì/No: muovendo il mouse verso "Sì" il puntatore esce dal menù, il menù si chiude e sembra che non sia successo niente. Completato e Modifica invece agiscono al primo clic, per questo funzionano.
*Da fare comunque:* giro completo su tutti i pulsanti dell'agenda, non solo su questo.

### F3 — Buoni SPA / Salone: integrazione del flusso esistente
**Priorità: da valutare insieme**

Flusso attuale: il cliente paga da un link Stripe dedicato → Make salva i dati del cliente su Google Fogli con un codice univoco → al cliente arriva il PDF → in negozio il controllo si fa a mano.

Da capire se e come portare tutto dentro il gestionale: registro buoni, ricerca per codice, marcatura "usato" al momento dell'uso, collegamento all'appuntamento. Si ragiona con calma, per ora è solo annotato.

### F4 — Web app di prenotazione con acconto
**Priorità: ALTA (dopo B1/B2)**

Oltre alla prenotazione online che invia la richiesta al gestionale (**A14**), si aggiunge:

- **pagamento anticipato**: una caparra (es. 10 €) sul totale della lavorazione, scalata dal conto finale
- automazioni collegate: messaggi di richiesta inviata, conferma, promemoria, annullamento

Da decidere insieme a **B1** (app o sito) e **B2** (notifiche o SMS); il pagamento presumibilmente su Stripe, come già fanno per i buoni.

---

## G. Nuova lista (giro 3)

Raccolta dalla chiamata. Ordine di scrittura, non di lavorazione.

### Bug da sistemare

**G1 — Modalità scura rotta, e barre nere per chi ce l'ha attiva** · ALTA
Le intestazioni sopra l'agenda, clienti, servizi e operatori appaiono nere ad
alcuni e normali ad altri. *Causa individuata:* nel raddrizzare i colori ho
scritto `body { bg-white text-zinc-900 }` fisso, mentre le barre hanno ancora
le varianti `dark:`. Chi ha il tema scuro salvato nel browser si ritrova barre
scure su pagina bianca; chi non l'ha mai attivato vede tutto normale — per
questo Daniele lo vede giusto. Da rifare: modalità chiara e scura entrambe
funzionanti, con l'interruttore che le cambia davvero.

**G2 — "Vedi chi sono" su Rosie Hub** · MEDIA
Il pulsante va sistemato.

**G3 — Nome della cliente tagliato** · ALTA
Deve vedersi **completo**, e su **tutti i blocchi** dell'appuntamento: se c'è
colore, posa e piega, il nome sta sia sul colore sia sulla piega. Se non ci
sta, puntini di sospensione e nome intero al passaggio del mouse.

**G4 — La card balla quando ci passi sopra** · ALTA
Adesso si rimpicciolisce e si riassesta. Deve aprirsi completa **senza
schiacciarsi**, restando alta uguale, e andare in evidenza.

**G5 — Lo zero fisso nei campi numerici** · ALTA
Nel servizio, prezzo e minuti partono da `0`: se scrivi 15 diventa `015` e non
si salva. Lo zero deve sparire appena scrivi, oppure niente numero e un
segnaposto in grigio.

**G6 — L'aspetto della posa non piace** · MEDIA
Così com'è non convince: deve dare l'idea di **spazio libero**, non di una
fascia occupata.

### Agenda: nuove funzioni

**G7 — Spostare i singoli servizi fra operatori** · ALTA
Colore con un'operatrice e piega con un'altra: si deve poter trascinare **il
singolo servizio** a destra o a sinistra, non tutto l'appuntamento. Spostando
di colonna l'orario **non deve cambiare**.

**G8 — Domanda allo spostamento** · ALTA
Quando si sposta, comparire un riquadro: *«Lo lasci allo stesso orario o lo
cambi?»*, e si decide lì.

**G9 — Servizi separati restano legati a vista** · MEDIA
Se i due servizi finiscono su operatrici diverse i trattini di collegamento
spariscono: restano **dello stesso colore**, e passando col mouse su uno si
evidenzia anche l'altro, così si capisce che è la stessa cliente.

**G10 — Effetto sfocatura sul resto al passaggio del mouse** · da decidere
Idea da valutare, serve un parere.

### Operatori

**G11 — Accesso per le operatrici** · ALTA
Email o nome utente e password, per entrare anche dal telefono.

**G12 — Permessi per operatrice** · ALTA
Chi dà l'accesso sceglie **a quali pagine** può entrare: solo agenda, oppure
agenda più clienti e servizi, oppure agenda e buoni. Il resto oscurato.

**G13 — Servizi che ogni operatrice può fare** · ALTA
Non tutte fanno tutto. Terza scheda nella scheda operatore, accanto a turni e
orari, con l'elenco dei servizi da spuntare e il tasto Salva.

### Clienti e prenotazioni

**G14 — "Ricontatta" che funziona** · ALTA
Da computer apre WhatsApp sul numero della cliente. Da telefono propone
**chiama** oppure **messaggio WhatsApp**.

**G15 — Verifica del numero nella prenotazione online** · ALTA
Oggi si può prenotare con un numero inventato. Serve un controllo.

**G16 — Messaggio alla cliente quando confermi** · ALTA
Quando il salone conferma, alla cliente arriva un messaggio.

**G17 — App o sito: decisione** · da decidere
Obiettivo dichiarato: far spendere meno al cliente.

### Buoni

**G18 — Collegare i buoni pagati online** · ALTA
Il foglio Google contiene già quanto ha pagato, chi è, e **piega sì / piega
no** in base all'importo. Da capire se leggere il foglio o passare da Make.

### Nuovo

**G19 — Preconto** · MEDIA
Come al ristorante: si selezionano i servizi fatti, esce il totale, si stampa
su una stampantina. I prezzi sono **gli stessi del catalogo**, così cambiando
lì cambia anche qui. Serve capire il collegamento con la stampante.
