import { prezzoSpa, canaleDi, persone, noteVisibili, filtraBuoni, riepilogo, tipoDi, isScaduto, faseDi, contaPerFase, ordinaBuoni } from './buoni';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// --- prezzo fisso del buono spa ---
check('spa senza piega', 50, prezzoSpa(false));
check('spa con piega',   70, prezzoSpa(true));

// --- online o in salone ---
check('fatto a mano: in salone', 'salone', canaleDi({ origine: 'manuale' }));
check('senza origine: in salone', 'salone', canaleDi({}));
check('dal foglio: online',       'online', canaleDi({ origine: 'foglio' }));
check('dal sito: online',         'online', canaleDi({ origine: 'online' }));

// --- chi regala e chi riceve ---
const nuovo = { intestatario: 'Anna Bianchi', telefono: '340', acquirente: 'Stefania Mucci', acquirente_telefono: '333', acquirente_email: 's@x.it' };
const p1 = persone(nuovo);
check('nuovo: chi regala',  'Stefania Mucci', p1.regala.nome);
check('nuovo: chi riceve',  'Anna Bianchi',   p1.riceve.nome);
check('nuovo: persone diverse', false, p1.stessa);

// Buono importato prima della divisione: chi paga stava nelle note.
const vecchio = { origine: 'foglio', intestatario: 'Anna Bianchi', telefono: '3401112233',
  note: 'Pagato da Stefania Mucci · stefania@example.it · Coupon ESTATE10' };
const p2 = persone(vecchio);
check('vecchio: chi regala dalle note', 'Stefania Mucci', p2.regala.nome);
check('vecchio: il telefono passa a chi paga', '3401112233', p2.regala.telefono);
check('vecchio: la beneficiaria non lo tiene', '', p2.riceve.telefono);
check('vecchio: email dalle note', 'stefania@example.it', p2.regala.email);
check('vecchio: le note perdono solo quelle righe', 'Coupon ESTATE10', noteVisibili(vecchio));

const se = persone({ intestatario: 'Rita Marchetti', telefono: '347' });
check('stessa persona: regala = riceve', 'Rita Marchetti', se.regala.nome);
check('stessa persona: segnata come tale', true, se.stessa);
check('note dei buoni nuovi intatte', 'Pagato da X', noteVisibili({ acquirente: 'Y', note: 'Pagato da X' }));

// --- filtri ---
const elenco = [
  { id: 1, codice: 'RSY-AAAA', tipo: 'spa', origine: 'foglio', stato: 'attivo', valore_residuo: 50, ...nuovo },
  { id: 2, codice: 'RSY-BBBB', tipo: 'salone', origine: 'manuale', stato: 'attivo', valore_residuo: 30, intestatario: 'Luca' },
  { id: 3, codice: 'RSY-CCCC', origine: 'manuale', stato: 'usato', valore_residuo: 0, intestatario: 'Marta' },
  { id: 4, codice: 'RSY-DDDD', tipo: 'spa', origine: 'manuale', stato: 'attivo', valore_residuo: 70, intestatario: 'Ada', data_scadenza: '2020-01-01' }
];
const base = { tipo: 'spa' as const, canale: 'tutti' as const, fase: 'tutte' as const, ricerca: '' };
check('senza tipo vale spa', 'spa', tipoDi({}));
check('solo spa', [1, 3, 4], filtraBuoni(elenco, base).map(b => b.id));
check('solo salone', [2], filtraBuoni(elenco, { ...base, tipo: 'salone' }).map(b => b.id));
check('spa online', [1], filtraBuoni(elenco, { ...base, canale: 'online' }).map(b => b.id));
check('spa in salone', [3, 4], filtraBuoni(elenco, { ...base, canale: 'salone' }).map(b => b.id));
check('cerca chi regala', [1], filtraBuoni(elenco, { ...base, ricerca: 'stefania' }).map(b => b.id));
check('cerca il telefono di chi regala', [1], filtraBuoni(elenco, { ...base, ricerca: '333' }).map(b => b.id));
check('cerca il codice', [4], filtraBuoni(elenco, { ...base, ricerca: 'dddd' }).map(b => b.id));

const r = riepilogo(filtraBuoni(elenco, base), '2026-10-01');
check('riepilogo: attivi', 2, r.attivi);
check('riepilogo: da scalare', 120, r.daScalare);
check('riepilogo: scaduti', 1, r.scaduti);
check('usato non è scaduto', false, isScaduto({ stato: 'usato', data_scadenza: '2020-01-01' }, '2026-10-01'));

// --- le tre tabelle ---
const OGGI = '2026-10-01';
check('attivo e in tempo: attivi', 'attivi', faseDi({ stato: 'attivo', data_scadenza: '2027-01-01' }, OGGI));
check('attivo senza scadenza: attivi', 'attivi', faseDi({ stato: 'attivo' }, OGGI));
check('attivo ma scaduto: scaduti', 'scaduti', faseDi({ stato: 'attivo', data_scadenza: '2026-09-30' }, OGGI));
check('scade oggi: ancora attivo', 'attivi', faseDi({ stato: 'attivo', data_scadenza: OGGI }, OGGI));
check('usato: usati', 'usati', faseDi({ stato: 'usato', data_scadenza: '2020-01-01' }, OGGI));
check('annullato: con gli usati', 'usati', faseDi({ stato: 'annullato' }, OGGI));
check('spa scaduti', [4], filtraBuoni(elenco, { ...base, fase: 'scaduti' }, OGGI).map(b => b.id));
check('spa attivi online', [1], filtraBuoni(elenco, { ...base, canale: 'online', fase: 'attivi' }, OGGI).map(b => b.id));
check('conta per tabella', { attivi: 1, scaduti: 1, usati: 1 }, contaPerFase(filtraBuoni(elenco, base), OGGI));
check('prima quelli che scadono prima', ['a', 'b', 'c'],
  ordinaBuoni([{ k: 'c' }, { k: 'b', data_scadenza: '2027-02-01' }, { k: 'a', data_scadenza: '2026-11-01' }] as any[], 'attivi').map((b: any) => b.k));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
