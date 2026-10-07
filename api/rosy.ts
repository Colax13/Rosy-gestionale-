// POST /api/rosy — una domanda a Rosy, l'assistente del gestionale.
//
// Il browser manda la conversazione; qui si controlla chi scrive, si leggono
// SOLO i dati del suo salone e si chiede all'IA: prima Gemini, poi, se è
// sovraccarico, le riserve gratuite Groq e OpenRouter. Le chiavi stanno su
// Vercel (GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY) e non arrivano
// mai al browser.
//
// Riservatezza: all'IA non arrivano telefoni, email e note delle clienti
// (vedi `Maschera` in _rosy.ts).
//
// Rosy non salva niente: se le si chiede un appuntamento risponde con una
// proposta, e il gestionale la salva quando si preme "Conferma".

process.env.TZ = 'Europe/Rome';

import { database, chiEntra, saloneDi } from './_firebase';
import { MODELLI_GEMINI, riserve, Riserva } from './_gemini';
import { richiestaPerOpenAI, rispostaDaOpenAI } from './_traduttore';
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


// Vercel chiude la funzione dopo 60 secondi: meglio rispondere prima con un
// errore chiaro che lasciare la chat appesa e poi muta.
const TEMPO_MASSIMO_MS = 50_000;
const TEMPO_PER_CHIAMATA_MS = 20_000;
/** Con le riserve accese, Gemini ha al massimo questo tempo: il resto è per loro. */
const TEMPO_GEMINI_CON_RISERVE_MS = 25_000;

/**
 * Quanto lasciar "ragionare" il modello prima di rispondere. Per leggere
 * un'agenda non serve: senza, risponde in pochi secondi invece che in trenta.
 * Ogni famiglia di modelli lo chiede a modo suo; se il fornitore rifiuta
 * un'impostazione si prova la successiva, e per ultimo nessuna.
 */
function ragionamentoPer(modello: string): (Record<string, any> | null)[] {
  if (/2\.5-flash/.test(modello)) return [{ thinkingBudget: 0 }, null];
  if (/gemini-3|latest/.test(modello)) return [{ thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, { thinkingBudget: 0 }, null];
  if (/gpt-oss/.test(modello)) return [{ reasoning_effort: 'low' }, null];
  return [null];
}

type Esito = { ok: boolean; stato: number; json: any };
const scaduto = (): Esito => ({ ok: false, stato: 504, json: { error: { message: 'tempo scaduto' } } });

type Fornitore = 'gemini' | Riserva['fornitore'];
type Scelta = { fornitore: Fornitore; modello: string; ragionamento: Record<string, any> | null };

/**
 * Il modello che ha funzionato. Resta finché il server è acceso: le domande
 * dopo la prima vanno dritte lì, senza tentativi a vuoto. Si dimentica solo
 * se il modello sparisce, non per un momento di traffico.
 */
let preferito: Scelta | null = null;

const rifiutaRagionamento = (e: Esito) => e.stato === 400 && /think|reasoning/i.test(e.json?.error?.message || '');
/** Il fornitore è sovraccarico: di solito passa in un attimo. */
const passeggero = (e: Esito) => e.stato === 500 || e.stato === 502 || e.stato === 503;
/**
 * Errori che dicono "questo modello no, adesso: prova un altro". Il limite
 * del piano gratuito (429) vale modello per modello, quindi anche lui; 413 è
 * Groq che trova la richiesta troppo lunga per il suo limite al minuto.
 */
const daCambiare = (e: Esito) =>
  passeggero(e) || e.stato === 404 || e.stato === 504 || e.stato === 429 || e.stato === 413 || rifiutaRagionamento(e);

const aspetta = (ms: number) => new Promise(r => setTimeout(r, ms));
const nomeScelta = (s: Scelta) => `${s.fornitore}/${s.modello} ${JSON.stringify(s.ragionamento)}`;

/**
 * L'IA per davvero. Prima il modello preferito, poi Gemini, poi le riserve
 * (Groq, OpenRouter): se un modello è sovraccarico si riprova una volta, poi
 * si passa al successivo; se non esiste più, ha finito le domande gratuite o
 * non risponde in tempo, subito al successivo. Tutti ricevono e restituiscono
 * il formato di Gemini: per le riserve traduce `_traduttore`.
 */
export function iaVera(chiaveGemini: string, partenza: number, elencoRiserve: Riserva[] = riserve()): ChiamaGemini {
  const limiteGemini = elencoRiserve.length ? TEMPO_GEMINI_CON_RISERVE_MS : TEMPO_MASSIMO_MS;

  const prova = async (corpoRichiesta: any, scelta: Scelta): Promise<Esito> => {
    const { fornitore, modello, ragionamento } = scelta;
    const resta = (fornitore === 'gemini' ? limiteGemini : TEMPO_MASSIMO_MS) - (Date.now() - partenza);
    if (resta < 4000) return scaduto();

    let url: string, intestazioni: Record<string, string>, corpo: any;
    if (fornitore === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modello)}:generateContent`;
      intestazioni = { 'x-goog-api-key': chiaveGemini };
      corpo = ragionamento
        ? { ...corpoRichiesta, generationConfig: { ...corpoRichiesta.generationConfig, thinkingConfig: ragionamento } }
        : corpoRichiesta;
    } else {
      const r = elencoRiserve.find(x => x.fornitore === fornitore)!;
      url = r.url;
      intestazioni = { Authorization: `Bearer ${r.chiave}`, ...r.intestazioni };
      corpo = richiestaPerOpenAI(corpoRichiesta, modello, ragionamento);
    }

    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), Math.min(TEMPO_PER_CHIAMATA_MS, resta));
    const inizio = Date.now();
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...intestazioni },
        body: JSON.stringify(corpo),
        signal: stop.signal
      });
      const grezzo: any = await r.json().catch(() => ({}));
      const messaggio = grezzo?.error?.message || (typeof grezzo?.error === 'string' ? grezzo.error : '');
      console.log(`Rosy: ${nomeScelta(scelta)} ha risposto ${r.status} in ${Date.now() - inizio} ms${r.ok ? '' : ` — ${messaggio}`}`);
      if (!r.ok) return { ok: false, stato: r.status, json: { error: { message: messaggio, fornitore } } };
      return { ok: true, stato: r.status, json: fornitore === 'gemini' ? grezzo : rispostaDaOpenAI(grezzo) };
    } catch (err: any) {
      console.error(`Rosy: ${nomeScelta(scelta)} non ha risposto in tempo (${Date.now() - inizio} ms)`, err?.name || err);
      return { ...scaduto(), json: { error: { message: 'tempo scaduto', fornitore } } };
    } finally {
      clearTimeout(timer);
    }
  };

  /** Una scelta, con un secondo tentativo se il fornitore è solo sovraccarico. */
  const provaConPazienza = async (corpo: any, scelta: Scelta): Promise<Esito> => {
    const esito = await prova(corpo, scelta);
    if (!passeggero(esito)) return esito;
    await aspetta(800);
    return prova(corpo, scelta);
  };

  // Per i giri successivi della stessa domanda: quello che ha appena risposto.
  let quiBuono: Scelta | null = null;
  const stessa = (a: Scelta, b: Scelta) =>
    a.fornitore === b.fornitore && a.modello === b.modello && JSON.stringify(a.ragionamento) === JSON.stringify(b.ragionamento);

  return async (corpoRichiesta) => {
    const tutte: Scelta[] = [];
    if (chiaveGemini) {
      MODELLI_GEMINI().forEach(modello =>
        ragionamentoPer(modello).forEach(ragionamento => tutte.push({ fornitore: 'gemini', modello, ragionamento })));
    }
    elencoRiserve.forEach(r =>
      ragionamentoPer(r.modello).forEach(ragionamento => tutte.push({ fornitore: r.fornitore, modello: r.modello, ragionamento })));

    const candidati: Scelta[] = [];
    const aggiungi = (c: Scelta | null) => {
      if (c && tutte.some(x => stessa(x, c)) && !candidati.some(x => stessa(x, c))) candidati.push(c);
    };
    aggiungi(quiBuono);
    aggiungi(preferito);
    tutte.forEach(aggiungi);
    // Se a metà domanda ha già risposto una riserva, non si torna a Gemini:
    // Gemini vuole le sue "firme" sui passaggi precedenti, e non le troverebbe.
    const lista = quiBuono && quiBuono.fornitore !== 'gemini'
      ? candidati.filter(c => c.fornitore !== 'gemini')
      : candidati;

    let ultima: Esito = scaduto();
    const saltati = new Set<string>();
    // Se si è arrivati a una riserva solo per un momento di traffico, la
    // riserva non diventa la preferita: la prossima domanda riprova il primo.
    let perTraffico = false;
    for (const scelta of lista) {
      const chi = `${scelta.fornitore}/${scelta.modello}`;
      // Un modello sparito o sovraccarico non si riprova con un'altra impostazione.
      if (saltati.has(chi)) continue;
      ultima = await provaConPazienza(corpoRichiesta, scelta);
      if (ultima.ok) {
        quiBuono = scelta;
        if (!preferito && !perTraffico) preferito = scelta;
        return ultima;
      }
      if (!daCambiare(ultima)) return ultima;
      if (rifiutaRagionamento(ultima)) {
        if (preferito && stessa(preferito, scelta)) preferito = null;
        continue;
      }
      if (ultima.stato === 404 && preferito && `${preferito.fornitore}/${preferito.modello}` === chi) preferito = null;
      if (ultima.stato !== 404) perTraffico = true;
      saltati.add(chi);
      if (TEMPO_MASSIMO_MS - (Date.now() - partenza) < 4000) return ultima;
    }
    return ultima;
  };
}

/** Il nome del salone, letto una volta ogni tanto come il resto. */
async function nomeDelSalone(salonId: string): Promise<string> {
  const [scheda] = await ricordato(`${salonId}:salone`, async () =>
    [((await database().collection('salons').doc(salonId).get()).data() as any) || {}]);
  return scheda?.salonDetails?.nomeSalone || 'il salone';
}

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  const partenza = Date.now();
  const chiave = (process.env.GEMINI_API_KEY || '').trim();
  if (!chiave && !riserve().length) {
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
    const { storia, riscalda } = corpo(req);
    const salonId = await saloneDi(chi.uid);
    const nomeSalone = await nomeDelSalone(salonId);
    const dati = datiDelSalone(salonId, nomeSalone);

    // Appena si apre la chat: il server si sveglia e legge in anticipo quello
    // che serve, così la prima domanda non aspetta il database.
    if (riscalda) {
      await Promise.all([dati.servizi(), dati.operatrici(), dati.clienti()]);
      console.log(`Rosy: pronta in ${Date.now() - partenza} ms`);
      res.status(200).json({ pronta: true });
      return;
    }

    const messaggi: MessaggioChat[] = Array.isArray(storia)
      ? storia
          .filter((m: any) => m && (m.ruolo === 'utente' || m.ruolo === 'rosy') && typeof m.testo === 'string')
          .map((m: any) => ({ ruolo: m.ruolo, testo: m.testo }))
      : [];

    const risposta = await chiediARosy(messaggi, dati, iaVera(chiave, partenza));
    console.log(`Rosy: risposta pronta in ${Date.now() - partenza} ms`);
    res.status(200).json(risposta);
  } catch (err: any) {
    if (err instanceof ErroreGemini) {
      console.error('Rosy: l\'IA ha rifiutato', err.fornitore, err.stato, err.dettaglio);
      res.status(502).json({ errore: spiegaErroreGemini(err), stato_ia: err.stato, fornitore: err.fornitore });
      return;
    }
    if (err?.message === 'accesso-sospeso') {
      res.status(403).json({ errore: 'Il tuo accesso al salone è sospeso.' });
      return;
    }
    console.error('Rosy: errore', err);
    res.status(500).json({ errore: `Rosy non è riuscita a rispondere: ${err?.message || 'errore sconosciuto'}` });
  }
}
