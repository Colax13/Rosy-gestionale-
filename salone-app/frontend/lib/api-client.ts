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
    await setDoc(ref, data, { merge: true });
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
  getAgenda: async (date?: string, startDate?: string, endDate?: string): Promise<any[]> => {
    // Firestore non supporta easily combined range filters on random timestamps easily without indexes. 
    // Mettiamo un getDocs globale per utente se piccolo, o indexiamo
    const q = query(collection(db, 'appuntamenti'), where('userId', '==', getUserId()));
    const snap = await getDocs(q);
    
    // Filtro locale per comodita senza require index
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (date) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      items = items.filter((app: any) => app.data_ora.startsWith(targetDate));
    } else if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000 - 1; 
      items = items.filter((app: any) => {
        const d = new Date(app.data_ora).getTime();
        return d >= start && d <= end;
      });
    }
    return items;
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
