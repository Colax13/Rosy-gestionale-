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
