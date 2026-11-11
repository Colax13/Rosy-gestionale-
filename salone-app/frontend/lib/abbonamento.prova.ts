import {
  leggiAbbonamento, smsInclusi, pianoDi, statoSms, leggiConsumoSms, idConsumoSms,
  leggiAmministratori, eAmministratore, eAccendibile
} from './abbonamento';
import { funzioneAccesa } from './funzioni';
import { impostaSessione, puoVedere, puoAprirePercorso, pagineConcedibili } from './sessione';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

console.log('\nL\'abbonamento letto dal database');
check('documento che non c\'è: in prova, niente acceso',
  { piano: 'prova', funzioni: {}, sms_inclusi: null, note: '' }, leggiAbbonamento(undefined));
check('documento a posto',
  { piano: 'messaggi', funzioni: { buoni: true }, sms_inclusi: 300, note: 'paga a marzo', aggiornato: '2026-11-11T10:00:00.000Z', aggiornato_da: 'io@esempio.it' },
  leggiAbbonamento({ piano: 'messaggi', funzioni: { buoni: true }, sms_inclusi: 300, note: 'paga a marzo', aggiornato: '2026-11-11T10:00:00.000Z', aggiornato_da: 'io@esempio.it' }));
check('piano inventato: torna in prova', 'prova', leggiAbbonamento({ piano: 'platino' }).piano);
check('funzione non accendibile da qui: ignorata', {}, leggiAbbonamento({ funzioni: { messaggi_automatici: true, buoni_dal_foglio: true } }).funzioni);
check('funzione "accesa" con un testo invece di vero: spenta', {}, leggiAbbonamento({ funzioni: { buoni: 'si' } }).funzioni);
check('funzione spenta: non resta scritta', {}, leggiAbbonamento({ funzioni: { buoni: false } }).funzioni);
check('SMS scritti come testo', 200, leggiAbbonamento({ sms_inclusi: '200' }).sms_inclusi);
check('SMS negativi: non valgono', null, leggiAbbonamento({ sms_inclusi: -5 }).sms_inclusi);
check('SMS vuoti: quelli del piano', null, leggiAbbonamento({ sms_inclusi: '' }).sms_inclusi);
check('zero SMS scritto a mano resta zero', 0, leggiAbbonamento({ sms_inclusi: 0 }).sms_inclusi);
check('niente mezzi SMS', 12, leggiAbbonamento({ sms_inclusi: 12.9 }).sms_inclusi);
check('note troppo lunghe: tagliate', 2000, leggiAbbonamento({ note: 'x'.repeat(5000) }).note.length);
check('non è un oggetto: non si rompe', 'prova', leggiAbbonamento('ciao').piano);

console.log('\nGli SMS compresi');
check('piano Base: nessuno', 0, smsInclusi(leggiAbbonamento({ piano: 'base' })));
check('piano Con messaggi: quelli del piano', pianoDi('messaggi').sms, smsInclusi(leggiAbbonamento({ piano: 'messaggi' })));
check('scritti a mano: vincono sul piano', 500, smsInclusi(leggiAbbonamento({ piano: 'messaggi', sms_inclusi: 500 })));
check('zero a mano su un piano con SMS: zero', 0, smsInclusi(leggiAbbonamento({ piano: 'messaggi', sms_inclusi: 0 })));

console.log('\nA che punto è il mese');
check('piano senza SMS', { mandati: 12, inclusi: 0, restano: 0, extra: 12, livello: 'senza' }, statoSms(12, 0));
check('inizio mese', { mandati: 10, inclusi: 150, restano: 140, extra: 0, livello: 'ok' }, statoSms(10, 150));
check('all\'80%: quasi finiti', 'quasi', statoSms(120, 150).livello);
check('appena sotto l\'80%', 'ok', statoSms(119, 150).livello);
check('pacchetto finito giusto', { mandati: 150, inclusi: 150, restano: 0, extra: 0, livello: 'quasi' }, statoSms(150, 150));
check('oltre il pacchetto', { mandati: 180, inclusi: 150, restano: 0, extra: 30, livello: 'oltre' }, statoSms(180, 150));
check('numeri strani: zero', { mandati: 0, inclusi: 0, restano: 0, extra: 0, livello: 'senza' }, statoSms(NaN as any, undefined as any));

console.log('\nIl contatore');
check('nome del documento', 'abc_2026-11', idConsumoSms('abc', '2026-11'));
check('contatore che non c\'è', { mese: '2026-11', mandati: 0, falliti: 0 }, leggiConsumoSms(undefined, '2026-11'));
check('contatore letto', { mese: '2026-10', mandati: 87, falliti: 3 }, leggiConsumoSms({ mese: '2026-10', mandati: 87, falliti: 3, userId: 'abc' }, '2026-11'));
check('valori rotti: zero', { mese: '2026-11', mandati: 0, falliti: 0 }, leggiConsumoSms({ mandati: 'tanti', falliti: -2 }, '2026-11'));

console.log('\nChi apre il pannello');
const elenco = leggiAmministratori(' Io@Esempio.it, socio@esempio.it ;  non-una-email  ');
check('elenco letto: minuscole, senza spazi, senza righe sbagliate', ['io@esempio.it', 'socio@esempio.it'], elenco);
check('variabile non impostata: nessuno', [], leggiAmministratori(undefined));
check('amministratore con indirizzo verificato', true, eAmministratore('IO@esempio.it', true, elenco));
check('stesso indirizzo ma NON verificato: no', false, eAmministratore('io@esempio.it', false, elenco));
check('un altro indirizzo: no', false, eAmministratore('titolare@salone.it', true, elenco));
check('senza indirizzo: no', false, eAmministratore('', true, elenco));
check('elenco vuoto: nessuno entra', false, eAmministratore('io@esempio.it', true, []));

console.log('\nLe funzioni accese dal pannello');
check('buoni è accendibile dal pannello', true, eAccendibile('buoni'));
check('i messaggi automatici no (il tablet è di un salone solo)', false, eAccendibile('messaggi_automatici'));
check('altro salone, buoni accesi dal pannello: li vede', true, funzioneAccesa('buoni', 'altro@salone.it', { buoni: true }));
check('altro salone, niente acceso: no', false, funzioneAccesa('buoni', 'altro@salone.it', {}));
check('altro salone, senza abbonamento: no', false, funzioneAccesa('buoni', 'altro@salone.it'));
check('RD Salon li vede anche senza abbonamento', true, funzioneAccesa('buoni', 'rdsalon.ceccano@gmail.com'));
check('RD Salon li vede anche con l\'abbonamento che dice no', true, funzioneAccesa('buoni', 'rdsalon.ceccano@gmail.com', { buoni: false }));
check('messaggi automatici: dal pannello NON si accendono', false, funzioneAccesa('messaggi_automatici', 'altro@salone.it', { messaggi_automatici: true }));
check('messaggi automatici: RD Salon sì', true, funzioneAccesa('messaggi_automatici', 'rdsalon.ceccano@gmail.com'));
check('una pagina normale è sempre accesa', true, funzioneAccesa('agenda', 'altro@salone.it'));
check('senza indirizzo ma con i buoni accesi dal pannello: li vede', true, funzioneAccesa('buoni', null, { buoni: true }));

impostaSessione({ uid: 's1', salonId: 's1', titolare: true, nome: 'Titolare', permessi: null, emailSalone: 'altro@salone.it', funzioni: { buoni: true } });
check('sessione con buoni accesi: la pagina c\'è', true, puoVedere('buoni'));
check('sessione con buoni accesi: il menù la mostra', true, puoAprirePercorso('/buoni-spa'));
check('sessione con buoni accesi: si possono concedere', true, pagineConcedibili().some(p => p.chiave === 'buoni'));
impostaSessione({ uid: 'u2', salonId: 's1', titolare: false, nome: 'Operatrice', permessi: ['agenda'], emailSalone: 'altro@salone.it', funzioni: { buoni: true } });
check('operatrice senza il permesso: non li vede lo stesso', false, puoVedere('buoni'));
impostaSessione({ uid: 's2', salonId: 's2', titolare: true, nome: 'Titolare', permessi: null, emailSalone: 'altro@salone.it' });
check('sessione senza abbonamento: niente buoni', false, puoVedere('buoni'));

console.log(`\n${ok} passate, ${ko} fallite`);
if (ko > 0) process.exit(1);
