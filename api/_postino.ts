// Il postino degli SMS di ciascun salone.
//
// Il gestionale lo usano più saloni, e ognuno manda gli SMS dal suo numero.
// Ogni salone collega il proprio tablet da Impostazioni → SMS: il gettone che
// mostra l'app finisce in `segreti_saloni/{salone}`, che dal browser non si
// legge — lo legge solo il server. Così nessuno, nemmeno un'operatrice dello
// stesso salone, se lo può portare via.
//
// Le chiavi messe a mano su Vercel restano valide, ma solo per i saloni a cui
// sono state date (vedi `messaggi_automatici` in lib/funzioni.ts): sono quelle
// con cui RD Salon ha cominciato, prima che ci fosse la pagina.

import type { Firestore } from 'firebase-admin/firestore';
import { postinoDaVercel, Postino } from './_messaggi';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';

export const COLLEZIONE_SEGRETI = 'segreti_saloni';

/** Un gettone di Traccar ha l'aria giusta? Lettere, numeri e pochi segni, niente spazi. */
export function gettoneValido(gettone: any): boolean {
  return typeof gettone === 'string' && /^[A-Za-z0-9_\-:.]{8,500}$/.test(gettone.trim());
}

/** Quale postino usare: prima quello collegato dal salone, poi le chiavi di Vercel se gli spettano. */
export function scegliPostino(gettoneDelSalone: string | undefined, ownerEmail: string, daVercel: Postino | null): Postino | null {
  if (gettoneDelSalone && gettoneValido(gettoneDelSalone)) {
    return { tipo: 'traccar', token: gettoneDelSalone.trim(), origine: 'salone' };
  }
  if (daVercel && funzioneAccesa('messaggi_automatici', ownerEmail)) return daVercel;
  return null;
}

export async function postinoDelSalone(db: Firestore, salonId: string, ownerEmail: string): Promise<Postino | null> {
  const segreti = await db.collection(COLLEZIONE_SEGRETI).doc(salonId).get();
  return scegliPostino((segreti.data() as any)?.traccarToken, ownerEmail, postinoDaVercel());
}
