// POST /api/rosy — una domanda a Rosy, l'assistente del gestionale.
//
// Il browser manda la conversazione; qui si controlla chi scrive, si leggono
// SOLO i dati del suo salone e si chiede a Gemini. La chiave di Gemini sta su
// Vercel (GEMINI_API_KEY) e non arriva mai al browser.
//
// Rosy non salva niente: se le si chiede un appuntamento risponde con una
// proposta, e il gestionale la salva quando si preme "Conferma".

process.env.TZ = 'Europe/Rome';

import { database, chiEntra, saloneDi } from './_firebase';
import { chiediARosy, ErroreGemini, spiegaErroreGemini, Dati, MessaggioChat, ChiamaGemini } from './_rosy';

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

// Clienti, listino e operatrici cambiano di rado: si tengono a mente qualche
// minuto, così una conversazione non rilegge la rubrica a ogni domanda.
const MEMORIA_MS = 5 * 60 * 1000;
const memoria = new Map<string, { quando: number; dati: any[] }>();

async function ricordato(chiave: string, leggi: () => Promise<any[]>): Promise<any[]> {
  const c = memoria.get(chiave);
  if (c && Date.now() - c.quando < MEMORIA_MS) return c.dati;
  const dati = await leggi();
  memoria.set(chiave, { quando: Date.now(), dati });
  return dati;
}

function datiDelSalone(salonId: string, nomeSalone: string): Dati {
  const db = database();
  const tutti = async (collezione: string) =>
    (await db.collection(collezione).where('userId', '==', salonId).get())
      .docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  return {
    nomeSalone,
    servizi: () => ricordato(`${salonId}:catalogo`, () => tutti('catalogo')),
    operatrici: () => ricordato(`${salonId}:dipendenti`, () => tutti('dipendenti')),
    clienti: () => ricordato(`${salonId}:clienti`, () => tutti('clienti')),
    appuntamenti: async (daIso, aIso) =>
      (await db.collection('appuntamenti')
        .where('userId', '==', salonId)
        .where('data_ora', '>=', daIso)
        .where('data_ora', '<=', aIso)
        .get()).docs.map(d => ({ id: d.id, ...(d.data() as any) })),
    appuntamentiCliente: async (idCliente) =>
      (await db.collection('appuntamenti')
        .where('userId', '==', salonId)
        .where('id_cliente', '==', idCliente)
        .get()).docs.map(d => ({ id: d.id, ...(d.data() as any) }))
  };
}

/** Gemini per davvero. Se il modello scelto non esiste più si prova il successivo. */
function geminiVero(chiave: string): ChiamaGemini {
  const modelli = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash']
    .filter((m, i, l): m is string => !!m && l.indexOf(m) === i);
  return async (corpoRichiesta) => {
    let ultima = { ok: false, stato: 500, json: {} as any };
    for (const modello of modelli) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modello)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chiave },
          body: JSON.stringify(corpoRichiesta)
        }
      );
      ultima = { ok: r.ok, stato: r.status, json: await r.json().catch(() => ({})) };
      if (r.status !== 404) return ultima;
    }
    return ultima;
  };
}

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  const chiave = (process.env.GEMINI_API_KEY || '').trim();
  if (!chiave) {
    res.status(503).json({ errore: 'Rosy non è ancora accesa: manca GEMINI_API_KEY su Vercel.' });
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

  try {
    const { storia } = corpo(req);
    const messaggi: MessaggioChat[] = Array.isArray(storia)
      ? storia
          .filter((m: any) => m && (m.ruolo === 'utente' || m.ruolo === 'rosy') && typeof m.testo === 'string')
          .map((m: any) => ({ ruolo: m.ruolo, testo: m.testo }))
      : [];

    const salonId = await saloneDi(chi.uid);
    const scheda = (await database().collection('salons').doc(salonId).get()).data() as any;
    const nomeSalone = scheda?.salonDetails?.nomeSalone || 'il salone';

    const risposta = await chiediARosy(messaggi, datiDelSalone(salonId, nomeSalone), geminiVero(chiave));
    res.status(200).json(risposta);
  } catch (err: any) {
    if (err instanceof ErroreGemini) {
      console.error('Rosy: Gemini ha rifiutato', err.stato, err.dettaglio);
      res.status(502).json({ errore: spiegaErroreGemini(err) });
      return;
    }
    if (err?.message === 'accesso-sospeso') {
      res.status(403).json({ errore: 'Il tuo accesso al salone è sospeso.' });
      return;
    }
    console.error('Rosy: errore', err);
    res.status(500).json({ errore: 'Rosy non è riuscita a rispondere: riprova fra poco.' });
  }
}
