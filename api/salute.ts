// GET /api/salute — la spia del server.
//
// Si apre nel browser e risponde a una domanda sola: le chiavi sono a posto?
// Non mostra mai una chiave né un pezzo di essa: dice solo se funzionano.

import { credenziali, firebase } from './_firebase';
import { MODELLI_GEMINI, riserve, Riserva } from './_gemini';

/**
 * Rosy (Gemini): la chiave c'è, e Google la accetta? Si chiede solo la scheda
 * del modello, che non consuma domande del piano gratuito.
 */
async function statoGemini(): Promise<string> {
  const chiave = (process.env.GEMINI_API_KEY || '').trim();
  if (!chiave) return 'spenta (manca GEMINI_API_KEY)';
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 8000);
  try {
    let ultimo = '';
    for (const modello of MODELLI_GEMINI()) {
      const inizio = Date.now();
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modello)}`, {
        headers: { 'x-goog-api-key': chiave },
        signal: stop.signal
      });
      if (r.ok) return `a posto (${modello}, ${Date.now() - inizio} ms)`;
      const dati: any = await r.json().catch(() => ({}));
      ultimo = `${modello}: ${r.status} ${dati?.error?.message || ''}`.trim();
      if (r.status !== 404) break;
    }
    return `non funziona — ${ultimo}`;
  } catch {
    return 'Google non risponde (più di 8 secondi)';
  } finally {
    clearTimeout(timer);
  }
}

interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

/**
 * Le riserve (Groq, OpenRouter): la chiave è accettata e il modello scelto
 * c'è ancora? Si leggono solo gli elenchi dei modelli, che non consumano
 * domande gratuite.
 */
async function statoRiserva(r: Riserva): Promise<string> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 8000);
  try {
    const base = r.fornitore === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://openrouter.ai/api/v1';
    const intestazioni = { Authorization: `Bearer ${r.chiave}` };
    if (r.fornitore === 'openrouter') {
      // L'elenco dei modelli di OpenRouter è pubblico: la chiave si prova a parte.
      const k = await fetch(`${base}/key`, { headers: intestazioni, signal: stop.signal });
      if (!k.ok) return `non funziona — la chiave è rifiutata (${k.status})`;
    }
    const m = await fetch(`${base}/models`, { headers: intestazioni, signal: stop.signal });
    if (!m.ok) return `non funziona — ${m.status}`;
    const dati: any = await m.json().catch(() => ({}));
    const presente = (dati.data || []).some((x: any) => x?.id === r.modello);
    return presente ? `a posto (${r.modello})` : `chiave a posto, ma il modello ${r.modello} non c'è più: cambialo su Vercel`;
  } catch {
    return 'non risponde (più di 8 secondi)';
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(_req: unknown, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  // Com'è messa l'email, che è indipendente da Firebase.
  const email = !process.env.RESEND_API_KEY
    ? 'spenta'
    : (process.env.MITTENTE_EMAIL ? 'a posto' : 'manca il mittente');

  const sms =
    (process.env.SKEBBY_USER && process.env.SKEBBY_PASSWORD) ? 'a posto (Skebby)'
    : process.env.TRACCAR_SMS_TOKEN ? 'a posto (tablet con Traccar)'
    : (process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD) ? 'a posto (tablet con SMS Gateway)'
    : 'spento';

  const promemoria = process.env.CRON_SECRET ? 'acceso' : 'spento (manca CRON_SECRET)';

  const buoniDalFoglio = process.env.BUONI_FOGLIO_ID ? 'acceso' : 'spento (manca BUONI_FOGLIO_ID)';

  const elencoRiserve = riserve();
  const [gemini, ...statiRiserve] = await Promise.all([statoGemini(), ...elencoRiserve.map(statoRiserva)]);
  const rosyRiserve = Object.fromEntries([
    ['groq', process.env.GROQ_API_KEY ? '' : 'spenta (manca GROQ_API_KEY)'],
    ['openrouter', process.env.OPENROUTER_API_KEY ? '' : 'spenta (manca OPENROUTER_API_KEY)']
  ].map(([nome, spenta]) => {
    const i = elencoRiserve.findIndex(r => r.fornitore === nome);
    return [nome, i >= 0 ? statiRiserve[i] : spenta];
  }));

  const base = { servizio: 'rosy', ora: new Date().toISOString(), email, sms, promemoria, buoni_dal_foglio: buoniDalFoglio, rosy_ia: gemini, rosy_ia_riserve: rosyRiserve };

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    res.status(503).json({
      ...base,
      chiave: 'manca',
      spiegazione: 'La variabile FIREBASE_SERVICE_ACCOUNT non è impostata su Vercel.'
    });
    return;
  }

  const dati = credenziali();
  if (!dati) {
    res.status(503).json({
      ...base,
      chiave: 'non valida',
      spiegazione: "La variabile c'è ma non è una chiave di servizio leggibile: probabilmente è stata incollata a metà, o è il file sbagliato."
    });
    return;
  }

  try {
    // La prova del nove: chiedere un token vero a Google. Se la chiave è stata
    // revocata o è di un altro progetto, è qui che si scopre.
    await firebase().options.credential!.getAccessToken();
    res.status(200).json({
      ...base,
      chiave: 'a posto',
      progetto: dati.project_id,
      spiegazione: 'La chiave funziona: il server può leggere e scrivere sul database.'
    });
  } catch (err: any) {
    res.status(503).json({
      ...base,
      chiave: 'non valida',
      progetto: dati.project_id,
      spiegazione: `Google ha rifiutato la chiave: ${err?.message || 'motivo sconosciuto'}`
    });
  }
}
