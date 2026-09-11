import { prezzoDiListino, righeDaAppuntamento, contiPreconto, euro } from './preconto';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const catalogo = [
  { id: 's1', nome: 'Colore', prezzo_base: 45 },
  { id: 's2', nome: 'Piega', prezzo_base: 20 },
  { id: 's3', nome: 'Trattamento Ricostruzione', prezzo_base: 35 },
  { id: 's4', nome: 'Sopracciglia', prezzo_base: 12 },
];

check('prezzo trovato',                 45, prezzoDiListino('Colore', catalogo));
check('maiuscole non contano',          20, prezzoDiListino('PIEGA', catalogo));
check('spazi di troppo non contano',    35, prezzoDiListino('  Trattamento   Ricostruzione ', catalogo));
check('accenti non contano',            12, prezzoDiListino('Sopraccìglia', catalogo));
check('servizio non a listino',       null, prezzoDiListino('Massaggio', catalogo));
check('catalogo vuoto',               null, prezzoDiListino('Colore', []));

const app = {
  righe_appuntamento: [
    { servizi_catalogo: { nome: 'Colore' } },
    { servizi_catalogo: { nome: 'Piega' } },
    { servizi_catalogo: { nome: 'Massaggio' } },
  ]
};
const righe = righeDaAppuntamento(app, catalogo);
check('una riga per servizio',          3, righe.length);
check('tutte spuntate',      [true, true, true], righe.map(r => r.scelta));
check('prezzi dal listino',      [45, 20, 0], righe.map(r => r.prezzo));
check('segnato chi non è a listino', [true, true, false], righe.map(r => r.daCatalogo));

check('totale delle spuntate',
  { totale: 65, sconto: 0, daPagare: 65 },
  contiPreconto(righe, ''));

const senzaPiega = righe.map(r => r.nome === 'Piega' ? { ...r, scelta: false } : r);
check('togliendo la piega',
  { totale: 45, sconto: 0, daPagare: 45 },
  contiPreconto(senzaPiega, ''));

check('con lo sconto',
  { totale: 65, sconto: 15, daPagare: 50 },
  contiPreconto(righe, '15'));

check('sconto con la virgola',
  { totale: 65, sconto: 5.5, daPagare: 59.5 },
  contiPreconto(righe, '5,50'));

check('sconto più grande del totale non fa negativi',
  { totale: 65, sconto: 65, daPagare: 0 },
  contiPreconto(righe, '100'));

check('sconto scritto negativo vale zero',
  { totale: 65, sconto: 0, daPagare: 65 },
  contiPreconto(righe, '-10'));

check('nessun servizio spuntato',
  { totale: 0, sconto: 0, daPagare: 0 },
  contiPreconto(righe.map(r => ({ ...r, scelta: false })), '20'));

check('importo scritto all\'italiana', '45,00 €', euro(45));
check('centesimi',                     '59,50 €', euro(59.5));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
