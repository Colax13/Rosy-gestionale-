// Il conto di fine appuntamento.
//
// I prezzi sono quelli del catalogo: cambiandoli lì cambiano anche qui, e non
// si riscrive un listino in due posti. I servizi dell'appuntamento portano con
// sé il nome ma non il prezzo, quindi il prezzo si ritrova nel catalogo per
// nome — e se non lo si trova si lascia scrivere a mano, invece di fermare
// tutto per una lettera diversa.

import { aNumero } from './numeri';

export interface RigaPreconto {
  /** Chiave stabile della riga nell'elenco (per le spunte). */
  id: string;
  nome: string;
  prezzo: number;
  /** Se viene dal catalogo o l'ha aggiunta l'operatrice sul momento. */
  daCatalogo: boolean;
  /** Se finisce sul conto. Si può togliere quello che non è stato fatto. */
  scelta: boolean;
  /** Solo per i prodotti venduti: quale prodotto del magazzino. */
  prodottoId?: string;
  /** Quanti pezzi (solo prodotti; i servizi valgono 1). `prezzo` è quello di un pezzo. */
  quantita?: number;
}

/** Quanti pezzi conta la riga: i servizi sempre 1. */
export const pezziDi = (r: Pick<RigaPreconto, 'quantita'>) =>
  Math.max(1, Math.trunc(Number(r.quantita) || 1));

/** Quanto pesa la riga sul conto: prezzo per pezzi. */
export const importoRiga = (r: Pick<RigaPreconto, 'prezzo' | 'quantita'>) =>
  (Number(r.prezzo) || 0) * pezziDi(r);

/** Confronto fra nomi indulgente: maiuscole, accenti e spazi non contano. */
function normalizza(nome: string): string {
  return String(nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Il prezzo di listino di un servizio, cercato per nome. */
export function prezzoDiListino(nome: string, catalogo: any[]): number | null {
  const cercato = normalizza(nome);
  const trovato = (catalogo || []).find(s => normalizza(s.nome) === cercato);
  if (!trovato) return null;
  const prezzo = aNumero(trovato.prezzo_base ?? trovato.prezzo, NaN);
  return Number.isFinite(prezzo) ? prezzo : null;
}

/**
 * Le righe con cui si apre il preconto: i servizi fissati, già spuntati, col
 * prezzo preso dal catalogo. Quello che non è stato fatto si toglie, quello
 * fatto in più si aggiunge.
 */
export function righeDaAppuntamento(app: any, catalogo: any[]): RigaPreconto[] {
  const righe = app?.righe_appuntamento || [];
  return righe.map((riga: any, i: number) => {
    const nome = riga?.servizi_catalogo?.nome || riga?.nome || 'Servizio';
    const prezzo = prezzoDiListino(nome, catalogo);
    return {
      id: `riga-${i}`,
      nome,
      prezzo: prezzo ?? 0,
      daCatalogo: prezzo !== null,
      scelta: true
    };
  });
}

/** Totale, sconto e resto da pagare. Lo sconto non scende mai sotto zero. */
export function contiPreconto(righe: RigaPreconto[], sconto: unknown) {
  const totale = righe
    .filter(r => r.scelta)
    .reduce((acc, r) => acc + importoRiga(r), 0);
  const scontoVero = Math.min(Math.max(0, aNumero(sconto)), totale);
  return {
    totale,
    sconto: scontoVero,
    daPagare: Math.max(0, totale - scontoVero)
  };
}

/** "45,00 €" — come si scrive su un conto in Italia. */
export function euro(valore: number): string {
  return `${(Number(valore) || 0).toFixed(2).replace('.', ',')} €`;
}

/** Quanto del conto è servizi e quanto prodotti (prima dello sconto). */
export function totaliPerTipo(righe: RigaPreconto[]) {
  const scelte = righe.filter(r => r.scelta);
  const prodotti = scelte.filter(r => r.prodottoId).reduce((t, r) => t + importoRiga(r), 0);
  const servizi = scelte.filter(r => !r.prodottoId).reduce((t, r) => t + importoRiga(r), 0);
  return { servizi, prodotti };
}

/** La riga come si salva sull'appuntamento: i prodotti portano anche id e pezzi. */
export function rigaDaSalvare(r: RigaPreconto) {
  return r.prodottoId
    ? { nome: r.nome, prezzo: r.prezzo, prodottoId: r.prodottoId, quantita: pezziDi(r) }
    : { nome: r.nome, prezzo: r.prezzo };
}
