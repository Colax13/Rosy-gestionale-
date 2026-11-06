/**
 * Il messaggio per recuperare le clienti che non passano da un po'.
 *
 * È un messaggio promozionale: per legge si manda solo a chi ha dato il
 * consenso al marketing (nella scheda, o spuntandolo prenotando online).
 * Chi non l'ha dato si può comunque ricontattare a mano, una alla volta,
 * da WhatsApp: è una conversazione, non un invio di massa.
 *
 * Le stesse regole le usa il server prima di mandare l'SMS: anche se il
 * browser sbagliasse, a chi non ha il consenso non parte niente.
 */

/** Il testo proposto. {nome} diventa il nome della cliente, {salone} il nome del salone. */
export const TESTO_RECUPERO =
  'Ciao {nome}, è passato un po\' di tempo dall\'ultima volta da {salone}! Ti va di fissare un appuntamento? Rispondi a questo messaggio o prenota online.';

/** Un SMS lungo si spezza in più messaggi (e costa di più): oltre questo no. */
export const LUNGHEZZA_MASSIMA = 320;

export function haConsensoMarketing(c: any): boolean {
  return c?.consenso_marketing === true || c?.consensi?.marketing === true;
}

/** Il testo vero per quella cliente. */
export function testoPer(modello: string, cliente: any, nomeSalone: string): string {
  const nome = (cliente?.nome || '').toString().trim().split(/\s+/)[0] || '';
  return (modello || '')
    .replace(/\{nome\}/gi, nome)
    .replace(/\{salone\}/gi, (nomeSalone || 'il salone').trim())
    .replace(/\s+([,!?.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Che cosa manca per poter mandare. Vuoto = si può. */
export function erroreTesto(testo: string): string {
  const t = (testo || '').trim();
  if (!t) return 'Scrivi il messaggio.';
  if (t.length > LUNGHEZZA_MASSIMA) return `Il messaggio è troppo lungo (${t.length} caratteri, massimo ${LUNGHEZZA_MASSIMA}).`;
  return '';
}
