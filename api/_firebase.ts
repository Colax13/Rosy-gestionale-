// Il collegamento a Firebase dalla parte del server.
//
// Qui il programma non entra come una persona: entra come amministratore, con
// una chiave di servizio che sta fra le variabili d'ambiente di Vercel e non
// esce mai da questo lato. Serve a due cose:
//
//   1. **riconoscere chi chiama.** Il browser manda il suo tesserino
//      (il token di Firebase); qui si controlla che sia vero e non scaduto.
//      Senza questo controllo chiunque potrebbe far partire messaggi a nome
//      del salone.
//   2. **leggere i dati senza passare dalle regole**, che sono fatte per il
//      browser e non saprebbero riconoscere il server.

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

let avviata: admin.app.App | null = null;

/** La chiave di servizio, letta dall'ambiente. null se non c'è. */
export function credenziali(): any | null {
  const grezza = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!grezza) return null;
  try {
    // Su Vercel si incolla il file JSON così com'è. Chi preferisce può
    // incollarlo in base64: si riconosce perché non comincia per graffa.
    const testo = grezza.trim().startsWith('{')
      ? grezza
      : Buffer.from(grezza, 'base64').toString('utf8');
    const dati = JSON.parse(testo);
    if (!dati.project_id || !dati.private_key || !dati.client_email) return null;
    return dati;
  } catch {
    return null;
  }
}

/** Firebase pronto all'uso. Si avvia una volta sola per ogni server acceso. */
export function firebase(): admin.app.App {
  if (avviata) return avviata;
  const chiave = credenziali();
  if (!chiave) throw new Error('chiave-mancante');
  avviata = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: admin.credential.cert(chiave) });
  return avviata;
}

/** Il database giusto: questo progetto non usa quello predefinito. */
export function database() {
  const id = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-7035b199-a80f-403a-9044-0d7d6c4eb074';
  return getFirestore(firebase(), id);
}

export interface ChiEntra { uid: string; email: string }

/**
 * Chi sta chiamando, controllato davvero.
 * L'intestazione arriva come `Authorization: Bearer <token>`; il token lo
 * firma Google quando la persona entra, e qui si verifica che sia suo.
 */
export async function chiEntra(intestazione?: string): Promise<ChiEntra> {
  // Prima si guarda se il server è configurato: se manca la chiave, dire
  // "non sei riconosciuto" manderebbe a cercare il problema dalla parte
  // sbagliata.
  const app = firebase();
  const token = (intestazione || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('senza-tesserino');
  const dati = await app.auth().verifyIdToken(token);
  return { uid: dati.uid, email: dati.email || '' };
}

/**
 * In quale salone lavora chi ha chiamato.
 * Il titolare è il salone stesso; le operatrici hanno una riga in `membri`.
 */
export async function saloneDi(uid: string): Promise<string> {
  const membro = await database().collection('membri').doc(uid).get();
  if (membro.exists) {
    const dati = membro.data() as any;
    if (dati?.attivo === false) throw new Error('accesso-sospeso');
    if (dati?.salonId) return dati.salonId;
  }
  return uid;
}
