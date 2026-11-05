import { cercaClienti, cifreTelefono, normalizzaTesto } from './cerca-clienti';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const clienti: any[] = [
  { id: 's1', nome: 'Sara', cognome: 'Rossi', telefono: '340 111 2233' },
  { id: 's2', nome: 'Sara', cognome: 'Ciotoli', telefono: '+39 347 999 8877' },
  { id: 's3', nome: 'Sarah', cognome: 'Bianchi' },
  { id: 'n1', nome: 'Niccolò', cognome: 'D’Angelo', email: 'nicco@esempio.it' },
  { id: 'x1', nome: 'Maria Grazia', cognome: undefined },
  { id: 'x2', nome: undefined, cognome: 'Senzanome' },
  { id: 'r1', nome: 'Rosa', cognome: 'Sarti' },
];
const ids = (l: any[]) => l.map(c => c.id);

check('nome e cognome insieme', ['s2'], ids(cercaClienti(clienti, 'sara ciotoli')));
check('cognome e nome', ['s2'], ids(cercaClienti(clienti, 'Ciotoli Sara')));
check('a metà', ['s2'], ids(cercaClienti(clienti, 'sar cio')));
check('maiuscole e spazi', ['s2'], ids(cercaClienti(clienti, '  SARA   CIOTOLI ')));
check('solo il nome: le Sara prima, poi Sarah', ['s2', 's1', 's3'], ids(cercaClienti(clienti, 'sara')));
check('senza accenti', ['n1'], ids(cercaClienti(clienti, 'niccolo')));
check('telefono con spazi', ['s1'], ids(cercaClienti(clienti, '340 111')));
check('telefono senza +39', ['s2'], ids(cercaClienti(clienti, '3479998877')));
check('telefono con +39', ['s2'], ids(cercaClienti(clienti, '+39 347 9998877')));
check('fine del numero', ['s2'], ids(cercaClienti(clienti, '8877')));
check('email', ['n1'], ids(cercaClienti(clienti, 'nicco@')));
check('scheda senza cognome non si rompe', ['x1'], ids(cercaClienti(clienti, 'grazia')));
check('scheda senza nome non si rompe', ['x2'], ids(cercaClienti(clienti, 'senzanome')));
check('niente scritto, niente risultati', [], ids(cercaClienti(clienti, '   ')));
check('dentro la parola, più in basso', ['r1'], ids(cercaClienti(clienti, 'arti')));
check('limite', 2, cercaClienti(clienti, 'sara', 2).length);
check('normalizza', 'nicolo d angelo', normalizzaTesto('Nicolò  D’Angelo'));
check('cifre telefono', '3479998877', cifreTelefono('0039 347 999 8877'));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
