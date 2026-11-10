// Il riepilogo della giornata (o della settimana, o del mese), senza che
// nessuno debba fare niente.
//
// Il report contava solo gli appuntamenti chiusi con "Completa appuntamento".
// In salone non sempre si chiudono uno per uno, e allora il report restava a
// zero e nessuno lo apriva più. Qui ogni appuntamento vale qualcosa comunque:
//
//   - chiuso con il conto   → quello che è stato incassato davvero ("reale");
//   - passato ma non chiuso → il prezzo di listino dei suoi servizi ("stima");
//   - ancora da fare        → il prezzo di listino, come "previsto".
//
// Non si scrive niente sul database: sono solo conti fatti su quello che c'è.

import { aData } from './tempo';
import { prezzoDiListino } from './preconto';

export type TipoValore = 'reale' | 'stima' | 'previsto' | 'niente';

export interface ValoreAppuntamento {
  importo: number;
  tipo: TipoValore;
}

export interface RigaOperatrice {
  id: string;
  nome: string;
  cognome: string;
  appuntamenti: number;
  reale: number;
  stima: number;
  previsto: number;
}

export interface Riepilogo {
  /** Appuntamenti veri del periodo: niente pause, annullati o richieste non confermate. */
  appuntamenti: number;
  /** Quelli già passati (chiusi o no). */
  fatti: number;
  /** Quelli che devono ancora arrivare. */
  daFare: number;
  /** Chiusi con il conto. */
  chiusi: number;
  /** Passati ma senza conto: sono quelli che fanno la stima. */
  nonChiusi: number;
  /** Incassato davvero (appuntamenti chiusi). */
  reale: number;
  /** Stima dal listino degli appuntamenti passati non chiusi. */
  stima: number;
  /** Listino degli appuntamenti ancora da fare. */
  previsto: number;
  /** reale + stima: quanto dovrebbe essere entrato finora. */
  finora: number;
  /** reale + stima + previsto: come dovrebbe chiudersi il periodo. */
  totale: number;
  /** Richieste dal sito ancora da confermare (non contano negli incassi). */
  richieste: number;
  annullati: number;
  /** Appuntamenti senza prezzo: servizi che a listino non si trovano. */
  senzaPrezzo: number;
  perOperatrice: RigaOperatrice[];
}

const soldi = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Una pausa segnata in agenda, non una cliente. */
export const ePausa = (app: any) =>
  app?.id_cliente === 'block-client' || app?.clienti?.id === 'block-client';

/** Annullato o rifiutato: non è successo. */
export const eAnnullato = (app: any) =>
  app?.stato === 'annullato' || app?.stato === 'rifiutato';

/** Il prezzo di listino dei servizi fissati; `null` se non se ne trova nemmeno uno. */
export function listinoAppuntamento(app: any, catalogo: any[]): number | null {
  const righe: any[] = app?.righe_appuntamento || [];
  let somma = 0;
  let trovati = 0;
  righe.forEach(riga => {
    const nome = riga?.servizi_catalogo?.nome || riga?.nome || '';
    // Prima il listino di oggi, come fa il preconto; se il servizio non c'è
    // più si usa il prezzo che l'appuntamento si era portato dietro.
    let prezzo = prezzoDiListino(nome, catalogo);
    if (prezzo === null) {
      const suo = Number(riga?.servizi_catalogo?.prezzo_base ?? riga?.servizi_catalogo?.prezzo ?? riga?.prezzo);
      prezzo = Number.isFinite(suo) ? suo : null;
    }
    if (prezzo !== null) { somma += prezzo; trovati++; }
  });
  return trovati ? soldi(somma) : null;
}

/** Quanto vale un appuntamento, e se è un incasso vero o una stima. */
export function valoreAppuntamento(app: any, catalogo: any[], adesso = new Date()): ValoreAppuntamento {
  if (ePausa(app) || eAnnullato(app) || app?.stato === 'in_attesa') return { importo: 0, tipo: 'niente' };

  // Chiuso con il conto: vale quello che c'è scritto, anche se è zero
  // (un omaggio è un omaggio, non una stima).
  if (app?.stato === 'completato' && app?.prezzo_finale !== undefined && app?.prezzo_finale !== null
      && Number.isFinite(Number(app.prezzo_finale))) {
    return { importo: soldi(Number(app.prezzo_finale)), tipo: 'reale' };
  }

  const quando = aData(app?.data_ora);
  const listino = listinoAppuntamento(app, catalogo);
  const passato = !!quando && quando.getTime() <= adesso.getTime();
  return { importo: listino ?? 0, tipo: passato || app?.stato === 'completato' ? 'stima' : 'previsto' };
}

/** Il riepilogo degli appuntamenti fra due momenti (compresi). */
export function riepilogoPeriodo(
  appuntamenti: any[], catalogo: any[], da: Date, a: Date, adesso = new Date(), operatrici: any[] = []
): Riepilogo {
  const r: Riepilogo = {
    appuntamenti: 0, fatti: 0, daFare: 0, chiusi: 0, nonChiusi: 0,
    reale: 0, stima: 0, previsto: 0, finora: 0, totale: 0,
    richieste: 0, annullati: 0, senzaPrezzo: 0, perOperatrice: []
  };
  const righe = new Map<string, RigaOperatrice>();
  const nomi = new Map<string, any>((operatrici || []).map(o => [o.id, o]));

  (appuntamenti || []).forEach(app => {
    const quando = aData(app?.data_ora);
    if (!quando || quando < da || quando > a) return;
    if (ePausa(app)) return;
    if (eAnnullato(app)) { r.annullati++; return; }
    if (app.stato === 'in_attesa') { r.richieste++; return; }

    const v = valoreAppuntamento(app, catalogo, adesso);
    r.appuntamenti++;
    if (v.tipo === 'previsto') r.daFare++; else r.fatti++;
    if (v.tipo === 'reale') { r.chiusi++; r.reale += v.importo; }
    if (v.tipo === 'stima') { r.nonChiusi++; r.stima += v.importo; }
    if (v.tipo === 'previsto') r.previsto += v.importo;
    if (v.tipo !== 'reale' && listinoAppuntamento(app, catalogo) === null) r.senzaPrezzo++;

    const id = app.id_dipendente || app.idDipendente || app.dipendenti?.id || 'nessuno';
    if (!righe.has(id)) {
      const scheda = nomi.get(id) || app.dipendenti || {};
      righe.set(id, {
        id,
        nome: scheda.nome || (id === 'nessuno' ? 'Non assegnato' : 'Operatrice'),
        cognome: scheda.cognome || '',
        appuntamenti: 0, reale: 0, stima: 0, previsto: 0
      });
    }
    const riga = righe.get(id)!;
    riga.appuntamenti++;
    if (v.tipo === 'reale') riga.reale += v.importo;
    if (v.tipo === 'stima') riga.stima += v.importo;
    if (v.tipo === 'previsto') riga.previsto += v.importo;
  });

  r.reale = soldi(r.reale);
  r.stima = soldi(r.stima);
  r.previsto = soldi(r.previsto);
  r.finora = soldi(r.reale + r.stima);
  r.totale = soldi(r.reale + r.stima + r.previsto);
  r.perOperatrice = Array.from(righe.values())
    .map(x => ({ ...x, reale: soldi(x.reale), stima: soldi(x.stima), previsto: soldi(x.previsto) }))
    // Prima chi ha già fatto di più; a parità, chi ha più lavoro davanti.
    .sort((x, y) => (y.reale + y.stima) - (x.reale + x.stima) || y.previsto - x.previsto);
  return r;
}

export type Periodo = 'oggi' | 'ieri' | 'settimana' | 'mese';

const inizioGiorno = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const fineGiorno = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/** Da quando a quando va un periodo. La settimana comincia di lunedì. */
export function confiniPeriodo(periodo: Periodo, adesso = new Date()): { da: Date; a: Date } {
  if (periodo === 'ieri') {
    const ieri = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() - 1);
    return { da: inizioGiorno(ieri), a: fineGiorno(ieri) };
  }
  if (periodo === 'settimana') {
    const daLunedi = (adesso.getDay() + 6) % 7; // lunedì = 0 … domenica = 6
    const lunedi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() - daLunedi);
    const domenica = new Date(lunedi.getFullYear(), lunedi.getMonth(), lunedi.getDate() + 6);
    return { da: inizioGiorno(lunedi), a: fineGiorno(domenica) };
  }
  if (periodo === 'mese') {
    const primo = new Date(adesso.getFullYear(), adesso.getMonth(), 1);
    const ultimo = new Date(adesso.getFullYear(), adesso.getMonth() + 1, 0);
    return { da: inizioGiorno(primo), a: fineGiorno(ultimo) };
  }
  return { da: inizioGiorno(adesso), a: fineGiorno(adesso) };
}

/** Il giorno dopo, tutto intero: per "domani in agenda". */
export function confiniDomani(adesso = new Date()): { da: Date; a: Date } {
  const domani = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + 1);
  return { da: inizioGiorno(domani), a: fineGiorno(domani) };
}

/** Quante schede cliente sono nate nel periodo. */
export function clientiNuove(clienti: any[], da: Date, a: Date): number {
  return (clienti || []).filter(c => {
    const d = aData(c?.createdAt);
    return !!d && d >= da && d <= a;
  }).length;
}

/** La stima degli appuntamenti passati non chiusi, mese per mese ("2026-11" → euro). */
export function stimaPerMese(appuntamenti: any[], catalogo: any[], adesso = new Date()): Record<string, number> {
  const mesi: Record<string, number> = {};
  (appuntamenti || []).forEach(app => {
    const v = valoreAppuntamento(app, catalogo, adesso);
    if (v.tipo !== 'stima') return;
    const d = aData(app.data_ora);
    if (!d) return;
    const chiave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    mesi[chiave] = soldi((mesi[chiave] || 0) + v.importo);
  });
  return mesi;
}

/** La stima degli appuntamenti passati non chiusi, operatrice per operatrice. */
export function stimaPerOperatrice(appuntamenti: any[], catalogo: any[], adesso = new Date()): Record<string, { appuntamenti: number; stima: number }> {
  const righe: Record<string, { appuntamenti: number; stima: number }> = {};
  (appuntamenti || []).forEach(app => {
    const v = valoreAppuntamento(app, catalogo, adesso);
    if (v.tipo !== 'stima') return;
    const id = app.id_dipendente || app.idDipendente || app.dipendenti?.id || 'unassigned';
    const riga = righe[id] || (righe[id] = { appuntamenti: 0, stima: 0 });
    riga.appuntamenti++;
    riga.stima = soldi(riga.stima + v.importo);
  });
  return righe;
}
