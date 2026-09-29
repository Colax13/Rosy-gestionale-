// Le parti di Skebby che si possono provare senza chiamarli davvero.
import { leggiRispostaLogin, mittenteValido } from '../../../api/_skebby';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('risposta in testo semplice', { userKey: 'UK123', sessionKey: 'SK456' }, leggiRispostaLogin('UK123;SK456'));
check('con spazi e a capo',         { userKey: 'UK123', sessionKey: 'SK456' }, leggiRispostaLogin('  UK123 ; SK456 \n'));
check('risposta in JSON',           { userKey: 'UK1', sessionKey: 'SK1' }, leggiRispostaLogin('{"user_key":"UK1","session_key":"SK1"}'));
check('JSON con il token',          { userKey: 'UK1', sessionKey: 'TOK' }, leggiRispostaLogin('{"user_key":"UK1","access_token":"TOK"}'));
check('risposta vuota',             null, leggiRispostaLogin(''));
check('risposta a metà',            null, leggiRispostaLogin('UK123'));
check('JSON rotto',                 null, leggiRispostaLogin('{"user_key":'));

check('mittente normale',      'RD SALON',    mittenteValido('RD SALON'));
check('mittente con simboli',  'RDSALON',     mittenteValido('RD_SALON!'));
check('mittente troppo lungo', 'RD SALON Pa', mittenteValido('RD SALON Parrucchieri'));
check('mittente assente',      '',            mittenteValido(undefined));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
