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
 * Da dove esce l'SMS. Si usa il primo che ha le chiavi su Vercel:
 *
 * - `skebby`   — postino a pagamento, nessun hardware;
 * - `traccar`  — tablet in salone con l'app *Traccar SMS Gateway* (Play Store);
 * - `telefono` — tablet in salone con l'app *SMS Gateway for Android* (capcom6).
 *
 * Le ultime due fanno la stessa cosa con due app diverse: il messaggio parte
 * dalla SIM del salone e non costa niente. Ce ne sono due perché non tutte
 * le app si installano su tutti i tablet.
 */
export function postinoSms(): 'skebby' | 'traccar' | 'telefono' | null {
  if (process.env.SKEBBY_USER && process.env.SKEBBY_PASSWORD) return 'skebby';
  if (process.env.TRACCAR_SMS_TOKEN) return 'traccar';
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

  if (postino === 'traccar') {
    // Traccar fa da passaggio fra il nostro server e il tablet: il gettone che
    // mostra l'app dice a quale tablet consegnare. Va nell'intestazione così
    // com'è, senza "Bearer" davanti.
    try {
      const risposta = await fetch(process.env.TRACCAR_SMS_URL || 'https://www.traccar.org/sms/', {
        method: 'POST',
        headers: {
          'Authorization': process.env.TRACCAR_SMS_TOKEN as string,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: `+${numero}`, message: testo })
      });
      if (!risposta.ok) {
        const dettaglio = await risposta.text().catch(() => '');
        // Le risposte di Traccar, dette in modo che si sappia cosa fare.
        const perche = [400, 401, 403, 404].includes(risposta.status)
          ? 'il gettone di Traccar non è più valido: copia il nuovo Cloud token dall\'app sul tablet e mettilo su Vercel (TRACCAR_SMS_TOKEN)'
          : risposta.status >= 500
            ? 'il servizio di Traccar non risponde: riprova fra qualche minuto'
            : 'il tablet del salone non ha accettato il messaggio';
        return { mandato: false, canale: 'sms', motivo: `${perche} (${risposta.status}). ${dettaglio}`.trim() };
      }
      return { mandato: true, canale: 'sms', a: `+${numero}` };
    } catch (err: any) {
      return { mandato: false, canale: 'sms', motivo: `non riesco a raggiungere il tablet del salone: ${err?.message || 'motivo sconosciuto'}` };
    }
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
