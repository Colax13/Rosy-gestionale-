# Accendere il pezzo lato server su Vercel

Serve una volta sola, e sblocca quattro cose insieme:

- **G15** — verifica del numero di telefono nella prenotazione online
- **G16** — messaggio di conferma alla cliente
- **F3** — Make che scrive il buono da solo nell'istante del pagamento
- **F4** — caparra con Stripe

Sono tutte cose che il browser non può fare da solo, perché avrebbe bisogno di
un segreto — e un segreto messo nel programma non è più un segreto: chi apre il
sito se lo prende in dieci secondi. Il segreto sta su Vercel, e solo lì.

---

## Cosa succede se lo fai

Nel programma non cambia niente finché non costruiamo le funzioni: questo passo
mette in piedi **la base**. Alla fine hai un indirizzo da aprire nel browser che
ti risponde se la chiave è a posto, e da lì in poi posso scrivere il resto.

**Costo:** le funzioni su Vercel sono comprese nel piano gratuito con un limite
mensile molto più alto di quello che consuma un salone. Se un giorno passassi a
pagamento, sarebbe per il traffico del sito, non per questo.

---

## 1. Prendere la chiave da Firebase

1. console.firebase.google.com → progetto **gestionaliparrucchieri**
2. Rotellina in alto a sinistra → **Impostazioni progetto**
3. Linguetta **Account di servizio**
4. **Genera nuova chiave privata** → conferma
5. Il browser scarica un file `.json`. Aprilo con un editor di testo
   (Blocco note va benissimo).

> **Questo file è la chiave di casa.** Chi ce l'ha può leggere e cancellare
> tutto il database, regole comprese. Non va messo nel repository, non va
> mandato per email, non va incollato in chat — nemmeno a me. Se dovesse
> uscirtene una copia, si revoca dalla stessa pagina e se ne genera un'altra.

---

## 2. Metterla su Vercel

1. vercel.com → il progetto di Rosy → **Settings**
2. Menù a sinistra: **Environment Variables**
3. Nuova variabile:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** tutto il contenuto del file `.json`, dalla prima graffa `{`
     all'ultima `}`. Copia e incolla in blocco: non togliere gli a capo, non
     togliere le virgolette, non fermarti a metà.
   - **Environments:** spunta tutte e tre (Production, Preview, Development)
4. **Save**

---

## 3. Rifare il deploy

Le variabili entrano in funzione **solo nei deploy nuovi**: quello già in linea
non le vede.

1. Linguetta **Deployments**
2. Sul primo della lista: i tre puntini `⋯` → **Redeploy** → **Redeploy**
3. Aspetta che diventi *Ready* (un paio di minuti)

---

## 4. Controllare che sia andata

Apri nel browser:

```
https://gestionalerosy.colasantiludovico.it/api/salute
```

Deve rispondere così:

```json
{ "servizio": "rosy", "chiave": "a posto", "progetto": "gestionaliparrucchieri" }
```

Se invece leggi:

| Cosa dice | Cosa è successo |
|---|---|
| `"chiave": "manca"` | La variabile non c'è, o il deploy è ancora quello vecchio: rifai il passo 3. |
| `"chiave": "non valida"` — *non è un JSON leggibile* | Il testo è stato incollato a metà. Rifai il passo 2 copiando tutto il file. |
| `"chiave": "non valida"` — *non è una chiave di servizio* | È stato incollato il file sbagliato: serve quello dell'**Account di servizio**, non la configurazione del sito. |
| `"chiave": "non valida"` — *Google ha rifiutato* | La chiave è stata revocata, o è di un altro progetto. Generane una nuova al passo 1. |
| Pagina bianca o errore 404 | Il deploy non ha preso la cartella `api/`: mandami lo screenshot del log di Vercel. |

La pagina non mostra mai la chiave né un pezzo di essa: dice solo se funziona.

---

## Quando hai finito

Scrivimelo, e comincio da **G15 e G16** — la verifica del numero e il messaggio
di conferma — che sono quelle che servono davvero tutti i giorni. Stripe e Make
vengono dopo, sulla stessa base.
