// La scheda della cliente: i campi in più, quelli che il vecchio gestionale
// aveva e Rosy no.
//
// Regola di fondo: **non si perde niente e non si obbliga niente**. Chi arriva
// da un altro programma porta con sé colonne che qui non servono tutti i
// giorni — sesso, data di nascita, quante volte è venuta, quando è stata
// registrata. Vanno conservate, perché rifarle a mano è impossibile, ma non
// devono ingombrare la schermata di chi aggiunge una cliente al volo mentre è
// al telefono. Quindi: tutte facoltative, tutte dentro una sezione chiusa.
//
// Le colonne che non hanno nemmeno un campo qui non si buttano: finiscono in
// `extra`, una mappa con il nome di colonna così com'era scritto nel foglio, e
// si vedono in fondo alla scheda. Meglio un dato scritto male che un dato
// perso.

export type TipoCampo = 'testo' | 'data' | 'numero' | 'scelta';

export interface CampoExtra {
  chiave: string;
  etichetta: string;
  tipo: TipoCampo;
  scelte?: string[];
  /** Spiegazione sotto il campo, quando il nome da solo non basta. */
  aiuto?: string;
}

export const CAMPI_EXTRA_CLIENTE: CampoExtra[] = [
  { chiave: 'sesso', etichetta: 'Sesso', tipo: 'scelta', scelte: ['Donna', 'Uomo', 'Altro'] },
  { chiave: 'data_nascita', etichetta: 'Data di nascita', tipo: 'data',
    aiuto: 'Serve per gli auguri e per le promozioni del compleanno.' },
  { chiave: 'stato_accettazione', etichetta: 'Stato di accettazione', tipo: 'testo',
    aiuto: 'Come arriva dal vecchio gestionale: se ha accettato di essere ricontattata.' },
  { chiave: 'numero_prenotazioni', etichetta: 'Prenotazioni fatte finora', tipo: 'numero',
    aiuto: 'Quante ne aveva nel vecchio gestionale. Non si aggiorna da sola.' },
  { chiave: 'creato_il_origine', etichetta: 'Cliente dal', tipo: 'data',
    aiuto: 'Quando era stata registrata la prima volta.' },
  { chiave: 'note_appuntamento', etichetta: 'Note sugli appuntamenti', tipo: 'testo' }
];

/** Il valore vuoto giusto per quel tipo di campo. */
export function valoreVuoto(campo: CampoExtra): string {
  return campo.tipo === 'scelta' ? '' : '';
}

/** Tutti i campi extra a vuoto: il punto di partenza di un form nuovo. */
export function schedaVuota(): Record<string, string> {
  return Object.fromEntries(CAMPI_EXTRA_CLIENTE.map(c => [c.chiave, valoreVuoto(c)]));
}

/** True se di quella scheda c'è almeno un campo in più riempito. */
export function haAltriDati(cliente: any): boolean {
  if (!cliente) return false;
  if (CAMPI_EXTRA_CLIENTE.some(c => !vuoto(cliente[c.chiave]))) return true;
  return Object.keys(cliente.extra || {}).some(k => !vuoto(cliente.extra[k]));
}

const vuoto = (v: any) => v === undefined || v === null || `${v}`.trim() === '';

/** Come si legge quel valore nella scheda: le date all'italiana. */
export function mostra(campo: CampoExtra, valore: any): string {
  if (vuoto(valore)) return '—';
  if (campo.tipo === 'data') return dataItaliana(`${valore}`);
  return `${valore}`;
}

/** 1990-03-07 → 07/03/1990. Quello che non è una data si lascia com'è. */
export function dataItaliana(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
