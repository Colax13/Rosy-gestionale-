import {
  indoviniMappaturaBuoni, aBuono, aGiorno, aImporto, valeSi,
  chiaveBuono, preparaImport, leggiCsv, buoniDaFoglio
} from './importa-buoni';
import { idDelFoglio, spiegaErroreFoglio, scegliSchede } from '../../../api/_fogli';

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
check('chi regala ha il suo campo',       'Stefania Mucci', buono.acquirente);
check('il telefono è di chi paga',        '3401112233', buono.acquirente_telefono);
check('l\'email è di chi paga',           'stefania@example.it', buono.acquirente_email);
check('la beneficiaria non prende il telefono di un altro', '', buono.telefono);
check('chi paga non finisce più nelle note', false, buono.note.includes('Pagato da'));
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
check('stessa persona: è anche chi regala',            'Rita Marchetti', usato.acquirente);

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

// --- Il foglio letto in automatico ---
const foglio = [
  ['Nome Cliente', 'Email', 'Phone', 'Nome del beneficiario', 'Codice univoco', 'Data acquisto', 'Stato', 'Pagamento totale', 'Piega'],
  ['Stefania Mucci', 's@x.it', '3401112233', 'Anna Bianchi', 'RSY-1111-AAAA', '19/06/2026', 'Attivo', '€ 70,00', 'Sì'],
  ['Rita Rossi', '', '3471112233', 'Rita Rossi', 'RSY-2222-BBBB', '20/06/2026', 'Attivo', '€ 50,00', 'No'],
  ['', '', '', '', '', '', '', '', ''],
  ['Ugo Neri', '', '', 'Ugo Neri', 'RSY-3333-CCCC', '21/06/2026', 'Attivo', '€ 50,00', 'No']
];
const prima = buoniDaFoglio(foglio, []);
check('foglio: tutti nuovi la prima volta', ['RSY-1111-AAAA', 'RSY-2222-BBBB', 'RSY-3333-CCCC'], prima.nuovi.map(b => b.codice));
check('foglio: il prezzo arriva dal foglio', [70, 50, 50], prima.nuovi.map(b => b.valore));
check('foglio: la piega arriva dal foglio', [true, false, false], prima.nuovi.map(b => b.piega_inclusa));
check('foglio: chi regala', 'Stefania Mucci', prima.nuovi[0].acquirente);
check('foglio: segnati come dal foglio (online)', 'foglio', prima.nuovi[0].origine);
check('foglio: codici da ricordare, riga vuota esclusa', 3, prima.codici.length);

const giaDentro = [{ codice: 'rsy-1111-aaaa' }];
check('foglio: quello già nel gestionale non si duplica', ['RSY-2222-BBBB', 'RSY-3333-CCCC'],
  buoniDaFoglio(foglio, giaDentro).nuovi.map(b => b.codice));
check('foglio: quello cancellato a mano non ricompare', ['RSY-3333-CCCC'],
  buoniDaFoglio(foglio, giaDentro, ['RSY-2222-BBBB']).nuovi.map(b => b.codice));
check('foglio: senza intestazioni giuste non importa niente', 0,
  buoniDaFoglio([['a', 'b'], ['1', '2']], []).nuovi.length);
check('foglio: e dice perché', true, !!buoniDaFoglio([['a', 'b']], []).motivo);
check('foglio vuoto', 0, buoniDaFoglio([], []).nuovi.length);
check('scheda del salone: buoni salone', ['salone', 'salone', 'salone'],
  buoniDaFoglio(foglio, [], [], 'salone').nuovi.map(b => b.tipo));
check('senza dire niente: buoni spa', 'spa', buoniDaFoglio(foglio, []).nuovi[0].tipo);

// --- l'ID del foglio, comunque lo si incolli su Vercel ---
const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-xy';
check('schede: salone riconosciuta dal nome', { spa: 'Buoni Spa', salone: 'Buoni del salone' },
  scegliSchede(['Buoni Spa', 'Buoni del salone']));
check('schede: anche se il salone viene prima', { spa: 'Foglio1', salone: 'SALONE' },
  scegliSchede(['SALONE', 'Foglio1']));
check('schede: una sola, è la spa', { spa: 'Foglio1', salone: undefined }, scegliSchede(['Foglio1']));
check('schede: nomi detti su Vercel', { spa: 'Vendite', salone: 'Altro' },
  scegliSchede(['Vendite', 'Altro', 'Buoni salone vecchi'], 'vendite', 'Altro'));
check('ID dal link intero', ID, idDelFoglio(`https://docs.google.com/spreadsheets/d/${ID}/edit#gid=0`));
check('ID già pulito', ID, idDelFoglio(`  ${ID} `));
check('ID senza senso', '', idDelFoglio('ciao'));
check('errore: API spenta', true, spiegaErroreFoglio(403, 'Google Sheets API has not been used in project', 'r@x').includes('Google Sheets API'));
check('errore: non condiviso', true, spiegaErroreFoglio(403, 'The caller does not have permission', 'robot@x').includes('robot@x'));
check('errore: foglio sbagliato', true, spiegaErroreFoglio(404, 'Requested entity was not found', 'r@x').includes('BUONI_FOGLIO_ID'));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
