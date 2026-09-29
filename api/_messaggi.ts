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
/** Da dove esce l'SMS: dal postino a pagamento, o dal telefono in salone. */
export function postinoSms(): 'skebby' | 'telefono' | null {
  if (process.env.SKEBBY_USER && process.env.SKEBBY_PASSWORD) return 'skebby';
  if (process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD) return 'telefono';
  return null;
}

/**
 * Manda l'SMS, per la strada che è accesa.
 *
 * Due strade possibili, e il codice non cambia a seconda di quale si usa:
 *
 * - **Skebby**, un postino a pagamento: non serve nessun telefono, si paga a
 *   messaggio, e il mittente può essere scritto a lettere ("RD SALON").
 * - **Il telefono in salone**, un Android con l'app che fa da ponte: non si
 *   paga niente a messaggio, ma quel telefono deve restare acceso.
 *
 * Si usa il testo corto (`messaggio.sms`), non quello dell'email: un SMS si
 * paga a pezzi da 160 caratteri e l'email ne fa quattro.
 */
export async function mandaSms(telefono: string, messaggio: Messaggio): Promise<EsitoInvio> {
  const postino = postinoSms();
  if (!postino) {
    return { mandato: false, canale: 'sms', motivo: "l'SMS non è ancora acceso (mancano le chiavi su Vercel)." };
  }

  const numero = numeroInternazionale(telefono);
  if (!numero) return { mandato: false, canale: 'sms', motivo: 'la cliente non ha lasciato un numero utilizzabile.' };

  const testo = messaggio.sms;
  const conto = segmentiSms(testo);
  if (conto.segmenti > 1) {
    // Non blocca niente: è un avviso nei registri, perché due pezzi si pagano
    // due volte e in genere vuol dire che qualcosa è cresciuto troppo.
    console.warn(`SMS da ${conto.segmenti} pezzi (${conto.caratteri} caratteri, alfabeto ${conto.alfabeto}).`);
  }

  if (postino === 'skebby') {
    const esito = await mandaConSkebby(`+${numero}`, testo);
    return esito.mandato
      ? { mandato: true, canale: 'sms', a: `+${numero}` }
      : { mandato: false, canale: 'sms', motivo: esito.motivo || 'Skebby non ha mandato il messaggio.' };
  }

  const indirizzo = process.env.SMS_GATEWAY_URL || 'https://api.sms-gate.app/3rdparty/v1/message';
  const credenziali = Buffer.from(`${process.env.SMS_GATEWAY_USER}:${process.env.SMS_GATEWAY_PASSWORD}`).toString('base64');

  try {
    const risposta = await fetch(indirizzo, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credenziali}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textMessage: { text: testo },
        phoneNumbers: [`+${numero}`]
      })
    });

    if (!risposta.ok) {
      const dettaglio = await risposta.text().catch(() => '');
      return { mandato: false, canale: 'sms', motivo: `il telefono del salone ha rifiutato (${risposta.status}). ${dettaglio}`.trim() };
    }
    return { mandato: true, canale: 'sms', a: `+${numero}` };
  } catch (err: any) {
    return { mandato: false, canale: 'sms', motivo: `non riesco a raggiungere il telefono del salone: ${err?.message || 'motivo sconosciuto'}` };
  }
}
