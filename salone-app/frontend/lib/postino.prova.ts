// Da dove esce l'SMS di ciascun salone.
import { scegliPostino, gettoneValido } from '../../../api/_postino';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const vercel = { tipo: 'traccar' as const, token: 'gettone-di-vercel', origine: 'vercel' as const };

check('il salone che ha collegato il suo tablet usa il suo',
  { tipo: 'traccar', token: 'gettone-del-salone', origine: 'salone' },
  scegliPostino('gettone-del-salone', 'qualsiasi@salone.it', vercel));
check('anche RD Salon, se ha collegato il tablet da Impostazioni, usa quello',
  'salone', scegliPostino('gettone-del-salone', 'rdsalon.ceccano@gmail.com', vercel)?.origine);
check('RD Salon senza tablet collegato usa le chiavi di Vercel',
  'vercel', scegliPostino(undefined, 'rdsalon.ceccano@gmail.com', vercel)?.origine);
check('un altro salone NON usa le chiavi di Vercel: sono del tablet di RD Salon',
  null, scegliPostino(undefined, 'altro@salone.it', vercel));
check('senza niente, niente SMS', null, scegliPostino(undefined, 'altro@salone.it', null));
check('un gettone rovinato non vale', null, scegliPostino('ha degli spazi dentro', 'altro@salone.it', null));

check('gettone normale',        true,  gettoneValido('a1B2c3D4e5F6g7H8'));
check('gettone con trattini',   true,  gettoneValido('abc-def_123:456'));
check('troppo corto',           false, gettoneValido('abc'));
check('con gli spazi in mezzo', false, gettoneValido('abc def ghi jkl'));
check('vuoto',                  false, gettoneValido(''));
check('non è un testo',         false, gettoneValido(12345678));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
