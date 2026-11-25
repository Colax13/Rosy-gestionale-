import { clientiDaRecuperare, compleanniInArrivo, riepilogoIncassi, incassoPrevisto, puntoDelGiorno } from './punto';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const adesso = new Date(2027, 0, 20, 10, 0);
const giorniFa = (n: number) => new Date(adesso.getTime() - n * 86400000).toISOString();
const fra = (n: number) => new Date(adesso.getTime() + n * 86400000).toISOString();

// --- da recuperare
const clienti: any[] = [
  { id: 'a', nome: 'Anna', createdAt: giorniFa(400) },
  { id: 'b', nome: 'Bea', createdAt: giorniFa(400) },
  { id: 'c', nome: 'Carla', createdAt: giorniFa(400) },
  { id: 'd', nome: 'Dora', createdAt: giorniFa(10) },
  { id: 'e', nome: 'Elsa', createdAt: giorniFa(200) },
];
const storico: any[] = [
  { id_cliente: 'a', data_ora: giorniFa(90), stato: 'completato' },
  { id_cliente: 'a', data_ora: giorniFa(200), stato: 'completato' },
  { id_cliente: 'b', data_ora: giorniFa(20), stato: 'completato' },
  { id_cliente: 'c', data_ora: giorniFa(100), stato: 'completato' },
  { id_cliente: 'c', data_ora: fra(3), stato: 'confermato' },
  { id_cliente: 'e', data_ora: giorniFa(5), stato: 'annullato' },
];
const dr = clientiDaRecuperare(clienti, storico, adesso);
check('chi manca da più di 60 giorni, le più lontane prima', ['e', 'a'], dr.map(r => r.cliente.id));
check('giorni dall\'ultima visita', 90, dr.find(r => r.cliente.id === 'a')!.giorni);
check('mai venuta: conta dalla scheda', [200, null], [dr[0].giorni, dr[0].ultimaVisita]);
check('soglia diversa', ['e'], clientiDaRecuperare(clienti, storico, adesso, 150).map(r => r.cliente.id));

// --- compleanni
const nati: any[] = [
  { id: '1', nome: 'Oggi', data_nascita: '1990-01-20' },
  { id: '2', nome: 'Domani', data_nascita: '21/01/1985' },
  { id: '3', nome: 'Lontana', data_nascita: '1990-06-01' },
  { id: '4', nome: 'Ieri', data_nascita: '1990-01-19' },
  { id: '5', nome: 'Senza' },
  { id: '6', nome: 'SenzaAnno', data_nascita: '25/01' },
  { id: '7', nome: 'Rotta', data_nascita: 'boh' },
];
const comp = compleanniInArrivo(nati, adesso, 7);
check('compleanni entro 7 giorni', ['1', '2', '6'], comp.map(c => c.cliente.id));
check('oggi e gli anni', [0, 37], [comp[0].fra, comp[0].anni]);
check('senza anno: niente età', null, comp[2].anni);
check('a cavallo dell\'anno', 2, compleanniInArrivo([{ id: 'x', data_nascita: '1990-01-01' }], new Date(2026, 11, 30), 7)[0].fra);

// --- incassi
const chiusi: any[] = [
  { stato: 'completato', prezzo_finale: 50, dipendenti: { nome: 'Giulia' }, preconto: { righe: [{ nome: 'Piega', prezzo: 25 }, { prodottoId: 'p', prezzo: 12.5, quantita: 2 }] } },
  { stato: 'completato', prezzo_finale: 30, dipendenti: { nome: 'Sara' } },
  { stato: 'completato', prezzo_finale: 70, dipendenti: { nome: 'Giulia' } },
  { stato: 'confermato', prezzo_finale: 999 },
];
check('incassi', { totale: 150, appuntamenti: 3, scontrino_medio: 50, prodotti: 25, per_operatrice: [{ nome: 'Giulia', appuntamenti: 2, totale: 120 }, { nome: 'Sara', appuntamenti: 1, totale: 30 }] }, riepilogoIncassi(chiusi));
check('incassi vuoti', 0, riepilogoIncassi([]).scontrino_medio);

const listino = [{ nome: 'Piega', prezzo_base: 25 }, { nome: 'Colore', prezzo_base: 60 }];
const oggi: any[] = [
  { stato: 'completato', prezzo_finale: 40, data_ora: new Date(2027, 0, 20, 9, 0).toISOString(), clienti: { nome: 'Anna' } },
  { stato: 'confermato', data_ora: new Date(2027, 0, 20, 11, 30).toISOString(), clienti: { nome: 'Bea', cognome: 'Rossi' }, righe_appuntamento: [{ servizi_catalogo: { nome: 'piega' } }, { servizi_catalogo: { nome: 'Colore' } }] },
  { stato: 'annullato', data_ora: new Date(2027, 0, 20, 12, 0).toISOString(), righe_appuntamento: [{ servizi_catalogo: { nome: 'Colore' } }] },
  { id_cliente: 'block-client', stato: 'confermato', data_ora: new Date(2027, 0, 20, 13, 0).toISOString() },
];
check('incasso previsto: in cassa + listino di quelli aperti', { previsto: 125, incassato: 40 }, incassoPrevisto(oggi, listino));

// --- il punto
const punto = puntoDelGiorno({ appuntamentiOggi: oggi, richieste: 2, daRecuperare: 12, compleanni: comp, prodotti: [{ nome: 'Olio', giacenza: 0 }, { nome: 'Shampoo', giacenza: 5 }], catalogo: listino, spaziLiberi: 6, adesso });
check('ordine: agenda, urgenti, idee, informazioni', ['agenda', 'richieste', 'prodotti', 'compleanni-oggi', 'spazi', 'recupero', 'compleanni'], punto.map(v => v.chiave));
check('agenda: quanti e la prossima', 'Oggi hai 2 appuntamenti · prossima Bea Rossi alle 11:30', punto[0].testo);
check('agenda: incasso', 'Incasso previsto 125 €, di cui 40 € già in cassa.', punto[0].dettaglio);
check('prodotto esaurito è urgente', 'urgente', punto.find(v => v.chiave === 'prodotti')!.tono);
const vuoto = puntoDelGiorno({ appuntamentiOggi: [], richieste: 0, daRecuperare: 0, compleanni: [], prodotti: null, catalogo: [], spaziLiberi: 0, adesso });
check('giornata vuota: una voce sola', ['Oggi non ci sono appuntamenti in agenda'], vuoto.map(v => v.testo));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
