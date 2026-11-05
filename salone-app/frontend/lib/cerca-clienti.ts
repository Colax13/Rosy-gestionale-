/**
 * La ricerca delle clienti, una sola per tutto il gestionale (agenda,
 * rubrica). Prima ogni pagina aveva la sua e quella dell'agenda:
 *  - non trovava "sara ciotoli" (cercava la frase intera dentro il solo nome
 *    o il solo cognome);
 *  - mostrava le prime 10 in ordine sparso, così con "sara" la Sara giusta
 *    poteva restare fuori senza che nessuno se ne accorgesse;
 *  - si rompeva sulle schede senza cognome.
 *
 * Qui: maiuscole e accenti non contano, nome e cognome si possono scrivere
 * in qualunque ordine e anche a metà ("sar cio"), il telefono si trova anche
 * scritto con spazi o con il +39. Le più simili vengono prima.
 */

/** Minuscole, senza accenti, spazi singoli. */
export function normalizzaTesto(s: unknown): string {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Solo le cifre, senza il prefisso italiano davanti. */
export function cifreTelefono(s: unknown): string {
  let c = (s ?? '').toString().replace(/\D/g, '');
  if (c.startsWith('0039')) c = c.slice(4);
  else if (c.startsWith('39') && c.length > 10) c = c.slice(2);
  return c;
}

/** Quanto la cliente somiglia a quello che si è scritto. 0 = per niente. */
export function punteggioCliente(cliente: any, testo: string): number {
  const q = normalizzaTesto(testo);
  if (!q || !cliente) return 0;

  const nome = normalizzaTesto(cliente.nome);
  const cognome = normalizzaTesto(cliente.cognome);
  const completo = `${nome} ${cognome}`.trim();
  const inverso = `${cognome} ${nome}`.trim();

  // Telefono: almeno 3 cifre e nient'altro che numeri, spazi, + e trattini.
  const cifreQ = cifreTelefono(testo);
  if (cifreQ.length >= 3 && /^[\d\s+\-./()]+$/.test(testo.trim())) {
    const tel = cifreTelefono(cliente.telefono);
    if (!tel) return 0;
    if (tel === cifreQ) return 100;
    if (tel.startsWith(cifreQ) || tel.endsWith(cifreQ)) return 80;
    if (tel.includes(cifreQ)) return 60;
    return 0;
  }

  if (completo === q || inverso === q) return 100;

  // Parole intere prima di quelle a metà: con "sara" vengono prima le Sara,
  // poi le Sarah.
  const parole = q.split(' ');
  const paroleScheda = completo.split(' ').filter(Boolean);
  if (parole.every(p => paroleScheda.includes(p))) return 95;
  if (completo.startsWith(q) || inverso.startsWith(q)) return 90;

  // Ogni parola scritta deve stare all'inizio di una parola della scheda
  // ("sar cio" → Sara Ciotoli), oppure dentro (più debole).
  if (parole.every(p => paroleScheda.some(w => w.startsWith(p)))) return 70;
  if (parole.every(p => completo.includes(p))) return 50;

  const email = normalizzaTesto(cliente.email);
  if (email && email.includes(q)) return 40;
  return 0;
}

/**
 * Le clienti che corrispondono, le più simili prima e, a parità, in ordine
 * alfabetico. `quante` = 0 vuol dire tutte.
 */
export function cercaClienti<T = any>(clienti: T[], testo: string, quante = 0): T[] {
  if (!normalizzaTesto(testo)) return [];
  const trovate = (clienti || [])
    .map(c => ({ c, p: punteggioCliente(c, testo) }))
    .filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p || etichetta(a.c).localeCompare(etichetta(b.c), 'it'))
    .map(x => x.c);
  return quante > 0 ? trovate.slice(0, quante) : trovate;
}

const etichetta = (c: any) => `${c?.cognome || ''} ${c?.nome || ''}`.trim().toLowerCase();
