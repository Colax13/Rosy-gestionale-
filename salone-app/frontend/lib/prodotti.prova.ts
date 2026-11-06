import { validaProdotto, moduloVuoto, leggiCifra, statoScorta, riepilogoMagazzino, filtraProdotti, moduloDa } from './prodotti';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('cifra con la virgola', 12.5, leggiCifra('12,50'));
check('cifra con l\'euro', 9, leggiCifra('€ 9'));
check('cifra vuota', null, leggiCifra(' '));
check('cifra sbagliata', null, leggiCifra('dodici'));

const buono = { ...moduloVuoto(), nome: ' Shampoo ristrutturante ', marca: 'Kérastase', prezzo: '24,90', giacenza: '6', scorta_minima: '2' };
check('prodotto valido', { nome: 'Shampoo ristrutturante', prezzo: 24.9, giacenza: 6, attivo: true, marca: 'Kérastase', scorta_minima: 2 }, validaProdotto(buono).dati);
check('senza nome', ['Scrivi il nome del prodotto.'], validaProdotto({ ...buono, nome: '' }).errori);
check('senza prezzo', 1, validaProdotto({ ...buono, prezzo: '' }).errori.length);
check('pezzi non interi', 1, validaProdotto({ ...buono, giacenza: '2,5' }).errori.length);
check('costo facoltativo vuoto: niente errore', 0, validaProdotto({ ...buono, costo: '' }).errori.length);
check('costo sbagliato', 1, validaProdotto({ ...buono, costo: 'boh' }).errori.length);
check('andata e ritorno dal modulo', 24.9, leggiCifra(moduloDa(validaProdotto(buono).dati!).prezzo));

check('esaurito', 'esaurito', statoScorta({ giacenza: 0, scorta_minima: 2 }));
check('in esaurimento', 'in_esaurimento', statoScorta({ giacenza: 2, scorta_minima: 2 }));
check('senza scorta minima', 'ok', statoScorta({ giacenza: 1 }));

const elenco: any[] = [
  { id: 'a', nome: 'Maschera', prezzo: 20, giacenza: 3, scorta_minima: 5 },
  { id: 'b', nome: 'Balsamo', marca: 'Davines', prezzo: 15, giacenza: 0 },
  { id: 'c', nome: 'Spazzola', prezzo: 10, giacenza: 4, attivo: false },
];
check('riepilogo (senza i disattivati)', { prodotti: 2, pezzi: 3, valore_vendita: 60, da_riordinare: 2 }, riepilogoMagazzino(elenco));
check('ricerca per marca', ['b'], filtraProdotti(elenco, 'davines').map(p => p.id));
check('in ordine di nome', ['b', 'a', 'c'], filtraProdotti(elenco, '').map(p => p.id));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
