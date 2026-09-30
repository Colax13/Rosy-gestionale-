import { prossimoNumero, numeroScritto } from '../../../api/_numerazione';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('il primo preconto in assoluto',     { anno: 2026, numero: 1 },  prossimoNumero(null, 2026));
check('quello dopo',                       { anno: 2026, numero: 13 }, prossimoNumero({ anno: 2026, ultimo: 12 }, 2026));
check('a gennaio si ricomincia da 1',      { anno: 2027, numero: 1 },  prossimoNumero({ anno: 2026, ultimo: 480 }, 2027));
check('contatore rovinato: si riparte',    { anno: 2026, numero: 1 },  prossimoNumero({ anno: 2026, ultimo: NaN } as any, 2026));
check('come si scrive',                    'N. 13/2026', numeroScritto({ anno: 2026, numero: 13 }));
check('senza numero non si scrive niente', '',           numeroScritto(null));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
