import { nomeOperatore, inizialiOperatore, ordinaOperatori, sposta, spostaA, cambiOrdine } from './operatori';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('nome e cognome', 'Giulia Rossi', nomeOperatore({ nome: 'Giulia', cognome: 'Rossi' }));
check('solo nome: niente spazio in fondo', 'Giulia', nomeOperatore({ nome: 'Giulia', cognome: '' }));
check('cognome assente', 'Giulia', nomeOperatore({ nome: ' Giulia ' }));
check('iniziali piene', 'GR', inizialiOperatore({ nome: 'giulia', cognome: 'rossi' }));
check('iniziale con solo nome', 'G', inizialiOperatore({ nome: 'Giulia', cognome: '' }));
check('senza niente', '?', inizialiOperatore({}));

const lista = [
  { id: 'a', nome: 'Zoe' },
  { id: 'b', nome: 'Anna', ordine: 2 },
  { id: 'c', nome: 'Bea', ordine: 0 },
  { id: 'd', nome: 'Carla' },
  { id: 'e', nome: 'Dora', ordine: 1 }
];
check('prima l\'ordine scelto, poi i nuovi in alfabetico', ['c', 'e', 'b', 'd', 'a'], ordinaOperatori(lista).map(d => d.id));
check('la lista di partenza non cambia', 'a', lista[0].id);
check('senza ordine: alfabetico', ['b', 'a'], ordinaOperatori([{ id: 'a', nome: 'Zoe' }, { id: 'b', nome: 'anna' }]).map(d => d.id));

check('sposta a destra', ['b', 'a', 'c'], sposta(['a', 'b', 'c'], 0, 1));
check('sposta a sinistra', ['a', 'c', 'b'], sposta(['a', 'b', 'c'], 2, -1));
check('il primo non va più a sinistra', ['a', 'b'], sposta(['a', 'b'], 0, -1));
check('trascina in fondo', ['b', 'c', 'a'], spostaA(['a', 'b', 'c'], 0, 2));
check('trascina in cima', ['c', 'a', 'b'], spostaA(['a', 'b', 'c'], 2, 0));

check('si salvano solo i cambi', [{ id: 'y', ordine: 0 }, { id: 'x', ordine: 1 }],
  cambiOrdine([{ id: 'y', ordine: 1 }, { id: 'x', ordine: 0 }, { id: 'z', ordine: 2 }]));
check('i nuovi prendono un posto', [{ id: 'n', ordine: 1 }], cambiOrdine([{ id: 'x', ordine: 0 }, { id: 'n' }]));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
