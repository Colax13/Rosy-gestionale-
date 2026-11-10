import {
  valoreAppuntamento, listinoAppuntamento, riepilogoPeriodo, confiniPeriodo, confiniDomani,
  clientiNuove, stimaPerMese, stimaPerOperatrice
} from './riepilogo';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const catalogo = [
  { id: 's1', nome: 'Colore', prezzo_base: 45 },
  { id: 's2', nome: 'Piega', prezzo_base: 20 },
  { id: 's3', nome: 'Taglio donna', prezzo_base: 25 },
];

// Mercoledì 11 novembre 2026, le 15:00: metà giornata.
const adesso = new Date(2026, 10, 11, 15, 0, 0);
const alle = (giorno: number, ora: number, minuti = 0) => new Date(2026, 10, giorno, ora, minuti).toISOString();
const servizi = (...nomi: string[]) => nomi.map(nome => ({ servizi_catalogo: { nome } }));

console.log('\nQuanto vale un appuntamento');
check('listino: somma dei servizi', 65, listinoAppuntamento({ righe_appuntamento: servizi('Colore', 'Piega') }, catalogo));
check('listino: maiuscole e spazi non contano', 20, listinoAppuntamento({ righe_appuntamento: servizi('  PIEGA ') }, catalogo));
check('listino: servizio sparito, vale il prezzo che si portava dietro', 30,
  listinoAppuntamento({ righe_appuntamento: [{ servizi_catalogo: { nome: 'Massaggio', prezzo_base: 30 } }] }, catalogo));
check('listino: nessun prezzo trovato', null, listinoAppuntamento({ righe_appuntamento: servizi('Massaggio') }, catalogo));
check('listino: senza servizi', null, listinoAppuntamento({}, catalogo));

check('chiuso con il conto: vale il conto, non il listino', { importo: 50, tipo: 'reale' },
  valoreAppuntamento({ stato: 'completato', prezzo_finale: 50, data_ora: alle(11, 9), righe_appuntamento: servizi('Colore', 'Piega') }, catalogo, adesso));
check('chiuso a zero (omaggio): resta zero, non diventa una stima', { importo: 0, tipo: 'reale' },
  valoreAppuntamento({ stato: 'completato', prezzo_finale: 0, data_ora: alle(11, 9), righe_appuntamento: servizi('Colore') }, catalogo, adesso));
check('passato e non chiuso: stima dal listino', { importo: 65, tipo: 'stima' },
  valoreAppuntamento({ stato: 'confermato', data_ora: alle(11, 10), righe_appuntamento: servizi('Colore', 'Piega') }, catalogo, adesso));
check('segnato completato ma senza conto: stima', { importo: 20, tipo: 'stima' },
  valoreAppuntamento({ stato: 'completato', data_ora: alle(11, 10), righe_appuntamento: servizi('Piega') }, catalogo, adesso));
check('ancora da fare: previsto', { importo: 25, tipo: 'previsto' },
  valoreAppuntamento({ stato: 'confermato', data_ora: alle(11, 17), righe_appuntamento: servizi('Taglio donna') }, catalogo, adesso));
check('annullato: niente', { importo: 0, tipo: 'niente' },
  valoreAppuntamento({ stato: 'annullato', data_ora: alle(11, 10), righe_appuntamento: servizi('Colore') }, catalogo, adesso));
check('richiesta non confermata: niente', { importo: 0, tipo: 'niente' },
  valoreAppuntamento({ stato: 'in_attesa', data_ora: alle(11, 10), righe_appuntamento: servizi('Colore') }, catalogo, adesso));
check('pausa in agenda: niente', { importo: 0, tipo: 'niente' },
  valoreAppuntamento({ id_cliente: 'block-client', stato: 'confermato', data_ora: alle(11, 13), righe_appuntamento: [] }, catalogo, adesso));
check('data come Timestamp di Firestore', { importo: 20, tipo: 'stima' },
  valoreAppuntamento({ stato: 'confermato', data_ora: { toDate: () => new Date(2026, 10, 11, 9) }, righe_appuntamento: servizi('Piega') }, catalogo, adesso));

console.log('\nLa giornata');
const operatrici = [{ id: 'd1', nome: 'Rosanna', cognome: 'Di Michele' }, { id: 'd2', nome: 'Giulia', cognome: '' }];
const giornata = [
  { id: 'a1', stato: 'completato', prezzo_finale: 60, id_dipendente: 'd1', data_ora: alle(11, 9), righe_appuntamento: servizi('Colore', 'Piega') },
  { id: 'a2', stato: 'confermato', id_dipendente: 'd1', data_ora: alle(11, 11), righe_appuntamento: servizi('Piega') },
  { id: 'a3', stato: 'confermato', id_dipendente: 'd2', data_ora: alle(11, 12), righe_appuntamento: servizi('Taglio donna') },
  { id: 'a4', stato: 'confermato', idDipendente: 'd2', data_ora: alle(11, 17), righe_appuntamento: servizi('Colore') },
  { id: 'a5', stato: 'annullato', id_dipendente: 'd2', data_ora: alle(11, 10), righe_appuntamento: servizi('Colore') },
  { id: 'a6', stato: 'in_attesa', id_dipendente: 'd1', data_ora: alle(11, 18), righe_appuntamento: servizi('Piega') },
  { id: 'a7', id_cliente: 'block-client', stato: 'confermato', id_dipendente: 'd1', data_ora: alle(11, 13), righe_appuntamento: [] },
  { id: 'a8', stato: 'confermato', data_ora: alle(11, 10, 30), righe_appuntamento: servizi('Massaggio') },
  // Altri giorni: non devono entrare nella giornata di oggi.
  { id: 'b1', stato: 'completato', prezzo_finale: 100, id_dipendente: 'd1', data_ora: alle(10, 9), righe_appuntamento: servizi('Colore') },
  { id: 'b2', stato: 'confermato', id_dipendente: 'd1', data_ora: alle(12, 9), righe_appuntamento: servizi('Colore', 'Piega') },
  { id: 'b3', stato: 'confermato', id_dipendente: 'd2', data_ora: alle(12, 15), righe_appuntamento: servizi('Piega') },
];
const { da, a } = confiniPeriodo('oggi', adesso);
const oggi = riepilogoPeriodo(giornata, catalogo, da, a, adesso, operatrici);
check('appuntamenti veri di oggi (senza pause, annullati e richieste)', 5, oggi.appuntamenti);
check('già passati', 4, oggi.fatti);
check('ancora da fare', 1, oggi.daFare);
check('chiusi con il conto', 1, oggi.chiusi);
check('passati non chiusi', 3, oggi.nonChiusi);
check('incassato davvero', 60, oggi.reale);
check('stima dei non chiusi (piega 20 + taglio 25 + massaggio senza prezzo)', 45, oggi.stima);
check('previsto per il resto della giornata', 45, oggi.previsto);
check('finora = reale + stima', 105, oggi.finora);
check('totale della giornata', 150, oggi.totale);
check('richieste in attesa', 1, oggi.richieste);
check('annullati', 1, oggi.annullati);
check('appuntamenti senza prezzo a listino', 1, oggi.senzaPrezzo);
check('per operatrice, dalla più alta',
  [['Rosanna', 2, 60, 20, 0], ['Giulia', 2, 0, 25, 45], ['Non assegnato', 1, 0, 0, 0]],
  oggi.perOperatrice.map(o => [o.nome, o.appuntamenti, o.reale, o.stima, o.previsto]));

const domani = confiniDomani(adesso);
const diDomani = riepilogoPeriodo(giornata, catalogo, domani.da, domani.a, adesso, operatrici);
check('domani: appuntamenti', 2, diDomani.appuntamenti);
check('domani: previsto', 85, diDomani.previsto);

const ieri = confiniPeriodo('ieri', adesso);
check('ieri: incassato', 100, riepilogoPeriodo(giornata, catalogo, ieri.da, ieri.a, adesso).reale);

check('niente appuntamenti: tutto a zero', [0, 0, 0, 0],
  (r => [r.appuntamenti, r.reale, r.stima, r.totale])(riepilogoPeriodo([], catalogo, da, a, adesso)));
check('elenco mancante: non si rompe', 0, riepilogoPeriodo(undefined as any, undefined as any, da, a, adesso).appuntamenti);

console.log('\nI periodi');
const g = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
check('oggi', ['2026-11-11 0:0', '2026-11-11 23:59'], (p => [g(p.da), g(p.a)])(confiniPeriodo('oggi', adesso)));
check('ieri', ['2026-11-10 0:0', '2026-11-10 23:59'], (p => [g(p.da), g(p.a)])(confiniPeriodo('ieri', adesso)));
check('settimana: da lunedì a domenica', ['2026-11-9 0:0', '2026-11-15 23:59'], (p => [g(p.da), g(p.a)])(confiniPeriodo('settimana', adesso)));
check('settimana vista di domenica: resta la stessa', ['2026-11-9 0:0', '2026-11-15 23:59'],
  (p => [g(p.da), g(p.a)])(confiniPeriodo('settimana', new Date(2026, 10, 15, 20))));
check('settimana vista di lunedì', ['2026-11-9 0:0', '2026-11-15 23:59'],
  (p => [g(p.da), g(p.a)])(confiniPeriodo('settimana', new Date(2026, 10, 9, 8))));
check('mese', ['2026-11-1 0:0', '2026-11-30 23:59'], (p => [g(p.da), g(p.a)])(confiniPeriodo('mese', adesso)));
check('mese di febbraio', ['2027-2-1 0:0', '2027-2-28 23:59'], (p => [g(p.da), g(p.a)])(confiniPeriodo('mese', new Date(2027, 1, 10))));
check('domani a fine mese passa al mese dopo', ['2026-12-1 0:0', '2026-12-1 23:59'],
  (p => [g(p.da), g(p.a)])(confiniDomani(new Date(2026, 10, 30, 12))));

console.log('\nClienti nuove e stime');
const clienti = [
  { createdAt: alle(11, 10) }, { createdAt: { toDate: () => new Date(2026, 10, 11, 12) } },
  { createdAt: alle(9, 10) }, { createdAt: null }, {}
];
check('clienti nuove oggi', 2, clientiNuove(clienti, da, a));
check('clienti nuove nella settimana', 3, (p => clientiNuove(clienti, p.da, p.a))(confiniPeriodo('settimana', adesso)));

const storico = [
  ...giornata,
  { id: 'o1', stato: 'confermato', id_dipendente: 'd1', data_ora: new Date(2026, 9, 20, 10).toISOString(), righe_appuntamento: servizi('Colore') },
  { id: 'o2', stato: 'completato', prezzo_finale: 80, id_dipendente: 'd1', data_ora: new Date(2026, 9, 21, 10).toISOString(), righe_appuntamento: servizi('Colore') },
];
check('stima mese per mese: solo i passati non chiusi', { '2026-11': 45, '2026-10': 45 }, stimaPerMese(storico, catalogo, adesso));
check('stima per operatrice', { d1: { appuntamenti: 2, stima: 65 }, d2: { appuntamenti: 1, stima: 25 }, unassigned: { appuntamenti: 1, stima: 0 } },
  stimaPerOperatrice(storico, catalogo, adesso));

console.log(`\n${ok} passate, ${ko} fallite`);
if (ko > 0) process.exit(1);
