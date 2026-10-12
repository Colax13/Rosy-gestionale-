// L'informativa e i consensi: il testo si riempie con i dati del salone, e
// i consensi di una nuova prenotazione si uniscono a quelli della scheda.
import { testoInformativa, datiMancanti, unisciConsensi } from './privacy';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const completo = { nomeSalone: 'RD Salon', ragioneSociale: 'RD Salon di Prova', partitaIva: '01234567890', indirizzo: 'Via Roma 1, Ceccano', email: 'info@rd.it', telefono: '0775 123456' };
const tutto = (d: any) => testoInformativa(d).flatMap(s => s.paragrafi).join(' ');

check('niente manca se è tutto scritto', [], datiMancanti(completo));
check('cosa manca', ['ragione sociale', 'partita IVA', 'indirizzo della sede', 'email per la privacy'], datiMancanti({ nomeSalone: 'X' }));
check('l\'email pubblica vale anche per la privacy', false, datiMancanti(completo).includes('email per la privacy'));
check('il testo usa i dati del salone', true, ['RD Salon di Prova', '01234567890', 'Via Roma 1, Ceccano', 'info@rd.it'].every(x => tutto(completo).includes(x)));
check('l\'email privacy ha la precedenza', true, tutto({ ...completo, emailPrivacy: 'privacy@rd.it' }).includes('privacy@rd.it'));
check('quello che manca si vede', true, tutto({ nomeSalone: 'X' }).includes('[partita IVA da completare in Impostazioni]'));
check('spiega le promozioni facoltative', true, /facoltativa/.test(tutto(completo)) && /ritirare/.test(tutto(completo)));

const prima = { informativa_letta_il: '2026-01-01T10:00:00.000Z', versione_informativa: 'v1', marketing: true, marketing_il: '2026-01-01T10:00:00.000Z' };
const nuova = { informativa_letta_il: '2026-10-12T10:00:00.000Z', versione_informativa: 'v2', marketing: false, marketing_il: '2026-10-12T10:00:00.000Z' };
check('senza consensi nuovi non si tocca niente', null, unisciConsensi(prima, null));
check('informativa: vale l\'ultima letta', ['2026-10-12T10:00:00.000Z', 'v2'], [unisciConsensi(prima, nuova)!.informativa_letta_il, unisciConsensi(prima, nuova)!.versione_informativa]);
check('promozioni: una spunta vuota non toglie il consenso', [true, '2026-01-01T10:00:00.000Z'], [unisciConsensi(prima, nuova)!.marketing, unisciConsensi(prima, nuova)!.marketing_il]);
check('promozioni: una spunta data lo accende', [true, '2026-10-12T10:00:00.000Z'], [unisciConsensi(null, { ...nuova, marketing: true })!.marketing, unisciConsensi(null, { ...nuova, marketing: true })!.marketing_il]);
check('cliente nuova senza spunta: no', false, unisciConsensi(null, nuova)!.marketing);

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
