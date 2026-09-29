import { componi, quandoScritto, quandoCorto, elencoScritto, segmentiSms } from './messaggi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const giovedi = new Date(2026, 9, 1, 15, 30); // 1 ottobre 2026, giovedì

check('quando, come lo direbbe una persona', 'giovedì 1 ottobre alle 15:30', quandoScritto(giovedi));
check('mezzanotte e mezza',                  'giovedì 1 ottobre alle 00:30', quandoScritto(new Date(2026, 9, 1, 0, 30)));

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
check('dice il salone, quando e cosa', true,
  smsConferma.startsWith('RD Salon:') && smsConferma.includes('gio 1/10 alle 15:30') && smsConferma.includes('Colore e Piega'));

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
check('i servizi si accorciano, non spariscono', true, pieno.sms.includes('Colore e altro'));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
