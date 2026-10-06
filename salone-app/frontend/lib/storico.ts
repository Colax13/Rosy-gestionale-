// L'ultima volta che una cliente è venuta: per fissare il prossimo
// appuntamento in un attimo, senza ricordarsi a memoria il trattamento.

const pulito = (s: any) => (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * L'ultimo appuntamento vero della cliente: l'ultimo già passato; se non ce
 * n'è nessuno, il prossimo già fissato. Fuori le pause dell'agenda, gli
 * annullati e le richieste ancora da confermare.
 */
export function ultimoAppuntamento<T extends { data_ora?: string; stato?: string; id_cliente?: string }>(
  appuntamenti: T[],
  adesso = new Date()
): T | null {
  const veri = (appuntamenti || []).filter(a =>
    a?.data_ora && a.id_cliente !== 'block-client' && a.stato !== 'annullato' && a.stato !== 'in_attesa');
  const ora = adesso.getTime();
  const passati = veri.filter(a => new Date(a.data_ora!).getTime() <= ora)
    .sort((a, b) => b.data_ora!.localeCompare(a.data_ora!));
  if (passati.length) return passati[0];
  const futuri = veri.sort((a, b) => a.data_ora!.localeCompare(b.data_ora!));
  return futuri[0] || null;
}

/** I nomi dei servizi di un appuntamento. */
export function serviziDi(app: any): string[] {
  return (app?.righe_appuntamento || []).map((r: any) => r?.servizi_catalogo?.nome).filter(Boolean);
}

/**
 * I servizi del listino che corrispondono a quelli dell'appuntamento, nello
 * stesso ordine. Si confronta il nome (è quello che resta scritto
 * sull'appuntamento). Quelli che nel listino non ci sono più si saltano.
 */
export function serviziDaRipetere<S extends { nome: string; attivo?: boolean }>(app: any, listino: S[]): S[] {
  const perNome = new Map<string, S>();
  (listino || []).filter(s => s.attivo !== false).forEach(s => { if (!perNome.has(pulito(s.nome))) perNome.set(pulito(s.nome), s); });
  return serviziDi(app).map(n => perNome.get(pulito(n))).filter(Boolean) as S[];
}
