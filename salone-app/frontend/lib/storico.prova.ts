import { ultimoAppuntamento, serviziDi, serviziDaRipetere } from './storico';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const adesso = new Date('2026-10-06T12:00:00Z');
const a = (id: string, data_ora: string, altro: any = {}) => ({ id, data_ora, stato: 'confermato', id_cliente: 'c1', ...altro });

check("l'ultimo passato", 'b', ultimoAppuntamento([
  a('a', '2026-08-01T09:00:00Z'), a('b', '2026-09-20T09:00:00Z'), a('c', '2026-10-20T09:00:00Z')
], adesso)?.id);
check('salta annullati e richieste', 'a', ultimoAppuntamento([
  a('a', '2026-08-01T09:00:00Z'), a('x', '2026-09-20T09:00:00Z', { stato: 'annullato' }), a('y', '2026-09-25T09:00:00Z', { stato: 'in_attesa' })
], adesso)?.id);
check('nessuno passato: il prossimo fissato', 'f1', ultimoAppuntamento([
  a('f2', '2026-11-20T09:00:00Z'), a('f1', '2026-10-20T09:00:00Z')
], adesso)?.id);
check('niente di niente', null, ultimoAppuntamento([], adesso));

const app = { righe_appuntamento: [{ servizi_catalogo: { nome: 'Colore' } }, { servizi_catalogo: { nome: ' piega  corta ' } }, { servizi_catalogo: { nome: 'Vecchio servizio' } }] };
check('nomi dei servizi', ['Colore', ' piega  corta ', 'Vecchio servizio'], serviziDi(app));
const listino = [{ id: 's1', nome: 'Colore' }, { id: 's2', nome: 'Piega corta' }, { id: 's3', nome: 'Taglio', attivo: false }];
check('dal listino, per nome e in ordine', ['s1', 's2'], serviziDaRipetere(app, listino).map(s => s.id));
check('servizi non più attivi saltati', [], serviziDaRipetere({ righe_appuntamento: [{ servizi_catalogo: { nome: 'Taglio' } }] }, listino));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
