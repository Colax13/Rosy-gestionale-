import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../src/lib/firebase';

const getUserId = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Utente non autenticato');
  return uid;
};

// ---------------------------------------------------------
// REFACTORING: DIRECT FIRESTORE CRUD IN REPLACEMENT OF EXPRESS /API
// ---------------------------------------------------------

export const reportApi = {
  getOverview: async () => {
    // Basic mock implementation for report currently
    return {
      overview: { incasso_mensile: 0, appuntamenti_oggi: 0, ticket_medio: 0 },
      incassi: [],
      dipendenti: [],
      clienti_report: null
    };
  },
};

export const clientiApi = {
  getAll: async (): Promise<any[]> => {
    const q = query(collection(db, 'clienti'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  getById: async (id: string): Promise<any> => {
    const d = await getDoc(doc(db, 'clienti', id));
    if (!d.exists() || d.data().userId !== getUserId()) throw new Error('Not found');
    return { id: d.id, filter: '', ...d.data() };
  },
  create: async (data: any) => {
    const ref = doc(collection(db, 'clienti'));
    const payload = { ...data, userId: getUserId(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  update: async (id: string, data: any) => {
    const ref = doc(db, 'clienti', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'clienti', id));
    return { success: true };
  },
  importAi: async (data: any) => {
    throw new Error('Not implemented on frontend yet');
  }
};

export const salonApi = {
  getSettings: async (): Promise<any> => {
    const ref = doc(db, 'salons', getUserId());
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },
  updateSettings: async (data: any) => {
    const ref = doc(db, 'salons', getUserId());
    const snap = await getDoc(ref);

    // Alla prima scrittura il documento salone deve nascere completo:
    // le regole del database pretendono ownerEmail, plan e createdAt.
    const payload = snap.exists() ? data : {
      ownerEmail: auth.currentUser?.email || '',
      plan: 'free',
      createdAt: serverTimestamp(),
      ...data
    };

    await setDoc(ref, payload, { merge: true });
    return { id: getUserId(), ...data };
  }
};

export const catalogoApi = {
  getPublic: async (salonId: string): Promise<any[]> => {
    const q = query(collection(db, 'catalogo'), where('userId', '==', salonId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  getAll: async (): Promise<any[]> => {
    const q = query(collection(db, 'catalogo'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  create: async (data: any) => {
    const ref = doc(collection(db, 'catalogo'));
    const payload = { ...data, userId: getUserId(), createdAt: serverTimestamp() };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  update: async (id: string, data: any) => {
    const ref = doc(db, 'catalogo', id);
    await updateDoc(ref, { ...data });
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'catalogo', id));
    return { success: true };
  },
  getCategorie: async () => {
    const q = query(collection(db, 'categorie_catalogo'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    // return list of names as component expects strings currently
    return snap.docs.map(d => d.data().nome);
  },
  createCategoria: async (nome: string) => {
    const ref = doc(collection(db, 'categorie_catalogo'));
    await setDoc(ref, { nome, userId: getUserId() });
    return { success: true };
  },
  updateCategoria: async (vecchioNome: string, nuovoNome: string) => {
    const q = query(collection(db, 'categorie_catalogo'), where('userId', '==', getUserId()), where('nome', '==', vecchioNome));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, { nome: nuovoNome });
    }
  },
  deleteCategoria: async (nome: string) => {
    const q = query(collection(db, 'categorie_catalogo'), where('userId', '==', getUserId()), where('nome', '==', nome));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
    }
  },
};

export const dipendentiApi = {
  getPublic: async (salonId: string): Promise<any[]> => {
    const q = query(collection(db, 'dipendenti'), where('userId', '==', salonId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  getAll: async (): Promise<any[]> => {
    const q = query(collection(db, 'dipendenti'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  create: async (data: any) => {
    const ref = doc(collection(db, 'dipendenti'));
    const payload = { ...data, userId: getUserId(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  update: async (id: string, data: any) => {
    const ref = doc(db, 'dipendenti', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'dipendenti', id));
    return { success: true };
  },
};

export const appuntamentiApi = {
  getAgendaPublic: async (salonId: string): Promise<any[]> => {
    const q = query(collection(db, 'appuntamenti'), where('userId', '==', salonId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  createPublic: async (salonId: string, data: any) => {
    const ref = doc(collection(db, 'appuntamenti'));
    const payload = { 
      ...data, 
      userId: salonId,
      source: 'web_public',
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  getByCliente: async (clienteId: string): Promise<any[]> => {
    const q = query(collection(db, 'appuntamenti'), where('userId', '==', getUserId()), where('id_cliente', '==', clienteId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  /**
   * Appuntamenti di un giorno o di un intervallo.
   *
   * Prima scaricava TUTTI gli appuntamenti del salone a ogni apertura
   * dell'agenda e li filtrava sul computer: con qualche migliaio di
   * appuntamenti diventava pesante. Ora chiede al database solo la finestra
   * che serve; se l'indice non è ancora stato pubblicato ricade sul vecchio
   * comportamento, così l'agenda non si blocca mai.
   */
  getAgenda: async (date?: string, startDate?: string, endDate?: string): Promise<any[]> => {
    const daGiorno = startDate || date;
    const aGiorno = endDate || date;

    // Confini in ora locale, con un giorno di margine per parte: le date sono
    // salvate in UTC e senza margine si perderebbero gli appuntamenti serali.
    let daIso: string | undefined;
    let aIso: string | undefined;
    if (daGiorno && aGiorno) {
      const da = new Date(`${daGiorno}T00:00:00`);
      da.setDate(da.getDate() - 1);
      const a = new Date(`${aGiorno}T23:59:59`);
      a.setDate(a.getDate() + 1);
      daIso = da.toISOString();
      aIso = a.toISOString();
    }

    let items: any[];
    try {
      const q = daIso && aIso
        ? query(
            collection(db, 'appuntamenti'),
            where('userId', '==', getUserId()),
            where('data_ora', '>=', daIso),
            where('data_ora', '<=', aIso)
          )
        : query(collection(db, 'appuntamenti'), where('userId', '==', getUserId()));
      const snap = await getDocs(q);
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      // Indice composito non ancora pubblicato: si riparte da tutto l'elenco.
      console.warn('Query per intervallo non disponibile, ricarico tutto:', err);
      const snap = await getDocs(query(collection(db, 'appuntamenti'), where('userId', '==', getUserId())));
      items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Taglio fine in ora locale, così i confini del giorno sono quelli veri.
    if (daGiorno && aGiorno) {
      const inizio = new Date(`${daGiorno}T00:00:00`).getTime();
      const fine = new Date(`${aGiorno}T23:59:59.999`).getTime();
      items = items.filter((app: any) => {
        const t = new Date(app.data_ora).getTime();
        return t >= inizio && t <= fine;
      });
    }

    return items;
  },
  /** Le prenotazioni arrivate dal sito e non ancora confermate dal salone. */
  getRichieste: async (): Promise<any[]> => {
    const q = query(
      collection(db, 'appuntamenti'),
      where('userId', '==', getUserId()),
      where('stato', '==', 'in_attesa')
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    return items.sort((a, b) => (a.data_ora || '').localeCompare(b.data_ora || ''));
  },
  create: async (data: any) => {
    const ref = doc(collection(db, 'appuntamenti'));
    const payload = { 
      ...data, 
      userId: getUserId(),
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  update: async (id: string, data: any) => {
    const ref = doc(db, 'appuntamenti', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'appuntamenti', id));
    return { success: true };
  }
};

export const buoniApi = {
  getAll: async (): Promise<any[]> => {
    const q = query(collection(db, 'buoni'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  create: async (data: any) => {
    const ref = doc(collection(db, 'buoni'));
    const payload = { ...data, userId: getUserId(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(ref, payload);
    return { id: ref.id, ...payload };
  },
  update: async (id: string, data: any) => {
    const ref = doc(db, 'buoni', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { id, ...data };
  },
  delete: async (id: string) => {
    await deleteDoc(doc(db, 'buoni', id));
    return { success: true };
  }
};
