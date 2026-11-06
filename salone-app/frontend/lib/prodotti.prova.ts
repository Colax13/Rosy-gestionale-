import { validaProdotto, moduloVuoto, leggiCifra, statoScorta, riepilogoMagazzino, filtraProdotti, moduloDa, differenzeMagazzino, variazione, incassoProdotti, categorieDi } from './prodotti';
import { contiPreconto, totaliPerTipo, rigaDaSalvare } from './preconto';

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

// --- movimenti
check('carico aggiunge', 3, variazione('carico', 3));
check('vendita toglie', -2, variazione('vendita', 2));
check('reso rimette', 1, variazione('reso', -1));

check('prima chiusura: vende tutto', [{ prodottoId: 'p1', nome: 'Shampoo', quantita: 2, prezzo: 20 }],
  differenzeMagazzino(null, [{ prodottoId: 'p1', nome: 'Shampoo', quantita: 2, prezzo: 20 }, { nome: 'Piega', prezzo: 25 }]));
check('richiusa uguale: niente', [], differenzeMagazzino([{ prodottoId: 'p1', quantita: 2 }], [{ prodottoId: 'p1', quantita: 2 }]));
check('un pezzo in più', [1], differenzeMagazzino([{ prodottoId: 'p1', quantita: 2 }], [{ prodottoId: 'p1', quantita: 3 }]).map(d => d.quantita));
check('prodotto tolto dal conto', [{ prodottoId: 'p1', nome: 'S', quantita: -2, prezzo: 20 }], differenzeMagazzino([{ prodottoId: 'p1', nome: 'S', quantita: 2, prezzo: 20 }], []));
check('stesso prodotto su due righe', [3], differenzeMagazzino([], [{ prodottoId: 'p1', quantita: 1 }, { prodottoId: 'p1', quantita: 2 }]).map(d => d.quantita));

const meseDi = (iso: string) => iso.slice(0, 7);
const apps = [
  { stato: 'completato', data_ora: '2026-11-03T10:00:00Z', preconto: { righe: [{ nome: 'Piega', prezzo: 25 }, { prodottoId: 'p1', prezzo: 20, quantita: 2 }] } },
  { stato: 'completato', data_ora: '2026-10-30T10:00:00Z', preconto: { righe: [{ prodottoId: 'p1', prezzo: 20 }] } },
  { stato: 'confermato', data_ora: '2026-11-04T10:00:00Z', preconto: { righe: [{ prodottoId: 'p1', prezzo: 20 }] } },
];
const movs: any[] = [{ tipo: 'vendita_banco', importo: 15, mese: '2026-11' }, { tipo: 'carico', mese: '2026-11' }, { tipo: 'vendita_banco', importo: 9, mese: '2026-10' }];
check('incasso prodotti del mese', 55, incassoProdotti(apps, movs, '2026-11', meseDi));
check('categorie', ['Maschere', 'Shampoo'], categorieDi([{ categoria: 'Shampoo' }, { categoria: 'Maschere' }, { categoria: ' Shampoo ' }, {}] as any));

// --- il preconto con i prodotti
const righePreconto: any[] = [
  { id: 'a', nome: 'Piega', prezzo: 25, daCatalogo: true, scelta: true },
  { id: 'b', nome: 'Shampoo', prezzo: 20, daCatalogo: true, scelta: true, prodottoId: 'p1', quantita: 2 },
  { id: 'c', nome: 'Maschera', prezzo: 30, daCatalogo: true, scelta: false, prodottoId: 'p2', quantita: 1 },
];
check('conto con quantità', 65, contiPreconto(righePreconto, 0).totale);
check('servizi e prodotti separati', { servizi: 25, prodotti: 40 }, totaliPerTipo(righePreconto));
check('riga prodotto salvata', { nome: 'Shampoo', prezzo: 20, prodottoId: 'p1', quantita: 2 }, rigaDaSalvare(righePreconto[1]));
check('riga servizio salvata come prima', { nome: 'Piega', prezzo: 25 }, rigaDaSalvare(righePreconto[0]));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
