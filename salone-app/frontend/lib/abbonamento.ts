// L'abbonamento di un salone: che piano ha, quali funzioni ha accese, quanti
// SMS ha compresi nel mese.
//
// Prima, per accendere una funzione a un salone, si scriveva il suo indirizzo
// email dentro il codice e nelle regole del database, e si ripubblicava tutto.
// Andava bene con un salone solo. Adesso ogni salone ha un documento suo
// (`abbonamenti/{salone}`) che si cambia dal pannello, senza toccare il codice.
//
// Quel documento lo scrive SOLO il server, e solo per chi è nell'elenco degli
// amministratori: il titolare del salone lo legge ma non può cambiarlo,
// altrimenti si accenderebbe da solo le funzioni a pagamento.

import { meseDi } from './consumi-ia';

export const COLLEZIONE_ABBONAMENTI = 'abbonamenti';
export const COLLEZIONE_CONSUMI_SMS = 'consumi_sms';

export interface Piano {
  chiave: string;
  nome: string;
  /** Prezzo al mese, in euro. Qui è solo un promemoria: non si incassa da qui. */
  prezzo: number;
  /** SMS compresi nel mese. 0 = il piano non ha SMS. */
  sms: number;
  descrizione: string;
}

/**
 * I piani. I prezzi e gli SMS compresi sono una proposta, da decidere: si
 * cambiano qui in un posto solo. Per un salone si può sempre scrivere un
 * numero di SMS diverso dal pannello.
 */
export const PIANI: Piano[] = [
  { chiave: 'prova', nome: 'In prova', prezzo: 0, sms: 0, descrizione: 'Salone appena entrato, non ancora attivato.' },
  { chiave: 'base', nome: 'Base', prezzo: 29, sms: 0, descrizione: 'Tutto il gestionale, senza SMS: email e tasto WhatsApp.' },
  { chiave: 'messaggi', nome: 'Con messaggi', prezzo: 35, sms: 150, descrizione: 'Come Base, con un pacchetto di SMS compreso ogni mese.' }
];

export const PIANO_DI_PARTENZA = 'prova';

export function pianoDi(chiave?: string | null): Piano {
  return PIANI.find(p => p.chiave === chiave) || PIANI.find(p => p.chiave === PIANO_DI_PARTENZA)!;
}

/**
 * Le funzioni che si accendono per salone dal pannello.
 *
 * Solo i Buoni, per ora. I messaggi automatici e i buoni letti dal foglio
 * restano legati a RD Salon nel codice: il tablet che manda gli SMS e il
 * foglio Google sono suoi, e accenderli a un altro salone manderebbe SMS dal
 * numero di RD Salon. Entreranno qui quando ogni salone avrà il suo postino.
 */
export const FUNZIONI_ACCENDIBILI = [
  { chiave: 'buoni', etichetta: 'Buoni', descrizione: 'La pagina dei buoni regalo (spa e salone).' }
] as const;

export type ChiaveAccendibile = typeof FUNZIONI_ACCENDIBILI[number]['chiave'];

export function eAccendibile(chiave: string): chiave is ChiaveAccendibile {
  return FUNZIONI_ACCENDIBILI.some(f => f.chiave === chiave);
}

export interface Abbonamento {
  piano: string;
  funzioni: Partial<Record<ChiaveAccendibile, boolean>>;
  /** SMS compresi scelti a mano per questo salone; null = quelli del piano. */
  sms_inclusi: number | null;
  note: string;
  aggiornato?: string;
  aggiornato_da?: string;
}

/** Un abbonamento letto dal database, rimesso in forma: niente campi strani. */
export function leggiAbbonamento(grezzo: any): Abbonamento {
  const g = grezzo && typeof grezzo === 'object' ? grezzo : {};
  const funzioni: Abbonamento['funzioni'] = {};
  FUNZIONI_ACCENDIBILI.forEach(f => {
    if (g.funzioni && g.funzioni[f.chiave] === true) funzioni[f.chiave] = true;
  });
  const sms = Number(g.sms_inclusi);
  return {
    piano: PIANI.some(p => p.chiave === g.piano) ? g.piano : PIANO_DI_PARTENZA,
    funzioni,
    sms_inclusi: g.sms_inclusi !== null && g.sms_inclusi !== undefined && g.sms_inclusi !== '' && Number.isFinite(sms) && sms >= 0
      ? Math.min(100000, Math.trunc(sms))
      : null,
    note: typeof g.note === 'string' ? g.note.slice(0, 2000) : '',
    aggiornato: typeof g.aggiornato === 'string' ? g.aggiornato : undefined,
    aggiornato_da: typeof g.aggiornato_da === 'string' ? g.aggiornato_da : undefined
  };
}

/** Quanti SMS ha compresi nel mese: quelli scritti a mano, altrimenti quelli del piano. */
export function smsInclusi(a: Abbonamento): number {
  return a.sms_inclusi !== null ? a.sms_inclusi : pianoDi(a.piano).sms;
}

// --- Il contatore degli SMS -------------------------------------------------

/** Il documento del contatore per quel salone e quel mese ("2026-11"). */
export const idConsumoSms = (salonId: string, mese: string = meseDi()) => `${salonId}_${mese}`;

export interface ConsumoSms {
  mese: string;
  /** Consegnati al postino: sono quelli che costano. */
  mandati: number;
  /** Provati e non partiti: non costano, ma vanno visti. */
  falliti: number;
}

export function leggiConsumoSms(grezzo: any, mese: string = meseDi()): ConsumoSms {
  const n = (v: any) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.trunc(Number(v)) : 0);
  return { mese: typeof grezzo?.mese === 'string' ? grezzo.mese : mese, mandati: n(grezzo?.mandati), falliti: n(grezzo?.falliti) };
}

export type LivelloSms = 'senza' | 'ok' | 'quasi' | 'oltre';

export interface StatoSms {
  mandati: number;
  inclusi: number;
  restano: number;
  /** Quanti ne sono partiti oltre quelli compresi. */
  extra: number;
  livello: LivelloSms;
}

/**
 * A che punto è il mese. Non blocca niente: serve a far vedere, al salone e a
 * chi gestisce, quanto si è consumato e quanto è fuori dal pacchetto.
 */
export function statoSms(mandati: number, inclusi: number): StatoSms {
  const m = Math.max(0, Math.trunc(Number(mandati) || 0));
  const i = Math.max(0, Math.trunc(Number(inclusi) || 0));
  const extra = Math.max(0, m - i);
  const livello: LivelloSms = i === 0 ? 'senza' : m > i ? 'oltre' : m >= i * 0.8 ? 'quasi' : 'ok';
  return { mandati: m, inclusi: i, restano: Math.max(0, i - m), extra, livello };
}

// --- Chi può aprire il pannello ---------------------------------------------

/** "a@x.it, B@x.it" → ['a@x.it', 'b@x.it']. */
export function leggiAmministratori(elenco?: string | null): string[] {
  return (elenco || '')
    .split(/[,;\s]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

/**
 * True se quell'indirizzo, verificato, è fra gli amministratori.
 * L'indirizzo deve essere VERIFICATO: gli accessi delle operatrici si creano
 * con un indirizzo qualsiasi e una password, e nessuno controlla che la
 * casella sia loro. Senza questa condizione basterebbe crearne uno con
 * l'indirizzo di un amministratore.
 */
export function eAmministratore(email: string | null | undefined, verificata: boolean, elenco: string[]): boolean {
  const e = (email || '').trim().toLowerCase();
  return !!e && verificata === true && elenco.includes(e);
}
