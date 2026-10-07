import { componi, avvisoNuovaRichiesta, TIPI_MESSAGGIO, quandoScritto, quandoCorto, elencoScritto, segmentiSms, giornoDelSalone, giornoDopo } from './messaggi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// Gli istanti si scrivono con il fuso esplicito: la prova deve dare lo stesso
// risultato sul computer di chiunque e sul server, che vive in UTC.
const giovedi = new Date('2026-10-01T15:30:00+02:00'); // 1 ottobre 2026, giovedì, ora legale

check('quando, come lo direbbe una persona', 'giovedì 1 ottobre alle 15:30', quandoScritto(giovedi));
check('mezzanotte e mezza',                  'giovedì 1 ottobre alle 00:30', quandoScritto(new Date('2026-10-01T00:30:00+02:00')));

// --- l'ora giusta anche dal server ----------------------------------------
// Il server vive in UTC: le 13:30 UTC del primo ottobre sono le 15:30 in
// salone. Prima di questa prova, l'SMS avrebbe scritto "13:30".
check("dal server in UTC si scrive l'ora del salone", 'giovedì 1 ottobre alle 15:30', quandoScritto(new Date('2026-10-01T13:30:00Z')));
check("d'inverno lo scarto cambia, e si segue",       'martedì 1 dicembre alle 15:30', quandoScritto(new Date('2026-12-01T14:30:00Z')));
check('le 23:30 UTC in salone sono già domani',        '2026-10-02', giornoDelSalone(new Date('2026-10-01T23:30:00Z')));
check('giorno dopo, a fine mese',                      '2026-11-01', giornoDopo('2026-10-31'));
check("giorno dopo, a fine anno",                      '2027-01-01', giornoDopo('2026-12-31'));
check('giorno dopo, il giorno del cambio d\'ora',      '2026-10-26', giornoDopo('2026-10-25'));

check('un servizio solo', 'colore',                  elencoScritto(['colore']));
check('due servizi',      'colore e piega',          elencoScritto(['colore', 'piega']));
check('tre servizi',      'colore, piega e taglio',  elencoScritto(['colore', 'piega', 'taglio']));
check('nessun servizio',  '',                        elencoScritto([]));
check('servizi vuoti',    '',                        elencoScritto(['', '']));

const dati = {
  nomeCliente: 'Maria Grazia Rossi',
  nomeSalone: 'RD Salon',
  indirizzo: 'Via Roma 1, Ceccano',
  telefonoSalone: '0775 123456',
  quando: giovedi,
  servizi: ['Colore', 'Piega'],
  operatore: 'Rosanna'
};

const conferma = componi('conferma', dati);
check('oggetto della conferma', 'Appuntamento confermato — giovedì 1 ottobre alle 15:30', conferma.oggetto);
check('si dà del tu, col nome di battesimo', true, conferma.testo.startsWith('Ciao Maria,'));
check('dice quando e cosa', true, conferma.testo.includes('giovedì 1 ottobre alle 15:30 — Colore e Piega con Rosanna.'));
check('dice di avvisare se non viene', true, conferma.testo.includes('avvisaci in tempo'));
check("c'è dove siamo", true, conferma.testo.includes('Via Roma 1, Ceccano · tel. 0775 123456'));
check('finisce col nome del salone', true, conferma.testo.trim().endsWith('RD Salon'));

const promemoria = componi('promemoria', dati);
check('oggetto del promemoria', 'Promemoria: domani giovedì 1 ottobre alle 15:30', promemoria.oggetto);
check('il promemoria ricorda, non conferma', true, promemoria.testo.includes('ti ricordiamo'));

// Senza nome, senza operatore, senza indirizzo: non deve uscire un buco.
const scarno = componi('conferma', {
  nomeCliente: '', nomeSalone: 'RD Salon', quando: giovedi, servizi: []
});
check('senza nome si saluta lo stesso', true, scarno.testo.startsWith('Ciao,'));
check('senza servizi la frase regge',   true, scarno.testo.includes('giovedì 1 ottobre alle 15:30.'));
check('niente doppi spazi',             false, scarno.testo.includes('  '));

// Un nome con un carattere strano non deve rompere l'HTML.
const cattivo = componi('conferma', { ...dati, nomeCliente: '<script>ciao' });
check("l'HTML non si fa scrivere da fuori", false, cattivo.html.includes('<script>'));

// --- quanto costa un SMS ----------------------------------------------------
check('data corta per l\'SMS', 'gio 1/10 alle 15:30', quandoCorto(giovedi));

check('testo corto sta in un pezzo',   { alfabeto: 'normale', caratteri: 5, segmenti: 1 }, segmentiSms('Ciao!'));
check('160 caratteri: ancora uno',     1, segmentiSms('a'.repeat(160)).segmenti);
check('161: diventano due',            2, segmentiSms('a'.repeat(161)).segmenti);
check('le accentate italiane non costano', 'normale', segmentiSms('perché è così però').alfabeto);
check('il trattino lungo raddoppia il prezzo', 'largo', segmentiSms('colore — piega').alfabeto);
check("l'apostrofo riccio pure",       'largo', segmentiSms('l\u2019appuntamento').alfabeto);
check("l'emoji pure",                  'largo', segmentiSms('a domani 💇').alfabeto);
check('alfabeto largo: 70 per pezzo',  1, segmentiSms('ā'.repeat(70)).segmenti);
check('alfabeto largo: 71 sono due',   2, segmentiSms('ā'.repeat(71)).segmenti);
check("un'emoji occupa due posti",     2, segmentiSms('💇').caratteri);
check('le parentesi graffe contano doppio', 6, segmentiSms('a{b}').caratteri);

// --- l'SMS vero, quello che paghi ------------------------------------------
const smsConferma = componi('conferma', dati).sms;
check('la conferma sta in un SMS solo', 1, segmentiSms(smsConferma).segmenti);
check('e usa l\'alfabeto che non costa', 'normale', segmentiSms(smsConferma).alfabeto);
check('dice il salone, il nome e quando', true,
  smsConferma.startsWith('RD Salon:') && smsConferma.includes('gio 1/10 alle 15:30') && smsConferma.includes('ciao Maria'));

const smsPromemoria = componi('promemoria', dati).sms;
check('anche il promemoria sta in uno', 1, segmentiSms(smsPromemoria).segmenti);
check('e dice che è domani', true, smsPromemoria.includes('domani'));

// Se non ci sta tutto, si lascia per strada il superfluo invece di pagare due
// crediti: prima il telefono, poi l'operatrice, poi l'elenco dei servizi.
const pieno = componi('conferma', {
  ...dati,
  nomeSalone: 'RD Salon Parrucchieri Ceccano',
  servizi: ['Colore', 'Piega', 'Taglio donna', 'Trattamento ricostruzione']
});
check('anche col nome lungo resta un SMS', 1, segmentiSms(pieno.sms).segmenti);
check('ma quando e dove non si perdono', true,
  pieno.sms.includes('gio 1/10 alle 15:30') && pieno.sms.includes('RD Salon Parrucchieri Ceccano'));
check('niente elenco di servizi nell\'SMS', false, pieno.sms.includes('Colore'));

// --- tutti i messaggi del percorso: un SMS solo, alfabeto che non costa ----
for (const t of TIPI_MESSAGGIO) {
  for (const prova of [dati, { ...dati, nomeSalone: 'RD Salon Parrucchieri Ceccano', nomeCliente: 'Mariagrazia Esposito', operatore: 'Annamaria' }]) {
    const m = componi(t, prova as any);
    check(`${t}: un SMS solo (${prova.nomeSalone})`, 1, segmentiSms(m.sms).segmenti);
    check(`${t}: alfabeto normale`, 'normale', segmentiSms(m.sms).alfabeto);
    check(`${t}: firmato dal salone`, true, m.sms.startsWith(`${prova.nomeSalone}:`));
  }
}
check('ricevuta: dice che arriverà la conferma', true, componi('ricevuta', dati).sms.includes('confermata'));
check('rifiuto: invita a chiamare', true, /chiamaci/i.test(componi('rifiuto', dati).sms));
check('spostamento: dice il nuovo orario', true, componi('spostamento', dati).sms.includes('abbiamo dovuto cambiare il tuo appuntamento') && componi('spostamento', dati).sms.includes('gio 1/10 alle 15:30'));
check('1 ora prima: dice l\'ora', true, componi('promemoria_ora', dati).sms.includes('15:30'));
check('senza nome non scrive "ciao ,"', false, componi('conferma', { ...dati, nomeCliente: '' }).sms.includes('ciao ,'));

const avviso = avvisoNuovaRichiesta({ nomeCliente: 'Maria Rossi', quando: dati.quando, servizi: ['Colore', 'Piega'], operatore: 'Giulia', telefonoCliente: '333 123 4567' });
check('avviso salone: un SMS solo', 1, segmentiSms(avviso).segmenti);
check('avviso salone: chi e quando', true, avviso.includes('Maria Rossi') && avviso.includes('gio 1/10 alle 15:30'));
const avvisoLungo = avvisoNuovaRichiesta({ nomeCliente: 'Mariagrazia Esposito De Santis', quando: dati.quando, servizi: ['Colore', 'Piega', 'Taglio donna', 'Trattamento ricostruzione profonda'], operatore: 'Annamaria', telefonoCliente: '333 123 4567' });
check('avviso salone lungo: resta un SMS', 1, segmentiSms(avvisoLungo).segmenti);

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
