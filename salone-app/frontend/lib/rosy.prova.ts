// Rosy senza Google e senza database: Gemini finto, dati finti.
// Si prova che gli strumenti leggano bene e che la proposta sia giusta.
process.env.TZ = 'Europe/Rome';

import { chiediARosy, eseguiStrumento, cercaClienti, trovaServizio, spiegaErroreGemini, ErroreGemini, Dati, Proposta } from '../../../api/_rosy';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

// Mercoledì 7 ottobre 2026, ore 10. Sabato è il 10.
const adesso = new Date('2026-10-07T10:00:00+02:00');

const servizi = [
  { id: 's1', nome: 'Piega', prezzo_base: 20, durata_minuti: 30 },
  { id: 's2', nome: 'Colore radici', prezzo_base: 45, durata_minuti: 60 },
  { id: 's3', nome: 'Taglio vecchio', attivo: false, durata_minuti: 30 }
];
const operatrici = [
  { id: 'o1', nome: 'Giulia', ordine: 1 },
  { id: 'o2', nome: 'Sara', ordine: 2, servizi: ['s1'] }
];
const clienti = [
  { id: 'c1', nome: 'Maria', cognome: 'Rossi', telefono: '+39 333 1234567', note: 'Allergica alla PPD' },
  { id: 'c2', nome: 'Mariangela', cognome: 'Bianchi', telefono: '3471112222' }
];
const riga = (nome: string, durata: number) => ({ servizi_catalogo: { nome, durata_minuti: durata } });
const appuntamenti = [
  { id: 'a1', data_ora: '2026-10-10T09:00:00+02:00', id_cliente: 'c2', stato: 'confermato', id_dipendente: 'o1',
    clienti: { nome: 'Mariangela', cognome: 'Bianchi' }, dipendenti: { id: 'o1', nome: 'Giulia' }, righe_appuntamento: [riga('Colore radici', 60)] },
  { id: 'a2', data_ora: '2026-10-10T12:00:00+02:00', id_cliente: 'block-client', stato: 'confermato', id_dipendente: 'o1',
    clienti: { nome: 'Pausa' }, dipendenti: { id: 'o1', nome: 'Giulia' }, righe_appuntamento: [riga('Pausa', 60)] },
  { id: 'a3', data_ora: '2026-09-20T15:00:00+02:00', id_cliente: 'c1', stato: 'completato', id_dipendente: 'o2',
    clienti: { nome: 'Maria', cognome: 'Rossi' }, dipendenti: { id: 'o2', nome: 'Sara' }, righe_appuntamento: [riga('Piega', 30)] }
].map(a => ({ ...a, data_ora: new Date(a.data_ora).toISOString() }));

const dati: Dati = {
  nomeSalone: 'RD Salon',
  servizi: async () => servizi,
  operatrici: async () => operatrici,
  clienti: async () => clienti,
  appuntamenti: async (da, a) => appuntamenti.filter(x => x.data_ora >= da && x.data_ora <= a),
  appuntamentiCliente: async id => appuntamenti.filter(x => x.id_cliente === id)
};

(async () => {
  // --- piccoli aiuti
  check('servizio dal nome detto a voce', 's2', trovaServizio('colore', servizi)?.id);
  check('servizio spento non si trova', null, trovaServizio('taglio vecchio', servizi));
  check('cliente per nome esatto prima', ['c1', 'c2'], cercaClienti('maria', clienti).map(c => c.id));
  check('cliente per telefono', ['c1'], cercaClienti('333 1234567', clienti).map(c => c.id));
  check('cliente per cognome e nome', ['c1'], cercaClienti('rossi maria', clienti).map(c => c.id));

  // --- agenda
  const agenda = await eseguiStrumento('leggi_agenda', { dal: '2026-10-10' }, dati, adesso, []);
  check('agenda: niente pause', 1, agenda.totale);
  check('agenda: chi c’è', 'Mariangela Bianchi', agenda.appuntamenti[0].cliente);
  check('agenda: troppi giorni', true, !!(await eseguiStrumento('leggi_agenda', { dal: '2026-10-01', al: '2026-11-01' }, dati, adesso, [])).errore);

  // --- scheda cliente
  const scheda = await eseguiStrumento('cerca_cliente', { testo: 'Maria Rossi' }, dati, adesso, []);
  check('cliente: note', 'Allergica alla PPD', scheda.clienti[0].note);
  check('cliente: ultima visita con i servizi', true, /Piega/.test(scheda.clienti[0].ultima_visita));

  // --- orari liberi
  const liberi = await eseguiStrumento('orari_liberi', { data: '2026-10-10', servizi: ['colore radici'] }, dati, adesso, []);
  check('orari: solo chi fa il colore', ['Giulia'], liberi.operatrici.map((o: any) => o.operatrice));
  const orariGiulia: string[] = liberi.operatrici[0].orari;
  check('orari: 9:00 occupato da Mariangela', false, orariGiulia.includes('09:00'));
  check('orari: 10:00 libero', true, orariGiulia.includes('10:00'));
  check('orari: la pausa delle 12 è occupata', false, orariGiulia.includes('12:00'));
  check('orari: servizio inesistente', true, !!(await eseguiStrumento('orari_liberi', { data: '2026-10-10', servizi: ['manicure'] }, dati, adesso, [])).errore);

  // --- proposta
  const proposte: Proposta[] = [];
  const esito = await eseguiStrumento('proponi_appuntamento',
    { cliente_id: 'c1', cliente_nome: 'Maria Rossi', servizi: ['piega'], data: '2026-10-10', ora: '10:00' }, dati, adesso, proposte);
  check('proposta pronta, non salvata', true, esito.ok && /NON/.test(esito.nota));
  const p = proposte[0];
  check('proposta: cliente in rubrica', 'c1', p.appuntamento.id_cliente);
  check('proposta: orario', new Date('2026-10-10T10:00:00+02:00').toISOString(), p.appuntamento.data_ora);
  check('proposta: prima operatrice libera', 'o1', p.appuntamento.id_dipendente);
  check('proposta: confermata e con il servizio', ['confermato', 'Piega', 30],
    [p.appuntamento.stato, p.appuntamento.righe_appuntamento[0].servizi_catalogo.nome, p.appuntamento.righe_appuntamento[0].servizi_catalogo.durata_minuti]);

  check('proposta: operatrice occupata', true,
    !!(await eseguiStrumento('proponi_appuntamento', { cliente_nome: 'Maria Rossi', servizi: ['piega'], operatrice: 'Giulia', data: '2026-10-10', ora: '09:00' }, dati, adesso, [])).errore);
  const altra: Proposta[] = [];
  await eseguiStrumento('proponi_appuntamento', { cliente_nome: 'Maria Rossi', servizi: ['piega'], data: '2026-10-10', ora: '09:00' }, dati, adesso, altra);
  check('proposta: se Giulia è occupata va Sara', 'o2', altra[0]?.appuntamento.id_dipendente);
  const nuova: Proposta[] = [];
  await eseguiStrumento('proponi_appuntamento', { cliente_nome: 'Lucia Verdi', telefono: '3209998888', servizi: ['piega'], data: '2026-10-10', ora: '15:00' }, dati, adesso, nuova);
  check('proposta: cliente nuova, senza id', [undefined, 'Lucia', 'Verdi', '3209998888'],
    [nuova[0].appuntamento.id_cliente, nuova[0].cliente.nome, nuova[0].cliente.cognome, nuova[0].cliente.telefono]);
  check('proposta: orario passato', true,
    !!(await eseguiStrumento('proponi_appuntamento', { cliente_nome: 'Maria', servizi: ['piega'], data: '2026-10-07', ora: '09:00' }, dati, adesso, [])).errore);

  // --- la conversazione, con un Gemini finto che chiede uno strumento e poi risponde
  const richieste: any[] = [];
  const finto = async (corpo: any) => {
    richieste.push(JSON.parse(JSON.stringify(corpo)));
    if (richieste.length === 1) {
      return { ok: true, stato: 200, json: { candidates: [{ content: { role: 'model', parts: [
        { functionCall: { name: 'proponi_appuntamento', args: { cliente_id: 'c1', cliente_nome: 'Maria Rossi', servizi: ['Piega'], data: '2026-10-10', ora: '10:00' } }, thoughtSignature: 'firma' }
      ] } }] } };
    }
    return { ok: true, stato: 200, json: { candidates: [{ content: { role: 'model', parts: [{ text: 'Ecco la proposta: premi Conferma.' }] } }] } };
  };
  const risposta = await chiediARosy([{ ruolo: 'utente', testo: 'Fissa una piega a Maria Rossi sabato alle 10' }], dati, finto, adesso);
  check('chat: testo finale', 'Ecco la proposta: premi Conferma.', risposta.testo);
  check('chat: una proposta', 1, risposta.proposte.length);
  check('chat: il turno del modello torna con la firma', 'firma', richieste[1].contents[1].parts[0].thoughtSignature);
  check('chat: la risposta dello strumento', 'proponi_appuntamento', richieste[1].contents[2].parts[0].functionResponse.name);
  check('chat: la data di oggi nelle istruzioni', true, /2026-10-07/.test(richieste[0].systemInstruction.parts[0].text));

  const vuota = await chiediARosy([], dati, finto, adesso);
  check('chat: senza domanda non chiama Google', 'Scrivimi pure una domanda.', vuota.testo);

  let errore: any = null;
  try { await chiediARosy([{ ruolo: 'utente', testo: 'ciao' }], dati, async () => ({ ok: false, stato: 429, json: { error: { message: 'quota' } } }), adesso); }
  catch (e) { errore = e; }
  check('chat: limite di Google spiegato', true, errore instanceof ErroreGemini && /limite/.test(spiegaErroreGemini(errore)));

  console.log(`\n${ok} ok, ${ko} ko`);
  if (ko) process.exit(1);
})();
