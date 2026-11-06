import { haConsensoMarketing, testoPer, erroreTesto, TESTO_RECUPERO } from './recupero';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('consenso dalla scheda', true, haConsensoMarketing({ consenso_marketing: true }));
check('consenso dalla prenotazione online', true, haConsensoMarketing({ consensi: { marketing: true } }));
check('senza consenso', false, haConsensoMarketing({ nome: 'Anna' }));
check('consenso negato', false, haConsensoMarketing({ consenso_marketing: false, consensi: { marketing: false } }));
check('nome e salone', 'Ciao Maria, ti aspettiamo da RD Salon!', testoPer('Ciao {nome}, ti aspettiamo da {salone}!', { nome: 'Maria Grazia' }, 'RD Salon'));
check('senza nome non resta lo spazio', 'Ciao, ti aspettiamo!', testoPer('Ciao {nome}, ti aspettiamo!', {}, 'X'));
check('testo proposto valido', '', erroreTesto(testoPer(TESTO_RECUPERO, { nome: 'Anna' }, 'RD Salon')));
check('testo vuoto', 'Scrivi il messaggio.', erroreTesto('  '));
check('testo troppo lungo', true, erroreTesto('x'.repeat(321)).startsWith('Il messaggio è troppo lungo'));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
