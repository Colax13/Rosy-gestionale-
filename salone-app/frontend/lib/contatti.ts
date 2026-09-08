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
