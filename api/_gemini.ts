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
