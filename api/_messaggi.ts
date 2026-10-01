// Come partono i messaggi: oggi per email, con Resend.
//
// Le parole stanno altrove, in `salone-app/frontend/lib/messaggi.ts`, perché
// servono anche al programma quando il salone avvisa la cliente su WhatsApp.
// Qui c'è solo il mezzo: la chiave, il mittente, e che cosa fare quando non
// funziona.

import { Messaggio } from '../salone-app/frontend/lib/messaggi';
import { numeroInternazionale } from '../salone-app/frontend/lib/contatti';
import { segmentiSms } from '../salone-app/frontend/lib/messaggi';
import { mandaConSkebby } from './_skebby';

export { componi, quandoScritto, elencoScritto } from '../salone-app/frontend/lib/messaggi';
export type { TipoMessaggio, DatiMessaggio, Messaggio } from '../salone-app/frontend/lib/messaggi';

export type Canale = 'email' | 'sms';

export type EsitoInvio =
  | { mandato: true; canale: Canale; a: string }
  | { mandato: false; canale: Canale; motivo: string };

/**
 * Manda l'email con Resend.
 *
 * Se la chiave non c'è non è un errore da urlare: vuol dire che quel pezzo non
 * è ancora acceso, e il programma deve continuare a funzionare lo stesso.
 */
export async function mandaEmail(a: string, messaggio: Messaggio): Promise<EsitoInvio> {
  const chiave = process.env.RESEND_API_KEY;
  if (!chiave) return { mandato: false, canale: 'email', motivo: "l'email non è ancora accesa (manca RESEND_API_KEY)." };
  if (!a || !a.includes('@')) return { mandato: false, canale: 'email', motivo: 'la cliente non ha lasciato un indirizzo email.' };

  const mittente = process.env.MITTENTE_EMAIL;
  if (!mittente) return { mandato: false, canale: 'email', motivo: 'manca il mittente (MITTENTE_EMAIL) su Vercel.' };

  const risposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chiave}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mittente,
      to: [a],
      subject: messaggio.oggetto,
      text: messaggio.testo,
      html: messaggio.html
    })
  });

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => '');
    return { mandato: false, canale: 'email', motivo: `Resend ha rifiutato l'invio (${risposta.status}). ${dettaglio}`.trim() };
  }

  return { mandato: true, canale: 'email', a };
}

/**
 * Manda l'SMS passando dal telefono del salone.
 *
 * In salone resta acceso un Android con sopra l'app *SMS Gateway for Android*:
 * il server le dice che cosa scrivere e a chi, e l'SMS parte dalla SIM del
 * salone, con il numero del salone come mittente. Non si paga niente a
 * messaggio — si consuma il piano che il salone ha già — e se la cliente
 * risponde, risponde al salone.
 *
 * Il prezzo da pagare è che quel telefono deve restare acceso e connesso: se
 * si spegne, l'SMS non parte, e qui lo si dice invece di far finta di sì.
 */
/**
 * Il postino degli SMS: da dove esce il messaggio.
 *
 * Ogni salone ha il suo. Il gestionale lo usano più saloni, e il messaggio
 * deve partire dal **loro** numero: il tablet di RD Salon non può mandare SMS
 * alle clienti di un altro salone. Quindi il postino si sceglie salone per
 * salone, in `_postino.ts`, e qui arriva già scelto.
 *
 * - `traccar`  — un tablet Android in salone con l'app *Traccar SMS Gateway*:
 *                il messaggio parte dalla SIM del salone, gratis;
 * - `telefono` — lo stesso, con l'app *SMS Gateway for Android* (capcom6);
 * - `skebby`   — un postino a pagamento, senza nessun telefono.
 */
export type Postino =
  | { tipo: 'traccar'; token: string; url?: string; origine: 'salone' | 'vercel' }
  | { tipo: 'telefono'; utente: string; password: string; url?: string; origine: 'vercel' }
  | { tipo: 'skebby'; origine: 'vercel' };

/** Le chiavi messe a mano su Vercel. Valgono solo per i saloni a cui sono state date. */
export function postinoDaVercel(): Postino | null {
  if (process.env.SKEBBY_USER && process.env.SKEBBY_PASSWORD) return { tipo: 'skebby', origine: 'vercel' };
  if (process.env.TRACCAR_SMS_TOKEN) {
    return { tipo: 'traccar', token: process.env.TRACCAR_SMS_TOKEN, url: process.env.TRACCAR_SMS_URL, origine: 'vercel' };
  }
  if (process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD) {
    return { tipo: 'telefono', utente: process.env.SMS_GATEWAY_USER, password: process.env.SMS_GATEWAY_PASSWORD, url: process.env.SMS_GATEWAY_URL, origine: 'vercel' };
  }
  return null;
}

/** Quello che ha risposto il postino, così com'è: serve a capire dove si ferma. */
export interface Dettaglio { postino: string; stato?: number; risposta?: string }

const accorcia = (t: string) => (t || '').replace(/\s+/g, ' ').trim().slice(0, 300);

/**
 * Manda l'SMS con il postino del salone.
 *
 * Si usa il testo corto (`messaggio.sms`), non quello dell'email: un SMS si
 * paga a pezzi da 160 caratteri e l'email ne fa quattro.
 *
 * Ogni invio lascia una riga nei registri di Vercel, riuscito o no: quando una
 * cliente dice "non mi è arrivato niente" lì si vede se il messaggio è uscito
 * dal server e che cosa ha risposto chi doveva consegnarlo.
 */
export async function mandaSms(telefono: string, messaggio: Messaggio, postino: Postino | null): Promise<EsitoInvio & { dettaglio?: Dettaglio }> {
  if (!postino) {
    return { mandato: false, canale: 'sms', motivo: 'questo salone non ha ancora collegato un telefono per gli SMS (Impostazioni → SMS).' };
  }

  const numero = numeroInternazionale(telefono);
  if (!numero) return { mandato: false, canale: 'sms', motivo: 'la cliente non ha lasciato un numero utilizzabile.' };

  const testo = messaggio.sms;
  const conto = segmentiSms(testo);
  if (conto.segmenti > 1) {
    console.warn(`SMS da ${conto.segmenti} pezzi (${conto.caratteri} caratteri, alfabeto ${conto.alfabeto}).`);
  }

  const a = `+${numero}`;
  const nascosto = `${a.slice(0, 6)}…${a.slice(-2)}`;

  if (postino.tipo === 'skebby') {
    const esito = await mandaConSkebby(a, testo);
    console.log(`SMS via Skebby a ${nascosto}: ${esito.mandato ? 'consegnato' : 'rifiutato'} ${esito.motivo || ''}`.trim());
    return esito.mandato
      ? { mandato: true, canale: 'sms', a, dettaglio: { postino: 'Skebby' } }
      : { mandato: false, canale: 'sms', motivo: esito.motivo || 'Skebby non ha mandato il messaggio.', dettaglio: { postino: 'Skebby', risposta: accorcia(esito.motivo || '') } };
  }

  // Traccar e capcom6: tutti e due passano dal loro server, che inoltra al
  // tablet. Se rispondono "ok" il messaggio è arrivato fino a loro; da lì in
  // poi tocca al tablet spedirlo.
  const richiesta = postino.tipo === 'traccar'
    ? {
        nome: 'Traccar',
        url: postino.url || 'https://www.traccar.org/sms/',
        // Il gettone va nell'intestazione così com'è, senza "Bearer" davanti.
        headers: { 'Authorization': postino.token, 'Content-Type': 'application/json' } as Record<string, string>,
        body: JSON.stringify({ to: a, message: testo })
      }
    : {
        nome: 'SMS Gateway',
        url: postino.url || 'https://api.sms-gate.app/3rdparty/v1/message',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${postino.utente}:${postino.password}`).toString('base64')}`,
          'Content-Type': 'application/json'
        } as Record<string, string>,
        body: JSON.stringify({ textMessage: { text: testo }, phoneNumbers: [a] })
      };

  try {
    const risposta = await fetch(richiesta.url, { method: 'POST', headers: richiesta.headers, body: richiesta.body });
    const corpo = accorcia(await risposta.text().catch(() => ''));
    const dettaglio = { postino: richiesta.nome, stato: risposta.status, risposta: corpo };
    console.log(`SMS via ${richiesta.nome} a ${nascosto}: risposta ${risposta.status} ${corpo}`.trim());
    if (!risposta.ok) {
      return { mandato: false, canale: 'sms', motivo: `${richiesta.nome} ha rifiutato il messaggio (${risposta.status}). ${corpo}`.trim(), dettaglio };
    }
    return { mandato: true, canale: 'sms', a, dettaglio };
  } catch (err: any) {
    console.log(`SMS via ${richiesta.nome} a ${nascosto}: irraggiungibile ${err?.message || ''}`);
    return {
      mandato: false, canale: 'sms',
      motivo: `non riesco a raggiungere ${richiesta.nome}: ${err?.message || 'motivo sconosciuto'}`,
      dettaglio: { postino: richiesta.nome, risposta: accorcia(err?.message || '') }
    };
  }
}
