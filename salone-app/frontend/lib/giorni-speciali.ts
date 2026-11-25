/**
 * Le aperture di un giorno solo.
 *
 * I turni si ripetono ogni settimana ("il lunedì riposo"). Ma capita di
 * aprire UN lunedì preciso — sotto Natale, prima di una cerimonia — senza
 * voler cambiare tutti i lunedì. Quel giorno si scrive sulla scheda
 * dell'operatrice, in `giorni_speciali`, con la data come chiave:
 *
 *   giorni_speciali: { "2026-12-21": { attivo: true, tipo: "lavoro",
 *                                      fasce: [{ inizio: "09:00", fine: "18:00" }] } }
 *
 * Per quel giorno vale quello, al posto del turno della settimana: in
 * agenda, negli orari liberi e nella prenotazione online. Il giorno dopo
 * torna tutto com'era, da solo.
 */

export interface Fascia { inizio: string; fine: string }
export interface GiornoSpeciale { attivo: true; tipo: 'lavoro'; fasce: Fascia[]; speciale: true }

/** "2026-12-21": la data sull'orologio di chi guarda, non in UTC. */
export function chiaveData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** L'apertura speciale di quell'operatrice in quel giorno, se c'è. */
export function giornoSpeciale(operatrice: any, data: Date): GiornoSpeciale | null {
  const g = operatrice?.giorni_speciali?.[chiaveData(data)];
  return g && g.attivo && Array.isArray(g.fasce) && g.fasce.length ? { ...g, tipo: 'lavoro', speciale: true } : null;
}

const minuti = (hhmm: string) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

/** Che cosa non va in quelle fasce. Vuoto = vanno bene. */
export function erroreFasce(fasce: Fascia[]): string {
  if (!fasce.length) return 'Scrivi almeno un orario.';
  let prima = -1;
  for (const f of fasce) {
    const i = minuti(f.inizio), e = minuti(f.fine);
    if (!Number.isFinite(i) || !Number.isFinite(e)) return 'Scrivi gli orari come 09:00.';
    if (e <= i) return 'L\'orario di chiusura deve venire dopo quello di apertura.';
    if (i < prima) return 'Il secondo orario deve cominciare dopo la fine del primo.';
    prima = e;
  }
  return '';
}

/**
 * La mappa `giorni_speciali` da salvare dopo aver aperto quel giorno. Già che
 * c'è butta via le aperture di giorni passati da più di un mese, così la
 * scheda non si gonfia negli anni.
 */
export function conGiornoAperto(esistenti: any, data: Date, fasce: Fascia[], oggi: Date = new Date()): Record<string, any> {
  const pulita = senzaVecchi(esistenti, oggi);
  pulita[chiaveData(data)] = { attivo: true, tipo: 'lavoro', fasce: fasce.map(f => ({ inizio: f.inizio, fine: f.fine })) };
  return pulita;
}

/** La mappa senza quel giorno: torna a valere il turno della settimana. */
export function senzaGiorno(esistenti: any, data: Date, oggi: Date = new Date()): Record<string, any> {
  const pulita = senzaVecchi(esistenti, oggi);
  delete pulita[chiaveData(data)];
  return pulita;
}

function senzaVecchi(esistenti: any, oggi: Date): Record<string, any> {
  const limite = new Date(oggi); limite.setDate(limite.getDate() - 31);
  const soglia = chiaveData(limite);
  const pulita: Record<string, any> = {};
  Object.keys(esistenti || {}).forEach(k => { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && k >= soglia) pulita[k] = esistenti[k]; });
  return pulita;
}
