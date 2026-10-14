// Gli indirizzi di prenotazione di ogni salone.
import { leggiDomini, saloneDelDominio, linkPrenotazione } from './domini';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const d = leggiDomini(' prenota.rdsalon.com = abc123 , https://Prenota.Altro.it/ =xyz_9; rotto ; senza= ; male=con spazi');
check('si leggono i domini', { 'prenota.rdsalon.com': 'abc123', 'prenota.altro.it': 'xyz_9' }, d);
check('variabile vuota: niente', {}, leggiDomini(undefined));
check('il salone del dominio', 'abc123', saloneDelDominio('prenota.rdsalon.com', d));
check('maiuscole e www non contano', 'abc123', saloneDelDominio('WWW.Prenota.RDSalon.com', d));
check('il gestionale non è un dominio di prenotazione', null, saloneDelDominio('rosygestionale.rdsalon.com', d));
check('link corto se c\'è', 'https://prenota.rdsalon.com', linkPrenotazione('abc123', 'https://rosygestionale.rdsalon.com', d));
check('altrimenti quello di sempre', 'https://rosygestionale.rdsalon.com/zzz/prenota', linkPrenotazione('zzz', 'https://rosygestionale.rdsalon.com', d));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
