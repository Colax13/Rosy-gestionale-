// Chi fa che cosa.
//
// Non tutte le operatrici fanno tutti i servizi: c'è chi fa colore e piega e
// chi fa solo estetica. Ogni operatrice può avere l'elenco dei servizi che sa
// fare (`servizi`, gli id del catalogo).
//
// Regola di fondo: se l'elenco non c'è o è vuoto, quell'operatrice fa tutto.
// Serve perché i saloni già avviati non hanno l'elenco compilato, e nessuno
// deve ritrovarsi l'agenda bloccata il giorno dopo l'aggiornamento.

/** True se quell'operatrice può fare quel servizio. */
export function faServizio(dipendente: any, idServizio: string | null | undefined): boolean {
  const elenco = dipendente?.servizi;
  if (!Array.isArray(elenco) || elenco.length === 0) return true;
  if (!idServizio) return true;
  return elenco.includes(idServizio);
}

/** True se l'elenco è stato compilato: serve per non dare avvisi a vuoto. */
export function haElencoServizi(dipendente: any): boolean {
  return Array.isArray(dipendente?.servizi) && dipendente.servizi.length > 0;
}

/** I servizi del catalogo che quell'operatrice sa fare. */
export function serviziDi(dipendente: any, catalogo: any[]): any[] {
  if (!haElencoServizi(dipendente)) return catalogo;
  return catalogo.filter(s => dipendente.servizi.includes(s.id));
}

/** Le operatrici che sanno fare quel servizio. */
export function operatoriPerServizio(dipendenti: any[], idServizio: string): any[] {
  return (dipendenti || []).filter(d => faServizio(d, idServizio));
}

// ---------------------------------------------------------------------

// Come si chiamano a schermo e in che ordine stanno.
//
// Il cognome è facoltativo: in salone ci si chiama per nome, e "Giulia" basta.
// Quindi da nessuna parte si scrive `${nome} ${cognome}` a mano: con il
// cognome vuoto resterebbe uno spazio in fondo, e le iniziali diventerebbero
// "G" più niente. Si passa da qui.
//
// L'ordine è quello delle colonne del calendario, da sinistra a destra. Lo
// sceglie il salone e vale ovunque: calendario, "Nuovo appuntamento",
// prenotazione online.

const testo = (v: any) => (v ?? '').toString().trim();

/** "Giulia Rossi", oppure solo "Giulia" se il cognome non c'è. */
export function nomeOperatore(d: any): string {
  return [testo(d?.nome), testo(d?.cognome)].filter(Boolean).join(' ');
}

/** Le iniziali per il pallino: "GR", o "G" se c'è solo il nome. */
export function inizialiOperatore(d: any): string {
  const n = testo(d?.nome), c = testo(d?.cognome);
  return ((n.charAt(0) + c.charAt(0)) || '?').toUpperCase();
}

/**
 * In ordine: prima chi ha un posto scelto, dal più piccolo; poi chi non ce
 * l'ha ancora (i nuovi), in ordine alfabetico. Non cambia la lista passata.
 */
export function ordinaOperatori<T>(lista: T[]): T[] {
  const posto = (d: any) => (typeof d?.ordine === 'number' && isFinite(d.ordine) ? d.ordine : Infinity);
  return [...(lista || [])].sort((a: any, b: any) => {
    const pa = posto(a), pb = posto(b);
    if (pa !== pb) return pa < pb ? -1 : 1;
    return nomeOperatore(a).localeCompare(nomeOperatore(b), 'it', { sensitivity: 'base' });
  });
}

/** Sposta un elemento di una posizione (−1 a sinistra, +1 a destra). */
export function sposta<T>(lista: T[], indice: number, verso: -1 | 1): T[] {
  const dove = indice + verso;
  if (indice < 0 || indice >= lista.length || dove < 0 || dove >= lista.length) return lista;
  const nuova = [...lista];
  [nuova[indice], nuova[dove]] = [nuova[dove], nuova[indice]];
  return nuova;
}

/** Sposta un elemento da una posizione a un'altra (per il trascinamento). */
export function spostaA<T>(lista: T[], da: number, a: number): T[] {
  if (da === a || da < 0 || da >= lista.length || a < 0 || a >= lista.length) return lista;
  const nuova = [...lista];
  const [preso] = nuova.splice(da, 1);
  nuova.splice(a, 0, preso);
  return nuova;
}

/** Che cosa salvare: solo chi ha cambiato posto. */
export function cambiOrdine(lista: { id: string; ordine?: number }[]): { id: string; ordine: number }[] {
  return lista
    .map((d, i) => ({ id: d.id, ordine: i, prima: d.ordine }))
    .filter(x => x.prima !== x.ordine)
    .map(({ id, ordine }) => ({ id, ordine }));
}
