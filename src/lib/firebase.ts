import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// I campi lasciati vuoti nei form arrivano come `undefined`: senza questa
// opzione Firestore rifiuta l'intero salvataggio (es. cliente senza telefono).
export const db = initializeFirestore(
  app,
  { ignoreUndefinedProperties: true },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
