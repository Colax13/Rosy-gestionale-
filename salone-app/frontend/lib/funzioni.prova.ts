// Prova delle funzioni riservate. Qui si controlla solo la maniglia (che cosa
// si vede); la serratura è in firestore.rules e si prova sul campo.
import { funzioneAccesa, eRiservata, normalizzaEmail } from './funzioni';
import { impostaSessione, puoVedere, puoAprirePercorso, pagineConcedibili, primaPaginaPermessa, Sessione } from './sessione';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const RD = 'rdsalon.ceccano@gmail.com';

// --- l'interruttore ---------------------------------------------------------
check('i buoni sono riservati',        true,  eRiservata('buoni'));
check("l'agenda no",                   false, eRiservata('agenda'));
check('accesa per RD Salon',           true,  funzioneAccesa('buoni', RD));
check('maiuscole e spazi non contano', true,  funzioneAccesa('buoni', '  RDSalon.Ceccano@Gmail.com '));
check('spenta per un altro salone',    false, funzioneAccesa('buoni', 'parrucchiere.sangiovanni@gmail.com'));
check('spenta se non si sa di chi è',  false, funzioneAccesa('buoni', null));
check('una pagina normale è per tutti',true,  funzioneAccesa('agenda', 'chiunque@esempio.it'));
check('indirizzo ripulito',            'a@b.it', normalizzaEmail(' A@B.IT '));

// --- che cosa vede chi entra ------------------------------------------------
const titolare = (emailSalone: string | null): Sessione =>
  ({ uid: 's', salonId: 's', titolare: true, nome: 'Rosanna', permessi: null, emailSalone });
const operatrice = (emailSalone: string | null, permessi: any): Sessione =>
  ({ uid: 'u2', salonId: 's', titolare: false, nome: 'Giulia', permessi, emailSalone });

impostaSessione(titolare(RD));
check('RD Salon: il titolare vede i buoni',     true, puoVedere('buoni'));
check('RD Salon: la voce del menù c\'è',        true, puoAprirePercorso('/buoni-spa'));
check('RD Salon: i buoni si possono concedere', true, pagineConcedibili().some(p => p.chiave === 'buoni'));

impostaSessione(titolare('parrucchiere.sangiovanni@gmail.com'));
check('altro salone: niente buoni',             false, puoVedere('buoni'));
check('altro salone: voce sparita dal menù',    false, puoAprirePercorso('/buoni-spa'));
check('altro salone: niente da concedere',      false, pagineConcedibili().some(p => p.chiave === 'buoni'));
check('altro salone: l\'agenda resta',          true,  puoAprirePercorso('/agenda'));

impostaSessione(titolare(null));
check('salone sconosciuto: chiuso',             false, puoVedere('buoni'));

impostaSessione(operatrice(RD, ['agenda', 'buoni']));
check('operatrice di RD con il permesso',       true,  puoVedere('buoni'));

impostaSessione(operatrice(RD, ['agenda']));
check('operatrice di RD senza il permesso',     false, puoVedere('buoni'));

// Il permesso scritto nella sua scheda non basta: se il salone non ha la
// funzione, la pagina non esiste per nessuno.
impostaSessione(operatrice('parrucchiere.sangiovanni@gmail.com', ['buoni']));
check('permesso senza funzione: chiuso',        false, puoVedere('buoni'));
check('e non ci finisce nemmeno dopo l\'accesso', '/agenda', primaPaginaPermessa());

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
