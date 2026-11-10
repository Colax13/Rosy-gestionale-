import { leggiIndirizzo, ePaginaPubblica, indirizzoSullaRiserva } from './riserva';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

console.log('\nL\'indirizzo della riserva');
check('indirizzo giusto', 'https://riserva.esempio.it', leggiIndirizzo('https://riserva.esempio.it'));
check('barra in fondo e spazi tolti', 'https://riserva.esempio.it', leggiIndirizzo('  https://riserva.esempio.it/  '));
check('variabile non impostata', null, leggiIndirizzo(undefined));
check('variabile vuota', null, leggiIndirizzo(''));
check('segnaposto rimasto nell\'HTML', null, leggiIndirizzo('%VITE_URL_RISERVA%'));
check('senza https non vale', null, leggiIndirizzo('http://riserva.esempio.it'));
check('solo il dominio non vale', null, leggiIndirizzo('riserva.esempio.it'));
check('testo qualsiasi non vale', null, leggiIndirizzo('https://riserva esempio'));
check('javascript: non vale', null, leggiIndirizzo('javascript:alert(1)'));
check('punta a sé stesso: niente, girerebbe in tondo', null, leggiIndirizzo('https://rosy.esempio.it', 'rosy.esempio.it'));
check('sé stesso, maiuscole diverse', null, leggiIndirizzo('https://Rosy.Esempio.it', 'rosy.esempio.it'));
check('un altro indirizzo va bene', 'https://riserva.esempio.it', leggiIndirizzo('https://riserva.esempio.it', 'rosy.esempio.it'));

console.log('\nLe pagine della cliente');
check('prenotazione', true, ePaginaPubblica('/abc123/prenota'));
check('informativa', true, ePaginaPubblica('/abc123/privacy/'));
check('agenda', false, ePaginaPubblica('/agenda'));
check('scheda cliente', false, ePaginaPubblica('/clienti/abc'));
check('radice', false, ePaginaPubblica('/'));

console.log('\nDove si arriva sulla riserva');
check('stessa pagina', 'https://riserva.esempio.it/agenda?da=principale', indirizzoSullaRiserva('https://riserva.esempio.it', '/agenda'));
check('scheda cliente', 'https://riserva.esempio.it/clienti/Ab_1-2?da=principale', indirizzoSullaRiserva('https://riserva.esempio.it', '/clienti/Ab_1-2'));
check('percorso strano: si va alla prima pagina', 'https://riserva.esempio.it/?da=principale', indirizzoSullaRiserva('https://riserva.esempio.it', '//altro.sito/x?y'));
check('percorso vuoto', 'https://riserva.esempio.it/?da=principale', indirizzoSullaRiserva('https://riserva.esempio.it', ''));

console.log(`\n${ok} passate, ${ko} fallite`);
if (ko > 0) process.exit(1);
