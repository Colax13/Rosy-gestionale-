// I campi numerici dei moduli tengono in memoria quello che è stato scritto,
// non un numero.
//
// Perché: se il campo parte da `0` e si scrive 15, resta scritto `015`; e se lo
// si svuota per riscriverlo, `Number('')` vale 0, che con un minimo obbligatorio
// fa fallire il salvataggio in silenzio. Tenendo il testo, il campo può restare
// vuoto — con un segnaposto grigio a suggerire il valore — e il numero si
// ricava solo al momento di salvare.

/** Il numero scritto nel campo; se il campo è vuoto o illeggibile, il ripiego. */
export function aNumero(valore: unknown, ripiego = 0): number {
  if (typeof valore === 'number') return Number.isFinite(valore) ? valore : ripiego;
  const testo = String(valore ?? '').trim().replace(',', '.');
  if (testo === '') return ripiego;
  const n = Number(testo);
  return Number.isFinite(n) ? n : ripiego;
}

/** Il numero da mettere in un campo di modulo: 0 e assente diventano vuoto. */
export function aTesto(valore: unknown): string {
  if (valore === null || valore === undefined || valore === '') return '';
  const n = Number(valore);
  if (!Number.isFinite(n)) return '';
  return String(n);
}
