// POST /api/admin — il pannello di chi gestisce Rosy.
//
// Due azioni: `elenco` (tutti i saloni con piano, funzioni e consumi del mese)
// e `salva` (cambia l'abbonamento di un salone). Qui passa tutto quello che un
// titolare NON deve poter fare da solo: accendersi una funzione, darsi un
// piano, alzarsi gli SMS compresi.
//
// Chi entra: solo gli indirizzi scritti su Vercel in ADMIN_EMAILS (separati
// da virgola), e solo se l'indirizzo è verificato — cioè con l'accesso Google.
// Senza la variabile il pannello è chiuso per tutti.

import { firebase, database } from './_firebase';
import { FieldValue } from 'firebase-admin/firestore';
import {
  COLLEZIONE_ABBONAMENTI, COLLEZIONE_CONSUMI_SMS, FUNZIONI_ACCENDIBILI, PIANI,
  leggiAbbonamento, leggiConsumoSms, leggiAmministratori, eAmministratore, smsInclusi
} from '../salone-app/frontend/lib/abbonamento';
import { meseDi } from '../salone-app/frontend/lib/consumi-ia';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';

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

const aIso = (v: any): string | null => {
  try {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
};

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  const amministratori = leggiAmministratori(process.env.ADMIN_EMAILS);
  if (!amministratori.length) {
    res.status(503).json({ errore: 'Il pannello non è acceso: manca ADMIN_EMAILS su Vercel.' });
    return;
  }

  // Chi chiama, controllato davvero: serve anche sapere se l'indirizzo è
  // verificato, quindi il tesserino si legge qui per intero.
  let chi: { uid: string; email: string; verificata: boolean };
  try {
    const token = intestazione(req, 'authorization').replace(/^Bearer\s+/i, '').trim();
    if (!token) throw new Error('senza-tesserino');
    const dati = await firebase().auth().verifyIdToken(token);
    chi = { uid: dati.uid, email: dati.email || '', verificata: dati.email_verified === true };
  } catch (err: any) {
    const senzaChiave = err?.message === 'chiave-mancante';
    res.status(senzaChiave ? 503 : 401).json({
      errore: senzaChiave
        ? 'Il server non è ancora configurato: manca FIREBASE_SERVICE_ACCOUNT.'
        : 'Questa richiesta non è riconosciuta: esci e rientra nel programma.'
    });
    return;
  }

  if (!eAmministratore(chi.email, chi.verificata, amministratori)) {
    res.status(403).json({ errore: 'Questa pagina è riservata a chi gestisce Rosy.' });
    return;
  }

  try {
    const richiesta = corpo(req);
    const db = database();

    if (richiesta.azione === 'salva') {
      const salonId = String(richiesta.salonId || '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(salonId)) {
        res.status(400).json({ errore: 'Salone non valido.' });
        return;
      }
      const salone = await db.collection('salons').doc(salonId).get();
      if (!salone.exists) {
        res.status(404).json({ errore: 'Questo salone non esiste.' });
        return;
      }
      // Si riscrive tutto l'abbonamento, rimesso in forma: quello che non è
      // un campo conosciuto non entra nel database.
      const pulito = leggiAbbonamento(richiesta.abbonamento);
      const funzioni: Record<string, boolean> = {};
      FUNZIONI_ACCENDIBILI.forEach(f => { funzioni[f.chiave] = pulito.funzioni[f.chiave] === true; });
      const daSalvare = {
        userId: salonId,
        piano: pulito.piano,
        funzioni,
        sms_inclusi: pulito.sms_inclusi,
        note: pulito.note,
        aggiornato: new Date().toISOString(),
        aggiornato_da: chi.email,
        scritto: FieldValue.serverTimestamp()
      };
      await db.collection(COLLEZIONE_ABBONAMENTI).doc(salonId).set(daSalvare);
      console.log(`Pannello: ${chi.email} ha cambiato l'abbonamento di ${salonId} → ${pulito.piano}, ${JSON.stringify(funzioni)}`);
      res.status(200).json({ salvato: true, abbonamento: leggiAbbonamento(daSalvare) });
      return;
    }

    if (richiesta.azione === 'elenco') {
      const mese = meseDi();
      const [saloni, abbonamenti, sms, ia] = await Promise.all([
        db.collection('salons').get(),
        db.collection(COLLEZIONE_ABBONAMENTI).get(),
        db.collection(COLLEZIONE_CONSUMI_SMS).where('mese', '==', mese).get(),
        db.collection('consumi_ia').where('mese', '==', mese).get()
      ]);
      const perSalone = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) =>
        new Map(docs.map(d => [String((d.data() as any).userId || ''), d.data() as any]));
      const abbonamentoDi = new Map(abbonamenti.docs.map(d => [d.id, d.data()]));
      const smsDi = perSalone(sms.docs);
      const iaDi = perSalone(ia.docs);

      const elenco = saloni.docs.map(d => {
        const s = d.data() as any;
        const abbonamento = leggiAbbonamento(abbonamentoDi.get(d.id));
        const email = s.ownerEmail || '';
        return {
          id: d.id,
          nome: s.salonDetails?.nomeSalone || '',
          email,
          creato: aIso(s.createdAt),
          abbonamento,
          sms_inclusi: smsInclusi(abbonamento),
          sms: leggiConsumoSms(smsDi.get(d.id), mese),
          domande_ia: Number(iaDi.get(d.id)?.domande) || 0,
          // Le funzioni che questo salone ha perché il suo indirizzo è scritto
          // nel codice: nel pannello si vedono, ma da lì non si spengono.
          fisse: {
            buoni: funzioneAccesa('buoni', email),
            messaggi_automatici: funzioneAccesa('messaggi_automatici', email)
          }
        };
      }).sort((a, b) => (b.creato || '').localeCompare(a.creato || ''));

      res.status(200).json({ mese, saloni: elenco, piani: PIANI, chi: chi.email });
      return;
    }

    res.status(400).json({ errore: 'Azione non riconosciuta.' });
  } catch (err: any) {
    console.error('Pannello: errore', err);
    res.status(500).json({ errore: `Il pannello non è riuscito a rispondere: ${err?.message || 'errore sconosciuto'}` });
  }
}
