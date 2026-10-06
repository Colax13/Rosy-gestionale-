// Le regole dei buoni, fuori dalla pagina perché si possano provare da sole.
//
// Un buono ha due persone: chi lo regala (e paga) e chi lo riceve. Spesso
// sono la stessa persona, e allora basta un nome solo. I buoni importati dal
// foglio prima di questa divisione avevano chi paga scritto nelle note
// ("Pagato da …"): qui si rilegge da lì, così non serve correggerli a mano.

/** Il buono spa ha un prezzo fisso; la piega si aggiunge con una spunta. */
export const PREZZO_SPA = 50;
export const PREZZO_PIEGA = 20;

export const prezzoSpa = (piega: boolean) => PREZZO_SPA + (piega ? PREZZO_PIEGA : 0);

export type Tipo = 'spa' | 'salone';
export type Canale = 'online' | 'salone';

/** Venduto online (dal sito, arrivato dal foglio) o al banco del salone. */
export function canaleDi(b: any): Canale {
  const origine = (b?.origine || 'manuale').toString();
  return origine === 'manuale' ? 'salone' : 'online';
}

export interface Persona { nome: string; telefono: string; email: string }

const testo = (v: any) => (v ?? '').toString().trim();
const uguali = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ') === b.toLowerCase().replace(/\s+/g, ' ');

/** Chi regala e chi riceve, anche per i buoni scritti prima che esistessero i due campi. */
export function persone(b: any): { regala: Persona; riceve: Persona; stessa: boolean } {
  const riceve: Persona = { nome: testo(b?.intestatario), telefono: testo(b?.telefono), email: '' };
  let regala: Persona = {
    nome: testo(b?.acquirente),
    telefono: testo(b?.acquirente_telefono),
    email: testo(b?.acquirente_email)
  };

  const vecchio = !regala.nome && !regala.telefono && !regala.email;
  if (vecchio) {
    const note = testo(b?.note);
    const pagato = /Pagato da ([^·\n]+)/.exec(note);
    const email = /[^\s·]+@[^\s·]+/.exec(note);
    if (pagato) {
      // Nel foglio il telefono è quello di chi paga: era finito sotto la
      // beneficiaria solo perché non c'era un altro posto dove metterlo.
      regala = { nome: pagato[1].trim(), telefono: riceve.telefono, email: email ? email[0] : '' };
      riceve.telefono = '';
    } else {
      regala = { nome: riceve.nome, telefono: riceve.telefono, email: email ? email[0] : '' };
    }
  }

  const stessa = !regala.nome || !riceve.nome || uguali(regala.nome, riceve.nome);
  return { regala, riceve, stessa };
}

/** Le note senza le righe che ora hanno un posto loro (chi ha pagato, la sua email). */
export function noteVisibili(b: any): string {
  if (testo(b?.acquirente)) return testo(b?.note);
  return testo(b?.note)
    .split(' · ')
    .filter(p => !/^Pagato da /.test(p) && !/^[^\s]+@[^\s]+$/.test(p.trim()))
    .join(' · ');
}

export const oggiIso = () => new Date().toISOString().split('T')[0];

/** Un buono vale 6 mesi dal giorno in cui è stato rilasciato. Non si sceglie a mano. */
export const MESI_VALIDITA = 6;

/**
 * Il giorno di scadenza, da un giorno di rilascio "AAAA-MM-GG".
 * 31 agosto + 6 mesi = 28 (o 29) febbraio: se il mese non ha quel giorno, si
 * prende l'ultimo del mese invece di scivolare a marzo.
 */
export function scadenzaDa(rilascio?: string | null, mesi = MESI_VALIDITA): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(rilascio || '');
  if (!m) return '';
  const anno = Number(m[1]), mese = Number(m[2]) - 1 + mesi, giorno = Number(m[3]);
  const annoFin = anno + Math.floor(mese / 12), meseFin = ((mese % 12) + 12) % 12;
  const ultimo = new Date(Date.UTC(annoFin, meseFin + 1, 0)).getUTCDate();
  const g = Math.min(giorno, ultimo);
  return `${annoFin}-${String(meseFin + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`;
}

/**
 * La scadenza vera di un buono: 6 mesi dal rilascio. Vale anche per i buoni
 * scritti prima, che avevano una scadenza messa a mano; solo quelli senza
 * data di rilascio tengono quella che hanno.
 */
export const scadenzaDi = (b: any): string =>
  scadenzaDa(b?.data_emissione) || (b?.data_scadenza || '');

export const isScaduto = (b: any, oggi = oggiIso()) => {
  const scade = scadenzaDi(b);
  return !!scade && scade < oggi && b?.stato === 'attivo';
};

/** Le tre tabelle di ogni registro: da usare, scaduti, già usati. */
export type Fase = 'attivi' | 'scaduti' | 'usati';

export function faseDi(b: any, oggi = oggiIso()): Fase {
  if (b?.stato === 'usato' || b?.stato === 'annullato') return 'usati';
  return isScaduto(b, oggi) ? 'scaduti' : 'attivi';
}

export interface Filtro {
  tipo: Tipo;
  canale: 'tutti' | Canale;
  fase: 'tutte' | Fase;
  ricerca: string;
}

/** I buoni senza tipo sono spa: erano tutti spa prima che esistesse la scelta. */
export const tipoDi = (b: any): Tipo => (b?.tipo === 'salone' ? 'salone' : 'spa');

export function filtraBuoni<T>(buoni: T[], f: Filtro, oggi = oggiIso()): T[] {
  const q = f.ricerca.trim().toLowerCase();
  return buoni.filter((b: any) => {
    if (tipoDi(b) !== f.tipo) return false;
    if (f.canale !== 'tutti' && canaleDi(b) !== f.canale) return false;
    if (f.fase !== 'tutte' && faseDi(b, oggi) !== f.fase) return false;
    if (!q) return true;
    const { regala, riceve } = persone(b);
    return [b.codice, regala.nome, riceve.nome, regala.email]
      .some(v => (v || '').toLowerCase().includes(q))
      || [regala.telefono, riceve.telefono].some(t => t && t.replace(/\s/g, '').includes(q.replace(/\s/g, '')));
  });
}

/** Quanti buoni per tabella, per scriverlo accanto alla scelta. */
export function contaPerFase(buoni: any[], oggi = oggiIso()): Record<Fase, number> {
  const conti: Record<Fase, number> = { attivi: 0, scaduti: 0, usati: 0 };
  buoni.forEach(b => { conti[faseDi(b, oggi)]++; });
  return conti;
}

/** In cima quelli che scadono prima; fra gli usati, gli ultimi usati. */
export function ordinaBuoni<T>(buoni: T[], fase: Fase): T[] {
  return [...buoni].sort((a: any, b: any) => {
    if (fase === 'usati') return (b.data_emissione || '').localeCompare(a.data_emissione || '');
    return (scadenzaDi(a) || '9999').localeCompare(scadenzaDi(b) || '9999');
  });
}

export function riepilogo(buoni: any[], oggi = oggiIso()) {
  const attivi = buoni.filter(b => b.stato === 'attivo');
  return {
    attivi: attivi.length,
    daScalare: attivi.reduce((acc, b) => acc + (Number(b.valore_residuo) || 0), 0),
    scaduti: buoni.filter(b => isScaduto(b, oggi)).length
  };
}
