import {
  indoviniMappaturaBuoni, aBuono, aGiorno, aImporto, valeSi,
  chiaveBuono, preparaImport, leggiCsv
} from './importa-buoni';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// --- le colonne vere del foglio di Ludovico ---
const intestazioni = [
  'Nome Cliente', 'Email', 'Phone', 'Nome del beneficiario', 'Codice Univoco',
  'Data Acquisto', 'Stato', 'Pagamento totale', 'ID STRIPE', 'Piega',
  'Data di Scadenza', 'Data di utilizzo', 'Coupon'
];
const mappatura = indoviniMappaturaBuoni(intestazioni);
check('colonne riconosciute',
  ['cliente', 'email', 'telefono', 'intestatario', 'codice',
   'data_acquisto', 'stato', 'valore', 'riferimento', 'piega',
   'data_scadenza', 'data_utilizzo', 'coupon'],
  mappatura);

// --- una riga tipica ---
const riga = [
  'Stefania Mucci', 'stefania@example.it', '3401112233', 'Anna Bianchi', 'RSY-8H2K-4PQW',
  '19/06/2026', 'Attivo', '€ 80,00', 'pi_3Ox9aB2eZvKY', 'Sì',
  '19/06/2027', '', 'ESTATE10'
];
const buono = aBuono(riga, mappatura);
check('codice',                'RSY-8H2K-4PQW', buono.codice);
check('va alla beneficiaria',  'Anna Bianchi',  buono.intestatario);
check('importo',               80,              buono.valore);
check('residuo pieno',         80,              buono.valore_residuo);
check('data acquisto',         '2026-06-19',    buono.data_emissione);
check('scadenza',              '2027-06-19',    buono.data_scadenza);
check('stato',                 'attivo',        buono.stato);
check('piega compresa',        true,            buono.piega_inclusa);
check('chi ha pagato finisce nelle note', true, buono.note.includes('Pagato da Stefania Mucci'));
check('il coupon finisce nelle note',     true, buono.note.includes('ESTATE10'));

// --- un buono già usato ---
const usato = aBuono([
  'Rita Marchetti', '', '', 'Rita Marchetti', 'RSY-QQ11-ZZ88',
  '2026-01-10', 'Attivo', '50', '', 'No', '2027-01-10', '03/03/2026', ''
], mappatura);
check('la data di utilizzo vince sullo stato scritto', 'usato', usato.stato);
check('un buono usato non ha residuo',                 0,       usato.valore_residuo);
check('piega non compresa',                            false,   usato.piega_inclusa);
check('stessa persona: niente "pagato da"',            false,   usato.note.includes('Pagato da'));

// --- le date come capitano ---
check('data all\'italiana',  '2026-03-12', aGiorno('12/03/2026'));
check('data americana',      '2026-03-12', aGiorno('2026-03-12'));
check('data coi trattini',   '2026-03-12', aGiorno('12-03-2026'));
check('anno a due cifre',    '2026-03-12', aGiorno('12/03/26'));
check('data vuota',          '',           aGiorno(''));
check('data senza senso',    '',           aGiorno('boh'));

// --- gli importi come capitano ---
check('euro e virgola',      80,     aImporto('€ 80,00'));
check('punto decimale',      45.5,   aImporto('45.50'));
check('migliaia e decimali', 1234.5, aImporto('1.234,50'));
check('numero secco',        30,     aImporto('30'));
check('importo vuoto',       0,      aImporto(''));

// --- il sì e il no ---
check('sì con accento', true,  valeSi('Sì'));
check('si maiuscolo',   true,  valeSi('SI'));
check('una x',          true,  valeSi('x'));
check('no',             false, valeSi('No'));
check('vuoto',          false, valeSi(''));

// --- doppioni e scarti ---
const esistenti = [{ codice: 'rsy-8h2k-4pqw' }];
const esito = preparaImport([
  riga,                                                  // già presente
  ['Anna', '', '', 'Anna', 'RSY-NUOVO-0001', '01/07/2026', 'Attivo', '50', '', 'No', '', '', ''],
  ['Senza codice', '', '', '', '', '', '', '40', '', '', '', '', ''],
  ['Senza importo', '', '', '', 'RSY-XXXX-0002', '', '', '', '', '', '', '', ''],
  ['Anna', '', '', 'Anna', 'RSY-NUOVO-0001', '01/07/2026', 'Attivo', '50', '', 'No', '', '', ''], // doppio nel foglio
], mappatura, esistenti);

check('nuovi',     ['RSY-NUOVO-0001'], esito.nuovi.map(b => b.codice));
check('doppioni',  ['RSY-8H2K-4PQW', 'RSY-NUOVO-0001'], esito.doppioni.map(b => b.codice));
check('scartati',  [{ riga: 4, motivo: 'manca il codice' }, { riga: 5, motivo: 'importo mancante o a zero' }], esito.scartati);

// --- il codice si confronta ripulito ---
check('maiuscole e trattini non contano nel confronto',
  chiaveBuono({ codice: 'RSY-8H2K-4PQW' }),
  chiaveBuono({ codice: 'rsy 8h2k 4pqw' }));

// --- il foglio esportato in CSV ---
const csv = `Nome Cliente,Email,Phone,Nome del beneficiario,Codice Univoco,Data Acquisto,Stato,Pagamento totale,ID STRIPE,Piega,Data di Scadenza,Data di utilizzo,Coupon
Stefania Mucci,s@x.it,3401112233,"Bianchi, Anna",RSY-8H2K-4PQW,19/06/2026,Attivo,"€ 80,00",pi_123,Sì,19/06/2027,,`;
const tabella = leggiCsv(csv);
check('righe lette', 2, tabella.length);
check('virgola dentro le virgolette', 'Bianchi, Anna', tabella[1][3]);

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
