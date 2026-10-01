// POST /api/messaggi — manda alla cliente la conferma o il promemoria.
//
// Chi chiama deve dimostrare chi è: il browser allega il tesserino di Firebase,
// e qui si controlla che sia vero e che quell'appuntamento sia davvero del suo
// salone. Senza, chiunque potrebbe far partire messaggi a nome del salone.

import { database, chiEntra, saloneDi } from './_firebase';
import { TipoMessaggio, mandaSms } from './_messaggi';
import { mandaPerAppuntamento, schedaSalone } from './_invio';
import { postinoDelSalone, gettoneValido, COLLEZIONE_SEGRETI } from './_postino';

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

async function impostazioniSms(
  azione: string, dati: any, db: FirebaseFirestore.Firestore, salone: string, titolare: boolean, res: Risposta
) {
  const rif = db.collection(COLLEZIONE_SEGRETI).doc(salone);
  const scheda = await schedaSalone(db, salone);

  if (azione === 'stato') {
    const postino = await postinoDelSalone(db, salone, scheda.ownerEmail);
    res.status(200).json({
      collegato: !!postino,
      // "salone" = collegato da Impostazioni; "vercel" = chiavi messe a mano.
      origine: postino?.origine || null,
      tipo: postino?.tipo || null
    });
    return;
  }

  // Collegare e scollegare il telefono è roba da titolare: decide da quale
  // numero partono i messaggi a tutte le clienti.
  if (!titolare) { res.status(403).json({ errore: 'Solo la titolare può collegare il telefono degli SMS.' }); return; }

  if (azione === 'collega') {
    const gettone = String(dati?.gettone || '').trim();
    if (!gettoneValido(gettone)) {
      res.status(400).json({ errore: 'Il gettone non sembra giusto: copialo di nuovo dall\'app, tutto intero, senza spazi.' });
      return;
    }
    await rif.set({ traccarToken: gettone, aggiornato: new Date().toISOString() });
    res.status(200).json({ collegato: true, origine: 'salone', tipo: 'traccar' });
    return;
  }

  if (azione === 'scollega') {
    await rif.delete();
    res.status(200).json({ collegato: false });
    return;
  }

  // azione === 'prova': un SMS vero, e indietro tutto quello che ha risposto
  // chi doveva consegnarlo. È il modo di vedere dove si ferma il messaggio.
  const postino = await postinoDelSalone(db, salone, scheda.ownerEmail);
  const nome = scheda.dettagli?.nomeSalone || 'Il salone';
  const testo = `${nome}: messaggio di prova dal gestionale. Se lo leggi, gli SMS alle clienti funzionano.`;
  const esito = await mandaSms(String(dati?.telefono || ''), { oggetto: '', testo, html: '', sms: testo }, postino);
  res.status(200).json(esito);
}

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');

  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  try {
    const { appuntamentoId, tipo, azione: azioneRichiesta } = corpo(req);
    const quale: TipoMessaggio = tipo === 'promemoria' ? 'promemoria' : 'conferma';
    const soloImpostazioni = ['stato', 'collega', 'scollega', 'prova'].includes(azioneRichiesta);

    if (!soloImpostazioni && (!appuntamentoId || typeof appuntamentoId !== 'string')) {
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

    // --- Il telefono del salone per gli SMS ---------------------------------
    // Stato, collegamento e prova. Il gettone si scrive da qui e non dal
    // browser, e non torna mai indietro: chi apre Impostazioni vede solo se è
    // collegato o no.
    const { azione } = corpo(req);
    if (azione === 'stato' || azione === 'collega' || azione === 'scollega' || azione === 'prova') {
      await impostazioniSms(azione, corpo(req), db, salone, salone === chi.uid, res);
      return;
    }

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
