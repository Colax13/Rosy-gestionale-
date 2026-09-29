// POST /api/messaggi — manda alla cliente la conferma o il promemoria.
//
// Chi chiama deve dimostrare chi è: il browser allega il tesserino di Firebase,
// e qui si controlla che sia vero e che quell'appuntamento sia davvero del suo
// salone. Senza, chiunque potrebbe far partire messaggi a nome del salone.

import { database, chiEntra, saloneDi } from './_firebase';
import { TipoMessaggio } from './_messaggi';
import { mandaPerAppuntamento } from './_invio';

interface Richiesta {
  method?: string;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
}
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

/** Il corpo, che Vercel a volte consegna già aperto e a volte no. */
function corpo(req: Richiesta): any {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

const intestazione = (req: Richiesta, nome: string): string => {
  const v = req.headers?.[nome] ?? req.headers?.[nome.toLowerCase()];
  return Array.isArray(v) ? v[0] : (v || '');
};

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  try {
    const { appuntamentoId, tipo } = corpo(req);
    const quale: TipoMessaggio = tipo === 'promemoria' ? 'promemoria' : 'conferma';

    if (!appuntamentoId || typeof appuntamentoId !== 'string') {
      res.status(400).json({ errore: "Manca il numero dell'appuntamento." });
      return;
    }

    let chi;
    try {
      chi = await chiEntra(intestazione(req, 'authorization'));
    } catch (err: any) {
      const senzaChiave = err?.message === 'chiave-mancante';
      res.status(senzaChiave ? 503 : 401).json({
        errore: senzaChiave
          ? 'Il server non è ancora configurato: manca FIREBASE_SERVICE_ACCOUNT.'
          : 'Questa richiesta non è riconosciuta: esci e rientra nel programma.'
      });
      return;
    }

    const db = database();
    const salone = await saloneDi(chi.uid);

    const appuntamento = await db.collection('appuntamenti').doc(appuntamentoId).get();
    // Se non è del suo salone si risponde "non esiste", non "non è tuo": chi
    // prova a indovinare numeri di appuntamento non deve imparare niente.
    if (!appuntamento.exists || (appuntamento.data() as any).userId !== salone) {
      res.status(404).json({ errore: 'Questo appuntamento non esiste più.' });
      return;
    }
    const app = appuntamento.data() as any;

    const risultato = await mandaPerAppuntamento(db, appuntamentoId, app, quale);

    // 202 = ricevuto, ma non è partito niente (manca una chiave, o la cliente
    // non ha lasciato né numero né indirizzo). Non è un errore: è una cosa da
    // dire, perché c'è una persona che aspetta una risposta.
    res.status(risultato.mandato ? 200 : 202).json(risultato);
  } catch (err: any) {
    console.error('Errore mandando il messaggio:', err);
    res.status(500).json({ errore: 'Qualcosa è andato storto lato server.', dettaglio: err?.message || '' });
  }
}
