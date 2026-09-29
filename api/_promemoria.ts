// Chi deve ricevere il promemoria domani. Solo la scelta, senza mandare
// niente: così si prova senza telefoni e senza database.

import { giornoDelSalone, giornoDopo } from '../salone-app/frontend/lib/messaggi';

export interface Candidato { id: string; dati: any }
export interface Scelta {
  domani: string;
  daMandare: Candidato[];
  saltati: { id: string; motivo: string }[];
}

/** Sotto quest'intervallo la conferma è ancora fresca: un promemoria in più infastidisce. */
const CONFERMA_FRESCA_MS = 12 * 60 * 60 * 1000;

/**
 * Fra gli appuntamenti dei prossimi giorni, quelli a cui mandare il promemoria.
 *
 * - "Domani" è domani **sul calendario del salone**, non del server: alle 23
 *   in Italia il server è già nel giorno dopo, e sbaglierebbe di un giorno.
 * - Solo gli appuntamenti confermati: una richiesta ancora in attesa non si
 *   ricorda, un appuntamento annullato nemmeno.
 * - I blocchi dell'agenda (pausa, ferie) non sono clienti.
 * - Mai due volte: se il promemoria è già partito, si salta.
 * - Se la conferma è partita da meno di dodici ore — la cliente ha prenotato
 *   stamattina per domani — il promemoria sarebbe un doppione.
 */
export function sceltaPromemoria(appuntamenti: Candidato[], adesso: Date): Scelta {
  const domani = giornoDopo(giornoDelSalone(adesso));
  const daMandare: Candidato[] = [];
  const saltati: { id: string; motivo: string }[] = [];

  for (const a of appuntamenti) {
    const d = a.dati || {};
    if (!d.data_ora || giornoDelSalone(new Date(d.data_ora)) !== domani) continue;

    if (d.id_cliente === 'block-client') continue;
    if (d.stato !== 'confermato') { saltati.push({ id: a.id, motivo: `stato ${d.stato || 'sconosciuto'}` }); continue; }
    if (d.messaggi?.promemoria) { saltati.push({ id: a.id, motivo: 'promemoria già mandato' }); continue; }

    const confermaIl = d.messaggi?.conferma?.quando ? new Date(d.messaggi.conferma.quando).getTime() : 0;
    if (confermaIl && adesso.getTime() - confermaIl < CONFERMA_FRESCA_MS) {
      saltati.push({ id: a.id, motivo: 'conferma mandata da poco' });
      continue;
    }

    daMandare.push(a);
  }

  return { domani, daMandare, saltati };
}
