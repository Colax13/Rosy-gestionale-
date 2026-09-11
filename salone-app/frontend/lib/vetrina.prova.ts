import {
  servizioPerVetrina, operatorePerVetrina, costruisciVetrina,
  fascePerDisponibilita, disponibilitaPerAppuntamento, occupata
} from './vetrina';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// --- quello che NON deve uscire dal salone ---
const servizio = {
  id: 's1', nome: 'Colore', categoria: 'Colore', prezzo_base: 45,
  durata_minuti: 75, tempo_lavorazione_minuti: 15, tempo_posa_minuti: 45, tempo_finitura_minuti: 15,
  note_pubbliche: 'Il prezzo varia con la lunghezza',
  note_private: 'Costo tinta 6€, margine 39€',
  attivo: true, userId: 'salone'
};
const fuori = servizioPerVetrina(servizio);
check('le note private restano dentro', false, 'note_private' in fuori);
check("l'identificativo del salone resta dentro", false, 'userId' in fuori);
check('le note pubbliche escono', 'Il prezzo varia con la lunghezza', fuori.note_pubbliche);
check('il prezzo esce', 45, fuori.prezzo_base);

const operatrice = {
  id: 'd2', nome: 'Giulia', cognome: 'Ferraro', email: 'giulia@salone.it',
  ruolo: 'dipendente', fotoUrl: '', turni: { lunedi: { attivo: true } }, servizi: ['s1'],
  attivo: true, userId: 'salone'
};
const fuoriOp = operatorePerVetrina(operatrice);
check("l'email resta dentro", false, 'email' in fuoriOp);
check('il ruolo resta dentro', false, 'ruolo' in fuoriOp);
check('i turni escono (servono agli orari liberi)', true, !!fuoriOp.turni);
check('i servizi che sa fare escono', ['s1'], fuoriOp.servizi);

// --- la vetrina salta quello che è disattivato ---
const vetrina = costruisciVetrina('salone',
  [servizio, { ...servizio, id: 's9', nome: 'Vecchio', attivo: false }],
  [operatrice, { ...operatrice, id: 'd9', nome: 'Andata via', attivo: false }]);
check('servizi disattivati fuori dalla vetrina', ['Colore'], vetrina.servizi.map(s => s.nome));
check('operatrici disattivate fuori dalla vetrina', ['Giulia'], vetrina.operatori.map(o => o.nome));

// --- le fasce occupate ---
const colore = { nome: 'Colore', tempo_lavorazione_minuti: 15, tempo_posa_minuti: 45, tempo_finitura_minuti: 15 };
const piega = { nome: 'Piega', tempo_lavorazione_minuti: 30, tempo_posa_minuti: 0, tempo_finitura_minuti: 0 };

const orario = (iso: string) => new Date(iso).toTimeString().slice(0, 5);
const leggi = (fasce: any[]) => fasce.map(f => [f.id_dipendente, orario(f.inizio), orario(f.fine)]);

const appColore = {
  data_ora: '2026-09-11T09:00:00', id_dipendente: 'd1',
  clienti: { nome: 'Stefania', cognome: 'Mucci', telefono: '3401112233' },
  righe_appuntamento: [{ servizi_catalogo: colore }]
};
check('la posa non occupa nessuno',
  [['d1', '09:00', '09:15'], ['d1', '10:00', '10:15']],
  leggi(fascePerDisponibilita(appColore)));

const appDiviso = {
  data_ora: '2026-09-11T09:00:00', id_dipendente: 'd1',
  righe_appuntamento: [
    { servizi_catalogo: colore, id_dipendente_finitura: 'd2' },
    { servizi_catalogo: piega, id_dipendente: 'd2' }
  ]
};
check('ogni fase sotto chi la fa davvero',
  [['d1', '09:00', '09:15'], ['d2', '10:00', '10:45']],
  leggi(fascePerDisponibilita(appDiviso)));

check('un appuntamento annullato non occupa niente',
  [], fascePerDisponibilita({ ...appColore, stato: 'annullato' }));

check('senza data non occupa niente', [], fascePerDisponibilita({ id: 'x' }));

// --- il documento pubblico non contiene persone ---
const pubblico = disponibilitaPerAppuntamento('salone', appColore);
check('giorno calcolato', '2026-09-11', pubblico.giorno);
check('nessun nome nel documento pubblico', false,
  JSON.stringify(pubblico).toLowerCase().includes('stefania'));
check('nessun telefono nel documento pubblico', false,
  JSON.stringify(pubblico).includes('3401112233'));

// --- il controllo di occupazione ---
const fasce = fascePerDisponibilita(appColore);
const alle = (h: number, m = 0) => new Date(`2026-09-11T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
check('occupata sulla lavorazione',  true,  occupata(fasce, 'd1', alle(9, 5), alle(9, 20)));
check('libera durante la posa',      false, occupata(fasce, 'd1', alle(9, 20), alle(9, 50)));
check("un'altra operatrice è libera", false, occupata(fasce, 'd2', alle(9, 5), alle(9, 20)));

console.log(`\n${ok} passate, ${ko} fallite`);
process.exit(ko ? 1 : 0);
