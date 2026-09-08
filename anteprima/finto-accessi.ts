// Gestione accessi finta, solo per l'anteprima.
import type { ChiavePagina } from '@/lib/sessione';

export interface Membro {
  uid: string;
  salonId: string;
  nome: string;
  email: string;
  permessi: ChiavePagina[];
  attivo: boolean;
  idDipendente?: string | null;
}

let membri: Membro[] = [
  { uid: 'u2', salonId: 'salone', nome: 'Giulia', email: 'giulia@salone.it', permessi: ['agenda', 'clienti', 'catalogo'], attivo: true, idDipendente: 'd2' },
  { uid: 'u3', salonId: 'salone', nome: 'Martina', email: 'martina@salone.it', permessi: ['agenda'], attivo: false, idDipendente: 'd3' },
];

export async function elencoMembri() { return membri; }

export async function creaAccesso(o: any) {
  const uid = `u${membri.length + 2}`;
  membri.push({ uid, salonId: o.salonId, nome: o.nome, email: o.email, permessi: o.permessi, attivo: true, idDipendente: o.idDipendente });
  return uid;
}

export async function aggiornaAccesso(uid: string, dati: any) {
  membri = membri.map(m => m.uid === uid ? { ...m, ...dati } : m);
}

export async function revocaAccesso(uid: string) {
  membri = membri.filter(m => m.uid !== uid);
}

export function spiegaErroreAccesso(e: any) { return e?.message || 'Errore'; }
