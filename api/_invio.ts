// Mandare un messaggio per un appuntamento: il pezzo che serve sia alla
// conferma (quando il salone preme Conferma) sia al promemoria (che parte da
// solo il giorno prima). Tutto quello che decide *se* e *a chi* mandare sta
// qui, una volta sola.

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { componi, mandaEmail, mandaSms, TipoMessaggio, EsitoInvio, Messaggio } from './_messaggi';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';
import { avvisoNuovaRichiesta, giornoDelSalone } from '../salone-app/frontend/lib/messaggi';

/**
 * Il registro: ogni SMS che il gestionale prova a mandare lascia una riga, che
 * sia partito o no. Dal browser si legge (pagina Automazioni → Registro SMS),
 * scrive solo il server. Serve a sapere che cosa è arrivato a chi, e
 * soprattutto a vedere quello che NON è partito, che altrimenti nessuno nota.
 */
export const COLLEZIONE_REGISTRO = 'registro_sms';

export interface VoceRegistro {
  userId: string;
  tipo: TipoMessaggio | 'avviso_salone' | 'prova';
  appuntamentoId?: string;
  cliente?: string;
  a: string;
  testo: string;
  esito: 'consegnato' | 'errore';
  motivo?: string;
}

export async function registra(db: Firestore, voce: VoceRegistro): Promise<void> {
  try {
    const adesso = new Date();
    await db.collection(COLLEZIONE_REGISTRO).add({
      ...voce,
      quando: adesso.toISOString(),
      giorno: giornoDelSalone(adesso),
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (err) {
    // Il registro non deve mai fermare un invio.
    console.error('Registro SMS non scritto:', err);
  }
}

export interface RisultatoInvio {
  mandato: boolean;
  canali: string[];
  a: string[];
  motivo?: string;
}

/** Scheda del salone: si legge una volta sola per giro, non una per cliente. */
export async function schedaSalone(db: Firestore, salonId: string, memoria?: Map<string, any>) {
  if (memoria?.has(salonId)) return memoria.get(salonId);
  const doc = await db.collection('salons').doc(salonId).get();
  const dati = (doc.data() as any) || {};
  const scheda = { ownerEmail: dati.ownerEmail || '', dettagli: dati.salonDetails || {} };
  memoria?.set(salonId, scheda);
  return scheda;
}

/**
 * Manda la conferma o il promemoria di un appuntamento, per SMS e per email.
 *
 * Tre controlli prima di spendere un messaggio:
 * - il salone deve avere i messaggi automatici accesi — il tablet è di RD
 *   Salon, e un'altra cliente di un altro salone non deve ricevere un SMS dal
 *   suo numero;
 * - ci dev'essere un numero o un indirizzo;
 * - se il numero non è scritto sull'appuntamento si cerca nella scheda della
 *   cliente, perché gli appuntamenti presi in salone lo hanno lì.
 *
 * Quello che parte resta segnato sull'appuntamento, sotto `messaggi`.
 */
export async function mandaPerAppuntamento(
  db: Firestore,
  appuntamentoId: string,
  app: any,
  quale: TipoMessaggio,
  memoria?: Map<string, any>
): Promise<RisultatoInvio> {
  const scheda = await schedaSalone(db, app.userId, memoria);
  if (!funzioneAccesa('messaggi_automatici', scheda.ownerEmail)) {
    return { mandato: false, canali: [], a: [], motivo: 'i messaggi automatici non sono attivi per questo salone.' };
  }

  let telefono = (app.clienti?.telefono || '').trim();
  let email = (app.clienti?.email || '').trim();
  if ((!telefono || !email) && app.id_cliente && app.id_cliente !== 'block-client') {
    const cliente = await db.collection('clienti').doc(app.id_cliente).get();
    const c = cliente.data() as any;
    // La scheda deve essere dello stesso salone: un id sbagliato non deve
    // diventare il numero di qualcun altro.
    if (cliente.exists && c?.userId === app.userId) {
      telefono = telefono || (c.telefono || '').trim();
      email = email || (c.email || '').trim();
    }
  }

  const dettagli = scheda.dettagli;
  const messaggio = componi(quale, {
    nomeCliente: `${app.clienti?.nome || ''} ${app.clienti?.cognome || ''}`.trim(),
    nomeSalone: dettagli.nomeSalone || 'il salone',
    indirizzo: dettagli.indirizzo || '',
    telefonoSalone: dettagli.telefono || '',
    quando: new Date(app.data_ora),
    servizi: (app.righe_appuntamento || []).map((r: any) => r?.servizi_catalogo?.nome).filter(Boolean),
    operatore: app.dipendenti?.nome || ''
  });

  // Si prova su tutte e due le strade: basta che ne arrivi una.
  const esiti: EsitoInvio[] = await Promise.all([
    mandaSms(telefono, messaggio),
    mandaEmail(email, messaggio)
  ]);

  const riusciti = esiti.filter(e => e.mandato) as Extract<EsitoInvio, { mandato: true }>[];
  const sms = esiti.find(e => e.canale === 'sms')!;
  const nomeCliente = `${app.clienti?.nome || ''} ${app.clienti?.cognome || ''}`.trim();

  await registra(db, {
    userId: app.userId,
    tipo: quale,
    appuntamentoId,
    cliente: nomeCliente,
    a: sms.mandato ? sms.a : telefono,
    testo: messaggio.sms,
    esito: sms.mandato ? 'consegnato' : 'errore',
    ...(sms.mandato ? {} : { motivo: (sms as { motivo: string }).motivo })
  });

  const quando = new Date().toISOString();
  if (riusciti.length) {
    await db.collection('appuntamenti').doc(appuntamentoId).update({
      [`messaggi.${quale}`]: {
        quando,
        arrivati: riusciti.map(e => ({ canale: e.canale, a: e.a }))
      },
      [`messaggi_errore.${quale}`]: FieldValue.delete()
    });
  } else {
    // Segnato sull'appuntamento: l'agenda lo mostra con "SMS non partito",
    // così la cliente si avvisa a mano.
    await db.collection('appuntamenti').doc(appuntamentoId).update({
      [`messaggi_errore.${quale}`]: { quando, motivo: (sms as { motivo?: string }).motivo || 'non partito' }
    }).catch(() => {});
  }

  return {
    mandato: riusciti.length > 0,
    canali: riusciti.map(e => e.canale),
    a: riusciti.map(e => e.a),
    motivo: riusciti.length
      ? undefined
      : esiti.filter(e => !e.mandato).map(e => `${e.canale}: ${(e as { motivo: string }).motivo}`).join(' ')
  };
}


/**
 * L'SMS al salone per una richiesta nuova dal sito. Va al numero scritto in
 * Impostazioni ("Cellulare per gli avvisi"); se non c'è, non parte niente.
 */
export async function mandaAvvisoSalone(db: Firestore, appuntamentoId: string, app: any): Promise<RisultatoInvio> {
  const scheda = await schedaSalone(db, app.userId);
  if (!funzioneAccesa('messaggi_automatici', scheda.ownerEmail)) {
    return { mandato: false, canali: [], a: [], motivo: 'i messaggi automatici non sono attivi per questo salone.' };
  }
  const privato = (await db.collection('impostazioni_private').doc(app.userId).get()).data() as any;
  const numero = (privato?.telefono_avvisi || '').trim();
  if (!numero) return { mandato: false, canali: [], a: [], motivo: 'nessun cellulare per gli avvisi in Impostazioni.' };

  const testo = avvisoNuovaRichiesta({
    nomeCliente: `${app.clienti?.nome || ''} ${app.clienti?.cognome || ''}`.trim(),
    quando: new Date(app.data_ora),
    servizi: (app.righe_appuntamento || []).map((r: any) => r?.servizi_catalogo?.nome).filter(Boolean),
    operatore: app.dipendenti?.nome || '',
    telefonoCliente: app.clienti?.telefono || ''
  });
  const messaggio = { oggetto: '', testo, html: '', sms: testo } as Messaggio;
  const esito = await mandaSms(numero, messaggio);

  await registra(db, {
    userId: app.userId,
    tipo: 'avviso_salone',
    appuntamentoId,
    cliente: 'Salone',
    a: esito.mandato ? esito.a : numero,
    testo,
    esito: esito.mandato ? 'consegnato' : 'errore',
    ...(esito.mandato ? {} : { motivo: (esito as { motivo: string }).motivo })
  });

  return esito.mandato
    ? { mandato: true, canali: ['sms'], a: [esito.a] }
    : { mandato: false, canali: [], a: [], motivo: (esito as { motivo: string }).motivo };
}
