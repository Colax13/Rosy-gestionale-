// Lettura dei file di import clienti. Sta qui, fuori dal componente, perché
// è la parte che si può provare da sola: se sbaglia, si importano dati storti.

export type Campo =
  | 'nome' | 'cognome' | 'nome_completo'
  | 'telefono' | 'email' | 'note' | 'canale_acquisizione'
  // I campi che arrivano dal vecchio gestionale. Non servono tutti i giorni,
  // ma rifarli a mano e impossibile: si importano e si mettono da parte.
  | 'sesso' | 'data_nascita' | 'giorno_nascita' | 'mese_nascita' | 'anno_nascita'
  | 'stato_accettazione' | 'numero_prenotazioni' | 'creato_il_origine'
  | 'note_appuntamento'
  | '';

export const CAMPI: { chiave: Campo; etichetta: string }[] = [
  { chiave: '', etichetta: 'Non importare' },
  { chiave: 'nome', etichetta: 'Nome' },
  { chiave: 'cognome', etichetta: 'Cognome' },
  { chiave: 'nome_completo', etichetta: 'Nome e cognome insieme' },
  { chiave: 'telefono', etichetta: 'Telefono' },
  { chiave: 'email', etichetta: 'Email' },
  { chiave: 'note', etichetta: 'Note' },
  { chiave: 'canale_acquisizione', etichetta: 'Come ci ha conosciuto' },
  { chiave: 'sesso', etichetta: 'Sesso' },
  { chiave: 'data_nascita', etichetta: 'Data di nascita' },
  { chiave: 'giorno_nascita', etichetta: 'Giorno di nascita' },
  { chiave: 'mese_nascita', etichetta: 'Mese di nascita' },
  { chiave: 'anno_nascita', etichetta: 'Anno di nascita' },
  { chiave: 'stato_accettazione', etichetta: 'Stato di accettazione' },
  { chiave: 'numero_prenotazioni', etichetta: 'Prenotazioni fatte' },
  { chiave: 'creato_il_origine', etichetta: 'Cliente dal' },
  { chiave: 'note_appuntamento', etichetta: 'Note sugli appuntamenti' }
];

/** Come si chiama di solito quella colonna in un foglio fatto in salone. */
const SINONIMI: Record<Exclude<Campo, ''>, string[]> = {
  nome: ['nome', 'name', 'firstname'],
  cognome: ['cognome', 'surname', 'lastname', 'cognomecliente'],
  // "Nome cliente" si tratta come nome e cognome insieme: se poi dentro c'e
  // solo il nome non succede niente, mentre il contrario lascerebbe "Maria
  // Rossi" tutto nella casella del nome.
  nome_completo: ['nomecompleto', 'nomeecognome', 'cliente', 'nomecliente', 'nominativo', 'fullname'],
  telefono: ['telefono', 'tel', 'cellulare', 'cell', 'numero', 'phone', 'mobile', 'recapito'],
  email: ['email', 'mail', 'posta', 'indirizzoemail'],
  note: ['note', 'nota', 'appunti', 'notes', 'commenti'],
  canale_acquisizione: ['canale', 'provenienza', 'origine', 'fonte', 'comecihaconosciuto'],
  sesso: ['sesso', 'genere', 'gender', 'sex'],
  data_nascita: ['datadinascita', 'datanascita', 'nascita', 'compleanno', 'birthday', 'dateofbirth', 'dob'],
  giorno_nascita: ['giornodinascita', 'giornonascita', 'birthday', 'dayofbirth'],
  mese_nascita: ['mesedinascita', 'mesenascita', 'monthofbirth'],
  anno_nascita: ['annodinascita', 'annonascita', 'yearofbirth'],
  stato_accettazione: ['statodiaccettazione', 'statoaccettazione', 'accettazione', 'consenso', 'optin'],
  numero_prenotazioni: ['numerodiprenotazioni', 'numeroprenotazioni', 'prenotazioni', 'numerobookings', 'bookings'],
  creato_il_origine: ['creatoil', 'creatoilgiorno', 'datacreazione', 'createdat', 'iscrittoil', 'clientedal'],
  note_appuntamento: ['noteappuntamento', 'notaappuntamento', 'notedellappuntamento', 'notesullappuntamento',
                      'noteappuntamenti', 'notedegliappuntamenti', 'appointmentnotes', 'bookingnotes']
};

/** I campi di testo libero: se due colonne finiscono lì, si tengono tutte e due. */
const CAMPI_NOTE = new Set<Campo>(['note', 'note_appuntamento']);

export const normalizza = (s: any) =>
  (s ?? '').toString().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export const soloCifre = (s: any) => (s ?? '').toString().replace(/\D/g, '');

/** Legge un CSV gestendo virgolette, virgole e punto e virgola. */
export function leggiCsv(testo: string): string[][] {
  const primaRiga = testo.split('\n')[0] || '';
  const separatore = (primaRiga.match(/;/g) || []).length > (primaRiga.match(/,/g) || []).length ? ';' : ',';

  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = '';
  let traVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (traVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') { campo += '"'; i++; }
        else traVirgolette = false;
      } else campo += c;
    } else if (c === '"') {
      traVirgolette = true;
    } else if (c === separatore) {
      riga.push(campo); campo = '';
    } else if (c === '\n') {
      riga.push(campo.replace(/\r$/, '')); righe.push(riga); riga = []; campo = '';
    } else {
      campo += c;
    }
  }
  if (campo || riga.length) { riga.push(campo.replace(/\r$/, '')); righe.push(riga); }
  return righe.filter(r => r.some(c => (c || '').trim() !== ''));
}

/** Indovina che cosa contiene ogni colonna guardando l'intestazione. */
export function indoviniMappatura(intestazioni: string[]): Campo[] {
  return intestazioni.map(t => {
    const n = normalizza(t);
    if (!n) return '' as Campo;
    for (const [campo, alias] of Object.entries(SINONIMI)) {
      if (alias.some(a => n === a)) return campo as Campo;
    }
    // Fra le corrispondenze parziali vince la più lunga: "Note
    // sull'appuntamento" contiene sia "note" sia "appuntamento", ed è la
    // seconda a dire che cos'è davvero.
    let migliore: Campo = '';
    let lunghezza = 0;
    for (const [campo, alias] of Object.entries(SINONIMI)) {
      for (const a of alias) {
        if (a.length > 3 && n.includes(a) && a.length > lunghezza) {
          migliore = campo as Campo;
          lunghezza = a.length;
        }
      }
    }
    return migliore;
  });
}

const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
              'luglio','agosto','settembre','ottobre','novembre','dicembre'];

/** Il numero del mese, scritto a cifre o a parole. 0 se non si capisce. */
export function numeroMese(valore: any): number {
  const testo = normalizza(valore);
  if (!testo) return 0;
  const cifra = parseInt(testo, 10);
  if (cifra >= 1 && cifra <= 12) return cifra;
  const trovato = MESI.findIndex(m => m.startsWith(testo.slice(0, 3)));
  return trovato >= 0 ? trovato + 1 : 0;
}

/**
 * Una data qualsiasi in forma 1990-03-07. Riconosce 07/03/1990, 7-3-1990 e
 * quello che e gia scritto all'americana. Se non la capisce, restituisce ''
 * invece di inventarsi un giorno.
 */
export function aDataIso(valore: any): string {
  const testo = (valore ?? '').toString().trim();
  if (!testo) return '';
  const gia = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(testo);
  if (gia) return `${gia[1]}-${gia[2].padStart(2, '0')}-${gia[3].padStart(2, '0')}`;
  const all = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(testo);
  if (!all) return '';
  const anno = all[3].length === 2 ? `19${all[3]}` : all[3];
  return `${anno}-${all[2].padStart(2, '0')}-${all[1].padStart(2, '0')}`;
}

/**
 * Trasforma una riga del foglio in un cliente, secondo la mappatura scelta.
 *
 * Le intestazioni servono per non perdere niente: le colonne lasciate su
 * "Non importare" finiscono comunque in `extra`, con il nome che avevano nel
 * foglio. Si vedono in fondo alla scheda e non danno fastidio a nessuno.
 */
export function aCliente(riga: any[], mappatura: Campo[], intestazioni?: string[]) {
  const c: any = { nome: '', cognome: '', telefono: '', email: '', note: '', canale_acquisizione: '' };
  const pezziNascita: { giorno?: string; mese?: string; anno?: string } = {};
  const extra: Record<string, string> = {};

  mappatura.forEach((campo, i) => {
    const valore = (riga[i] ?? '').toString().trim();
    if (!valore) return;

    if (!campo) {
      const testa = (intestazioni?.[i] || '').toString().trim();
      if (testa) extra[testa] = valore;
      return;
    }

    if (campo === 'nome_completo') {
      const pezzi = valore.split(/\s+/);
      c.nome = pezzi.shift() || '';
      c.cognome = pezzi.join(' ');
      return;
    }

    if (campo === 'giorno_nascita') { pezziNascita.giorno = valore; return; }
    if (campo === 'mese_nascita')   { pezziNascita.mese = valore; return; }
    if (campo === 'anno_nascita')   { pezziNascita.anno = valore; return; }

    if (campo === 'data_nascita' || campo === 'creato_il_origine') {
      const iso = aDataIso(valore);
      if (iso) c[campo] = iso;
      return;
    }

    if (CAMPI_NOTE.has(campo) && c[campo]) {
      c[campo] = `${c[campo]}\n${valore}`;
      return;
    }

    c[campo] = valore;
  });

  // Certi fogli tengono la nascita spezzata in colonne separate. Si rimette
  // insieme solo se non e gia arrivata intera: quella vera vince.
  if (!c.data_nascita && (pezziNascita.giorno || pezziNascita.mese)) {
    const giorno = parseInt(pezziNascita.giorno || '', 10);
    const mese = numeroMese(pezziNascita.mese);
    const anno = parseInt(pezziNascita.anno || '', 10);
    if (giorno >= 1 && giorno <= 31 && mese) {
      const a = anno >= 1900 && anno <= 2100 ? anno : 1900;
      c.data_nascita = `${a}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
      // 1900 e il modo di dire "l'anno non ce l'ho": giorno e mese bastano
      // per gli auguri, ed e meglio di buttare via anche quelli.
    }
  }

  if (Object.keys(extra).length) c.extra = extra;
  return c;
}

/** Chiavi con cui riconoscere un cliente già in anagrafica. */
export function chiaviCliente(c: any): string[] {
  const chiavi: string[] = [];
  const tel = soloCifre(c.telefono);
  if (tel.length >= 6) chiavi.push(`t:${tel}`);
  const nome = normalizza(c.nome), cognome = normalizza(c.cognome);
  if (nome || cognome) chiavi.push(`n:${nome}|${cognome}`);
  return chiavi;
}

/** I campi della scheda che l'import sa riempire, oltre a nome e cognome. */
const CAMPI_SCHEDA = [
  'telefono', 'email', 'note', 'canale_acquisizione',
  'sesso', 'data_nascita', 'stato_accettazione', 'numero_prenotazioni',
  'creato_il_origine', 'note_appuntamento'
] as const;

const pieno = (v: any) => v !== undefined && v !== null && `${v}`.trim() !== '';

/**
 * Quello che si salva per una cliente nuova: tutto quello che il file ha
 * portato, non solo nome e telefono. I campi vuoti restano fuori.
 */
export function datiCliente(c: any): Record<string, any> {
  const dati: Record<string, any> = {
    nome: c.nome || '—',
    cognome: c.cognome || '',
    canale_acquisizione: c.canale_acquisizione || 'Importato'
  };
  for (const campo of CAMPI_SCHEDA) {
    if (campo === 'canale_acquisizione') continue;
    if (pieno(c[campo])) dati[campo] = `${c[campo]}`.trim();
  }
  if (c.extra && Object.keys(c.extra).length) dati.extra = { ...c.extra };
  return dati;
}

/**
 * Che cosa aggiungere a una cliente che c'è già. Non si sovrascrive niente:
 * si riempiono i campi vuoti, e le note del file si aggiungono in fondo a
 * quelle che ci sono, se non ci sono già. Se non c'è niente da aggiungere
 * restituisce null.
 */
export function completamento(esistente: any, nuovo: any): Record<string, any> | null {
  const modifiche: Record<string, any> = {};
  const nuovi = datiCliente(nuovo);

  for (const campo of CAMPI_SCHEDA) {
    const valore = nuovi[campo];
    if (!pieno(valore) || campo === 'canale_acquisizione') continue;
    const attuale = esistente?.[campo];

    if (!pieno(attuale)) { modifiche[campo] = valore; continue; }

    if (CAMPI_NOTE.has(campo as Campo)) {
      const gia = normalizza(attuale);
      if (!gia.includes(normalizza(valore))) modifiche[campo] = `${`${attuale}`.trim()}\n${valore}`;
    }
  }

  if (nuovi.extra) {
    const extra = { ...(esistente?.extra || {}) };
    let cambiato = false;
    for (const [k, v] of Object.entries(nuovi.extra)) {
      if (!pieno(extra[k])) { extra[k] = v; cambiato = true; }
    }
    if (cambiato) modifiche.extra = extra;
  }

  return Object.keys(modifiche).length ? modifiche : null;
}
