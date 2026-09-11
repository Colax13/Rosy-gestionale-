// Quello che il mondo esterno può vedere del salone.
//
// La pagina di prenotazione gira senza login. Prima, per sapere quando le
// operatrici erano occupate, leggeva gli appuntamenti veri — e con quelli si
// portava dietro nome, cognome e telefono di ogni cliente. Chi conosceva
// l'indirizzo del progetto poteva scaricarsi la rubrica del salone.
//
// Adesso fuori escono solo due cose, e nessuna delle due contiene una persona:
//
//   VETRINA      il listino e le operatrici, con i soli campi che servono a
//                far scegliere: niente note private, niente email.
//   DISPONIBILITÀ  gli orari in cui ciascuna è occupata. Chi la legge sa che
//                Giulia è presa dalle 15 alle 16, non chi ha per le mani.
//
// Gli appuntamenti veri restano chiusi a chiave come i clienti.

import { segmentiAppuntamento, NON_ASSEGNATO } from './servizi';

export interface ServizioVetrina {
  id: string;
  nome: string;
  categoria: string;
  prezzo_base: number;
  durata_minuti: number;
  tempo_lavorazione_minuti: number;
  tempo_posa_minuti: number;
  tempo_finitura_minuti: number;
  note_pubbliche: string;
}

export interface OperatoreVetrina {
  id: string;
  nome: string;
  cognome: string;
  fotoUrl: string;
  /** Servono a calcolare gli orari liberi: non sono dati di nessuno. */
  turni: any;
  /** Quali servizi sa fare. Vuoto = li fa tutti. */
  servizi: string[];
}

export interface Vetrina {
  userId: string;
  servizi: ServizioVetrina[];
  operatori: OperatoreVetrina[];
  aggiornato: string;
}

/** Un servizio ripulito: fuori restano le note private, i costi, i margini. */
export function servizioPerVetrina(s: any): ServizioVetrina {
  return {
    id: String(s?.id || ''),
    nome: String(s?.nome || ''),
    categoria: String(s?.categoria || 'Generico'),
    prezzo_base: Number(s?.prezzo_base ?? s?.prezzo) || 0,
    durata_minuti: Number(s?.durata_minuti) || 0,
    tempo_lavorazione_minuti: Number(s?.tempo_lavorazione_minuti) || 0,
    tempo_posa_minuti: Number(s?.tempo_posa_minuti) || 0,
    tempo_finitura_minuti: Number(s?.tempo_finitura_minuti) || 0,
    note_pubbliche: String(s?.note_pubbliche || '')
  };
}

/** Un'operatrice ripulita: fuori resta l'email, e tutto il resto della scheda. */
export function operatorePerVetrina(d: any): OperatoreVetrina {
  return {
    id: String(d?.id || ''),
    nome: String(d?.nome || ''),
    cognome: String(d?.cognome || ''),
    fotoUrl: String(d?.fotoUrl || ''),
    turni: d?.turni || null,
    servizi: Array.isArray(d?.servizi) ? d.servizi.map(String) : []
  };
}

/** La vetrina intera: solo quello che è attivo, solo i campi che servono. */
export function costruisciVetrina(userId: string, catalogo: any[], dipendenti: any[]): Vetrina {
  return {
    userId,
    servizi: (catalogo || []).filter(s => s?.attivo !== false).map(servizioPerVetrina),
    operatori: (dipendenti || []).filter(d => d?.attivo !== false).map(operatorePerVetrina),
    aggiornato: new Date().toISOString()
  };
}

// ---------------------------------------------------------------------------
// Disponibilità
// ---------------------------------------------------------------------------

export interface Fascia {
  id_dipendente: string;
  inizio: string; // ISO
  fine: string;   // ISO
}

export interface Disponibilita {
  userId: string;
  /** Serve solo a fare pulizia del passato: non dice niente di nessuno. */
  giorno: string; // AAAA-MM-GG
  fasce: Fascia[];
}

/**
 * Quando, e per chi, questo appuntamento tiene occupata l'agenda.
 *
 * Due cose che rendono queste fasce più giuste di quello che si faceva prima:
 * la posa non ci finisce — lì l'operatrice è libera e ci si può prenotare —
 * e ogni fase va sotto chi la fa davvero, anche quando il colore è di una e
 * la finitura di un'altra.
 */
export function fascePerDisponibilita(app: any): Fascia[] {
  if (!app?.data_ora) return [];
  if (app.stato === 'annullato') return [];

  const inizioMs = new Date(app.data_ora).getTime();
  if (!Number.isFinite(inizioMs)) return [];

  const operatoreApp = app.id_dipendente || app.dipendenti?.id || app.idDipendente || NON_ASSEGNATO;
  const segmenti = segmentiAppuntamento(app.righe_appuntamento || [], operatoreApp);

  const fasce: Fascia[] = [];
  segmenti
    .filter(s => s.tipo === 'lavorazione')
    .forEach(s => {
      const inizio = inizioMs + s.inizio * 60000;
      const fine = inizio + s.durata * 60000;
      const ultima = fasce[fasce.length - 1];
      // Fasi di fila della stessa persona diventano una fascia sola.
      if (ultima && ultima.id_dipendente === s.operatore && new Date(ultima.fine).getTime() >= inizio) {
        ultima.fine = new Date(Math.max(new Date(ultima.fine).getTime(), fine)).toISOString();
        return;
      }
      fasce.push({
        id_dipendente: s.operatore,
        inizio: new Date(inizio).toISOString(),
        fine: new Date(fine).toISOString()
      });
    });

  return fasce;
}

/** Il documento da mettere nella lista pubblica per questo appuntamento. */
export function disponibilitaPerAppuntamento(userId: string, app: any): Disponibilita {
  const fasce = fascePerDisponibilita(app);
  const quando = app?.data_ora ? new Date(app.data_ora) : new Date();
  const giorno = Number.isFinite(quando.getTime())
    ? `${quando.getFullYear()}-${String(quando.getMonth() + 1).padStart(2, '0')}-${String(quando.getDate()).padStart(2, '0')}`
    : '';
  return { userId, giorno, fasce };
}

/** True se quell'operatrice è occupata in quell'intervallo. */
export function occupata(fasce: Fascia[], idDipendente: string, inizioMs: number, fineMs: number): boolean {
  return (fasce || []).some(f => {
    if (f.id_dipendente !== idDipendente) return false;
    const a = new Date(f.inizio).getTime();
    const b = new Date(f.fine).getTime();
    return a < fineMs && inizioMs < b;
  });
}
