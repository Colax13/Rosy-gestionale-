// POST /api/prenota — la prenotazione dal sito, con la verifica del numero.
//
// Prima la pagina pubblica scriveva l'appuntamento direttamente nel database.
// Adesso passa di qui, in due tempi:
//
//   1. { azione: "codice" }  → se il salone ha gli SMS accesi, manda un codice
//                               di 6 cifre al numero della cliente;
//   2. { azione: "prenota" } → controlla il codice e, solo se è giusto, scrive
//                               l'appuntamento.
//
// Il controllo sta qui e non nel browser apposta: un controllo nel browser si
// salta scrivendo direttamente nel database. Da qui non si passa.
//
// Una scelta voluta: se il tablet è spento e l'SMS non parte, la cliente
// prenota lo stesso, e l'appuntamento resta segnato come "numero non
// verificato". Perdere una cliente per colpa di un tablet scarico sarebbe
// peggio di una prenotazione da controllare.

import { FieldValue } from 'firebase-admin/firestore';
import { database } from './_firebase';
import { mandaSms, postinoSms } from './_messaggi';
import { schedaSalone, mandaPerAppuntamento, mandaAvvisoSalone } from './_invio';
import {
  idVerifica, nuovoCodice, puoMandareCodice, controllaCodice, inviiRecenti, testoCodice,
  pulisciPrenotazione, StatoCodice, DURATA_CODICE_MS, SENZA_CODICE_MS, MAX_CODICI_ORA_SALONE
} from './_otp';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';
import { numeroInternazionale } from '../salone-app/frontend/lib/contatti';
import { disponibilitaPerAppuntamento } from '../salone-app/frontend/lib/vetrina';
import { giornoDelSalone } from '../salone-app/frontend/lib/messaggi';

interface Richiesta { method?: string; body?: any }
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

const idValido = (v: any) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);

/** Il salone vuole la verifica del numero? Solo se ha un modo di mandare SMS. */
async function serveVerifica(db: FirebaseFirestore.Firestore, salonId: string) {
  const scheda = await schedaSalone(db, salonId);
  return { scheda, serve: !!postinoSms() && funzioneAccesa('messaggi_automatici', scheda.ownerEmail) };
}

async function mandaCodice(salonId: string, telefono: string, res: Risposta) {
  const db = database();
  const numero = numeroInternazionale(telefono);
  if (!numero) { res.status(400).json({ errore: 'Scrivi un numero di cellulare valido.' }); return; }

  const { scheda, serve } = await serveVerifica(db, salonId);
  if (!serve) { res.status(200).json({ serveCodice: false }); return; }

  const adesso = Date.now();
  const rif = db.collection('verifiche').doc(idVerifica(salonId, numero));
  const rifSalone = db.collection('verifiche_saloni').doc(salonId);

  // Il controllo dei limiti e la scrittura del codice nuovo stanno insieme,
  // in una transazione: due richieste contemporanee non scavalcano i limiti.
  type EsitoPreparazione = { ok: true; codice: string } | { ok: false; motivo: string };
  const preparato = await db.runTransaction(async (tx): Promise<EsitoPreparazione> => {
    const stato = (await tx.get(rif)).data() as StatoCodice | undefined;
    const permesso = puoMandareCodice(stato, adesso);
    if (permesso.ok === false) return { ok: false, motivo: permesso.motivo };

    // Tetto per salone: chi provasse a far partire centinaia di codici verso
    // numeri a caso farebbe sospendere la SIM del salone. Qui si ferma prima.
    const inviiSalone = inviiRecenti(((await tx.get(rifSalone)).data() as any)?.invii, adesso);
    if (inviiSalone.length >= MAX_CODICI_ORA_SALONE) {
      return { ok: false, motivo: 'In questo momento non riusciamo a mandare codici. Riprova fra poco o chiama il salone.' };
    }

    const { codice, sale, hash } = nuovoCodice();
    tx.set(rif, {
      salonId, sale, hash,
      scade: adesso + DURATA_CODICE_MS,
      tentativi: 0,
      invii: [...inviiRecenti(stato?.invii, adesso), adesso]
    });
    tx.set(rifSalone, { invii: [...inviiSalone, adesso] });
    return { ok: true, codice };
  });

  if (preparato.ok === false) { res.status(429).json({ errore: preparato.motivo }); return; }

  const testo = testoCodice(scheda.dettagli?.nomeSalone || '', preparato.codice);
  const esito = await mandaSms(numero, { oggetto: '', testo, html: '', sms: testo });

  if (!esito.mandato) {
    // Il tablet non ha preso il messaggio: si lascia prenotare lo stesso per
    // un quarto d'ora, e l'appuntamento risulterà "numero non verificato".
    console.warn('Codice non partito:', (esito as any).motivo);
    await rif.update({ senzaCodiceFinoA: adesso + SENZA_CODICE_MS, hash: FieldValue.delete() });
    res.status(200).json({ serveCodice: false, avviso: 'sms-non-partito' });
    return;
  }

  res.status(200).json({ serveCodice: true, a: `+${numero}` });
}

async function prenota(salonId: string, dati: any, codice: string, res: Risposta) {
  const db = database();
  const adesso = Date.now();

  const pulita = pulisciPrenotazione(dati, adesso);
  if (pulita.ok === false) { res.status(400).json({ errore: pulita.motivo }); return; }
  const app = pulita.app;
  const numero = numeroInternazionale(app.clienti.telefono);

  const { serve } = await serveVerifica(db, salonId);
  let verificato = false;

  if (serve) {
    const rif = db.collection('verifiche').doc(idVerifica(salonId, numero));
    type EsitoVerifica = { ok: true; verificato: boolean } | { ok: false; motivo: string };
    const esito = await db.runTransaction(async (tx): Promise<EsitoVerifica> => {
      const stato = (await tx.get(rif)).data() as StatoCodice | undefined;
      if (stato?.senzaCodiceFinoA && adesso < stato.senzaCodiceFinoA) return { ok: true, verificato: false };
      const controllo = controllaCodice(stato, codice, adesso);
      if (controllo.ok === false) {
        if (stato?.hash) tx.update(rif, { tentativi: (stato.tentativi || 0) + 1 });
        return { ok: false, motivo: controllo.motivo };
      }
      // Codice usato: non vale una seconda volta.
      tx.delete(rif);
      return { ok: true, verificato: true };
    });
    if (esito.ok === false) { res.status(400).json({ errore: esito.motivo }); return; }
    verificato = esito.verificato;
  }

  const rifApp = db.collection('appuntamenti').doc();
  await rifApp.set({
    ...app,
    userId: salonId,
    stato: 'in_attesa',
    source: 'web_public',
    telefono_verificato: verificato,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  // Occupa subito l'orario, altrimenti due clienti prendono le stesse 15:00.
  // Il giorno si calcola sul calendario del salone: il server vive in UTC.
  const riga = disponibilitaPerAppuntamento(salonId, { id: rifApp.id, ...app });
  await db.collection('disponibilita').doc(rifApp.id).set({ ...riga, giorno: giornoDelSalone(new Date(app.data_ora)) });

  // La ricevuta alla cliente e l'avviso al salone partono insieme, prima di
  // rispondere: su Vercel quello che resta da fare dopo la risposta può
  // venire interrotto. Se un SMS non parte la prenotazione resta valida: lo
  // si vede nel registro e in agenda.
  const scritto = { ...app, userId: salonId, stato: 'in_attesa' };
  const [ricevuta, avviso] = await Promise.allSettled([
    mandaPerAppuntamento(db, rifApp.id, scritto, 'ricevuta'),
    mandaAvvisoSalone(db, rifApp.id, scritto)
  ]);
  if (ricevuta.status === 'rejected') console.error('Ricevuta non mandata:', ricevuta.reason);
  if (avviso.status === 'rejected') console.error('Avviso al salone non mandato:', avviso.reason);

  res.status(200).json({ id: rifApp.id, verificato });
}

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');
  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  try {
    const { azione, salonId, telefono, appuntamento, codice } = corpo(req);
    if (!idValido(salonId)) { res.status(400).json({ errore: 'Salone non riconosciuto.' }); return; }

    if (azione === 'codice') { await mandaCodice(salonId, String(telefono || ''), res); return; }
    if (azione === 'prenota') { await prenota(salonId, appuntamento, String(codice || ''), res); return; }

    res.status(400).json({ errore: 'Azione sconosciuta.' });
  } catch (err: any) {
    if (err?.message === 'chiave-mancante') {
      res.status(503).json({ errore: 'La prenotazione online è momentaneamente ferma. Chiama il salone.' });
      return;
    }
    console.error('Errore nella prenotazione:', err);
    res.status(500).json({ errore: 'Qualcosa è andato storto. Riprova, o chiama il salone.' });
  }
}
