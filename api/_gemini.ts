// Quale modello di Gemini usa Rosy. Sta da solo perché lo legge anche la spia
// del server (/api/salute), che non deve caricarsi tutta Rosy.

/** Il modello scelto su Vercel (GEMINI_MODEL), poi quelli di riserva. */
export const MODELLI_GEMINI = () => [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest']
  .map(m => (m || '').trim())
  .filter((m, i, l) => !!m && l.indexOf(m) === i);
