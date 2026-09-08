// Creare e togliere l'accesso alle operatrici.
//
// Un dettaglio che vale la pena scrivere: creare un utente con Firebase
// sostituisce chi è collegato. Se lo facessimo sull'applicazione principale,
// la titolare si ritroverebbe collegata come la persona appena creata. Per
// questo si apre una SECONDA applicazione Firebase, usa e getta, che serve
// solo a registrare l'utente e poi viene chiusa: la titolare non si muove.

import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, getDocs, query, collection, where, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { db, auth } from '../../../src/lib/firebase';
import type { ChiavePagina } from './sessione';

export interface Membro {
  uid: string;
  salonId: string;
  nome: string;
  email: string;
  permessi: ChiavePagina[];
  attivo: boolean;
  idDipendente?: string | null;
}

/** Chi ha l'accesso in questo salone. */
export async function elencoMembri(salonId: string): Promise<Membro[]> {
  const snap = await getDocs(query(collection(db, 'membri'), where('salonId', '==', salonId)));
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
}

/**
 * Crea l'accesso per un'operatrice e le assegna i permessi.
 * Torna l'uid del nuovo utente.
 */
export async function creaAccesso(opzioni: {
  salonId: string;
  nome: string;
  email: string;
  password: string;
  permessi: ChiavePagina[];
  idDipendente?: string | null;
}): Promise<string> {
  const primaEra = auth.currentUser?.uid;
  let secondaria: FirebaseApp | null = null;

  try {
    secondaria = initializeApp(firebaseConfig, `creazione-${Date.now()}`);
    const authSecondaria = getAuth(secondaria);
    const credenziali = await createUserWithEmailAndPassword(
      authSecondaria,
      opzioni.email.trim(),
      opzioni.password
    );
    const uid = credenziali.user.uid;
    await signOut(authSecondaria);

    // La riga in `membri` è quella che dà davvero l'accesso ai dati: senza,
    // l'utente esiste ma non vede nessun salone.
    await setDoc(doc(db, 'membri', uid), {
      salonId: opzioni.salonId,
      nome: opzioni.nome.trim(),
      email: opzioni.email.trim(),
      permessi: opzioni.permessi,
      attivo: true,
      idDipendente: opzioni.idDipendente || null
    });

    if (auth.currentUser?.uid !== primaEra) {
      throw new Error('Qualcosa è andato storto con la sessione: rientra e ricontrolla.');
    }
    return uid;
  } finally {
    if (secondaria) await deleteApp(secondaria).catch(() => {});
  }
}

/** Cambia i permessi, o sospende/riattiva un accesso. */
export async function aggiornaAccesso(uid: string, dati: Partial<Pick<Membro, 'permessi' | 'attivo' | 'nome'>>) {
  await updateDoc(doc(db, 'membri', uid), dati as any);
}

/**
 * Toglie l'accesso ai dati del salone.
 * L'utente Firebase resta (cancellarlo richiede il lato server), ma senza la
 * riga in `membri` non vede più niente: è quella che conta.
 */
export async function revocaAccesso(uid: string) {
  await deleteDoc(doc(db, 'membri', uid));
}

/** Traduce gli errori di Firebase in italiano comprensibile. */
export function spiegaErroreAccesso(errore: any): string {
  switch (errore?.code) {
    case 'auth/email-already-in-use':
      return 'Questo indirizzo ha già un accesso. Usane un altro, oppure togli il vecchio accesso.';
    case 'auth/invalid-email':
      return "L'indirizzo non è scritto in modo valido.";
    case 'auth/weak-password':
      return 'La password è troppo corta: servono almeno sei caratteri.';
    case 'auth/operation-not-allowed':
      return "L'accesso con indirizzo e password non è ancora acceso su Firebase. Va acceso in Firebase → Authentication → Sign-in method → Email/Password.";
    case 'permission-denied':
      return 'Le regole del database non permettono questa operazione: vanno ripubblicate.';
    default:
      return errore?.message || 'Non sono riuscito a creare l\'accesso.';
  }
}
