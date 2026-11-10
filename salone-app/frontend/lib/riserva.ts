/// <reference types="vite/client" />
// Il gestionale di riserva.
//
// È una seconda copia del programma, su un altro indirizzo, ferma all'ultima
// versione collaudata. Legge e scrive lo STESSO database: stessi clienti,
// stessa agenda, in diretta. Se una pubblicazione nuova rompe qualcosa, in
// salone si continua a lavorare da lì mentre il principale viene sistemato.
//
// Due variabili su Vercel, una per progetto (vedi docs/RISERVA.md):
//   - sul principale:   VITE_URL_RISERVA = https://indirizzo-della-riserva
//   - sulla riserva:    VITE_RISERVA_DI  = https://indirizzo-del-principale
// Senza variabili non cambia niente: nessun pulsante, nessun rimando.

/** Un indirizzo https scritto bene, senza barra in fondo; altrimenti niente. */
export function leggiIndirizzo(valore?: string | null, hostAttuale?: string): string | null {
  const testo = (valore || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s]*)?$/.test(testo)) return null;
  // Un indirizzo che punta a sé stesso farebbe girare in tondo.
  const host = testo.replace(/^https:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (hostAttuale && host === hostAttuale.toLowerCase()) return null;
  return testo;
}

const hostQui = () => (typeof window !== 'undefined' ? window.location.host : undefined);

/** L'indirizzo della riserva, se questo è il principale e la riserva è configurata. */
export const urlRiserva = (): string | null =>
  leggiIndirizzo(import.meta.env?.VITE_URL_RISERVA, hostQui());

/** L'indirizzo del principale, se questa copia È la riserva. */
export const urlPrincipale = (): string | null =>
  leggiIndirizzo(import.meta.env?.VITE_RISERVA_DI, hostQui());

export const eRiserva = (): boolean => !!urlPrincipale();

/** Le pagine che apre la cliente: lì la riserva non si propone. */
export const ePaginaPubblica = (percorso: string): boolean =>
  /^\/[A-Za-z0-9_-]{1,128}\/(prenota|privacy)\/?$/.test(percorso || '');

/** Dove mandare chi passa alla riserva: stessa pagina, sull'altro indirizzo. */
export function indirizzoSullaRiserva(base: string, percorso: string): string {
  const pagina = /^\/[A-Za-z0-9/_-]*$/.test(percorso || '') ? percorso : '/';
  return `${base}${pagina}${pagina.includes('?') ? '&' : '?'}da=principale`;
}

// --- Il registro dei problemi, su questo computer ---------------------------
// Quando qualcosa si rompe resta scritto qui (solo nel browser, niente dati
// delle clienti): in Impostazioni → Stato del sistema si legge e si copia,
// così chi sistema sa che cosa è successo senza doverlo indovinare.

const CHIAVE_PROBLEMI = 'rosy:problemi';
const QUANTI = 8;

export interface Problema {
  quando: string;
  dove: string;
  cosa: string;
  dettaglio?: string;
}

export function leggiProblemi(): Problema[] {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE_PROBLEMI) || '[]');
    return Array.isArray(dati) ? dati.filter(p => p && typeof p.cosa === 'string').slice(0, QUANTI) : [];
  } catch {
    return [];
  }
}

export function segnaProblema(cosa: string, dettaglio?: string): void {
  try {
    const nuovo: Problema = {
      quando: new Date().toISOString(),
      dove: typeof window !== 'undefined' ? window.location.pathname : '',
      cosa: String(cosa || 'errore').slice(0, 300),
      dettaglio: dettaglio ? String(dettaglio).slice(0, 1200) : undefined
    };
    localStorage.setItem(CHIAVE_PROBLEMI, JSON.stringify([nuovo, ...leggiProblemi()].slice(0, QUANTI)));
  } catch { /* memoria piena o chiusa: pazienza */ }
}

export function svuotaProblemi(): void {
  try { localStorage.removeItem(CHIAVE_PROBLEMI); } catch { /* niente */ }
}
