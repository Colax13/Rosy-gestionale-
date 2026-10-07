// Chi riceve un promemoria, e quale. Si prova la scelta, non l'invio.
import { sceltaPromemoria, fissatoIl } from '../../../api/_promemoria';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// Il giro passa alle 10:00 del 30 settembre, ora del salone.
const adesso = new Date('2026-09-30T10:00:00+02:00');
const LONTANO = '2026-09-20T09:00:00Z'; // fissato dieci giorni fa
const app = (id: string, data_ora: string, altro: any = {}) =>
  ({ id, dati: { data_ora, stato: 'confermato', id_cliente: 'c1', messaggi: { conferma: { quando: LONTANO } }, ...altro } });

const scelta = sceltaPromemoria([
  app('domani-1000',      '2026-10-01T10:00:00+02:00'),   // esattamente 24 ore
  app('domani-0945',      '2026-10-01T09:45:00+02:00'),   // 23h45
  app('domani-1015',      '2026-10-01T10:15:00+02:00'),   // 24h15: al prossimo giro
  app('oggi-1050',        '2026-09-30T10:50:00+02:00'),   // tra 50 minuti
  app('oggi-1100',        '2026-09-30T11:00:00+02:00'),   // tra 60 minuti
  app('oggi-1130',        '2026-09-30T11:30:00+02:00'),   // tra 90 minuti: niente
  app('oggi-1005',        '2026-09-30T10:05:00+02:00'),   // tra 5 minuti: troppo tardi
  app('passato',          '2026-09-30T09:00:00+02:00'),
  app('in-attesa',        '2026-10-01T09:30:00+02:00', { stato: 'in_attesa' }),
  app('pausa',            '2026-09-30T10:30:00+02:00', { id_cliente: 'block-client' }),
  app('senza-sms',        '2026-09-30T10:45:00+02:00', { sms_spenti: true }),
  app('gia-24h',          '2026-10-01T09:00:00+02:00', { messaggi: { conferma: { quando: LONTANO }, promemoria: { quando: '2026-09-30T07:00:00Z' } } }),
  app('gia-1h',           '2026-09-30T10:40:00+02:00', { messaggi: { conferma: { quando: LONTANO }, promemoria_ora: { quando: '2026-09-30T07:40:00Z' } } }),
  app('fissato-ieri-sera','2026-10-01T09:00:00+02:00', { messaggi: { conferma: { quando: '2026-09-30T07:30:00Z' } } }),
  app('fissato-ora',      '2026-09-30T10:45:00+02:00', { messaggi: { conferma: { quando: '2026-09-30T07:50:00Z' } } }),
], adesso);

check('chi riceve e quale',
  [['domani-1000', 'promemoria'], ['domani-0945', 'promemoria'], ['oggi-1050', 'promemoria_ora'], ['oggi-1100', 'promemoria_ora']],
  scelta.daMandare.map(c => [c.candidato.id, c.tipo]));
check('chi viene saltato, e perché', [
  { id: 'oggi-1005', tipo: 'promemoria_ora', motivo: 'troppo tardi' },
  { id: 'in-attesa', tipo: 'promemoria', motivo: 'stato in_attesa' },
  { id: 'fissato-ieri-sera', tipo: 'promemoria', motivo: 'fissato meno di 24 ore prima' },
  { id: 'fissato-ora', tipo: 'promemoria_ora', motivo: 'fissato meno di 2 ore prima' }
], scelta.saltati);
check('le pause non compaiono da nessuna parte', false,
  [...scelta.daMandare.map(c => c.candidato.id), ...scelta.saltati.map(s => s.id)].includes('pausa'));
check('"Avvisa la cliente" tolto: niente promemoria', false,
  [...scelta.daMandare.map(c => c.candidato.id), ...scelta.saltati.map(s => s.id)].includes('senza-sms'));

// "domani" deve essere vero: alle 23:30 in salone il server è già nel giorno
// dopo, ma l'appuntamento delle 23:00 di domani resta "domani".
const tardi = sceltaPromemoria([app('domani-2300', '2026-10-01T23:00:00+02:00')], new Date('2026-09-30T23:30:00+02:00'));
check('alle 23:30, l\'appuntamento delle 23 di domani riceve il 24 ore', ['domani-2300'], tardi.daMandare.map(c => c.candidato.id));

// Fissato dall'operatore senza conferma salvata: conta la creazione.
check('fissato: dalla conferma', new Date(LONTANO).getTime(), fissatoIl({ messaggi: { conferma: { quando: LONTANO } } }));
check('fissato: dalla creazione (Timestamp)', 1000, fissatoIl({ createdAt: { toMillis: () => 1000 } }));
check('fissato: dalla creazione (secondi)', 2000, fissatoIl({ createdAt: { _seconds: 2 } }));
check('fissato: sconosciuto', 0, fissatoIl({}));
check('fissato: lo spostamento più recente vince', new Date('2026-09-30T08:00:00Z').getTime(),
  fissatoIl({ messaggi: { conferma: { quando: LONTANO }, spostamento: { quando: '2026-09-30T08:00:00Z' } } }));

// Il giorno del cambio dell'ora: 24 ore prima resta "domani".
const cambio = sceltaPromemoria([app('dopo-cambio', '2026-10-25T10:00:00+01:00')], new Date('2026-10-24T11:15:00+02:00'));
check('cambio dell\'ora: nessuno perso', ['dopo-cambio'], cambio.daMandare.map(c => c.candidato.id));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
