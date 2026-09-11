// Il pezzo lato server di Rosy.
//
// Il programma parla da solo con Firestore: quasi tutto quello che serve al
// salone non passa di qui. Il server serve per le poche cose che il browser
// non può fare senza mettere in piazza un segreto:
//
//   - mandare l'SMS o il messaggio di verifica del numero (G15, G16)
//   - far scrivere i buoni a Make quando qualcuno paga online (F3)
//   - incassare la caparra con Stripe (F4)
//
// Tutte e tre hanno bisogno della stessa cosa: una **chiave di servizio**
// Firebase, cioè un permesso da amministratore su tutto il database. Quella
// chiave non può stare nel programma — chiunque apra il sito se la
// prenderebbe — quindi sta fra le variabili d'ambiente di Vercel, con il nome
// FIREBASE_SERVICE_ACCOUNT, e vive solo qui dentro.
//
// Per ora c'è un solo indirizzo, /api/salute, che serve a rispondere a una
// domanda sola: "la chiave è a posto?". Le funzioni vere si appoggiano a
// questa base e si aggiungono qui sotto.

interface Richiesta { url?: string; method?: string }
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

/** Quello che sappiamo della chiave, senza mai stamparne un pezzo. */
async function statoDellaChiave() {
  const grezza = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!grezza) {
    return {
      chiave: 'manca',
      spiegazione: 'La variabile FIREBASE_SERVICE_ACCOUNT non è impostata su Vercel.'
    };
  }

  let credenziali: any;
  try {
    // Su Vercel si incolla il file JSON così com'è. Chi preferisce può
    // incollarlo in base64: si riconosce perché non comincia per graffa.
    const testo = grezza.trim().startsWith('{')
      ? grezza
      : Buffer.from(grezza, 'base64').toString('utf8');
    credenziali = JSON.parse(testo);
  } catch {
    return {
      chiave: 'non valida',
      spiegazione: 'La variabile c\'è ma non è un JSON leggibile: probabilmente è stata incollata a metà.'
    };
  }

  if (!credenziali.project_id || !credenziali.private_key || !credenziali.client_email) {
    return {
      chiave: 'non valida',
      spiegazione: 'Il JSON c\'è ma non è una chiave di servizio: mancano project_id, client_email o private_key.'
    };
  }

  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(credenziali) });
    }
    // La prova del nove: chiedere un token vero a Google. Se la chiave è stata
    // revocata o è di un altro progetto, è qui che si scopre.
    await admin.app().options.credential!.getAccessToken();
    return {
      chiave: 'a posto',
      progetto: credenziali.project_id,
      spiegazione: 'La chiave funziona: il server può scrivere sul database.'
    };
  } catch (err: any) {
    return {
      chiave: 'non valida',
      progetto: credenziali.project_id,
      spiegazione: `Google ha rifiutato la chiave: ${err?.message || 'motivo sconosciuto'}`
    };
  }
}

export default async function handler(req: Richiesta, res: Risposta) {
  const percorso = (req.url || '').split('?')[0];

  // Niente cache: queste risposte dicono com'è la situazione adesso.
  res.setHeader('Cache-Control', 'no-store');

  if (percorso === '/api/salute' || percorso === '/salute') {
    const stato = await statoDellaChiave();
    res.status(stato.chiave === 'a posto' ? 200 : 503).json({
      servizio: 'rosy',
      ora: new Date().toISOString(),
      ...stato
    });
    return;
  }

  res.status(404).json({
    errore: 'Questo indirizzo non esiste.',
    disponibili: ['/api/salute']
  });
}
