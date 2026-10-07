// Rosy, l'assistente del gestionale: il cervello, senza database e senza rete.
//
// Rosy parla con Gemini (l'IA di Google) e, per rispondere, usa degli
// "strumenti": leggere l'agenda, cercare una cliente, trovare gli orari
// liberi, guardare il listino. Gli strumenti leggono SOLO i dati del salone di
// chi sta scrivendo: il server li riceve già filtrati (vedi `Dati`).
//
// Rosy non scrive niente da sola. Quando le si chiede di fissare un
// appuntamento prepara una PROPOSTA: il gestionale la mostra con il pulsante
// "Conferma", e solo lì l'appuntamento viene salvato.
//
// Tutto quello che serve dall'esterno (dati, chiamata a Gemini) entra come
// funzione: così si prova senza Google e senza Firestore.

import { orariLiberi, istante, chiaveGiorno } from '../salone-app/frontend/lib/prenotazione';
import { fascePerDisponibilita } from '../salone-app/frontend/lib/vetrina';
import { tempiServizio, durataTotale } from '../salone-app/frontend/lib/servizi';
import { nomeOperatore, ordinaOperatori, faServizio } from '../salone-app/frontend/lib/operatori';
import { quandoCorto, elencoScritto } from '../salone-app/frontend/lib/messaggi';
import { ultimoAppuntamento, serviziDi } from '../salone-app/frontend/lib/storico';
import { noteDaMostrare } from '../salone-app/frontend/lib/cliente';

// ---------------------------------------------------------------------------
// I dati del salone, come li vede Rosy
// ---------------------------------------------------------------------------

export interface Dati {
  nomeSalone: string;
  servizi(): Promise<any[]>;
  operatrici(): Promise<any[]>;
  clienti(): Promise<any[]>;
  /** Appuntamenti fra due istanti ISO. */
  appuntamenti(daIso: string, aIso: string): Promise<any[]>;
  appuntamentiCliente(idCliente: string): Promise<any[]>;
}

/** Una proposta di appuntamento: il gestionale la salva solo dopo "Conferma". */
export interface Proposta {
  riepilogo: string;
  cliente: { id?: string; nome: string; cognome: string; telefono: string };
  /** Pronto per appuntamentiApi.create (manca solo id_cliente se è nuova). */
  appuntamento: any;
}

const pulito = (s: any) => (s ?? '').toString().trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const soloCifre = (s: any) => (s ?? '').toString().replace(/\D/g, '');

const ora = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** "2026-10-10" → la mezzanotte di quel giorno, sull'orologio del salone. */
function giorno(testo: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((testo || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Trova un servizio del listino dal nome detto a voce ("piega", "colore radici"). */
export function trovaServizio(nome: string, listino: any[]): any | null {
  const n = pulito(nome);
  if (!n) return null;
  const attivi = listino.filter(s => s.attivo !== false);
  return attivi.find(s => pulito(s.nome) === n)
    || attivi.find(s => pulito(s.nome).startsWith(n))
    || attivi.find(s => pulito(s.nome).includes(n))
    || attivi.find(s => n.includes(pulito(s.nome)))
    || null;
}

/** Trova un'operatrice dal nome ("Giulia"). */
export function trovaOperatrice(nome: string, operatrici: any[]): any | null {
  const n = pulito(nome);
  if (!n) return null;
  return operatrici.find(o => pulito(nomeOperatore(o)) === n)
    || operatrici.find(o => pulito(o.nome) === n)
    || operatrici.find(o => pulito(nomeOperatore(o)).includes(n))
    || null;
}

/** Le clienti che corrispondono a un nome o a un numero. Le più simili prima. */
export function cercaClienti(testo: string, clienti: any[], quante = 5): any[] {
  const q = pulito(testo);
  const cifre = soloCifre(testo);
  if (!q) return [];
  const punteggio = (c: any) => {
    const nome = pulito(`${c.nome || ''} ${c.cognome || ''}`);
    const inverso = pulito(`${c.cognome || ''} ${c.nome || ''}`);
    if (cifre.length >= 6 && soloCifre(c.telefono).endsWith(cifre.slice(-9))) return 100;
    if (nome === q || inverso === q) return 90;
    if (nome.startsWith(q) || inverso.startsWith(q)) return 70;
    const parole = q.split(' ');
    if (parole.every(p => nome.includes(p))) return 50;
    return 0;
  };
  return clienti
    .map(c => ({ c, p: punteggio(c) }))
    .filter(x => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, quante)
    .map(x => x.c);
}

// ---------------------------------------------------------------------------
// Gli strumenti
// ---------------------------------------------------------------------------

export const STRUMENTI = [
  {
    name: 'leggi_agenda',
    description: "Gli appuntamenti del salone in un giorno o in un intervallo (al massimo 14 giorni). Usalo per domande come 'chi ho domani?' o 'cosa fa Giulia venerdì?'.",
    parameters: {
      type: 'OBJECT',
      properties: {
        dal: { type: 'STRING', description: 'Primo giorno, formato AAAA-MM-GG' },
        al: { type: 'STRING', description: 'Ultimo giorno compreso, AAAA-MM-GG. Se manca, solo il primo giorno.' },
        operatrice: { type: 'STRING', description: "Facoltativo: solo gli appuntamenti di questa operatrice (nome)." }
      },
      required: ['dal']
    }
  },
  {
    name: 'cerca_cliente',
    description: "Cerca una cliente per nome, cognome o telefono. Restituisce contatti, note, ultima visita con i servizi fatti e il prossimo appuntamento.",
    parameters: {
      type: 'OBJECT',
      properties: { testo: { type: 'STRING', description: 'Nome, cognome o numero di telefono' } },
      required: ['testo']
    }
  },
  {
    name: 'orari_liberi',
    description: "Gli orari liberi di un giorno per i servizi indicati, operatrice per operatrice, rispettando turni e appuntamenti già fissati.",
    parameters: {
      type: 'OBJECT',
      properties: {
        data: { type: 'STRING', description: 'Il giorno, AAAA-MM-GG' },
        servizi: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Nomi dei servizi (dal listino). Se mancano si considera un appuntamento di 30 minuti.' },
        operatrice: { type: 'STRING', description: 'Facoltativo: solo questa operatrice' }
      },
      required: ['data']
    }
  },
  {
    name: 'listino',
    description: 'I servizi del salone con prezzo, durata e categoria.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'operatrici',
    description: 'Le operatrici del salone, con i servizi che sanno fare e i giorni in cui lavorano.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'proponi_appuntamento',
    description: "Prepara un appuntamento da far confermare: NON lo salva. Il gestionale mostra la proposta con il pulsante Conferma. Usalo solo quando cliente, servizi, giorno e ora sono chiari.",
    parameters: {
      type: 'OBJECT',
      properties: {
        cliente_id: { type: 'STRING', description: "L'id della cliente trovato con cerca_cliente, se è già in rubrica" },
        cliente_nome: { type: 'STRING', description: 'Nome e cognome della cliente' },
        telefono: { type: 'STRING', description: 'Facoltativo: telefono, per una cliente nuova' },
        servizi: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Nomi dei servizi dal listino' },
        operatrice: { type: 'STRING', description: 'Nome dell’operatrice. Se manca, la prima libera.' },
        data: { type: 'STRING', description: 'AAAA-MM-GG' },
        ora: { type: 'STRING', description: 'HH:MM' }
      },
      required: ['cliente_nome', 'servizi', 'data', 'ora']
    }
  }
];

const GIORNI_TURNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];

/** Esegue uno strumento. Le proposte preparate finiscono in `proposte`. */
export async function eseguiStrumento(nome: string, args: any, dati: Dati, adesso: Date, proposte: Proposta[]): Promise<any> {
  const a = args || {};
  switch (nome) {
    case 'leggi_agenda': {
      const dal = giorno(a.dal);
      if (!dal) return { errore: 'Data non valida: usa AAAA-MM-GG.' };
      const al = giorno(a.al) || dal;
      const fine = new Date(al); fine.setDate(fine.getDate() + 1);
      if ((fine.getTime() - dal.getTime()) / 86400000 > 14) return { errore: 'Al massimo 14 giorni per volta.' };
      const [lista, ops] = await Promise.all([dati.appuntamenti(dal.toISOString(), fine.toISOString()), dati.operatrici()]);
      const filtroOp = a.operatrice ? trovaOperatrice(a.operatrice, ops) : null;
      if (a.operatrice && !filtroOp) return { errore: `Non trovo l'operatrice "${a.operatrice}".`, operatrici: ops.map(nomeOperatore) };
      const righe = lista
        .filter(x => x.id_cliente !== 'block-client' && x.stato !== 'annullato')
        .filter(x => !filtroOp || (x.id_dipendente || x.dipendenti?.id) === filtroOp.id)
        .sort((x, y) => (x.data_ora || '').localeCompare(y.data_ora || ''))
        .map(x => ({
          quando: quandoCorto(new Date(x.data_ora)),
          fine: ora(new Date(new Date(x.data_ora).getTime() + durataTotale(x.righe_appuntamento || []) * 60000)),
          cliente: `${x.clienti?.nome || ''} ${x.clienti?.cognome || ''}`.trim(),
          servizi: elencoScritto(serviziDi(x)),
          operatrice: x.dipendenti ? nomeOperatore(x.dipendenti) : 'nessuna',
          stato: x.stato === 'in_attesa' ? 'richiesta online da confermare' : x.stato
        }));
      return { dal: chiaveGiorno(dal), al: chiaveGiorno(al), totale: righe.length, appuntamenti: righe.slice(0, 80) };
    }

    case 'cerca_cliente': {
      const trovate = cercaClienti(a.testo || '', await dati.clienti());
      if (!trovate.length) return { trovate: 0, nota: 'Nessuna cliente con questo nome o numero.' };
      const schede = await Promise.all(trovate.map(async c => {
        const storico = await dati.appuntamentiCliente(c.id);
        const ultimo = ultimoAppuntamento(storico.filter(x => new Date(x.data_ora).getTime() <= adesso.getTime()), adesso);
        const prossimo = storico
          .filter(x => x.stato !== 'annullato' && x.id_cliente !== 'block-client' && new Date(x.data_ora).getTime() > adesso.getTime())
          .sort((x, y) => x.data_ora.localeCompare(y.data_ora))[0];
        return {
          id: c.id,
          nome: `${c.nome || ''} ${c.cognome || ''}`.trim(),
          telefono: c.telefono || '',
          note: noteDaMostrare(c),
          ultima_visita: ultimo ? `${quandoCorto(new Date(ultimo.data_ora))} — ${elencoScritto(serviziDi(ultimo)) || 'servizi non indicati'}${ultimo.dipendenti?.nome ? ` con ${nomeOperatore(ultimo.dipendenti)}` : ''}` : 'mai venuta',
          prossimo_appuntamento: prossimo ? `${quandoCorto(new Date(prossimo.data_ora))} — ${elencoScritto(serviziDi(prossimo))}` : 'nessuno'
        };
      }));
      return { trovate: schede.length, clienti: schede };
    }

    case 'orari_liberi': {
      const d = giorno(a.data);
      if (!d) return { errore: 'Data non valida: usa AAAA-MM-GG.' };
      const [listino, ops] = await Promise.all([dati.servizi(), dati.operatrici()]);
      const nomi: string[] = Array.isArray(a.servizi) ? a.servizi : [];
      const servizi = nomi.map(n => trovaServizio(n, listino));
      const mancanti = nomi.filter((_, i) => !servizi[i]);
      if (mancanti.length) return { errore: `Non trovo nel listino: ${mancanti.join(', ')}.`, listino: listino.filter(s => s.attivo !== false).map(s => s.nome) };
      const durata = servizi.reduce((t, s) => t + tempiServizio(s).totale, 0) || 30;
      let candidate = ops.filter(o => o.attivo !== false && servizi.every(s => faServizio(o, s.id)));
      if (a.operatrice) {
        const scelta = trovaOperatrice(a.operatrice, candidate);
        if (!scelta) return { errore: `L'operatrice "${a.operatrice}" non c'è o non fa questi servizi.` };
        candidate = [scelta];
      }
      const fine = new Date(d); fine.setDate(fine.getDate() + 1);
      const occupate = (await dati.appuntamenti(d.toISOString(), fine.toISOString())).flatMap(fascePerDisponibilita);
      const perOperatrice = candidate.map(o => ({
        operatrice: nomeOperatore(o),
        orari: orariLiberi(d, [o], durata, occupate, adesso.getTime())
      }));
      return { data: chiaveGiorno(d), durata_minuti: durata, operatrici: perOperatrice };
    }

    case 'listino': {
      const listino = (await dati.servizi()).filter(s => s.attivo !== false);
      return {
        servizi: listino.map(s => ({
          nome: s.nome,
          categoria: s.categoria || '',
          prezzo: Number(s.prezzo_base ?? s.prezzo) || 0,
          durata_minuti: tempiServizio(s).totale
        }))
      };
    }

    case 'operatrici': {
      const [ops, listino] = await Promise.all([dati.operatrici(), dati.servizi()]);
      return {
        operatrici: ordinaOperatori(ops.filter(o => o.attivo !== false)).map(o => ({
          nome: nomeOperatore(o),
          servizi: Array.isArray(o.servizi) && o.servizi.length
            ? listino.filter(s => o.servizi.includes(s.id)).map(s => s.nome)
            : 'tutti',
          giorni: o.turni
            ? GIORNI_TURNI.filter(g => o.turni[g]?.attivo && o.turni[g]?.tipo === 'lavoro')
                .map(g => `${g} ${(o.turni[g].fasce || []).map((f: any) => `${f.inizio}-${f.fine}`).join(', ')}`)
            : 'turni non impostati (martedì-sabato 9-18)'
        }))
      };
    }

    case 'proponi_appuntamento': {
      const d = giorno(a.data);
      if (!d || !/^\d{1,2}:\d{2}$/.test(a.ora || '')) return { errore: 'Servono data AAAA-MM-GG e ora HH:MM.' };
      const [listino, ops, clienti] = await Promise.all([dati.servizi(), dati.operatrici(), dati.clienti()]);
      const nomi: string[] = Array.isArray(a.servizi) ? a.servizi : [];
      const servizi = nomi.map(n => trovaServizio(n, listino));
      const mancanti = nomi.filter((_, i) => !servizi[i]);
      if (!nomi.length || mancanti.length) return { errore: `Servizi non trovati nel listino: ${mancanti.join(', ') || 'nessuno indicato'}.` };

      const inizio = istante(d, a.ora.padStart(5, '0'));
      if (inizio.getTime() <= adesso.getTime()) return { errore: "Quell'orario è già passato." };

      const righe = servizi.map(s => {
        const t = tempiServizio(s);
        return {
          id_dipendente: null,
          id_dipendente_finitura: null,
          servizi_catalogo: { nome: s.nome, durata_minuti: t.totale, tempo_lavorazione_minuti: t.lavorazione, tempo_posa_minuti: t.posa, tempo_finitura_minuti: t.finitura }
        };
      });
      const durata = durataTotale(righe);
      const fine = new Date(d); fine.setDate(fine.getDate() + 1);
      const occupate = (await dati.appuntamenti(d.toISOString(), fine.toISOString())).flatMap(fascePerDisponibilita);
      const adatte = ops.filter(o => o.attivo !== false && servizi.every(s => faServizio(o, s.id)));
      const hhmm = ora(inizio);

      let op: any = null;
      if (a.operatrice) {
        op = trovaOperatrice(a.operatrice, adatte);
        if (!op) return { errore: `L'operatrice "${a.operatrice}" non c'è o non fa questi servizi.` };
        if (!orariLiberi(d, [op], durata, occupate, adesso.getTime()).includes(hhmm)) {
          return { errore: `${nomeOperatore(op)} non è libera alle ${hhmm} (o è fuori turno). Usa orari_liberi per vedere quando lo è.` };
        }
      } else {
        op = adatte.find(o => orariLiberi(d, [o], durata, occupate, adesso.getTime()).includes(hhmm)) || null;
        if (!op) return { errore: `Nessuna operatrice è libera alle ${hhmm} per questi servizi. Usa orari_liberi.` };
      }

      // La cliente: quella indicata, o quella con lo stesso nome in rubrica.
      let cliente = a.cliente_id ? clienti.find(c => c.id === a.cliente_id) : null;
      if (!cliente) {
        const simili = cercaClienti(a.telefono || a.cliente_nome || '', clienti, 2);
        if (simili.length === 1) cliente = simili[0];
      }
      const pezzi = (a.cliente_nome || '').trim().split(/\s+/);
      const datiCliente = cliente
        ? { id: cliente.id, nome: cliente.nome || '', cognome: cliente.cognome || '', telefono: cliente.telefono || '' }
        : { nome: pezzi.shift() || 'Cliente', cognome: pezzi.join(' '), telefono: (a.telefono || '').trim() };

      const proposta: Proposta = {
        riepilogo: `${`${datiCliente.nome} ${datiCliente.cognome}`.trim()} · ${quandoCorto(inizio)} · ${elencoScritto(servizi.map(s => s.nome))} · con ${nomeOperatore(op)}`,
        cliente: datiCliente,
        appuntamento: {
          data_ora: inizio.toISOString(),
          ...(datiCliente.id ? { id_cliente: datiCliente.id } : {}),
          id_dipendente: op.id,
          note: '',
          stato: 'confermato',
          clienti: { nome: datiCliente.nome, cognome: datiCliente.cognome, telefono: datiCliente.telefono },
          dipendenti: { id: op.id, nome: op.nome || '', cognome: op.cognome || '' },
          righe_appuntamento: righe
        }
      };
      proposte.push(proposta);
      return {
        ok: true,
        proposta: proposta.riepilogo,
        cliente_in_rubrica: !!datiCliente.id,
        nota: 'Proposta pronta: NON è ancora salvata. Di’ di premere "Conferma" sotto il messaggio.'
      };
    }
  }
  return { errore: `Strumento sconosciuto: ${nome}` };
}

// ---------------------------------------------------------------------------
// La conversazione con Gemini
// ---------------------------------------------------------------------------

export function istruzioni(nomeSalone: string, adesso: Date, contesto = ''): string {
  const oggi = `${GIORNI_TURNI[adesso.getDay()]} ${chiaveGiorno(adesso)}`;
  return [
    `Sei Rosy, l'assistente del gestionale del salone "${nomeSalone}". Parli italiano, con un tono caldo, professionale e breve: chi ti scrive lavora in salone e ha poco tempo.`,
    `Adesso sono le ${ora(adesso)} di ${oggi} (ora italiana). "Domani", "sabato", "la prossima settimana" vanno calcolati da qui, nel formato AAAA-MM-GG.`,
    'Rispondi solo con dati veri presi dagli strumenti: non inventare appuntamenti, clienti, prezzi o orari. Se uno strumento non trova niente, dillo.',
    'Per fissare un appuntamento: trova la cliente con cerca_cliente, controlla gli orari con orari_liberi, poi usa proponi_appuntamento. L’appuntamento NON è salvato finché chi ti scrive non preme "Conferma": dillo chiaramente e non dire mai che è già fissato.',
    'Se mancano informazioni (quale cliente, quale servizio, che ora), chiedile in una frase.',
    'Non puoi cancellare né spostare appuntamenti: per quello si usa l’agenda.',
    'Risposte corte: elenchi puntati per gli appuntamenti, niente tabelle, niente codici o id.',
    ...(contesto ? [
      'Qui sotto ci sono già operatrici, listino e agenda di oggi e domani: se la risposta è lì, rispondi subito senza usare strumenti. Per gli altri giorni, le clienti e gli orari liberi usa gli strumenti.',
      contesto
    ] : [])
  ].join('\n');
}

/**
 * Quello che serve quasi sempre, già pronto: così le domande più comuni
 * ("chi ho domani?", "quanto costa una piega?") si risolvono in un giro solo
 * con Google invece di due o tre. Se qualcosa non si legge, si va avanti senza.
 */
export async function contestoGiornata(dati: Dati, adesso: Date): Promise<string> {
  const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
  const dopodomani = new Date(oggi); dopodomani.setDate(dopodomani.getDate() + 2);
  const [ops, listino, agenda] = await Promise.all([
    dati.operatrici(),
    dati.servizi(),
    dati.appuntamenti(oggi.toISOString(), dopodomani.toISOString())
  ]);

  const righeOp = ordinaOperatori(ops.filter(o => o.attivo !== false)).map(o => `- ${nomeOperatore(o)}`);
  const righeListino = listino.filter(s => s.attivo !== false).slice(0, 120)
    .map(s => `- ${s.nome}: ${Number(s.prezzo_base ?? s.prezzo) || 0} €, ${tempiServizio(s).totale} min`);
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1);
  const giornoDi = (iso: string) => (new Date(iso).getTime() < domani.getTime() ? 'oggi' : 'domani');
  const righeAgenda = agenda
    .filter(x => x.id_cliente !== 'block-client' && x.stato !== 'annullato')
    .sort((x, y) => (x.data_ora || '').localeCompare(y.data_ora || ''))
    .slice(0, 80)
    .map(x => `- ${giornoDi(x.data_ora)} ${ora(new Date(x.data_ora))}: ${`${x.clienti?.nome || ''} ${x.clienti?.cognome || ''}`.trim() || 'cliente'}`
      + ` — ${elencoScritto(serviziDi(x)) || 'servizi non indicati'}`
      + ` — ${x.dipendenti ? nomeOperatore(x.dipendenti) : 'senza operatrice'}`
      + (x.stato === 'in_attesa' ? ' (richiesta online da confermare)' : ''));

  return [
    `OPERATRICI:\n${righeOp.join('\n') || '- nessuna'}`,
    `LISTINO:\n${righeListino.join('\n') || '- vuoto'}`,
    `AGENDA DI OGGI E DOMANI:\n${righeAgenda.join('\n') || '- nessun appuntamento'}`
  ].join('\n\n');
}

export interface MessaggioChat { ruolo: 'utente' | 'rosy'; testo: string }

export type ChiamaGemini = (corpo: any) => Promise<{ ok: boolean; stato: number; json: any }>;

export interface RispostaRosy { testo: string; proposte: Proposta[] }

/** Una domanda a Rosy, con gli strumenti: al massimo qualche giro. */
export async function chiediARosy(
  storia: MessaggioChat[],
  dati: Dati,
  chiama: ChiamaGemini,
  adesso = new Date(),
  giri = 6
): Promise<RispostaRosy> {
  const contents: any[] = storia
    .filter(m => m && typeof m.testo === 'string' && m.testo.trim())
    .slice(-12)
    .map(m => ({ role: m.ruolo === 'rosy' ? 'model' : 'user', parts: [{ text: m.testo.slice(0, 2000) }] }));
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    return { testo: 'Scrivimi pure una domanda.', proposte: [] };
  }

  const proposte: Proposta[] = [];
  const contesto = await contestoGiornata(dati, adesso).catch(() => '');
  const sistema = istruzioni(dati.nomeSalone, adesso, contesto);
  for (let i = 0; i < giri; i++) {
    const risposta = await chiama({
      systemInstruction: { parts: [{ text: sistema }] },
      contents,
      tools: [{ functionDeclarations: STRUMENTI }],
      generationConfig: { temperature: 0.3 }
    });
    if (!risposta.ok) throw new ErroreGemini(risposta.stato, risposta.json?.error?.message || '');

    const contenuto = risposta.json?.candidates?.[0]?.content;
    const parti: any[] = contenuto?.parts || [];
    const chiamate = parti.filter(p => p.functionCall);
    if (!chiamate.length) {
      const testo = parti.map(p => p.text || '').join('').trim();
      return { testo: testo || 'Non sono riuscita a rispondere: prova a riformulare.', proposte };
    }

    // Il turno del modello va rimesso com'è (con le sue firme), poi le risposte.
    contents.push({ role: 'model', parts: parti });
    const risultati = await Promise.all(chiamate.map(async p => {
      let esito: any;
      try { esito = await eseguiStrumento(p.functionCall.name, p.functionCall.args, dati, adesso, proposte); }
      catch (err: any) { esito = { errore: `Non sono riuscita a leggere i dati: ${err?.message || 'errore'}` }; }
      return { functionResponse: { name: p.functionCall.name, response: esito } };
    }));
    contents.push({ role: 'user', parts: risultati });
  }
  return { testo: 'Ci ho messo troppo a trovare la risposta: prova con una domanda più precisa.', proposte };
}

export class ErroreGemini extends Error {
  constructor(public stato: number, public dettaglio: string) { super(`Gemini ${stato}: ${dettaglio}`); }
}

/** Che cosa dire a chi usa il gestionale quando Gemini rifiuta. */
export function spiegaErroreGemini(err: ErroreGemini): string {
  if (err.stato === 429) return 'Ho ricevuto troppe domande in poco tempo (limite del piano gratuito di Google): riprova fra un minuto.';
  if (err.stato === 400 && /api key/i.test(err.dettaglio)) return 'La chiave di Gemini non è valida: controlla GEMINI_API_KEY su Vercel.';
  if (err.stato === 401 || err.stato === 403) return 'La chiave di Gemini non è valida o non ha i permessi: controlla GEMINI_API_KEY su Vercel.';
  if (err.stato === 504) return 'Google ci sta mettendo troppo a rispondere: riprova fra poco, o fai una domanda più semplice.';
  if (err.stato === 404) return 'Il modello di Gemini indicato non esiste: controlla GEMINI_MODEL su Vercel, o toglila.';
  if (err.stato >= 500) return 'Il servizio di Google in questo momento non risponde: riprova fra poco.';
  return `Gemini ha rifiutato la domanda (${err.stato}): ${err.dettaglio || 'senza spiegazione'}`;
}

export { GIORNI_TURNI };
