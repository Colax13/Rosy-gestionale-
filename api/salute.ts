// GET /api/salute — la spia del server.
//
// Si apre nel browser e risponde a una domanda sola: le chiavi sono a posto?
// Non mostra mai una chiave né un pezzo di essa: dice solo se funzionano.

import { credenziali, firebase } from './_firebase';

interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

export default async function handler(_req: unknown, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  // Com'è messa l'email, che è indipendente da Firebase.
  const email = !process.env.RESEND_API_KEY
    ? 'spenta'
    : (process.env.MITTENTE_EMAIL ? 'a posto' : 'manca il mittente');

  const sms = (process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD)
    ? 'a posto'
    : 'spento';

  const base = { servizio: 'rosy', ora: new Date().toISOString(), email, sms };

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
