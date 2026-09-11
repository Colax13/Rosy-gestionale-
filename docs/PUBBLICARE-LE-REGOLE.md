# Ripubblicare le regole (e perché, questa volta)

## Cos'è cambiato

Prima gli **appuntamenti erano leggibili da chiunque**. Dentro ogni
appuntamento ci sono nome, cognome e telefono della cliente: chi conosceva
l'indirizzo del progetto poteva scaricarsi la rubrica del salone.

Non era un bug nascosto, era una scorciatoia: la pagina di prenotazione gira
senza login e, per sapere quando le operatrici erano occupate, leggeva gli
appuntamenti veri — portandosi dietro anche le persone.

Adesso fuori escono solo due liste, e in nessuna delle due c'è una persona:

| Lista | Cosa contiene | Chi la legge |
|---|---|---|
| `vetrina` | listino e operatrici, ripuliti: niente note private, niente email | chiunque |
| `disponibilita` | solo gli orari occupati: chi, da quando, a quando | chiunque |

E si chiudono a chiave: **appuntamenti**, **listino** (dentro ci sono i costi e
i margini) e **schede operatrici** (dentro c'è l'email).

---

## Cosa devi fare, nell'ordine

L'ordine conta. Fra il passo 1 e il passo 2 la pagina di prenotazione online
resta vuota per qualche minuto: non è un danno, è solo che le due liste nuove
non esistono ancora.

### 1. Pubblica le regole e gli indici

Da riga di comando, nella cartella del progetto:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Oppure a mano: console Firebase → **Firestore Database** → database
`ai-studio-7035b199-…` → linguetta **Sicurezza** → incolla il contenuto di
[`firestore.rules`](https://github.com/Colax13/rosy-gestionale-/blob/main/firestore.rules)
→ **Pubblica**.

> Se lo fai a mano, aggiungi anche l'indice: console → **Indici** → indice
> composto su `disponibilita` con `userId` crescente e `giorno` crescente.
> Senza, il programma funziona lo stesso ma legge qualche riga in più.

### 2. Apri Rosy e vai sull'Agenda

Basta aprirla. Il programma scrive da solo le due liste nuove, con gli
appuntamenti da oggi in avanti. Ci mette qualche secondo e non te ne accorgi.

### 3. Controlla

Apri il tuo link pubblico di prenotazione e arriva fino alla scelta
dell'orario. Devi vedere il listino, le operatrici e gli orari liberi.

---

## Come verifichi che la fuga sia chiusa

Sul link pubblico, premi **F12** → scheda **Rete** (Network) → ricarica la
pagina. Nelle risposte non deve comparire **nessun nome di cliente e nessun
numero di telefono**: solo servizi, operatrici e orari.

---

## Se qualcosa va storto

**La pagina pubblica resta vuota.** Vuol dire che il passo 2 non è andato:
riapri l'Agenda da titolare e ricarica il link pubblico.

**In salone qualcuno non vede più l'agenda.** Controlla che la sua riga in
*Operatori → Accessi* abbia il permesso **Agenda**: adesso senza quel permesso
gli appuntamenti non si leggono nemmeno, prima bastava essere entrati.

**Firebase segnala un errore di sintassi.** Non pubblicare e mandamelo.
