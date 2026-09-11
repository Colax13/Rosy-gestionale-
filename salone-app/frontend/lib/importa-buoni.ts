// Portare dentro i buoni pagati online.
//
// Il foglio Google esiste già: lo riempie Make quando una cliente paga con
// Stripe, e contiene tutto quello che serve — chi ha pagato, quanto, il codice
// univoco, la scadenza, e la colonna *Piega* che dice se il buono comprende
// anche la piega (dipende da quanto ha pagato).
//
// Qui si legge quel foglio esportato in CSV e lo si trasforma in buoni. Niente
// server, niente chiavi: si esporta e si importa, come per i clienti.

import { normalizza, soloCifre, leggiCsv } from './importa';
import { aNumero } from './numeri';

export { leggiCsv };

export type CampoBuono =
  | 'codice' | 'intestatario' | 'cliente' | 'telefono' | 'email'
  | 'valore' | 'data_acquisto' | 'data_scadenza' | 'data_utilizzo'
  | 'stato' | 'piega' | 'coupon' | 'riferimento' | '';

export const CAMPI_BUONO: { chiave: CampoBuono; etichetta: string }[] = [
  { chiave: 'codice',        etichetta: 'Codice del buono' },
  { chiave: 'intestatario',  etichetta: 'Chi lo userà' },
  { chiave: 'cliente',       etichetta: 'Chi ha pagato' },
  { chiave: 'telefono',      etichetta: 'Telefono' },
  { chiave: 'email',         etichetta: 'Email' },
  { chiave: 'valore',        etichetta: 'Importo pagato' },
  { chiave: 'data_acquisto', etichetta: 'Data di acquisto' },
  { chiave: 'data_scadenza', etichetta: 'Data di scadenza' },
  { chiave: 'data_utilizzo', etichetta: 'Data di utilizzo' },
  { chiave: 'stato',         etichetta: 'Stato' },
  { chiave: 'piega',         etichetta: 'Piega compresa' },
  { chiave: 'coupon',        etichetta: 'Coupon' },
  { chiave: 'riferimento',   etichetta: 'Riferimento pagamento' },
  { chiave: '',              etichetta: '— non importare —' }
];

const SINONIMI: Record<Exclude<CampoBuono, ''>, string[]> = {
  codice:        ['codiceunivoco', 'codice', 'codicebuono', 'voucher', 'code'],
  intestatario:  ['nomedelbeneficiario', 'beneficiario', 'intestatario', 'destinatario'],
  cliente:       ['nomecliente', 'cliente', 'acquirente', 'nome', 'name'],
  telefono:      ['phone', 'telefono', 'cellulare', 'numero'],
  email:         ['email', 'mail', 'posta'],
  valore:        ['pagamentototale', 'importo', 'valore', 'totale', 'prezzo', 'amount'],
  data_acquisto: ['dataacquisto', 'datadiacquisto', 'acquisto', 'data'],
  data_scadenza: ['datadiscadenza', 'datascadenza', 'scadenza', 'validofino'],
  data_utilizzo: ['datadiutilizzo', 'datautilizzo', 'utilizzo', 'usato'],
  stato:         ['stato', 'status'],
  piega:         ['piega'],
  coupon:        ['coupon', 'buonosconto'],
  riferimento:   ['idstripe', 'stripe', 'idpagamento', 'riferimento', 'transazione']
};

/** Indovina che cosa contiene ogni colonna guardando l'intestazione. */
export function indoviniMappaturaBuoni(intestazioni: string[]): CampoBuono[] {
  const usati = new Set<string>();
  const scelte: CampoBuono[] = intestazioni.map(() => '' as CampoBuono);

  // Prima le corrispondenze esatte, poi quelle parziali: così "Nome Cliente"
  // non si prende il posto di "Nome del beneficiario".
  [true, false].forEach(esatto => {
    intestazioni.forEach((titolo, i) => {
      if (scelte[i]) return;
      const n = normalizza(titolo);
      if (!n) return;
      for (const [campo, alias] of Object.entries(SINONIMI)) {
        if (usati.has(campo)) continue;
        const trovato = esatto
          ? alias.some(a => n === a)
          : alias.some(a => a.length > 3 && n.includes(a));
        if (trovato) { scelte[i] = campo as CampoBuono; usati.add(campo); return; }
      }
    });
  });

  return scelte;
}

/** "Sì", "SI", "x", "true", "1" valgono sì. Tutto il resto vale no. */
export function valeSi(valore: any): boolean {
  const n = normalizza(valore);
  return ['si', 'sì', 's', 'x', 'true', 'vero', '1', 'yes', 'y', 'inclusa', 'compresa'].includes(n);
}

/**
 * Le date arrivano come capita: 12/03/2026, 2026-03-12, 12-03-2026.
 * Torna il giorno in formato AAAA-MM-GG, o stringa vuota se non si capisce.
 */
export function aGiorno(valore: any): string {
  const testo = (valore ?? '').toString().trim();
  if (!testo) return '';

  const iso = testo.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  // All'italiana: giorno prima del mese.
  const ita = testo.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (ita) {
    const anno = ita[3].length === 2 ? `20${ita[3]}` : ita[3];
    return `${anno}-${ita[2].padStart(2, '0')}-${ita[1].padStart(2, '0')}`;
  }

  const d = new Date(testo);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

/** Gli importi arrivano come "45,00 €", "€ 45.00", "45". */
export function aImporto(valore: any): number {
  const testo = (valore ?? '').toString().replace(/[^\d,.-]/g, '').trim();
  if (!testo) return 0;
  // Se ci sono sia punto sia virgola, l'ultimo dei due è il separatore dei decimali.
  const ultimoPunto = testo.lastIndexOf('.');
  const ultimaVirgola = testo.lastIndexOf(',');
  let pulito = testo;
  if (ultimoPunto >= 0 && ultimaVirgola >= 0) {
    pulito = ultimaVirgola > ultimoPunto
      ? testo.replace(/\./g, '').replace(',', '.')
      : testo.replace(/,/g, '');
  } else if (ultimaVirgola >= 0) {
    pulito = testo.replace(',', '.');
  }
  return aNumero(pulito);
}

export interface BuonoImportato {
  codice: string;
  intestatario: string;
  telefono: string;
  valore: number;
  valore_residuo: number;
  data_emissione: string;
  data_scadenza: string;
  stato: 'attivo' | 'usato' | 'annullato';
  piega_inclusa: boolean;
  note: string;
  tipo: 'spa' | 'salone';
  origine: string;
}

/** Trasforma una riga del foglio in un buono, secondo la mappatura scelta. */
export function aBuono(riga: any[], mappatura: CampoBuono[]): BuonoImportato {
  const preso: Partial<Record<Exclude<CampoBuono, ''>, string>> = {};
  mappatura.forEach((campo, i) => {
    if (!campo) return;
    const valore = (riga[i] ?? '').toString().trim();
    if (valore) preso[campo] = valore;
  });

  const valore = aImporto(preso.valore);
  const dataUtilizzo = aGiorno(preso.data_utilizzo);

  // Lo stato si legge dalla colonna, ma una data di utilizzo scritta vince su
  // tutto: se è stato usato, è stato usato.
  const statoScritto = normalizza(preso.stato);
  let stato: BuonoImportato['stato'] = 'attivo';
  if (dataUtilizzo) stato = 'usato';
  else if (['usato', 'utilizzato', 'used', 'consumato', 'redeemed'].includes(statoScritto)) stato = 'usato';
  else if (['annullato', 'annullata', 'rimborsato', 'refunded', 'cancelled', 'canceled'].includes(statoScritto)) stato = 'annullato';

  const note: string[] = [];
  if (preso.cliente && normalizza(preso.cliente) !== normalizza(preso.intestatario)) {
    note.push(`Pagato da ${preso.cliente}`);
  }
  if (preso.email) note.push(preso.email);
  if (preso.coupon) note.push(`Coupon ${preso.coupon}`);
  if (preso.riferimento) note.push(`Pagamento ${preso.riferimento}`);
  if (dataUtilizzo) note.push(`Usato il ${dataUtilizzo}`);

  return {
    codice: (preso.codice || '').toUpperCase(),
    intestatario: preso.intestatario || preso.cliente || '',
    telefono: preso.telefono || '',
    valore,
    valore_residuo: stato === 'attivo' ? valore : 0,
    data_emissione: aGiorno(preso.data_acquisto),
    data_scadenza: aGiorno(preso.data_scadenza),
    stato,
    piega_inclusa: valeSi(preso.piega),
    note: note.join(' · '),
    tipo: 'spa',
    origine: 'foglio'
  };
}

/** Il codice è quello che dice se un buono c'è già: si confronta ripulito. */
export function chiaveBuono(b: any): string {
  const codice = normalizza(b?.codice);
  if (codice) return `c:${codice}`;
  // Senza codice ci si aggrappa a chi e quanto: meglio di niente.
  return `n:${normalizza(b?.intestatario)}|${soloCifre(b?.telefono)}|${aNumero(b?.valore)}`;
}

export interface EsitoImport {
  nuovi: BuonoImportato[];
  doppioni: BuonoImportato[];
  scartati: { riga: number; motivo: string }[];
}

/** Divide le righe del foglio in: da importare, già presenti, non valide. */
export function preparaImport(
  righe: any[][],
  mappatura: CampoBuono[],
  buoniEsistenti: any[]
): EsitoImport {
  const gia = new Set((buoniEsistenti || []).map(chiaveBuono));
  const vistiOra = new Set<string>();

  const esito: EsitoImport = { nuovi: [], doppioni: [], scartati: [] };

  righe.forEach((riga, i) => {
    const buono = aBuono(riga, mappatura);

    if (!buono.codice) {
      esito.scartati.push({ riga: i + 2, motivo: 'manca il codice' });
      return;
    }
    if (!(buono.valore > 0)) {
      esito.scartati.push({ riga: i + 2, motivo: 'importo mancante o a zero' });
      return;
    }

    const chiave = chiaveBuono(buono);
    if (gia.has(chiave) || vistiOra.has(chiave)) {
      esito.doppioni.push(buono);
      return;
    }
    vistiOra.add(chiave);
    esito.nuovi.push(buono);
  });

  return esito;
}
