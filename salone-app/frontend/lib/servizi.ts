// Logica condivisa fra agenda, sidebar di inserimento e prenotazione pubblica.
//
// Due concetti che prima erano sparsi (e indovinati) nel codice:
//
//  1. TEMPI DI UN SERVIZIO — ogni servizio del catalogo ha un tempo di
//     lavorazione (l'operatore è occupato) e un tempo di posa (l'operatore è
//     libero e può prendere un'altra cliente). Prima la posa veniva dedotta dal
//     nome del servizio; adesso si legge dai campi del catalogo.
//
//  2. TURNI — ogni dipendente ha i suoi giorni e le sue fasce orarie. Prima
//     l'agenda usava un 9:00-18:00 fisso uguale per tutti.

export interface TempiServizio {
  lavorazione: number;  // prima lavorazione: operatore occupato
  posa: number;         // posa: operatore libero
  finitura: number;     // lavorazione finale: operatore occupato
  totale: number;
}

export interface Segmento {
  tipo: 'lavorazione' | 'posa';
  nome: string;
  inizio: number; // minuti dall'inizio dell'appuntamento
  durata: number;
}

export interface Intervallo {
  inizio: number; // timestamp ms
  fine: number;
}

export const DURATA_DEFAULT = 30;

/** Le tre fasi di un servizio del catalogo: lavorazione, posa, finitura. */
export function tempiServizio(servizio: any): TempiServizio {
  const durata = Math.max(0, Number(servizio?.durata_minuti) || 0);
  const posa = Math.max(0, Number(servizio?.tempo_posa_minuti) || 0);
  const finitura = Math.max(0, Number(servizio?.tempo_finitura_minuti) || 0);

  const lavorazioneDichiarata = Number(servizio?.tempo_lavorazione_minuti);
  const lavorazione = Number.isFinite(lavorazioneDichiarata) && lavorazioneDichiarata > 0
    ? lavorazioneDichiarata
    : Math.max(0, durata - posa - finitura);

  const totale = lavorazione + posa + finitura;
  if (totale <= 0) {
    return { lavorazione: DURATA_DEFAULT, posa: 0, finitura: 0, totale: DURATA_DEFAULT };
  }
  return { lavorazione, posa, finitura, totale };
}

/**
 * Scompone un appuntamento nei suoi segmenti in ordine: lavorazione, posa,
 * lavorazione... I minuti sono relativi all'inizio dell'appuntamento.
 */
export function segmentiAppuntamento(righe: any[]): Segmento[] {
  const segmenti: Segmento[] = [];
  let cursore = 0;

  (righe || []).forEach((riga: any) => {
    const servizio = riga?.servizi_catalogo || riga || {};
    const nome = servizio.nome || 'Servizio';
    const { lavorazione, posa, finitura } = tempiServizio(servizio);

    if (lavorazione > 0) {
      segmenti.push({ tipo: 'lavorazione', nome, inizio: cursore, durata: lavorazione });
      cursore += lavorazione;
    }

    if (posa > 0) {
      segmenti.push({ tipo: 'posa', nome: 'Posa', inizio: cursore, durata: posa });
      cursore += posa;
    }

    if (finitura > 0) {
      segmenti.push({
        tipo: 'lavorazione',
        nome: `${nome} · finitura`,
        inizio: cursore,
        durata: finitura
      });
      cursore += finitura;
    }
  });

  if (segmenti.length === 0) {
    segmenti.push({ tipo: 'lavorazione', nome: 'Servizio', inizio: 0, durata: DURATA_DEFAULT });
  }

  return segmenti;
}

/** Durata complessiva, posa inclusa: quanto spazio occupa la card in agenda. */
export function durataTotale(righe: any[]): number {
  const segmenti = segmentiAppuntamento(righe);
  const ultimo = segmenti[segmenti.length - 1];
  return ultimo.inizio + ultimo.durata;
}

/** Minuti in cui l'operatore è davvero impegnato (posa esclusa). */
export function durataLavorazione(righe: any[]): number {
  return segmentiAppuntamento(righe)
    .filter(s => s.tipo === 'lavorazione')
    .reduce((acc, s) => acc + s.durata, 0);
}

/**
 * Gli intervalli in cui l'operatore è occupato. Durante la posa NON è occupato:
 * è lì che si apre il buco in cui infilare un'altra cliente.
 */
export function intervalliOccupati(inizioMs: number, righe: any[]): Intervallo[] {
  const occupati: Intervallo[] = [];

  segmentiAppuntamento(righe)
    .filter(s => s.tipo === 'lavorazione')
    .forEach(s => {
      const inizio = inizioMs + s.inizio * 60000;
      const fine = inizio + s.durata * 60000;
      const precedente = occupati[occupati.length - 1];
      if (precedente && precedente.fine >= inizio) {
        precedente.fine = Math.max(precedente.fine, fine);
      } else {
        occupati.push({ inizio, fine });
      }
    });

  return occupati;
}

/** True se i due appuntamenti si pestano i piedi sulle sole lavorazioni. */
export function sovrappongono(
  inizioA: number, righeA: any[],
  inizioB: number, righeB: any[]
): boolean {
  const a = intervalliOccupati(inizioA, righeA);
  const b = intervalliOccupati(inizioB, righeB);
  return a.some(x => b.some(y => x.inizio < y.fine && y.inizio < x.fine));
}

// ---------------------------------------------------------------------------
// Turni
// ---------------------------------------------------------------------------

export const GIORNI_SETTIMANA = [
  'domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'
];

export interface FasciaMinuti {
  inizio: number; // minuti dalla mezzanotte
  fine: number;
}

export interface TurnoDelGiorno {
  lavora: boolean;
  tipo: 'riposo' | 'lavoro' | 'lavoro_permesso' | 'ferie' | 'malattia';
  fasce: FasciaMinuti[];
  etichetta: string;
}

function minutiDaOrario(orario: string | undefined, fallback: number): number {
  if (typeof orario !== 'string') return fallback;
  const [h, m] = orario.split(':').map(Number);
  if (!Number.isFinite(h)) return fallback;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

const ETICHETTE: Record<string, string> = {
  riposo: 'Riposo',
  ferie: 'Ferie',
  malattia: 'Malattia',
  lavoro: 'In turno',
  lavoro_permesso: 'In turno'
};

/**
 * Turno di un dipendente in una certa data, normalizzato in fasce di minuti.
 * Regge sia il formato nuovo (fasce) sia quello vecchio (inizio/fine secchi).
 */
export function turnoDelGiorno(dipendente: any, data: Date): TurnoDelGiorno {
  const giorno = GIORNI_SETTIMANA[data.getDay()];
  const turno = dipendente?.turni?.[giorno];

  if (!turno) {
    return { lavora: false, tipo: 'riposo', fasce: [], etichetta: 'Nessun turno' };
  }

  let tipo = turno.tipo || (turno.attivo ? 'lavoro' : 'riposo');
  if (tipo === 'permesso') tipo = 'lavoro_permesso';

  if (!turno.attivo || tipo === 'riposo' || tipo === 'ferie' || tipo === 'malattia') {
    return { lavora: false, tipo, fasce: [], etichetta: ETICHETTE[tipo] || 'Non in turno' };
  }

  const fasce: FasciaMinuti[] = [];

  if (tipo === 'lavoro_permesso') {
    const base = turno.orarioBase || { inizio: '09:00', fine: '18:00' };
    const permesso = turno.orarioPermesso || { inizio: '14:00', fine: '15:00' };
    const inizio = minutiDaOrario(base.inizio, 9 * 60);
    const fine = minutiDaOrario(base.fine, 18 * 60);
    const pausaInizio = minutiDaOrario(permesso.inizio, 14 * 60);
    const pausaFine = minutiDaOrario(permesso.fine, 15 * 60);

    if (pausaInizio > inizio) fasce.push({ inizio, fine: Math.min(pausaInizio, fine) });
    if (pausaFine < fine) fasce.push({ inizio: Math.max(pausaFine, inizio), fine });
    if (fasce.length === 0) fasce.push({ inizio, fine });
  } else {
    const elenco = Array.isArray(turno.fasce) && turno.fasce.length > 0
      ? turno.fasce
      : [{ inizio: turno.inizio || '09:00', fine: turno.fine || '18:00' }];

    elenco.forEach((f: any) => {
      const inizio = minutiDaOrario(f.inizio, 9 * 60);
      const fine = minutiDaOrario(f.fine, 18 * 60);
      if (fine > inizio) fasce.push({ inizio, fine });
    });
  }

  fasce.sort((a, b) => a.inizio - b.inizio);

  return {
    lavora: fasce.length > 0,
    tipo,
    fasce,
    etichetta: ETICHETTE[tipo] || 'In turno'
  };
}

/** True se quel minuto della giornata cade dentro una fascia di lavoro. */
export function dentroTurno(turno: TurnoDelGiorno, minuti: number): boolean {
  return turno.fasce.some(f => minuti >= f.inizio && minuti < f.fine);
}

/** Riassunto leggibile del turno, es. "09:00-13:00 · 15:00-19:00". */
export function descriviTurno(turno: TurnoDelGiorno): string {
  if (!turno.lavora) return turno.etichetta;
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return turno.fasce.map(f => `${fmt(f.inizio)}-${fmt(f.fine)}`).join(' · ');
}
