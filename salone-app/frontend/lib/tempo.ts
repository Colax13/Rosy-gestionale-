// Piccoli aiuti sulle date, condivisi fra le pagine.

/** Prende una data comunque sia stata salvata: Timestamp, stringa o Date. */
export function aData(valore: any): Date | null {
  if (!valore) return null;
  if (typeof valore?.toDate === 'function') return valore.toDate();
  const d = new Date(valore);
  return isNaN(d.getTime()) ? null : d;
}

/** Quanti giorni interi sono passati da quella data a oggi. */
export function giorniDa(valore: any, adesso = new Date()): number | null {
  const d = aData(valore);
  if (!d) return null;
  return Math.floor((adesso.getTime() - d.getTime()) / 86400000);
}

/** "3 giorni fa", "2 mesi fa", "mai" — per farsi leggere senza contare. */
export function daQuanto(valore: any, adesso = new Date()): string {
  const giorni = giorniDa(valore, adesso);
  if (giorni === null) return 'mai';
  if (giorni <= 0) return 'oggi';
  if (giorni === 1) return 'ieri';
  if (giorni < 30) return `${giorni} giorni fa`;
  const mesi = Math.floor(giorni / 30);
  if (mesi === 1) return 'un mese fa';
  if (mesi < 12) return `${mesi} mesi fa`;
  const anni = Math.floor(mesi / 12);
  return anni === 1 ? 'un anno fa' : `${anni} anni fa`;
}
