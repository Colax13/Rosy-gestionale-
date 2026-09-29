// GET /api/promemoria — il giro dei promemoria, una volta al giorno.
//
// Non lo chiama nessuno a mano: lo fa partire Vercel all'ora scritta in
// vercel.json (sotto "crons"). Trova gli appuntamenti confermati di domani e
// manda a ciascuna cliente il promemoria, per SMS e — se c'è — per email.
//
// È protetto da una parola segreta (CRON_SECRET su Vercel): Vercel la allega
// da sé quando lo chiama. Senza, chiunque conoscesse l'indirizzo potrebbe far
// partire un giro di SMS a tutte le clienti.

import { database } from './_firebase';
import { mandaPerAppuntamento } from './_invio';
import { sceltaPromemoria, Candidato } from './_promemoria';

interface Richiesta { headers?: Record<string, string | string[] | undefined> }
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

/** Quanti messaggi insieme. Pochi, perché il telefono li manda uno alla volta comunque. */
const INSIEME = 5;

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  const segreto = process.env.CRON_SECRET;
  if (!segreto) {
    res.status(503).json({ errore: 'Manca CRON_SECRET su Vercel: il giro dei promemoria è spento.' });
    return;
  }
  const arrivato = req.headers?.authorization ?? req.headers?.Authorization;
  if ((Array.isArray(arrivato) ? arrivato[0] : arrivato) !== `Bearer ${segreto}`) {
    res.status(401).json({ errore: 'Non autorizzato.' });
    return;
  }

  try {
    const db = database();
    const adesso = new Date();

    // Si guarda un po' più in là di domani (60 ore) e poi si sceglie a mano il
    // giorno giusto: il calendario del salone e quello del server non
    // coincidono, e così non si perde nessuno a cavallo della mezzanotte.
    const fine = new Date(adesso.getTime() + 60 * 60 * 60 * 1000);
    const trovati = await db.collection('appuntamenti')
      .where('data_ora', '>=', adesso.toISOString())
      .where('data_ora', '<', fine.toISOString())
      .get();

    const candidati: Candidato[] = trovati.docs.map(d => ({ id: d.id, dati: d.data() }));
    const scelta = sceltaPromemoria(candidati, adesso);

    const memoriaSaloni = new Map<string, any>();
    const esiti: { id: string; mandato: boolean; motivo?: string }[] = [];

    for (let i = 0; i < scelta.daMandare.length; i += INSIEME) {
      const gruppo = scelta.daMandare.slice(i, i + INSIEME);
      const risultati = await Promise.all(gruppo.map(async c => {
        try {
          const r = await mandaPerAppuntamento(db, c.id, c.dati, 'promemoria', memoriaSaloni);
          return { id: c.id, mandato: r.mandato, motivo: r.motivo };
        } catch (err: any) {
          return { id: c.id, mandato: false, motivo: err?.message || 'errore sconosciuto' };
        }
      }));
      esiti.push(...risultati);
    }

    const mandati = esiti.filter(e => e.mandato).length;
    console.log(`Promemoria per il ${scelta.domani}: ${mandati} mandati su ${scelta.daMandare.length}.`);

    res.status(200).json({
      domani: scelta.domani,
      daMandare: scelta.daMandare.length,
      mandati,
      nonPartiti: esiti.filter(e => !e.mandato),
      saltati: scelta.saltati
    });
  } catch (err: any) {
    if (err?.message === 'chiave-mancante') {
      res.status(503).json({ errore: 'Manca FIREBASE_SERVICE_ACCOUNT su Vercel: senza, il server non legge gli appuntamenti.' });
      return;
    }
    console.error('Errore nel giro dei promemoria:', err);
    res.status(500).json({ errore: 'Il giro dei promemoria si è fermato.', dettaglio: err?.message || '' });
  }
}
