import { componi, quandoScritto, elencoScritto } from './messaggi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const giovedi = new Date(2026, 9, 1, 15, 30); // 1 ottobre 2026, giovedì

check('quando, come lo direbbe una persona', 'giovedì 1 ottobre alle 15:30', quandoScritto(giovedi));
check('mezzanotte e mezza',                  'giovedì 1 ottobre alle 00:30', quandoScritto(new Date(2026, 9, 1, 0, 30)));

check('un servizio solo', 'colore',                  elencoScritto(['colore']));
check('due servizi',      'colore e piega',          elencoScritto(['colore', 'piega']));
check('tre servizi',      'colore, piega e taglio',  elencoScritto(['colore', 'piega', 'taglio']));
check('nessun servizio',  '',                        elencoScritto([]));
check('servizi vuoti',    '',                        elencoScritto(['', '']));

const dati = {
  nomeCliente: 'Maria Grazia Rossi',
  nomeSalone: 'RD Salon',
  indirizzo: 'Via Roma 1, Ceccano',
  telefonoSalone: '0775 123456',
  quando: giovedi,
  servizi: ['Colore', 'Piega'],
  operatore: 'Rosanna'
};

const conferma = componi('conferma', dati);
check('oggetto della conferma', 'Appuntamento confermato — giovedì 1 ottobre alle 15:30', conferma.oggetto);
check('si dà del tu, col nome di battesimo', true, conferma.testo.startsWith('Ciao Maria,'));
check('dice quando e cosa', true, conferma.testo.includes('giovedì 1 ottobre alle 15:30 — Colore e Piega con Rosanna.'));
check('dice di avvisare se non viene', true, conferma.testo.includes('avvisaci in tempo'));
check("c'è dove siamo", true, conferma.testo.includes('Via Roma 1, Ceccano · tel. 0775 123456'));
check('finisce col nome del salone', true, conferma.testo.trim().endsWith('RD Salon'));

const promemoria = componi('promemoria', dati);
check('oggetto del promemoria', 'Promemoria: domani giovedì 1 ottobre alle 15:30', promemoria.oggetto);
check('il promemoria ricorda, non conferma', true, promemoria.testo.includes('ti ricordiamo'));

// Senza nome, senza operatore, senza indirizzo: non deve uscire un buco.
const scarno = componi('conferma', {
  nomeCliente: '', nomeSalone: 'RD Salon', quando: giovedi, servizi: []
});
check('senza nome si saluta lo stesso', true, scarno.testo.startsWith('Ciao,'));
check('senza servizi la frase regge',   true, scarno.testo.includes('giovedì 1 ottobre alle 15:30.'));
check('niente doppi spazi',             false, scarno.testo.includes('  '));

// Un nome con un carattere strano non deve rompere l'HTML.
const cattivo = componi('conferma', { ...dati, nomeCliente: '<script>ciao' });
check("l'HTML non si fa scrivere da fuori", false, cattivo.html.includes('<script>'));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
