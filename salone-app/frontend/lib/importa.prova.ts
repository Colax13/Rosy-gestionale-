import { leggiCsv, indoviniMappatura, aCliente, chiaviCliente } from './importa';

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

console.log(`\n${ok} passati, ${ko} falliti`);
process.exit(ko ? 1 : 0);
