import { chiaveData, giornoSpeciale, conGiornoAperto, senzaGiorno, erroreFasce } from './giorni-speciali';
import { turnoDelGiorno as turnoAgenda } from './servizi';
import { turnoDelGiorno as turnoPrenotazione, orariLiberi } from './prenotazione';
import { operatorePerVetrina } from './vetrina';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const lunedi = new Date(2026, 11, 21, 12, 0);        // lunedì 21 dicembre 2026
const lunediDopo = new Date(2026, 11, 28, 12, 0);
const oggi = new Date(2026, 11, 1);
const turni = {
  lunedi: { attivo: false, tipo: 'riposo' },
  martedi: { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '18:00' }] }
};
const giulia: any = { id: 'd1', nome: 'Giulia', turni };

check('chiave della data, in ora locale', '2026-12-21', chiaveData(new Date(2026, 11, 21, 23, 30)));
check('di norma il lunedì è chiuso (agenda)', false, turnoAgenda(giulia, lunedi).lavora);
check('di norma il lunedì è chiuso (prenotazione)', null, turnoPrenotazione(giulia, lunedi));

const aperta = { ...giulia, giorni_speciali: conGiornoAperto(giulia.giorni_speciali, lunedi, [{ inizio: '10:00', fine: '16:00' }], oggi) };
check('quel lunedì è aperto (agenda)', [true, [{ inizio: 600, fine: 960 }]], [turnoAgenda(aperta, lunedi).lavora, turnoAgenda(aperta, lunedi).fasce]);
check('quel lunedì è aperto (prenotazione)', [{ inizio: '10:00', fine: '16:00' }], turnoPrenotazione(aperta, lunedi)?.fasce);
check('il lunedì dopo resta chiuso', false, turnoAgenda(aperta, lunediDopo).lavora);
check('il martedì non cambia', [{ inizio: 540, fine: 1080 }], turnoAgenda(aperta, new Date(2026, 11, 22)).fasce);
check('i turni della settimana non si toccano', turni, aperta.turni);
check('online escono orari quel lunedì', true, orariLiberi(lunedi, [aperta], 30, [], oggi.getTime()).length > 0);
check('e non escono il lunedì dopo', 0, orariLiberi(lunediDopo, [aperta], 30, [], oggi.getTime()).length);
check('la vetrina porta fuori l\'apertura', true, !!operatorePerVetrina(aperta).giorni_speciali?.['2026-12-21']);

const richiusa = { ...aperta, giorni_speciali: senzaGiorno(aperta.giorni_speciali, lunedi, oggi) };
check('tolta l\'apertura torna chiuso', false, turnoAgenda(richiusa, lunedi).lavora);
check('senza scheda non si rompe', null, giornoSpeciale(null, lunedi));

const vecchie = conGiornoAperto({ '2026-09-01': { attivo: true, fasce: [{ inizio: '09:00', fine: '10:00' }] }, '2026-11-20': { attivo: true, fasce: [] }, 'boh': 1 }, lunedi, [{ inizio: '09:00', fine: '13:00' }], oggi);
check('le aperture vecchie di più di un mese si buttano', ['2026-11-20', '2026-12-21'], Object.keys(vecchie).sort());

check('fasce giuste', '', erroreFasce([{ inizio: '09:00', fine: '13:00' }, { inizio: '15:00', fine: '19:00' }]));
check('chiusura prima dell\'apertura', true, erroreFasce([{ inizio: '18:00', fine: '09:00' }]) !== '');
check('fasce accavallate', true, erroreFasce([{ inizio: '09:00', fine: '15:00' }, { inizio: '14:00', fine: '19:00' }]) !== '');
check('nessuna fascia', true, erroreFasce([]) !== '');

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
