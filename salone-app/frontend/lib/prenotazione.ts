// Gli orari liberi nella pagina di prenotazione pubblica. Sta fuori dalla
// pagina perché è la parte che, se sbaglia, fa prenotare due clienti alla
// stessa ora: così si prova da sola.

import { occupata, Fascia } from './vetrina';

const GIORNI_TURNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

/** Ogni quanti minuti si propone un orario. */
export const PASSO_MINUTI = 30;

export interface OperatoreConTurni { id: string; turni?: Record<string, any> }

/**
 * Il turno di quell'operatrice in quel giorno.
 * Chi non ha ancora impostato i turni lavora 9-18, dal martedì al sabato:
 * meglio proporre orari ragionevoli che una pagina vuota.
 */
export function turnoDelGiorno(op: OperatoreConTurni, giorno: Date) {
  const nome = GIORNI_TURNI[giorno.getDay()];
  if (!op.turni || Object.keys(op.turni).length === 0) {
    if (nome === 'domenica' || nome === 'lunedi') return null;
    return { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '18:00' }] };
  }
  const turno = op.turni[nome];
  if (!turno || !turno.attivo || turno.tipo !== 'lavoro') return null;
  return turno;
}

const minuti = (hhmm: string) => {
  const [h, m] = (hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};
const orario = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** L'istante di quel giorno a quell'ora, sull'orologio di chi guarda. */
export function istante(giorno: Date, hhmm: string): Date {
  const d = new Date(giorno);
  const m = minuti(hhmm);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

/**
 * Gli orari in cui almeno una delle operatrici indicate può prendere un
 * appuntamento lungo `durata` minuti: dentro il suo turno, senza
 * accavallarsi con quello che ha già, e non nel passato.
 */
export function orariLiberi(
  giorno: Date,
  operatori: OperatoreConTurni[],
  durata: number,
  fasceOccupate: Fascia[],
  adesso: number = Date.now()
): string[] {
  const liberi = new Set<string>();
  const lunghezza = Math.max(durata || 0, PASSO_MINUTI);

  for (const op of operatori) {
    const turno = turnoDelGiorno(op, giorno);
    if (!turno) continue;
    for (const fascia of turno.fasce || []) {
      const inizio = minuti(fascia.inizio);
      const fine = minuti(fascia.fine);
      if (!Number.isFinite(inizio) || !Number.isFinite(fine)) continue;

      for (let m = inizio; m + lunghezza <= fine; m += PASSO_MINUTI) {
        const da = istante(giorno, orario(m)).getTime();
        if (da <= adesso) continue;
        if (occupata(fasceOccupate, op.id, da, da + lunghezza * 60000)) continue;
        liberi.add(orario(m));
      }
    }
  }
  return Array.from(liberi).sort();
}

/** Con "prima disponibile": la prima operatrice libera a quell'ora. */
export function operatoreLibero(
  giorno: Date,
  hhmm: string,
  operatori: OperatoreConTurni[],
  durata: number,
  fasceOccupate: Fascia[],
  adesso: number = Date.now()
): string | null {
  const scelta = operatori.find(op => orariLiberi(giorno, [op], durata, fasceOccupate, adesso).includes(hhmm));
  return scelta ? scelta.id : null;
}

/** Il giorno come chiave, 2026-10-01, sul calendario di chi guarda. */
export function chiaveGiorno(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
