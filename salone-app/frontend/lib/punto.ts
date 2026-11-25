/**
 * Il punto della giornata: quello che Rosy dice appena si apre la sua pagina.
 *
 * Non è l'IA a inventarlo: sono conti fatti sui dati veri del salone
 * (appuntamenti, clienti, listino, magazzino), così c'è sempre, è gratis e
 * non sbaglia. Gli stessi conti li usa l'IA quando le si chiede "quanto ho
 * incassato?" o "chi devo richiamare?": una regola sola, due posti.
 *
 * Qui solo regole, senza database: si provano con `npm run prova:punto`.
 */
import { aData, giorniDa } from './tempo';
import { prezzoDiListino } from './preconto';
import { statoScorta } from './prodotti';

const vero = (a: any) => a && a.stato !== 'annullato' && a.id_cliente !== 'block-client';
const nomeDi = (c: any) => `${c?.nome || ''} ${c?.cognome || ''}`.trim() || 'Cliente';
const arrotonda = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Clienti da recuperare
// ---------------------------------------------------------------------------

export interface DaRecuperare { cliente: any; ultimaVisita: Date | null; giorni: number }

/**
 * Chi non passa da almeno `giorniAssenza` giorni e non ha niente in
 * calendario. Chi non è mai venuta conta dalla data della scheda. Le più
 * lontane prima.
 */
export function clientiDaRecuperare(clienti: any[], appuntamenti: any[], adesso: Date = new Date(), giorniAssenza = 60): DaRecuperare[] {
  const ultima = new Map<string, Date>();
  const prenotate = new Set<string>();
  (appuntamenti || []).forEach(app => {
    const id = app?.id_cliente || app?.clienti?.id;
    if (!id || app.stato === 'annullato') return;
    const d = aData(app.data_ora);
    if (!d) return;
    if (d.getTime() > adesso.getTime()) { prenotate.add(id); return; }
    const gia = ultima.get(id);
    if (!gia || d > gia) ultima.set(id, d);
  });
  return (clienti || [])
    .filter(c => !prenotate.has(c.id))
    .map(c => {
      const visita = ultima.get(c.id) || null;
      const giorni = giorniDa(visita || aData(c.createdAt), adesso);
      return { cliente: c, ultimaVisita: visita, giorni: giorni as number };
    })
    .filter(r => r.giorni !== null && r.giorni >= giorniAssenza)
    .sort((a, b) => b.giorni - a.giorni);
}

// ---------------------------------------------------------------------------
// Compleanni
// ---------------------------------------------------------------------------

export interface Compleanno { cliente: any; fra: number; anni: number | null }

/** Giorno e mese di nascita, da "1990-05-12", "12/05/1990" o una data. */
function nascita(v: any): { giorno: number; mese: number; anno: number | null } | null {
  if (!v) return null;
  const t = String(v).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return { anno: Number(m[1]), mese: Number(m[2]), giorno: Number(m[3]) };
  m = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/.exec(t);
  if (m) {
    const anno = m[3] ? Number(m[3].length === 2 ? `19${m[3]}` : m[3]) : null;
    return { giorno: Number(m[1]), mese: Number(m[2]), anno };
  }
  return null;
}

/** Chi compie gli anni da oggi a `entro` giorni. Oggi prima. */
export function compleanniInArrivo(clienti: any[], adesso: Date = new Date(), entro = 7): Compleanno[] {
  const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
  const trovati: Compleanno[] = [];
  (clienti || []).forEach(c => {
    const n = nascita(c?.data_nascita);
    if (!n || n.mese < 1 || n.mese > 12 || n.giorno < 1 || n.giorno > 31) return;
    let prossimo = new Date(oggi.getFullYear(), n.mese - 1, n.giorno);
    if (prossimo.getTime() < oggi.getTime()) prossimo = new Date(oggi.getFullYear() + 1, n.mese - 1, n.giorno);
    const fra = Math.round((prossimo.getTime() - oggi.getTime()) / 86400000);
    if (fra <= entro) trovati.push({ cliente: c, fra, anni: n.anno && n.anno > 1900 ? prossimo.getFullYear() - n.anno : null });
  });
  return trovati.sort((a, b) => a.fra - b.fra || nomeDi(a.cliente).localeCompare(nomeDi(b.cliente), 'it'));
}

// ---------------------------------------------------------------------------
// Incassi
// ---------------------------------------------------------------------------

export interface RiepilogoIncassi {
  totale: number;
  appuntamenti: number;
  scontrino_medio: number;
  /** Quanto del totale viene dai prodotti venduti nei conti. */
  prodotti: number;
  per_operatrice: { nome: string; appuntamenti: number; totale: number }[];
}

/** Quanto si è incassato dagli appuntamenti completati in quell'elenco. */
export function riepilogoIncassi(appuntamenti: any[]): RiepilogoIncassi {
  const chiusi = (appuntamenti || []).filter(a => a?.stato === 'completato');
  const perOp = new Map<string, { nome: string; appuntamenti: number; totale: number }>();
  let totale = 0, prodotti = 0;
  chiusi.forEach(a => {
    const incasso = Number(a.prezzo_finale) || 0;
    totale += incasso;
    prodotti += (a.preconto?.righe || [])
      .filter((r: any) => r?.prodottoId)
      .reduce((t: number, r: any) => t + (Number(r.prezzo) || 0) * Math.max(1, Math.trunc(Number(r.quantita) || 1)), 0);
    const nome = (a.dipendenti?.nome || '').trim() || 'Non assegnato';
    const riga = perOp.get(nome) || { nome, appuntamenti: 0, totale: 0 };
    riga.appuntamenti += 1;
    riga.totale = arrotonda(riga.totale + incasso);
    perOp.set(nome, riga);
  });
  return {
    totale: arrotonda(totale),
    appuntamenti: chiusi.length,
    scontrino_medio: chiusi.length ? arrotonda(totale / chiusi.length) : 0,
    prodotti: arrotonda(prodotti),
    per_operatrice: [...perOp.values()].sort((a, b) => b.totale - a.totale)
  };
}

/**
 * Quanto dovrebbe entrare oggi: quello già incassato più, per gli
 * appuntamenti ancora da chiudere, i prezzi di listino dei loro servizi.
 */
export function incassoPrevisto(appuntamentiOggi: any[], catalogo: any[]): { previsto: number; incassato: number } {
  let previsto = 0, incassato = 0;
  (appuntamentiOggi || []).filter(vero).forEach(a => {
    if (a.stato === 'completato') { incassato += Number(a.prezzo_finale) || 0; previsto += Number(a.prezzo_finale) || 0; return; }
    previsto += (a.righe_appuntamento || [])
      .reduce((t: number, r: any) => t + (prezzoDiListino(r?.servizi_catalogo?.nome || r?.nome || '', catalogo) || 0), 0);
  });
  return { previsto: arrotonda(previsto), incassato: arrotonda(incassato) };
}

// ---------------------------------------------------------------------------
// Il punto
// ---------------------------------------------------------------------------

export type AzionePunto = 'agenda' | 'recupera' | 'compleanni' | 'prodotti' | 'chiedi';

export interface VocePunto {
  chiave: string;
  testo: string;
  /** Una riga in più, più piccola. */
  dettaglio?: string;
  /** "urgente" va fatto oggi; "idea" è un'occasione; "info" è solo da sapere. */
  tono: 'urgente' | 'idea' | 'info';
  azione?: { tipo: AzionePunto; etichetta: string; domanda?: string };
}

export interface DatiPunto {
  appuntamentiOggi: any[];
  richieste: number;
  daRecuperare: number;
  compleanni: Compleanno[];
  prodotti: any[] | null;
  catalogo: any[];
  spaziLiberi: number;
  adesso?: Date;
}

const ora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const euro = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;

/** Le voci del punto di oggi, le più urgenti prima. */
export function puntoDelGiorno(d: DatiPunto): VocePunto[] {
  const adesso = d.adesso || new Date();
  const voci: VocePunto[] = [];
  const oggi = (d.appuntamentiOggi || []).filter(vero);

  if (d.richieste > 0) {
    voci.push({
      chiave: 'richieste', tono: 'urgente',
      testo: d.richieste === 1 ? 'C\'è 1 richiesta dal sito da confermare' : `Ci sono ${d.richieste} richieste dal sito da confermare`,
      dettaglio: 'La cliente aspetta la tua risposta.',
      azione: { tipo: 'agenda', etichetta: 'Apri l\'agenda' }
    });
  }

  const prossimo = oggi
    .filter(a => a.stato !== 'completato' && new Date(a.data_ora).getTime() >= adesso.getTime() - 15 * 60000)
    .sort((a, b) => String(a.data_ora).localeCompare(String(b.data_ora)))[0];
  if (oggi.length === 0) {
    voci.push({ chiave: 'agenda', tono: 'info', testo: 'Oggi non ci sono appuntamenti in agenda', azione: { tipo: 'agenda', etichetta: 'Apri l\'agenda' } });
  } else {
    const soldi = incassoPrevisto(oggi, d.catalogo);
    voci.push({
      chiave: 'agenda', tono: 'info',
      testo: `Oggi ${oggi.length === 1 ? 'hai 1 appuntamento' : `hai ${oggi.length} appuntamenti`}${prossimo ? ` · prossima ${nomeDi(prossimo.clienti)} alle ${ora(new Date(prossimo.data_ora))}` : ''}`,
      dettaglio: soldi.previsto > 0
        ? `Incasso previsto ${euro(soldi.previsto)}${soldi.incassato > 0 ? `, di cui ${euro(soldi.incassato)} già in cassa` : ''}.`
        : undefined,
      azione: { tipo: 'agenda', etichetta: 'Vedi l\'agenda' }
    });
  }

  const compleanniOggi = d.compleanni.filter(c => c.fra === 0);
  if (compleanniOggi.length) {
    voci.push({
      chiave: 'compleanni-oggi', tono: 'idea',
      testo: `Oggi ${compleanniOggi.length === 1 ? 'compie gli anni' : 'compiono gli anni'} ${compleanniOggi.map(c => nomeDi(c.cliente)).slice(0, 3).join(', ')}${compleanniOggi.length > 3 ? ` e altre ${compleanniOggi.length - 3}` : ''}`,
      dettaglio: 'Un messaggio di auguri fa sempre piacere.',
      azione: { tipo: 'compleanni', etichetta: 'Fai gli auguri' }
    });
  }
  const inSettimana = d.compleanni.filter(c => c.fra > 0);
  if (inSettimana.length) {
    voci.push({
      chiave: 'compleanni', tono: 'info',
      testo: `${inSettimana.length === 1 ? '1 compleanno' : `${inSettimana.length} compleanni`} nei prossimi giorni`,
      dettaglio: inSettimana.slice(0, 3).map(c => `${nomeDi(c.cliente)} ${c.fra === 1 ? 'domani' : `fra ${c.fra} giorni`}`).join(' · '),
      azione: { tipo: 'compleanni', etichetta: 'Vedi chi sono' }
    });
  }

  if (d.spaziLiberi >= 4 && d.daRecuperare > 0) {
    voci.push({
      chiave: 'spazi', tono: 'idea',
      testo: `Oggi restano ${d.spaziLiberi} mezz'ore libere`,
      dettaglio: 'Puoi riempirle richiamando chi non passa da un po\'.',
      azione: { tipo: 'chiedi', etichetta: 'Chiedi a Rosy gli orari', domanda: 'Quali orari sono ancora liberi oggi?' }
    });
  }

  if (d.daRecuperare > 0) {
    voci.push({
      chiave: 'recupero', tono: 'idea',
      testo: `${d.daRecuperare === 1 ? '1 cliente non passa' : `${d.daRecuperare} clienti non passano`} da oltre 60 giorni`,
      dettaglio: 'Nessuna ha un appuntamento in calendario.',
      azione: { tipo: 'recupera', etichetta: 'Manda un messaggio' }
    });
  }

  if (d.prodotti) {
    const finiti = d.prodotti.filter(p => p?.attivo !== false && statoScorta(p) !== 'ok');
    if (finiti.length) {
      voci.push({
        chiave: 'prodotti', tono: finiti.some(p => statoScorta(p) === 'esaurito') ? 'urgente' : 'info',
        testo: `${finiti.length === 1 ? '1 prodotto è' : `${finiti.length} prodotti sono`} da riordinare`,
        dettaglio: finiti.slice(0, 3).map(p => p.nome).join(' · '),
        azione: { tipo: 'prodotti', etichetta: 'Apri i prodotti' }
      });
    }
  }

  const peso = { urgente: 0, idea: 1, info: 2 } as const;
  // L'agenda resta in cima fra le informazioni; il resto per urgenza.
  return voci.sort((a, b) => (a.chiave === 'agenda' ? -0.5 : peso[a.tono]) - (b.chiave === 'agenda' ? -0.5 : peso[b.tono]));
}
