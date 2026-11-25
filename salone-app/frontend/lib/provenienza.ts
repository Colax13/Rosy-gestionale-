/**
 * Da dove arriva chi prenota online: Instagram, Facebook, Google, il sito del
 * salone… Si capisce da soli, senza far mettere niente nei link:
 *
 *  - le app (Instagram, Facebook, TikTok) aprono i link dentro un loro
 *    browser, che si presenta col proprio nome;
 *  - gli altri siti (Google, il sito del salone) dicono da che pagina si
 *    arriva (il "referrer");
 *  - chi vuole essere preciso può ancora aggiungere ?da=volantino al link.
 *
 * Quello che NON si può sapere: WhatsApp, gli SMS e i link digitati a mano
 * non lasciano traccia. Finiscono tutti in "Link diretto".
 *
 * Qui solo regole, senza browser: si provano con `npm run prova:provenienza`.
 */

export type Provenienza =
  | 'instagram' | 'facebook' | 'tiktok' | 'google' | 'whatsapp' | 'sito' | 'qr' | 'diretto' | 'altro';

export const NOME_PROVENIENZA: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  google: 'Google',
  whatsapp: 'WhatsApp',
  sito: 'Sito del salone',
  qr: 'Cartello / QR',
  diretto: 'Link diretto (WhatsApp, SMS, digitato)',
  altro: 'Altro sito'
};

/** Come si mostra una provenienza, anche se è un'etichetta scritta a mano. */
export function nomeProvenienza(p?: string | null): string {
  if (!p) return 'Non indicata';
  return NOME_PROVENIENZA[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

/** Un'etichetta scritta nel link (?da=…): solo lettere, numeri e trattini, corta. */
export function pulisciEtichetta(v?: string | null): string {
  return (v || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
}

const SINONIMI: Record<string, Provenienza> = {
  ig: 'instagram', insta: 'instagram', instagram: 'instagram',
  fb: 'facebook', facebook: 'facebook', meta: 'facebook',
  tiktok: 'tiktok', tt: 'tiktok',
  google: 'google', maps: 'google', gmb: 'google',
  wa: 'whatsapp', whatsapp: 'whatsapp',
  sito: 'sito', web: 'sito', site: 'sito',
  qr: 'qr', cartello: 'qr'
};

const dominio = (url: string): string => {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
};

export interface Indizi {
  /** L'indirizzo della pagina aperta (con i suoi parametri). */
  url: string;
  /** Da che pagina si arriva (document.referrer). */
  referrer?: string;
  /** Come si presenta il browser (navigator.userAgent). */
  userAgent?: string;
}

/** Da dove arriva la visita. `etichetta` c'è quando è stata scritta a mano nel link. */
export function capisciProvenienza(i: Indizi): { provenienza: string; dettaglio?: string } {
  let parametri: URLSearchParams;
  try { parametri = new URL(i.url, 'https://x').searchParams; } catch { parametri = new URLSearchParams(); }

  // 1. Scritta nel link: vince su tutto.
  const scritta = pulisciEtichetta(parametri.get('da') || parametri.get('utm_source') || parametri.get('ref'));
  if (scritta) return { provenienza: SINONIMI[scritta] || scritta };
  if (parametri.has('fbclid')) return { provenienza: 'facebook' };
  if (parametri.has('gclid') || parametri.has('gad_source')) return { provenienza: 'google' };

  // 2. Il browser dentro un'app.
  const ua = i.userAgent || '';
  if (/Instagram/i.test(ua)) return { provenienza: 'instagram' };
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return { provenienza: 'facebook' };
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return { provenienza: 'tiktok' };
  if (/WhatsApp/i.test(ua)) return { provenienza: 'whatsapp' };

  // 3. La pagina da cui si arriva.
  const da = dominio(i.referrer || '');
  const qui = dominio(i.url);
  if (da && da !== qui) {
    if (/(^|\.)instagram\.com$/.test(da)) return { provenienza: 'instagram' };
    if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(da)) return { provenienza: 'facebook' };
    if (/(^|\.)tiktok\.com$/.test(da)) return { provenienza: 'tiktok' };
    if (/(^|\.)google\.[a-z.]+$/.test(da) || da === 'g.co' || da === 'maps.app.goo.gl') return { provenienza: 'google' };
    if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(da)) return { provenienza: 'whatsapp' };
    // Stesso dominio "di casa" del salone (prenota.salone.it ← salone.it): è il suo sito.
    const radice = (h: string) => h.split('.').slice(-2).join('.');
    if (qui && radice(da) === radice(qui)) return { provenienza: 'sito', dettaglio: da };
    return { provenienza: 'altro', dettaglio: da.slice(0, 60) };
  }

  return { provenienza: 'diretto' };
}

/** Per il report: quante prenotazioni online per provenienza, le più numerose prima. */
export function contaProvenienze(appuntamenti: any[]): { provenienza: string; nome: string; quante: number }[] {
  const conti = new Map<string, number>();
  (appuntamenti || []).filter(a => a?.source === 'web_public').forEach(a => {
    const p = a.provenienza || 'non-indicata';
    conti.set(p, (conti.get(p) || 0) + 1);
  });
  return [...conti.entries()]
    .map(([provenienza, quante]) => ({ provenienza, nome: provenienza === 'non-indicata' ? 'Non indicata (prima di questa funzione)' : nomeProvenienza(provenienza), quante }))
    .sort((a, b) => b.quante - a.quante);
}

/**
 * Il canale di acquisizione da scrivere sulla scheda di una cliente nuova
 * arrivata con una prenotazione online. Gli stessi nomi che si scelgono a
 * mano creando una cliente (Instagram, Facebook, Google…); quando non si sa,
 * resta "Prenotazione online".
 */
export function canaleDaProvenienza(p?: string | null): string {
  const noti: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', google: 'Google', tiktok: 'TikTok', sito: 'Sito web', whatsapp: 'WhatsApp' };
  return (p && noti[p]) || 'Prenotazione online';
}
