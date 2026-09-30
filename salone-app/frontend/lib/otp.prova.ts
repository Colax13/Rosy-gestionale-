// La verifica del numero: le regole, senza database e senza SMS.
import {
  nuovoCodice, impronta, puoMandareCodice, controllaCodice, testoCodice, idVerifica,
  pulisciPrenotazione, ATTESA_FRA_CODICI_MS, MAX_TENTATIVI, DURATA_CODICE_MS
} from '../../../api/_otp';
import { segmentiSms } from './messaggi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const adesso = Date.parse('2026-09-30T12:00:00Z');

// --- il codice -------------------------------------------------------------
const c = nuovoCodice();
check('il codice è di 6 cifre', true, /^\d{6}$/.test(c.codice));
check("nel database va l'impronta, non il codice", false, c.hash.includes(c.codice));
check("l'impronta si ritrova", c.hash, impronta(c.codice, c.sale));
check('due codici non si somigliano', true, nuovoCodice().sale !== c.sale);
check('il numero non finisce in chiaro nel nome del documento', false, idVerifica('s1', '393331234567').includes('3331234567'));

const stato = { sale: c.sale, hash: c.hash, scade: adesso + DURATA_CODICE_MS, tentativi: 0 };
check('codice giusto',                 { ok: true }, controllaCodice(stato, c.codice, adesso));
check('codice giusto con gli spazi',   { ok: true }, controllaCodice(stato, `${c.codice.slice(0, 3)} ${c.codice.slice(3)}`, adesso));
const sbagliato = String((Number(c.codice) + 1) % 1_000_000).padStart(6, '0');
check('codice sbagliato: si dice quanti tentativi restano',
  { ok: false, motivo: `Codice sbagliato. Hai ancora ${MAX_TENTATIVI - 1} tentativi.` },
  controllaCodice(stato, sbagliato, adesso));
check('codice scaduto', false, controllaCodice(stato, c.codice, adesso + DURATA_CODICE_MS + 1).ok);
check('dopo 5 tentativi si brucia anche quello giusto', false,
  controllaCodice({ ...stato, tentativi: MAX_TENTATIVI }, c.codice, adesso).ok);
check('senza codice chiesto prima', false, controllaCodice(undefined, '123456', adesso).ok);
check('codice troppo corto', { ok: false, motivo: 'Il codice è di 6 cifre.' }, controllaCodice(stato, '123', adesso));

// --- quando si può chiedere un codice --------------------------------------
check('il primo si manda', { ok: true }, puoMandareCodice(undefined, adesso));
check('il secondo subito dopo no', false, puoMandareCodice({ invii: [adesso - 10_000] }, adesso).ok);
check('dopo un minuto sì', true, puoMandareCodice({ invii: [adesso - ATTESA_FRA_CODICI_MS - 1] }, adesso).ok);
check('più di 5 in un\'ora no', false,
  puoMandareCodice({ invii: [1, 2, 3, 4, 5].map(m => adesso - m * 5 * 60_000) }, adesso).ok);
check('quelli di ieri non contano', true,
  puoMandareCodice({ invii: [1, 2, 3, 4, 5].map(m => adesso - 2 * 60 * 60_000 - m) }, adesso).ok);

// --- l'SMS del codice ------------------------------------------------------
const sms = testoCodice('RD Salon', '482913');
check("l'SMS del codice costa un credito", 1, segmentiSms(sms).segmenti);
check('e usa l\'alfabeto che non costa doppio', 'normale', segmentiSms(sms).alfabeto);

// --- quello che arriva dal sito --------------------------------------------
const buona = {
  data_ora: '2026-10-02T09:00:00+02:00',
  clienti: { nome: ' Maria ', cognome: 'Rossi', telefono: '333 123 4567', email: 'm@r.it' },
  id_dipendente: 'd1', dipendenti: { nome: 'Rosanna' },
  righe_appuntamento: [{ servizi_catalogo: { nome: 'Colore', durata_minuti: 75, prezzo_base: 45 } }],
  campoInventato: 'da buttare'
};
const p = pulisciPrenotazione(buona, adesso);
check('prenotazione buona accettata', true, p.ok);
check('i nomi ripuliti', 'Maria', (p as any).app?.clienti?.nome);
check('i campi inventati spariscono', false, 'campoInventato' in ((p as any).app || {}));
check('orario già passato', false, pulisciPrenotazione({ ...buona, data_ora: '2026-09-29T09:00:00Z' }, adesso).ok);
check('senza servizi',       false, pulisciPrenotazione({ ...buona, righe_appuntamento: [] }, adesso).ok);
check('senza cognome',       false, pulisciPrenotazione({ ...buona, clienti: { ...buona.clienti, cognome: '' } }, adesso).ok);
check('telefono inventato',  false, pulisciPrenotazione({ ...buona, clienti: { ...buona.clienti, telefono: '12' } }, adesso).ok);
check('durata assurda azzerata', 0, (pulisciPrenotazione({
  ...buona, righe_appuntamento: [{ servizi_catalogo: { nome: 'X', durata_minuti: 99999, prezzo_base: 1 } }]
}, adesso) as any).app.righe_appuntamento[0].servizi_catalogo.durata_minuti);

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
