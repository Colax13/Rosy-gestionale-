// Chi deve ricevere un promemoria adesso. Solo la scelta, senza mandare
// niente: così si prova senza telefoni e senza database.
//
// Il giro passa ogni 15 minuti (cron-job.org) e una volta al giorno come
// riserva (Vercel). Due promemoria per appuntamento:
//
//   - 24 ore prima ("domani alle 10:00");
//   - 1 ora prima ("ti aspettiamo alle 10:00").
//
// Regole, una per riga:
// - solo gli appuntamenti confermati: una richiesta in attesa o annullata no;
// - i blocchi dell'agenda (pausa, ferie) non sono clienti;
// - niente promemoria se il salone ha tolto "Avvisa la cliente con SMS";
// - ogni promemoria parte una volta sola;
// - se l'appuntamento è stato fissato meno di 24 ore prima, quello del giorno
//   prima salta (la conferma è appena arrivata); se è stato fissato meno di 2
//   ore prima, salta anche quello di un'ora prima;
// - "domani" è domani sul calendario del salone, non del server (che vive in
//   UTC): il promemoria del giorno prima dice "domani", e deve essere vero.

import { giornoDelSalone, giornoDopo } from '../salone-app/frontend/lib/messaggi';

export type TipoPromemoria = 'promemoria' | 'promemoria_ora';
export interface Candidato { id: string; dati: any }
export interface DaMandare { candidato: Candidato; tipo: TipoPromemoria }
export interface Scelta {
  daMandare: DaMandare[];
  saltati: { id: string; tipo: TipoPromemoria; motivo: string }[];
}

const MINUTO = 60 * 1000;
const ORA = 60 * MINUTO;

/** Sotto quest'anticipo il promemoria di un'ora non serve più: la cliente è già per strada. */
const TROPPO_TARDI = 10 * MINUTO;

/**
 * Quando è stato fissato l'appuntamento (o spostato l'ultima volta): il più
 * recente fra conferma, spostamento e creazione. Spostato a domani mattina
 * vale come fissato adesso: la cliente ha appena ricevuto l'SMS.
 */
export function fissatoIl(d: any): number {
  const daIso = (v: any) => (v ? new Date(v).getTime() || 0 : 0);
  const c = d?.createdAt;
  const creato = !c ? 0
    : typeof c.toMillis === 'function' ? c.toMillis()
    : typeof c._seconds === 'number' ? c._seconds * 1000
    : typeof c.seconds === 'number' ? c.seconds * 1000
    : daIso(c);
  const conferma = daIso(d?.messaggi?.conferma?.quando);
  const spostamento = daIso(d?.messaggi?.spostamento?.quando);
  // Senza conferma registrata conta la creazione (appuntamenti fissati dal
  // salone prima che esistesse l'SMS di conferma).
  return Math.max(conferma || creato, spostamento);
}

export function sceltaPromemoria(appuntamenti: Candidato[], adesso: Date): Scelta {
  const ora = adesso.getTime();
  const domani = giornoDopo(giornoDelSalone(adesso));
  const scelta: Scelta = { daMandare: [], saltati: [] };

  for (const a of appuntamenti) {
    const d = a.dati || {};
    if (!d.data_ora || d.id_cliente === 'block-client') continue;
    // Il salone ha tolto "Avvisa la cliente con SMS": niente promemoria.
    if (d.sms_spenti) continue;
    const inizio = new Date(d.data_ora).getTime();
    const manca = inizio - ora;
    if (!(manca > 0)) continue;

    const tipo: TipoPromemoria = manca <= ORA ? 'promemoria_ora' : 'promemoria';
    if (tipo === 'promemoria' && (manca > 24 * ORA || giornoDelSalone(new Date(inizio)) !== domani)) continue;
    if (d.messaggi?.[tipo]) continue;

    const salta = (motivo: string) => scelta.saltati.push({ id: a.id, tipo, motivo });
    if (d.stato !== 'confermato') { salta(`stato ${d.stato || 'sconosciuto'}`); continue; }

    const fissato = fissatoIl(d);
    if (tipo === 'promemoria_ora') {
      if (manca < TROPPO_TARDI) { salta('troppo tardi'); continue; }
      if (fissato && inizio - fissato < 2 * ORA) { salta('fissato meno di 2 ore prima'); continue; }
    } else if (fissato && inizio - fissato < 24 * ORA) {
      salta('fissato meno di 24 ore prima'); continue;
    }

    scelta.daMandare.push({ candidato: a, tipo });
  }

  return scelta;
}
