// Mandare un messaggio per un appuntamento: il pezzo che serve sia alla
// conferma (quando il salone preme Conferma) sia al promemoria (che parte da
// solo il giorno prima). Tutto quello che decide *se* e *a chi* mandare sta
// qui, una volta sola.

import type { Firestore } from 'firebase-admin/firestore';
import { componi, mandaEmail, mandaSms, TipoMessaggio, EsitoInvio } from './_messaggi';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';
import { postinoDelSalone } from './_postino';

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

  // Gli SMS partono col postino del salone: il suo tablet, collegato da
  // Impostazioni. L'email invece parte da un dominio solo (quello di RD
  // Salon), quindi resta riservata a chi ce l'ha.
  const chiavePostino = `postino:${app.userId}`;
  if (memoria && !memoria.has(chiavePostino)) memoria.set(chiavePostino, await postinoDelSalone(db, app.userId, scheda.ownerEmail));
  const postino = memoria ? memoria.get(chiavePostino) : await postinoDelSalone(db, app.userId, scheda.ownerEmail);
  const emailAccesa = funzioneAccesa('messaggi_automatici', scheda.ownerEmail);

  if (!postino && !emailAccesa) {
    return { mandato: false, canali: [], a: [], motivo: 'questo salone non ha ancora collegato un telefono per gli SMS (Impostazioni → SMS).' };
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
    mandaSms(telefono, messaggio, postino),
    emailAccesa ? mandaEmail(email, messaggio) : Promise.resolve({ mandato: false as const, canale: 'email' as const, motivo: "l'email non è attiva per questo salone." })
  ]);

  const riusciti = esiti.filter(e => e.mandato) as Extract<EsitoInvio, { mandato: true }>[];

  if (riusciti.length) {
    await db.collection('appuntamenti').doc(appuntamentoId).update({
      [`messaggi.${quale}`]: {
        quando: new Date().toISOString(),
        arrivati: riusciti.map(e => ({ canale: e.canale, a: e.a }))
      }
    });
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
