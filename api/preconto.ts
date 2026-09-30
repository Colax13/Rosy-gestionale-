// POST /api/preconto — dà il numero progressivo a un preconto che si stampa.
//
// Il contatore sta sul server e non nel browser per una ragione sola: due
// persone che stampano nello stesso momento non devono prendere lo stesso
// numero, e nessuno deve poterlo cambiare a mano. Qui il numero si prende
// dentro una transazione: o si scrive tutto, o niente.
//
// Se lo stesso preconto si ristampa, torna il numero che aveva già: ristampare
// non consuma numeri.

import { FieldValue } from 'firebase-admin/firestore';
import { database, chiEntra, saloneDi } from './_firebase';
import { prossimoNumero, NumeroPreconto } from './_numerazione';
import { orologioDelSalone } from '../salone-app/frontend/lib/messaggi';

interface Richiesta { method?: string; body?: any; headers?: Record<string, string | string[] | undefined> }
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

const corpo = (req: Richiesta): any => {
  if (!req.body) return {};
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return req.body;
};

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');
  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  try {
    const { appuntamentoId } = corpo(req);
    if (!appuntamentoId || typeof appuntamentoId !== 'string') {
      res.status(400).json({ errore: "Manca il numero dell'appuntamento." });
      return;
    }

    const auth = req.headers?.authorization;
    const chi = await chiEntra(Array.isArray(auth) ? auth[0] : auth);
    const salone = await saloneDi(chi.uid);
    const db = database();

    const rifApp = db.collection('appuntamenti').doc(appuntamentoId);
    const rifContatore = db.collection('contatori').doc(salone);
    const anno = orologioDelSalone(new Date()).anno;

    const numero = await db.runTransaction(async tx => {
      const app = await tx.get(rifApp);
      const dati = app.data() as any;
      if (!app.exists || dati?.userId !== salone) throw new Error('non-trovato');

      // Già stampato una volta: si ridà lo stesso numero.
      if (dati.preconto_numero?.numero) return dati.preconto_numero as NumeroPreconto;

      const contatore = (await tx.get(rifContatore)).data() as any;
      const nuovo = prossimoNumero(contatore?.preconto, anno);

      tx.set(rifContatore, { preconto: { anno: nuovo.anno, ultimo: nuovo.numero } }, { merge: true });
      tx.update(rifApp, { preconto_numero: nuovo, updatedAt: FieldValue.serverTimestamp() });
      return nuovo;
    });

    res.status(200).json(numero);
  } catch (err: any) {
    const messaggio = err?.message || '';
    if (messaggio === 'non-trovato') { res.status(404).json({ errore: 'Questo appuntamento non esiste più.' }); return; }
    if (messaggio === 'chiave-mancante') { res.status(503).json({ errore: 'Il server non è configurato: manca FIREBASE_SERVICE_ACCOUNT.' }); return; }
    if (messaggio === 'senza-tesserino' || /token/i.test(messaggio)) { res.status(401).json({ errore: 'Esci e rientra nel programma.' }); return; }
    console.error('Errore nel numero del preconto:', err);
    res.status(500).json({ errore: 'Non sono riuscito a dare il numero al preconto.', dettaglio: messaggio });
  }
}
