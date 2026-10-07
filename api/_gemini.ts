// Quale modello di Gemini usa Rosy. Sta da solo perché lo legge anche la spia
// del server (/api/salute), che non deve caricarsi tutta Rosy.

/**
 * Il modello scelto su Vercel (GEMINI_MODEL), poi quello che Google consiglia,
 * poi quelli di riserva. gemini-2.5-flash non si usa più: Google non lo dà
 * agli account nuovi.
 */
export const MODELLI_GEMINI = () => [process.env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']
  .map(m => (m || '').trim())
  .filter((m, i, l) => !!m && l.indexOf(m) === i);

/**
 * I fornitori di riserva, gratuiti, "alla OpenAI": entrano quando Gemini è
 * sovraccarico o ha finito le domande gratuite. Ognuno si accende mettendo la
 * sua chiave su Vercel; senza chiave si salta. Si usano solo modelli di
 * aziende note (di base gpt-oss di OpenAI, aperto), cambiabili da Vercel.
 */
export interface Riserva {
  fornitore: 'groq' | 'openrouter';
  url: string;
  chiave: string;
  modello: string;
  intestazioni: Record<string, string>;
}

export function riserve(): Riserva[] {
  const elenco: Riserva[] = [];
  const groq = (process.env.GROQ_API_KEY || '').trim();
  if (groq) elenco.push({
    fornitore: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    chiave: groq,
    modello: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
    intestazioni: {}
  });
  const openrouter = (process.env.OPENROUTER_API_KEY || '').trim();
  if (openrouter) elenco.push({
    fornitore: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    chiave: openrouter,
    modello: (process.env.OPENROUTER_MODEL || 'openai/gpt-oss-120b:free').trim(),
    intestazioni: { 'HTTP-Referer': 'https://rosygestionale.rdsalon.com', 'X-Title': 'Rosy gestionale' }
  });
  return elenco;
}
