/**
 * Il magazzino dei prodotti del salone: quelli che si vendono alle clienti
 * (shampoo, maschere, spazzole) e quelli che si usano in salone.
 *
 * Versione base: elenco, prezzo, quanti ce ne sono, avviso quando stanno
 * finendo, carico e scarico. Qui le regole pure, senza database, così si
 * provano da sole (`npm run prova:prodotti`).
 */

export interface Prodotto {
  id: string;
  nome: string;
  marca?: string;
  categoria?: string;
  codice?: string;
  /** Prezzo di vendita alla cliente, in euro. */
  prezzo: number;
  /** Quanto costa al salone, in euro (facoltativo). */
  costo?: number;
  /** Quanti pezzi ci sono. */
  giacenza: number;
  /** Sotto questo numero si avvisa che sta finendo. */
  scorta_minima?: number;
  note?: string;
  attivo?: boolean;
}

/** Quello che si scrive nel pannello di modifica: tutto testo. */
export interface ModuloProdotto {
  nome: string;
  marca: string;
  categoria: string;
  codice: string;
  prezzo: string;
  costo: string;
  giacenza: string;
  scorta_minima: string;
  note: string;
}

export const moduloVuoto = (): ModuloProdotto =>
  ({ nome: '', marca: '', categoria: '', codice: '', prezzo: '', costo: '', giacenza: '0', scorta_minima: '', note: '' });

export const moduloDa = (p: Partial<Prodotto>): ModuloProdotto => ({
  nome: p.nome || '',
  marca: p.marca || '',
  categoria: p.categoria || '',
  codice: p.codice || '',
  prezzo: p.prezzo != null ? String(p.prezzo) : '',
  costo: p.costo != null ? String(p.costo) : '',
  giacenza: String(p.giacenza ?? 0),
  scorta_minima: p.scorta_minima != null ? String(p.scorta_minima) : '',
  note: p.note || ''
});

/** "12,50" e "12.50" sono la stessa cifra. Vuoto o sbagliato → null. */
export function leggiCifra(testo: string): number | null {
  const t = (testo || '').trim().replace(/\s|€/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Dal modulo ai dati da salvare. Restituisce gli errori da mostrare, oppure
 * i dati puliti (i campi vuoti non si scrivono).
 */
export function validaProdotto(m: ModuloProdotto): { errori: string[]; dati?: Omit<Prodotto, 'id'> } {
  const errori: string[] = [];
  const nome = m.nome.trim();
  if (!nome) errori.push('Scrivi il nome del prodotto.');
  if (nome.length > 120) errori.push('Il nome è troppo lungo.');

  const prezzo = leggiCifra(m.prezzo);
  if (prezzo === null || prezzo < 0) errori.push('Il prezzo di vendita deve essere una cifra (es. 12,50).');

  const costo = leggiCifra(m.costo);
  if (m.costo.trim() && (costo === null || costo < 0)) errori.push('Il costo deve essere una cifra, o restare vuoto.');

  const giacenza = leggiCifra(m.giacenza || '0');
  if (giacenza === null || !Number.isInteger(giacenza)) errori.push('I pezzi in magazzino devono essere un numero intero.');

  const scorta = leggiCifra(m.scorta_minima);
  if (m.scorta_minima.trim() && (scorta === null || !Number.isInteger(scorta) || scorta < 0)) {
    errori.push('La scorta minima deve essere un numero intero, o restare vuota.');
  }

  if (errori.length) return { errori };

  const dati: Omit<Prodotto, 'id'> = { nome, prezzo: arrotonda(prezzo!), giacenza: giacenza!, attivo: true };
  if (m.marca.trim()) dati.marca = m.marca.trim();
  if (m.categoria.trim()) dati.categoria = m.categoria.trim();
  if (m.codice.trim()) dati.codice = m.codice.trim();
  if (costo !== null && m.costo.trim()) dati.costo = arrotonda(costo);
  if (scorta !== null && m.scorta_minima.trim()) dati.scorta_minima = scorta;
  if (m.note.trim()) dati.note = m.note.trim();
  return { errori: [], dati };
}

const arrotonda = (n: number) => Math.round(n * 100) / 100;

export type StatoScorta = 'esaurito' | 'in_esaurimento' | 'ok';

export function statoScorta(p: Pick<Prodotto, 'giacenza' | 'scorta_minima'>): StatoScorta {
  const g = Number(p.giacenza) || 0;
  if (g <= 0) return 'esaurito';
  if (p.scorta_minima != null && g <= p.scorta_minima) return 'in_esaurimento';
  return 'ok';
}

/** Riepilogo per l'intestazione della pagina. */
export function riepilogoMagazzino(prodotti: Prodotto[]) {
  const attivi = prodotti.filter(p => p.attivo !== false);
  return {
    prodotti: attivi.length,
    pezzi: attivi.reduce((t, p) => t + Math.max(0, Number(p.giacenza) || 0), 0),
    valore_vendita: arrotonda(attivi.reduce((t, p) => t + Math.max(0, Number(p.giacenza) || 0) * (Number(p.prezzo) || 0), 0)),
    da_riordinare: attivi.filter(p => statoScorta(p) !== 'ok').length
  };
}

/** Ricerca per nome, marca, categoria o codice; le più simili prima per nome. */
export function filtraProdotti(prodotti: Prodotto[], testo: string): Prodotto[] {
  const q = (testo || '').trim().toLowerCase();
  const ordinati = [...prodotti].sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  if (!q) return ordinati;
  return ordinati.filter(p =>
    [p.nome, p.marca, p.categoria, p.codice].some(v => (v || '').toLowerCase().includes(q)));
}
