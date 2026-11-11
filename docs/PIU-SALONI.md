# Rosy per più saloni

Rosy è nato per RD Salon. Qui c'è scritto che cosa serve perché lo usino
anche altri, che cosa è già fatto e che cosa manca.

---

## Le fondamenta (fatte)

### 1. L'abbonamento di ogni salone

Ogni salone ha un documento suo, `abbonamenti/{salone}`, con:

- il **piano** (In prova · Base · Con messaggi);
- le **funzioni accese** (per ora: i Buoni);
- gli **SMS compresi** nel mese, se diversi da quelli del piano;
- le **note** di chi gestisce (le vede solo lui).

Lo scrive **solo il server**, dal pannello. Il titolare del salone lo legge ma
non può cambiarlo: altrimenti si accenderebbe da solo le funzioni a pagamento.

Prima, per dare i Buoni a un salone, si scriveva il suo indirizzo email nel
codice e nelle regole del database e si ripubblicava tutto. Adesso si spunta
una casella.

RD Salon non cambia: le sue funzioni restano legate al suo indirizzo, nel
codice, e funzionano anche se il suo abbonamento non esiste.

I piani e i prezzi stanno in un posto solo, `salone-app/frontend/lib/abbonamento.ts`
(`PIANI`). Quelli scritti oggi — Base 29 €, Con messaggi 35 € con 150 SMS —
sono **una proposta da decidere**, non un listino.

### 2. Il pannello dei saloni

All'indirizzo **`/admin`**. Elenco di tutti i saloni con piano, funzioni,
SMS mandati nel mese e domande fatte a Rosy IA; con **Modifica** si cambia
l'abbonamento.

La pagina la può aprire chiunque scriva l'indirizzo, ma i dati li dà il
server, e solo a chi è nell'elenco degli amministratori, con l'indirizzo
**verificato** (cioè entrato con Google). Agli altri risponde "pagina
riservata".

### 3. Il contatore degli SMS

A ogni SMS il server aggiorna un numero per salone e per mese
(`consumi_sms/{salone}_{mese}`): quanti ne sono partiti, quanti no. Si vede
nel pannello e, per il salone, in **Automazioni**.

Per ora **conta e basta**: superare gli SMS compresi non blocca gli invii.
Il conto parte dal giorno in cui questa versione viene pubblicata: gli SMS
di prima stanno nel registro ma non nel contatore.

---

## Da fare una volta, per accenderle

1. **Vercel → Settings → Environment Variables**
   - **Key:** `ADMIN_EMAILS`
   - **Value:** il tuo indirizzo Google (più indirizzi separati da virgola)
   - poi **Redeploy**
2. **Ripubblicare le regole di Firestore** (come le altre volte: vedi
   `docs/MESSA-IN-LINEA.md`, punto 4). Servono per:
   - far leggere al salone il suo abbonamento e il suo contatore;
   - far valere i Buoni accesi dal pannello.
   Per capire se sono quelle nuove: nella pagina delle regole cerca
   `buoniAccesiDalPannello`.
3. Aprire **`/admin`** entrando con quell'indirizzo.

Finché non si fanno questi passi non cambia niente per nessuno: il pannello
risponde che non è acceso, e RD Salon lavora come prima.

`/api/salute` dice se il pannello è acceso (`"pannello": "acceso"`).

---

## Come si attiva un salone nuovo, oggi

1. Il titolare entra con Google sull'indirizzo di Rosy e fa l'avvio guidato.
2. Tu apri `/admin`, lo trovi in cima (i più recenti per primi), **Modifica**:
   scegli il piano, accendi i Buoni se servono, scrivi nelle note come paga.
3. L'incasso per ora è fuori da Rosy (bonifico, link di pagamento).

---

## Che cosa manca

Nell'ordine in cui conviene farlo.

| # | Cosa | Perché non è ancora fatto |
|---|------|---------------------------|
| 1 | **SMS per ogni salone** | Oggi il server ha un solo "postino": il tablet di RD Salon. Accendere gli SMS a un altro salone li farebbe partire dal numero di RD Salon. Serve scegliere un fornitore di SMS con il mittente per salone (o un tablet per salone). Finché non c'è, gli SMS automatici restano di RD Salon |
| 2 | **Limite sugli SMS compresi** | Il contatore c'è; va deciso che cosa succede a pacchetto finito (avviso, blocco, pacchetto extra) |
| 3 | **Pagamenti** | Abbonamento con addebito automatico. Con l'attivazione a mano non è urgente |
| 4 | **Prova e sospensione** | Un salone "In prova" oggi usa tutto senza scadenza; un salone che non paga non si può sospendere dal pannello |
| 5 | **Indirizzo di prenotazione del salone** (tipo `prenota.nomesalone.it`) | Sta in una variabile su Vercel: va spostato nella scheda del salone |
| 6 | **Rosy IA** | Una chiave gratuita sola per tutti: con più saloni finisce presto. Il conteggio per salone c'è già |
| 7 | **Contratto e privacy** | Vendendo Rosy si trattano i dati delle clienti per conto di ogni salone: servono un contratto e un accordo sul trattamento dei dati |
| 8 | **Costi fissi** | Piano a pagamento di Vercel (uso commerciale) e piano a consumo di Firebase (il limite gratuito di letture è unico per tutti i saloni) |

---

## Per chi mette mano al codice

| Cosa | Dove |
|---|---|
| Piani, funzioni accendibili, conteggio SMS, chi è amministratore | `salone-app/frontend/lib/abbonamento.ts` |
| Funzioni riservate (elenco per indirizzo + abbonamento) | `salone-app/frontend/lib/funzioni.ts` |
| La sessione carica le funzioni del salone | `salone-app/frontend/lib/sessione.ts` |
| Pannello, lato server | `api/admin.ts` |
| Pannello, pagina | `salone-app/frontend/app/(dashboard)/admin/page.tsx` |
| Contatore SMS | `api/_invio.ts` (`contaSms`) |
| Regole | `firestore.rules`: `abbonamenti`, `consumi_sms`, `buoniAccesiDalPannello` |
| Prove | `npm run prova:abbonamento`, `npm run prova:funzioni` |

Per aggiungere una funzione accendibile dal pannello: una riga in
`FUNZIONI_ACCENDIBILI`, la voce in `FUNZIONI_RISERVATE`, e nelle regole un
controllo come `buoniAccesiDalPannello`.
