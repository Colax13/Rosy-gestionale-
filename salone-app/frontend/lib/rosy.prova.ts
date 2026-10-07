// Rosy senza Google e senza database: Gemini finto, dati finti.
// Si prova che gli strumenti leggano bene e che la proposta sia giusta.
process.env.TZ = 'Europe/Rome';

import { chiediARosy, contestoGiornata, eseguiStrumento, cercaClienti, trovaServizio, spiegaErroreGemini, ErroreGemini, Maschera, STRUMENTI, Dati, Proposta } from '../../../api/_rosy';
import { richiestaPerOpenAI, rispostaDaOpenAI } from '../../../api/_traduttore';
import { iaVera } from '../../../api/rosy';

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
  check('cliente: telefono e note NON vanno all\'IA', [undefined, undefined, true, true],
    [scheda.clienti[0].telefono, scheda.clienti[0].note, scheda.clienti[0].ha_telefono, scheda.clienti[0].ha_note]);
  check('cliente: nessun numero nel risultato', false, /333|1234567/.test(JSON.stringify(scheda)));
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

  check('chat: listino già nelle istruzioni', true, /LISTINO:[\s\S]*Piega: 20 €, 30 min/.test(richieste[0].systemInstruction.parts[0].text));

  // --- il contesto della giornata: venerdì 9, quindi sabato 10 è "domani"
  const contesto = await contestoGiornata(dati, new Date('2026-10-09T10:00:00+02:00'));
  check('contesto: appuntamento di domani', true, contesto.includes('- domani 09:00: Mariangela Bianchi — Colore radici — Giulia'));
  check('contesto: niente pause', false, contesto.includes('Pausa'));
  check('contesto: operatrici in ordine', true, /OPERATRICI:\n- Giulia\n- Sara/.test(contesto));
  check('contesto: servizi spenti fuori', false, contesto.includes('Taglio vecchio'));
  const lontano = await contestoGiornata(dati, adesso);
  check('contesto: giorni senza appuntamenti', true, lontano.includes('- nessun appuntamento'));

  const vuota = await chiediARosy([], dati, finto, adesso);
  check('chat: senza domanda non chiama Google', 'Scrivimi pure una domanda.', vuota.testo);

  let errore: any = null;
  try { await chiediARosy([{ ruolo: 'utente', testo: 'ciao' }], dati, async () => ({ ok: false, stato: 429, json: { error: { message: 'quota' } } }), adesso); }
  catch (e) { errore = e; }
  check('chat: limite di Google spiegato', true, errore instanceof ErroreGemini && /limite/.test(spiegaErroreGemini(errore)));

  // --- privacy: telefoni ed email non arrivano all'IA
  const m = new Maschera();
  const nascosto = m.nascondi('Fissa Lucia Verdi 320 999 8888, lucia@posta.it, sabato 2026-10-10 alle 10:00');
  check('maschera: telefono ed email sostituiti', 'Fissa Lucia Verdi [telefono 1], [email 1], sabato 2026-10-10 alle 10:00', nascosto);
  check('maschera: stesso numero, stesso segnaposto', '[telefono 1]', m.nascondi('320 999 8888'));
  check('maschera: rimessi negli argomenti', { telefono: '320 999 8888', servizi: ['Piega'] }, m.mostra({ telefono: '[telefono 1]', servizi: ['Piega'] }));
  check('maschera: +39 e trattini', '[telefono 1]', new Maschera().nascondi('+39 333-1234567'));
  check('maschera: date e prezzi restano', 'il 10/10 costa 45 €, ore 15:30', new Maschera().nascondi('il 10/10 costa 45 €, ore 15:30'));

  const visti: any[] = [];
  const spia = async (corpo: any) => {
    visti.push(JSON.parse(JSON.stringify(corpo)));
    if (visti.length === 1) {
      return { ok: true, stato: 200, json: { candidates: [{ content: { role: 'model', parts: [
        { functionCall: { name: 'proponi_appuntamento', args: { cliente_nome: 'Lucia Verdi', telefono: '[telefono 1]', servizi: ['Piega'], data: '2026-10-10', ora: '15:00' } } }
      ] } }] } };
    }
    return { ok: true, stato: 200, json: { candidates: [{ content: { parts: [{ text: 'Fatto: la richiamo al [telefono 1].' }] } }] } };
  };
  const conNumero = await chiediARosy([{ ruolo: 'utente', testo: 'Piega per Lucia Verdi 320 999 8888 sabato alle 15' }], dati, spia, adesso);
  check('privacy: il numero non è mai partito', false, visti.some(v => /999 ?8888/.test(JSON.stringify(v))));
  check('privacy: la proposta ha il numero vero', '320 999 8888', conNumero.proposte[0]?.cliente.telefono);
  check('privacy: la risposta mostra il numero vero', 'Fatto: la richiamo al 320 999 8888.', conNumero.testo);

  // --- traduttore Gemini ⇄ OpenAI
  const corpoGemini = {
    systemInstruction: { parts: [{ text: 'Sei Rosy' }] },
    contents: [
      { role: 'user', parts: [{ text: 'chi ho domani?' }] },
      { role: 'model', parts: [{ functionCall: { name: 'leggi_agenda', args: { dal: '2026-10-08' } }, thoughtSignature: 'x' }] },
      { role: 'user', parts: [{ functionResponse: { name: 'leggi_agenda', response: { totale: 0 } } }] }
    ],
    tools: [{ functionDeclarations: STRUMENTI }],
    generationConfig: { temperature: 0.3 }
  };
  const oa = richiestaPerOpenAI(corpoGemini, 'openai/gpt-oss-120b', { reasoning_effort: 'low' });
  check('traduttore: ruoli', ['system', 'user', 'assistant', 'tool'], oa.messages.map((x: any) => x.role));
  check('traduttore: chiamata e risposta abbinate', oa.messages[2].tool_calls[0].id, oa.messages[3].tool_call_id);
  check('traduttore: argomenti in JSON', '{"dal":"2026-10-08"}', oa.messages[2].tool_calls[0].function.arguments);
  check('traduttore: tipi in minuscolo', 'object', oa.tools[0].function.parameters.type);
  check('traduttore: niente maiuscole negli schemi', false, /"(OBJECT|STRING|ARRAY)"/.test(JSON.stringify(oa.tools)));
  check('traduttore: impostazioni extra', ['low', 'openai/gpt-oss-120b'], [oa.reasoning_effort, oa.model]);
  const ritorno = rispostaDaOpenAI({ choices: [{ message: { content: null, tool_calls: [{ id: 'q', type: 'function', function: { name: 'listino', arguments: '{}' } }] } }] });
  check('traduttore: ritorno con strumento', [{ functionCall: { name: 'listino', args: {} } }], ritorno.candidates[0].content.parts);
  check('traduttore: ritorno con testo', [{ text: 'Ciao!' }], rispostaDaOpenAI({ choices: [{ message: { content: 'Ciao!' } }] }).candidates[0].content.parts);

  // --- la catena: Gemini sovraccarico → Groq
  const fetchVero = (globalThis as any).fetch;
  const indirizzi: string[] = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    indirizzi.push(url.includes('groq') ? 'groq' : url.includes('openrouter') ? 'openrouter' : 'gemini');
    const risposta = (status: number, j: any) => ({ ok: status === 200, status, json: async () => j });
    if (url.includes('googleapis')) return risposta(503, { error: { message: 'The model is overloaded' } });
    if (url.includes('groq')) {
      const b = JSON.parse(init.body);
      return b.messages?.[0]?.role === 'system' && b.tools?.length
        ? risposta(200, { choices: [{ message: { content: 'Ciao da Groq' } }] })
        : risposta(400, { error: { message: 'richiesta strana' } });
    }
    return risposta(500, {});
  };
  const riserveFinte = [{ fornitore: 'groq' as const, url: 'https://api.groq.com/openai/v1/chat/completions', chiave: 'k', modello: 'openai/gpt-oss-120b', intestazioni: {} }];
  const viaGroq = await chiediARosy([{ ruolo: 'utente', testo: 'ciao' }], dati, iaVera('chiave-gemini', Date.now(), riserveFinte), adesso);
  check('catena: risponde Groq quando Gemini è giù', 'Ciao da Groq', viaGroq.testo);
  check('catena: un solo tentativo per modello Gemini sovraccarico', true, indirizzi.filter(x => x === 'gemini').length <= 6 && indirizzi.at(-1) === 'groq');
  (globalThis as any).fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: { message: 'overloaded' } }) });
  let tuttiGiu: any = null;
  try { await chiediARosy([{ ruolo: 'utente', testo: 'ciao' }], dati, iaVera('chiave-gemini', Date.now(), riserveFinte), adesso); }
  catch (e) { tuttiGiu = e; }
  check('catena: tutti giù → messaggio chiaro', true, tuttiGiu instanceof ErroreGemini && /sovraccarichi/.test(spiegaErroreGemini(tuttiGiu)));
  (globalThis as any).fetch = fetchVero;

  console.log(`\n${ok} ok, ${ko} ko`);
  if (ko) process.exit(1);
})();
