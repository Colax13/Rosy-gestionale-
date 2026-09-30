// Il numero progressivo dei preconti. Solo il conto, senza database, così si
// prova da solo.
//
// Si ricomincia da 1 ogni anno, come si fa con le ricevute: "N. 12/2026".
// Il preconto non è un documento fiscale, ma un numero che riparte a gennaio
// si legge meglio di un 4.318 che cresce per sempre.

export interface Contatore { anno: number; ultimo: number }
export interface NumeroPreconto { anno: number; numero: number }

/** Il numero da dare al prossimo preconto, e come resta il contatore. */
export function prossimoNumero(contatore: Contatore | null | undefined, annoAdesso: number): NumeroPreconto {
  if (!contatore || contatore.anno !== annoAdesso || !(contatore.ultimo >= 0)) {
    return { anno: annoAdesso, numero: 1 };
  }
  return { anno: annoAdesso, numero: contatore.ultimo + 1 };
}

/** Come si scrive sul foglio: "N. 12/2026". */
export function numeroScritto(n: NumeroPreconto | null | undefined): string {
  return n && n.numero ? `N. ${n.numero}/${n.anno}` : '';
}
