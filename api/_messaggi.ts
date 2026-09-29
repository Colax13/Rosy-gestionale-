// Come partono i messaggi: oggi per email, con Resend.
//
// Le parole stanno altrove, in `salone-app/frontend/lib/messaggi.ts`, perché
// servono anche al programma quando il salone avvisa la cliente su WhatsApp.
// Qui c'è solo il mezzo: la chiave, il mittente, e che cosa fare quando non
// funziona.

import { Messaggio } from '../salone-app/frontend/lib/messaggi';
import { numeroInternazionale } from '../salone-app/frontend/lib/contatti';

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
export async function mandaSms(telefono: string, messaggio: Messaggio): Promise<EsitoInvio> {
  const utente = process.env.SMS_GATEWAY_USER;
  const password = process.env.SMS_GATEWAY_PASSWORD;
  if (!utente || !password) {
    return { mandato: false, canale: 'sms', motivo: "l'SMS non è ancora acceso (mancano SMS_GATEWAY_USER e SMS_GATEWAY_PASSWORD)." };
  }

  const numero = numeroInternazionale(telefono);
  if (!numero) return { mandato: false, canale: 'sms', motivo: 'la cliente non ha lasciato un numero utilizzabile.' };

  const indirizzo = process.env.SMS_GATEWAY_URL || 'https://api.sms-gate.app/3rdparty/v1/message';
  const credenziali = Buffer.from(`${utente}:${password}`).toString('base64');

  try {
    const risposta = await fetch(indirizzo, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credenziali}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        textMessage: { text: messaggio.testo },
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
