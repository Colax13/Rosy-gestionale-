import { spezzoniPerOperatore, segmentiAppuntamento, intervalliDaSegmenti, siAccavallano, NON_ASSEGNATO } from './servizi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const colore = { nome: 'Colore', tempo_lavorazione_minuti: 15, tempo_posa_minuti: 45, tempo_finitura_minuti: 15 };
const piega  = { nome: 'Piega',  tempo_lavorazione_minuti: 30, tempo_posa_minuti: 0,  tempo_finitura_minuti: 0 };
const taglio = { nome: 'Taglio', tempo_lavorazione_minuti: 45, tempo_posa_minuti: 0,  tempo_finitura_minuti: 0 };

// --- ogni segmento sa da quale servizio viene ---
const segmenti = segmentiAppuntamento([{ servizi_catalogo: colore }, { servizi_catalogo: piega }]);
check('segmenti del colore + piega', 4, segmenti.length);
check('righe dei segmenti', [0, 0, 0, 1], segmenti.map(s => s.indiceRiga));
check('tipi dei segmenti', ['lavorazione', 'posa', 'lavorazione', 'lavorazione'], segmenti.map(s => s.tipo));

// --- tutto a una sola persona: un pezzo solo ---
const unSolo = spezzoniPerOperatore(
  [{ servizi_catalogo: colore }, { servizi_catalogo: piega }],
  'd1'
);
check('un solo operatore, un solo pezzo', 1, unSolo.length);
check('il pezzo copre tutto', [0, 105], [unSolo[0].inizio, unSolo[0].fine]);
check("è di chi ha l'appuntamento", 'd1', unSolo[0].idDipendente);

// --- colore a Rosanna, piega a Giulia: due pezzi in due colonne ---
const divisi = spezzoniPerOperatore(
  [{ servizi_catalogo: colore }, { servizi_catalogo: piega, id_dipendente: 'd2' }],
  'd1'
);
check('due operatori, due pezzi', 2, divisi.length);
check('primo pezzo: il colore, da 0 a 75', ['d1', 0, 75], [divisi[0].idDipendente, divisi[0].inizio, divisi[0].fine]);
check('secondo pezzo: la piega, da 75 a 105', ['d2', 75, 105], [divisi[1].idDipendente, divisi[1].inizio, divisi[1].fine]);
check('i minuti del pezzo ripartono da zero', [0], divisi[1].segmenti.map(s => s.inizio));
check('la posa resta col colore', ['lavorazione', 'posa', 'lavorazione'], divisi[0].segmenti.map(s => s.tipo));

// --- tre servizi, quello in mezzo a un'altra: tre pezzi, non due ---
const alternati = spezzoniPerOperatore(
  [{ servizi_catalogo: taglio }, { servizi_catalogo: piega, id_dipendente: 'd2' }, { servizi_catalogo: piega }],
  'd1'
);
check('si alternano: tre pezzi', ['d1', 'd2', 'd1'], alternati.map(s => s.idDipendente));

// --- riga senza operatore e appuntamento senza operatore ---
const orfano = spezzoniPerOperatore([{ servizi_catalogo: piega }], null);
check('senza nessuno: non assegnato', NON_ASSEGNATO, orfano[0].idDipendente);

// --- durante la posa l'operatore è libero ---
const inizio = new Date('2026-09-08T09:00:00').getTime();
const occupati = intervalliDaSegmenti(inizio, divisi[0].segmenti);
const ore = occupati.map(o => [new Date(o.inizio).getHours() + ':' + String(new Date(o.inizio).getMinutes()).padStart(2, '0'),
                               new Date(o.fine).getHours() + ':' + String(new Date(o.fine).getMinutes()).padStart(2, '0')]);
check('occupata solo lavorazione e finitura', [['9:00', '9:15'], ['10:00', '10:15']], ore);

// --- accavallamenti visti dalla parte dell'operatrice ---
const ore9 = new Date('2026-09-08T09:00:00').getTime();
const ore920 = new Date('2026-09-08T09:20:00').getTime();
const ore1030 = new Date('2026-09-08T10:30:00').getTime();

const colorePiega = [{ servizi_catalogo: colore }, { servizi_catalogo: piega }];

// La posa del colore va dalle 9:15 alle 10:00: una piega da 30' alle 9:20 ci sta.
check('nella posa ci si infila un altro servizio',
  false,
  siAccavallano(
    { inizioMs: ore920, righe: [{ servizi_catalogo: piega }], operatore: 'd1' },
    { inizioMs: ore9, righe: colorePiega, operatore: 'd1' },
    'd1'));

// Un taglio da 45' alle 9:20 invece sfora nella finitura delle 10:00.
check('ma se sfora nella finitura no',
  true,
  siAccavallano(
    { inizioMs: ore920, righe: [{ servizi_catalogo: taglio }], operatore: 'd1' },
    { inizioMs: ore9, righe: colorePiega, operatore: 'd1' },
    'd1'));

check('sulla lavorazione altrui no',
  true,
  siAccavallano(
    { inizioMs: ore9, righe: [{ servizi_catalogo: taglio }], operatore: 'd1' },
    { inizioMs: ore9, righe: colorePiega, operatore: 'd1' },
    'd1'));

check("la piega affidata a un'altra non impegna la prima",
  false,
  siAccavallano(
    { inizioMs: ore1030, righe: [{ servizi_catalogo: piega }], operatore: 'd1' },
    { inizioMs: ore9, righe: [{ servizi_catalogo: colore }, { servizi_catalogo: piega, id_dipendente: 'd2' }], operatore: 'd1' },
    'd1'));

check('ma impegna quella a cui è stata data',
  true,
  siAccavallano(
    { inizioMs: ore1030, righe: [{ servizi_catalogo: piega }], operatore: 'd2' },
    { inizioMs: ore9, righe: [{ servizi_catalogo: colore }, { servizi_catalogo: piega, id_dipendente: 'd2' }], operatore: 'd1' },
    'd2'));

// --- la finitura affidata a un'altra ---
const coloreFinituraAltrove = [{ servizi_catalogo: colore, id_dipendente_finitura: 'd2' }];
const treFasi = spezzoniPerOperatore(coloreFinituraAltrove, 'd1');

check('lavorazione e finitura in due colonne', ['d1', 'd2'], treFasi.map(x => x.idDipendente));
check('il primo pezzo tiene lavorazione e posa', ['lavorazione', 'posa'], treFasi[0].segmenti.map(x => x.fase));
check('il primo pezzo va da 0 a 60',            [0, 60], [treFasi[0].inizio, treFasi[0].fine]);
check('il secondo pezzo è la finitura',         ['finitura'], treFasi[1].segmenti.map(x => x.fase));
check('la finitura va da 60 a 75',              [60, 75], [treFasi[1].inizio, treFasi[1].fine]);

check("la finitura altrui non impegna chi ha steso il colore",
  false,
  siAccavallano(
    { inizioMs: new Date('2026-09-08T10:00:00').getTime(), righe: [{ servizi_catalogo: piega }], operatore: 'd1' },
    { inizioMs: ore9, righe: coloreFinituraAltrove, operatore: 'd1' },
    'd1'));

check('ma impegna chi la fa',
  true,
  siAccavallano(
    { inizioMs: new Date('2026-09-08T10:00:00').getTime(), righe: [{ servizi_catalogo: piega }], operatore: 'd2' },
    { inizioMs: ore9, righe: coloreFinituraAltrove, operatore: 'd1' },
    'd2'));

// --- lavorazione spostata, finitura ferma ---
const soloLavorazioneAltrove = [{ servizi_catalogo: colore, id_dipendente: 'd3', id_dipendente_finitura: 'd1' }];
check('lavorazione a una, finitura a un\'altra',
  ['d3', 'd1'],
  spezzoniPerOperatore(soloLavorazioneAltrove, 'd1').map(x => x.idDipendente));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
