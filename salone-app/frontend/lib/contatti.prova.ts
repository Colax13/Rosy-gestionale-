import { numeroInternazionale, linkWhatsApp, linkTelefonata, whatsappDelSalone, cellulareValido } from './contatti';

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
check('WhatsApp del salone: quello scritto apposta', '347 000 1111', whatsappDelSalone('347 000 1111', '0775 123456'));
check('WhatsApp del salone: il telefono se è un cellulare', '340 111 2233', whatsappDelSalone('', '340 111 2233'));
check('WhatsApp del salone: un fisso no', '', whatsappDelSalone('', '0775 123456'));
check('WhatsApp del salone: niente', '', whatsappDelSalone(undefined, undefined));

// --- il cellulare per il codice di verifica: solo numeri giusti
const valido = (t: string) => { const r = cellulareValido(t); return r.ok ? r.numero : 'NO'; };
check('cellulare con spazi', '393331234567', valido('333 123 4567'));
check('cellulare attaccato', '393331234567', valido('3331234567'));
check('cellulare con +39', '393331234567', valido('+39 333 1234567'));
check('cellulare con 0039', '393331234567', valido('0039 333 123 4567'));
check('cellulare con 39 senza +', '393331234567', valido('39 333 1234567'));
check('cellulare con trattini e parentesi', '393331234567', valido('(333) 123-4567'));
check('cellulare copiato dalla rubrica iPhone', '393331234567', valido('\u202A+39 333 123 4567\u202C'));
check('cellulare che inizia con 39', '393912345678', valido('391 2345678'));
check('fisso: no', 'NO', valido('0775 123456'));
check('fisso con +39: no', 'NO', valido('+39 0775 123456'));
check('una cifra in meno: no', 'NO', valido('333 123 456'));
check('una cifra in più: no', 'NO', valido('333 123 45678'));
check('vuoto: no', 'NO', valido(''));
check('straniero col prefisso: sì', '41791234567', valido('+41 79 123 45 67'));
check('il motivo del fisso', true, /fisso/.test((cellulareValido('0775 123456') as any).motivo));
check('il motivo delle cifre', true, /10 cifre: ne hai scritte 9/.test((cellulareValido('333 123 456') as any).motivo));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
