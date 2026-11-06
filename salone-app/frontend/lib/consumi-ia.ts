/**
 * Quanto usa Rosy (l'IA) ogni salone, e quanto costa.
 *
 * Il server conta ogni domanda in `consumi_ia/{salone}_{AAAA-MM}`: quante
 * domande, quanti "token" (i pezzetti di testo che Google fa pagare), e il
 * costo vero stimato. Ogni salone ha un certo numero di domande gratuite al
 * mese; oltre, ogni domanda ha un prezzo, che a fine mese si addebita al
 * salone. Rosy non si blocca mai: oltre la quota si continua a usarla e si
 * paga quello che si usa.
 *
 * Sta qui (e non nel server) perché la stessa regola la usa anche la pagina
 * Impostazioni per mostrare il conto: un solo posto dove cambiare i prezzi.
 */

/** Domande gratuite al mese per salone. */
export const DOMANDE_GRATUITE = 100;
/** Prezzo al salone per ogni domanda oltre la quota, in euro. */
export const PREZZO_DOMANDA_EURO = 0.05;
/** Oltre questa parte della quota si avvisa che sta per finire. */
export const SOGLIA_AVVISO = 0.8;

/**
 * Prezzi di listino di Google per Gemini Flash, in dollari per milione di
 * token. Servono solo a stimare il costo vero; le riserve gratuite (Groq,
 * OpenRouter) costano zero.
 */
export const DOLLARI_PER_MILIONE = { entrata: 0.3, uscita: 2.5 };
/** Cambio approssimato, per mostrare il costo in euro. */
export const EURO_PER_DOLLARO = 0.92;

export interface ConsumoMese {
  mese: string;          // "2026-11"
  domande: number;
  chiamate: number;
  token_entrata: number;
  token_uscita: number;
  /** Costo vero stimato (quello che paga chi gestisce il programma), in euro. */
  costo_euro: number;
}

export const consumoVuoto = (mese: string): ConsumoMese =>
  ({ mese, domande: 0, chiamate: 0, token_entrata: 0, token_uscita: 0, costo_euro: 0 });

/** "2026-11": il mese a cui si conta una domanda, nell'ora italiana. */
export function meseDi(d: Date = new Date()): string {
  const parti = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit' }).formatToParts(d);
  const v = (t: string) => parti.find(p => p.type === t)?.value || '';
  return `${v('year')}-${v('month')}`;
}

/** Il documento del database per quel salone e quel mese. */
export const idConsumo = (salonId: string, mese: string) => `${salonId}_${mese}`;

/** Il costo vero di una chiamata, in euro. Gratis per le riserve. */
export function costoChiamata(fornitore: string, entrata: number, uscita: number): number {
  if (fornitore !== 'gemini') return 0;
  const dollari = (entrata * DOLLARI_PER_MILIONE.entrata + uscita * DOLLARI_PER_MILIONE.uscita) / 1_000_000;
  return dollari * EURO_PER_DOLLARO;
}

/** I token di una risposta, nel formato di Gemini o in quello "alla OpenAI". */
export function tokenDi(risposta: any): { entrata: number; uscita: number } {
  const g = risposta?.usageMetadata;
  if (g) {
    return {
      entrata: Number(g.promptTokenCount) || 0,
      uscita: (Number(g.candidatesTokenCount) || 0) + (Number(g.thoughtsTokenCount) || 0)
    };
  }
  const o = risposta?.usage;
  if (o) return { entrata: Number(o.prompt_tokens) || 0, uscita: Number(o.completion_tokens) || 0 };
  return { entrata: 0, uscita: 0 };
}

export interface Conto {
  domande: number;
  gratuite: number;
  /** Domande gratuite non ancora usate questo mese. */
  restanti: number;
  /** Domande oltre la quota, da addebitare. */
  extra: number;
  /** Quanto si addebita al salone questo mese, in euro. */
  da_addebitare: number;
  stato: 'ok' | 'quasi' | 'oltre';
}

/** Il conto del mese per il salone. */
export function contoDelMese(consumo: Pick<ConsumoMese, 'domande'> | null | undefined, gratuite = DOMANDE_GRATUITE, prezzo = PREZZO_DOMANDA_EURO): Conto {
  const domande = Math.max(0, Math.floor(Number(consumo?.domande) || 0));
  const extra = Math.max(0, domande - gratuite);
  const da_addebitare = Math.round(extra * prezzo * 100) / 100;
  const stato = extra > 0 ? 'oltre' : domande >= gratuite * SOGLIA_AVVISO ? 'quasi' : 'ok';
  return { domande, gratuite, restanti: Math.max(0, gratuite - domande), extra, da_addebitare, stato };
}

export const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: n < 1 && n > 0 ? 4 : 2 }).format(n);
