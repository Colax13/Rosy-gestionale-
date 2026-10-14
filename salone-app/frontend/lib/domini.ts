/// <reference types="vite/client" />
// Gli indirizzi di prenotazione tutti del salone, come prenota.rdsalon.com.
//
// Su Vercel la variabile VITE_DOMINI_PRENOTAZIONE dice quale indirizzo è di
// quale salone: "prenota.rdsalon.com=<codice salone>", più indirizzi
// separati da virgola. Chi apre uno di quegli indirizzi vede subito la
// prenotazione di quel salone; "Condividi prenotazione" copia quell'indirizzo
// invece di quello lungo. Senza la variabile tutto resta com'era.
// (Il dominio va anche aggiunto in Vercel → Settings → Domains, col suo
// record DNS.)

/** "host=salone, host2=salone2" → { host: salone }. Il resto si ignora. */
export function leggiDomini(config?: string | null): Record<string, string> {
  const domini: Record<string, string> = {};
  (config || '').split(/[,;\n]/).forEach(pezzo => {
    const [host, salone] = pezzo.split('=').map(x => (x || '').trim());
    const pulito = host.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (pulito && /^[A-Za-z0-9_-]{1,128}$/.test(salone || '')) domini[pulito] = salone;
  });
  return domini;
}

const configurati = () => leggiDomini(import.meta.env?.VITE_DOMINI_PRENOTAZIONE);

/** Il salone di un indirizzo tutto suo, se lo è. "www." non conta. */
export function saloneDelDominio(hostname: string, domini = configurati()): string | null {
  const h = (hostname || '').toLowerCase().replace(/^www\./, '');
  return domini[h] || null;
}

/** Il link di prenotazione da condividere: quello corto se c'è. */
export function linkPrenotazione(salonId: string, origine: string, domini = configurati()): string {
  const host = Object.keys(domini).find(h => domini[h] === salonId);
  return host ? `https://${host}` : `${origine}/${salonId}/prenota`;
}
