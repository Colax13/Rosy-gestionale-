// Come si ricontatta una cliente.
//
// Il pulsante "Ricontatta" apriva `tel:`, che dal computer non fa niente di
// utile. Dal computer serve WhatsApp; dal telefono serve poter scegliere fra
// chiamare e scrivere.

/** Prefisso usato quando il numero è scritto senza indicativo del Paese. */
export const PREFISSO_PREDEFINITO = '39';

/**
 * Il numero come lo vuole WhatsApp: solo cifre, con l'indicativo del Paese.
 * Regge gli spazi, i trattini, le parentesi, il `+39`, lo `0039` e il numero
 * scritto secco come lo si scrive sul quaderno.
 * Torna stringa vuota se non è un numero utilizzabile.
 */
export function numeroInternazionale(telefono: string | null | undefined, prefisso = PREFISSO_PREDEFINITO): string {
  const grezzo = String(telefono ?? '').trim();
  if (!grezzo) return '';

  const conPiu = grezzo.startsWith('+');
  let cifre = grezzo.replace(/\D/g, '');
  if (!cifre) return '';

  if (conPiu) return cifre;
  if (cifre.startsWith('00')) return cifre.slice(2);
  if (cifre.startsWith(prefisso) && cifre.length > 10) return cifre;

  // Numero italiano scritto senza indicativo (fisso o cellulare).
  if (cifre.length >= 6 && cifre.length <= 11) return prefisso + cifre;

  return cifre;
}

/** Il collegamento che apre la conversazione WhatsApp con quel numero. */
export function linkWhatsApp(telefono: string | null | undefined, messaggio?: string): string {
  const numero = numeroInternazionale(telefono);
  if (!numero) return '';
  const testo = messaggio ? `?text=${encodeURIComponent(messaggio)}` : '';
  return `https://wa.me/${numero}${testo}`;
}

/** Il collegamento che fa partire la chiamata. */
export function linkTelefonata(telefono: string | null | undefined): string {
  const grezzo = String(telefono ?? '').trim();
  if (!grezzo) return '';
  return `tel:${grezzo.replace(/[^\d+]/g, '')}`;
}

/** Vero se siamo su un telefono: lì ha senso proporre anche la chiamata. */
export function suTelefono(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
}

/**
 * Il numero su cui le clienti scrivono al salone su WhatsApp: quello scritto
 * apposta in Impostazioni; se manca, il telefono del salone, ma solo se è un
 * cellulare (un fisso su WhatsApp di solito non c'è). Stringa vuota se non
 * c'è un numero adatto.
 */
export function whatsappDelSalone(whatsapp?: string | null, telefono?: string | null): string {
  if (numeroInternazionale(whatsapp)) return String(whatsapp).trim();
  const numero = numeroInternazionale(telefono);
  return numero.startsWith('393') ? String(telefono).trim() : '';
}

export type ControlloCellulare = { ok: true; numero: string } | { ok: false; motivo: string };

/**
 * Il numero a cui mandare un codice per SMS è un cellulare vero?
 * - italiano (scritto con o senza +39): esattamente 10 cifre che iniziano
 *   con 3. Un fisso o un numero con una cifra in più o in meno non passa:
 *   il codice non arriverebbe mai, e la cliente resterebbe ad aspettare;
 * - straniero: solo se scritto col prefisso (+41…, 0044…), da 8 a 15 cifre.
 * Spazi, trattini, punti, parentesi non contano.
 */
export function cellulareValido(telefono: string | null | undefined): ControlloCellulare {
  const grezzo = String(telefono ?? '').replace(/[‎‏‪-‮]/g, '').trim();
  const cifre = grezzo.replace(/\D/g, '');
  if (!cifre) return { ok: false, motivo: 'Scrivi il tuo numero di cellulare.' };

  const conPrefisso = grezzo.startsWith('+') || cifre.startsWith('00');
  const internazionale = numeroInternazionale(grezzo);
  if (conPrefisso && !internazionale.startsWith('39')) {
    return internazionale.length >= 8 && internazionale.length <= 15
      ? { ok: true, numero: internazionale }
      : { ok: false, motivo: 'Il numero straniero non sembra giusto: controlla il prefisso e le cifre.' };
  }

  // Italiano: si toglie il 39 davanti (se c'è) e restano le 10 cifre.
  const locale = internazionale.startsWith('39') ? internazionale.slice(2) : cifre;
  if (/^0/.test(locale)) return { ok: false, motivo: 'Questo è un numero fisso: il codice arriva per SMS, serve un cellulare.' };
  if (!/^3/.test(locale)) return { ok: false, motivo: 'Il cellulare deve iniziare con 3 (es. 333 123 4567).' };
  if (locale.length !== 10) {
    return { ok: false, motivo: `Il cellulare deve avere 10 cifre: ne hai scritte ${locale.length}.` };
  }
  return { ok: true, numero: `39${locale}` };
}
