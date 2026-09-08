// Chi sta usando il programma, e che cosa gli è permesso.
//
// Il salone è uno solo, ma ci lavorano in più persone. Il titolare entra con
// Google; le operatrici entrano con un indirizzo e una password che il
// titolare crea per loro dalla scheda dell'operatore.
//
// I dati non cambiano posto: ogni documento porta già `userId` = il salone, e
// il salone ha lo stesso identificativo del titolare. Quello che cambia è chi
// può leggerli: chi entra viene riconosciuto come titolare (se il salone è
// suo) oppure come membro, leggendo `membri/{uid}`. Se non è né l'uno né
// l'altro, il salone è il suo e basta — che è esattamente come funzionava
// prima, così chi usa già il programma non si accorge di niente.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../src/lib/firebase';

/** Le pagine su cui si può dare o togliere l'accesso. */
export const PAGINE = [
  { chiave: 'agenda',      etichetta: 'Agenda',       percorsi: ['/agenda'] },
  { chiave: 'clienti',     etichetta: 'Clienti',      percorsi: ['/clienti'] },
  { chiave: 'catalogo',    etichetta: 'Servizi',      percorsi: ['/catalogo'] },
  { chiave: 'buoni',       etichetta: 'Buoni',        percorsi: ['/buoni-spa'] },
  { chiave: 'prodotti',    etichetta: 'Prodotti',     percorsi: ['/prodotti'] },
  { chiave: 'report',      etichetta: 'Report',       percorsi: ['/report'] },
  { chiave: 'dipendenti',  etichetta: 'Operatori',    percorsi: ['/dipendenti'] },
  { chiave: 'automazioni', etichetta: 'Automazioni',  percorsi: ['/automazioni'] },
  { chiave: 'rosie',       etichetta: 'Rosie Hub',    percorsi: ['/rosie', '/'] },
  // Le impostazioni restano al titolare: le regole del database non lasciano
  // scrivere il salone a nessun altro, e un permesso che non funziona è
  // peggio di un permesso che non c'è.
  { chiave: 'impostazioni',etichetta: 'Impostazioni', percorsi: ['/settings'], soloTitolare: true }
] as const;

/** Le pagine che si possono davvero concedere a un'operatrice. */
export const PAGINE_CONCEDIBILI = PAGINE.filter(p => !('soloTitolare' in p && p.soloTitolare));

export type ChiavePagina = typeof PAGINE[number]['chiave'];

/** Combinazioni pronte, per non dover spuntare dieci caselle ogni volta. */
export const PROFILI: { nome: string; descrizione: string; permessi: ChiavePagina[] }[] = [
  {
    nome: 'Solo agenda',
    descrizione: 'Vede e gestisce gli appuntamenti, nient\'altro.',
    permessi: ['agenda']
  },
  {
    nome: 'Agenda e clienti',
    descrizione: 'Appuntamenti, anagrafica clienti e listino servizi.',
    permessi: ['agenda', 'clienti', 'catalogo']
  },
  {
    nome: 'Agenda e buoni',
    descrizione: 'Appuntamenti e registro dei buoni.',
    permessi: ['agenda', 'buoni']
  },
  {
    nome: 'Tutto tranne i conti',
    descrizione: 'Tutto, ma non report, operatori e impostazioni.',
    permessi: ['agenda', 'clienti', 'catalogo', 'buoni', 'prodotti', 'rosie']
  }
];

export interface Sessione {
  uid: string;
  salonId: string;
  /** Il titolare vede e fa tutto; l'operatrice solo quello che le è concesso. */
  titolare: boolean;
  nome: string;
  /** null = nessun limite. */
  permessi: ChiavePagina[] | null;
}

let corrente: Sessione | null = null;

/**
 * Capisce in che salone è entrata questa persona.
 * Il titolare non ha un documento in `membri`: il salone è il suo.
 */
export async function apriSessione(uid: string, nome: string): Promise<Sessione> {
  let sessione: Sessione = { uid, salonId: uid, titolare: true, nome, permessi: null };

  try {
    const membro = await getDoc(doc(db, 'membri', uid));
    if (membro.exists()) {
      const dati = membro.data() as any;
      if (dati.attivo === false) {
        throw new Error("Questo accesso è stato sospeso. Chiedi alla titolare di riattivarlo.");
      }
      if (dati.salonId) {
        sessione = {
          uid,
          salonId: dati.salonId,
          titolare: false,
          nome: dati.nome || nome,
          permessi: Array.isArray(dati.permessi) ? dati.permessi : ['agenda']
        };
      }
    }
  } catch (err: any) {
    // Se il messaggio è nostro va mostrato; un errore di rete no: si continua
    // come titolare, che è il comportamento di sempre.
    if (err?.message?.includes('sospeso')) throw err;
    console.warn('Non sono riuscito a leggere il profilo: proseguo come titolare.', err);
  }

  corrente = sessione;
  return sessione;
}

/** Solo per l'anteprima e le prove: apre una sessione senza passare da Firebase. */
export function impostaSessione(sessione: Sessione) {
  corrente = sessione;
}

export function chiudiSessione() {
  corrente = null;
}

export function sessioneCorrente(): Sessione | null {
  return corrente;
}

/** L'identificativo del salone a cui appartengono i dati. */
export function idSalone(): string | null {
  return corrente?.salonId || null;
}

/** True se questa persona può aprire quella pagina. */
export function puoVedere(chiave: ChiavePagina): boolean {
  if (!corrente) return false;
  if (corrente.permessi === null) return true;
  return corrente.permessi.includes(chiave);
}

/** True se può aprire quel percorso della barra laterale. */
export function puoAprirePercorso(percorso: string): boolean {
  if (!corrente) return false;
  if (corrente.permessi === null) return true;
  const pagina = PAGINE.find(p => (p.percorsi as readonly string[]).includes(percorso));
  if (!pagina) return true;
  return corrente.permessi.includes(pagina.chiave);
}

/** La prima pagina che questa persona può aprire: dove mandarla dopo l'accesso. */
export function primaPaginaPermessa(): string {
  if (!corrente || corrente.permessi === null) return '/';
  for (const pagina of PAGINE) {
    if (corrente.permessi.includes(pagina.chiave)) return pagina.percorsi[0];
  }
  return '/agenda';
}
