// Gli orari liberi della prenotazione online.
import { orariLiberi, operatoreLibero, turnoDelGiorno } from './prenotazione';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// Giovedì 1 ottobre 2026, a mezzanotte sull'orologio di chi guarda.
const giovedi = new Date(2026, 9, 1);
const primaDiTutto = new Date(2026, 8, 30, 20, 0).getTime();
const turni = { giovedi: { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '12:00' }] } };
const rosanna = { id: 'r', turni };
const giulia  = { id: 'g', turni: { giovedi: { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '14:00', fine: '16:00' }] } } };

check('un turno di tre ore, servizio di un\'ora',
  ['09:00', '09:30', '10:00', '10:30', '11:00'], orariLiberi(giovedi, [rosanna], 60, [], primaDiTutto));
check('il servizio deve finire dentro il turno',
  ['09:00'], orariLiberi(giovedi, [rosanna], 180, [], primaDiTutto));
check('più lungo del turno: niente',
  [], orariLiberi(giovedi, [rosanna], 181, [], primaDiTutto));

const occupata = [{ id_dipendente: 'r', inizio: new Date(2026, 9, 1, 10, 0).toISOString(), fine: new Date(2026, 9, 1, 11, 0).toISOString() }];
check('si salta quello che è già preso',
  ['09:00', '11:00'], orariLiberi(giovedi, [rosanna], 60, occupata as any, primaDiTutto));
check("l'occupato di un'altra non conta",
  ['09:00', '09:30', '10:00', '10:30', '11:00'], orariLiberi(giovedi, [rosanna], 60, [{ ...occupata[0], id_dipendente: 'g' }] as any, primaDiTutto));

const alle10 = new Date(2026, 9, 1, 10, 0).getTime();
check('gli orari passati non si propongono', ['10:30', '11:00'], orariLiberi(giovedi, [rosanna], 60, [], alle10));

check('con più operatrici si sommano gli orari',
  ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'], orariLiberi(giovedi, [rosanna, giulia], 60, [], primaDiTutto));
check('"prima disponibile" alle 14 è Giulia', 'g', operatoreLibero(giovedi, '14:00', [rosanna, giulia], 60, [], primaDiTutto));
check('"prima disponibile" alle 9 è Rosanna', 'r', operatoreLibero(giovedi, '09:00', [rosanna, giulia], 60, [], primaDiTutto));
check('nessuna libera a quell\'ora', null, operatoreLibero(giovedi, '12:30', [rosanna, giulia], 60, [], primaDiTutto));

check('senza turni impostati: 9-18', 'lavoro', turnoDelGiorno({ id: 'x' }, giovedi)?.tipo);
check('senza turni impostati: il lunedì chiuso', null, turnoDelGiorno({ id: 'x' }, new Date(2026, 9, 5)));
check('giorno di riposo', null, turnoDelGiorno({ id: 'x', turni: { giovedi: { attivo: false, tipo: 'riposo' } } }, giovedi));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
