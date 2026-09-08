import { numeroInternazionale, linkWhatsApp, linkTelefonata } from './contatti';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('cellulare scritto secco',        '393401112233', numeroInternazionale('3401112233'));
check('con gli spazi',                  '393401112233', numeroInternazionale('340 111 22 33'));
check('con i trattini',                 '393401112233', numeroInternazionale('340-111-2233'));
check('con il più',                     '393401112233', numeroInternazionale('+39 340 1112233'));
check('con lo zero zero',               '393401112233', numeroInternazionale('0039 340 1112233'));
check('fisso di casa',                  '390871123456', numeroInternazionale('0871 123456'));
check('numero straniero',               '447700900123', numeroInternazionale('+44 7700 900123'));
check('campo vuoto',                    '',             numeroInternazionale(''));
check('campo assente',                  '',             numeroInternazionale(null));
check('solo lettere',                   '',             numeroInternazionale('non lo so'));

check('collegamento WhatsApp',   'https://wa.me/393401112233', linkWhatsApp('340 111 22 33'));
check('WhatsApp con messaggio',  'https://wa.me/393401112233?text=Ciao%20Anna%2C%20come%20va%3F', linkWhatsApp('3401112233', 'Ciao Anna, come va?'));
check('WhatsApp senza numero',   '', linkWhatsApp(''));
check('collegamento chiamata',   'tel:+393401112233', linkTelefonata('+39 340 111 22 33'));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
