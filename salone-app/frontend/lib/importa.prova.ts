import { leggiCsv, indoviniMappatura, aCliente, chiaviCliente, aDataIso, numeroMese } from './importa';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// --- CSV all'italiana: punto e virgola, virgolette, virgola dentro il campo ---
const csv = `Nome;Cognome;Cellulare;E-mail;Note
Maria;Rossi;333 123 4567;maria@x.it;"Allergica, usare linea delicata"
Anna;Bianchi;+39 340-9876543;;Preferisce il mattino
;;;;
Giulia;Verdi;3401112222;g@v.it;`;

const tabella = leggiCsv(csv);
check('righe lette (riga vuota scartata)', 4, tabella.length);
check('virgola dentro le virgolette', 'Allergica, usare linea delicata', tabella[1][4]);

const mappatura = indoviniMappatura(tabella[0]);
check('colonne riconosciute', ['nome','cognome','telefono','email','note'], mappatura);

check('cliente convertito', 
  { nome:'Maria', cognome:'Rossi', telefono:'333 123 4567', email:'maria@x.it', note:'Allergica, usare linea delicata', canale_acquisizione:'' },
  aCliente(tabella[1], mappatura));

// --- CSV con la virgola come separatore e nome completo in una sola colonna ---
const csv2 = `Cliente,Telefono
Maria Grazia De Santis,3331234567`;
const t2 = leggiCsv(csv2);
const m2 = indoviniMappatura(t2[0]);
check('colonna unica riconosciuta come nome completo', ['nome_completo','telefono'], m2);
check('nome completo diviso', { nome:'Maria', cognome:'Grazia De Santis' },
  (({nome,cognome}) => ({nome,cognome}))(aCliente(t2[1], m2)));

// --- doppioni: stesso numero scritto in modo diverso ---
const inAnagrafica = chiaviCliente({ nome:'Maria', cognome:'Rossi', telefono:'+39 333 123 4567' });
const dalFile = chiaviCliente({ nome:'maria', cognome:'ROSSI', telefono:'333-1234567' });
check('stesso numero scritto diverso = stesso cliente', true, dalFile.some(k => inAnagrafica.includes(k)));
check('maiuscole diverse = stesso cliente', true, chiaviCliente({nome:'Anna',cognome:'Bianchi'}).some(k => chiaviCliente({nome:'anna',cognome:'bianchi'}).includes(k)));
check('cliente diverso non e doppione', false, chiaviCliente({nome:'Anna',cognome:'Neri'}).some(k => inAnagrafica.includes(k)));
check('numero troppo corto non fa da chiave', [ 'n:anna|' ], chiaviCliente({nome:'Anna', telefono:'12'}));

// --- le colonne del vecchio gestionale -------------------------------------
const csv3 = `Nome Cliente,Telefono,Sesso,Data di nascita,Giorno di nascita,Mese di nascita,Numero di prenotazioni,Stato di accettazione,Creato il,Lingua
Maria Rossi,3331234567,Donna,07/03/1990,7,marzo,14,Accettato,01/02/2021,Italiano`;
const t3 = leggiCsv(csv3);
const m3 = indoviniMappatura(t3[0]);
check('colonne del vecchio gestionale riconosciute',
  ['nome_completo','telefono','sesso','data_nascita','giorno_nascita','mese_nascita','numero_prenotazioni','stato_accettazione','creato_il_origine',''],
  m3);

const c3 = aCliente(t3[1], m3, t3[0]);
check('sesso',                 'Donna',      c3.sesso);
check('data di nascita in ISO','1990-03-07', c3.data_nascita);
check('prenotazioni fatte',    '14',         c3.numero_prenotazioni);
check('stato di accettazione', 'Accettato',  c3.stato_accettazione);
check('cliente dal',           '2021-02-01', c3.creato_il_origine);
check('la colonna non importata non si perde', { Lingua: 'Italiano' }, c3.extra);

// Nascita spezzata in due colonne, senza la data intera.
const csv4 = `Nome,Cognome,Giorno di nascita,Mese di nascita
Anna,Bianchi,3,Dicembre`;
const t4 = leggiCsv(csv4);
const c4 = aCliente(t4[1], indoviniMappatura(t4[0]), t4[0]);
check('nascita rimessa insieme dai pezzi', '1900-12-03', c4.data_nascita);

check('mese scritto a parole',  3, numeroMese('Marzo'));
check('mese abbreviato',        9, numeroMese('set'));
check('mese a cifre',          11, numeroMese('11'));
check('mese che non esiste',    0, numeroMese('boh'));
check('data gia in ISO',       '1990-03-07', aDataIso('1990-03-07'));
check('data con i trattini',   '1990-03-07', aDataIso('7-3-1990'));
check('anno a due cifre',      '1990-03-07', aDataIso('07/03/90'));
check('data incomprensibile',  '',           aDataIso('boh'));
check('data assente',          '',           aDataIso(''));

console.log(`\n${ok} passati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
