// Chi riceve il promemoria di domani. Si prova la scelta, non l'invio.
import { sceltaPromemoria } from '../../../api/_promemoria';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// Il giro parte a mezzogiorno del 30 settembre, ora del salone.
const adesso = new Date('2026-09-30T12:00:00+02:00');
const app = (id: string, data_ora: string, altro: any = {}) =>
  ({ id, dati: { data_ora, stato: 'confermato', id_cliente: 'c1', ...altro } });

const scelta = sceltaPromemoria([
  app('domani-mattina',   '2026-10-01T09:00:00+02:00'),
  app('domani-sera',      '2026-10-01T19:30:00+02:00'),
  // 23:30 UTC del 30 = 01:30 del primo ottobre in salone: è domani.
  app('domani-notte-utc', '2026-09-30T23:30:00Z'),
  app('oggi',             '2026-09-30T17:00:00+02:00'),
  app('dopodomani',       '2026-10-02T10:00:00+02:00'),
  app('in-attesa',        '2026-10-01T11:00:00+02:00', { stato: 'in_attesa' }),
  app('annullato',        '2026-10-01T11:00:00+02:00', { stato: 'annullato' }),
  app('pausa',            '2026-10-01T13:00:00+02:00', { id_cliente: 'block-client', stato: 'annullato' }),
  app('gia-ricordato',    '2026-10-01T15:00:00+02:00', { messaggi: { promemoria: { quando: '2026-09-30T09:00:00Z' } } }),
  app('confermato-ora',   '2026-10-01T16:00:00+02:00', { messaggi: { conferma: { quando: '2026-09-30T08:00:00Z' } } }),
  app('confermato-ieri',  '2026-10-01T17:00:00+02:00', { messaggi: { conferma: { quando: '2026-09-29T08:00:00Z' } } }),
], adesso);

check('domani, sul calendario del salone', '2026-10-01', scelta.domani);
check('chi riceve il promemoria',
  ['domani-mattina', 'domani-sera', 'domani-notte-utc', 'confermato-ieri'],
  scelta.daMandare.map(c => c.id));
check('chi viene saltato, e perché', [
  { id: 'in-attesa', motivo: 'stato in_attesa' },
  { id: 'annullato', motivo: 'stato annullato' },
  { id: 'gia-ricordato', motivo: 'promemoria già mandato' },
  { id: 'confermato-ora', motivo: 'conferma mandata da poco' }
], scelta.saltati);
check('le pause non sono clienti: non compaiono nemmeno fra i saltati', false,
  scelta.saltati.some(s => s.id === 'pausa'));

// Il giro alle 23:30 in salone: per il server è già il giorno dopo, ma
// "domani" resta quello del salone.
const tardi = sceltaPromemoria([], new Date('2026-09-30T23:30:00+02:00'));
check('alle 23:30 domani è ancora il primo ottobre', '2026-10-01', tardi.domani);

// Il giorno del cambio dell'ora non deve saltare nessuno.
const cambioOra = sceltaPromemoria([app('dopo-cambio', '2026-10-25T10:00:00+01:00')], new Date('2026-10-24T12:00:00+02:00'));
check("il giorno del cambio d'ora si ricorda lo stesso", ['dopo-cambio'], cambioOra.daMandare.map(c => c.id));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
