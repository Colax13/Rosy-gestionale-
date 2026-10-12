import { ordinaOperatori } from '../salone-app/frontend/lib/operatori';
// Sostituto dell'accesso a Firestore, usato solo dall'anteprima (npm run anteprima).
//
// Serve per aprire le schermate vere, con dati veri, senza doversi collegare
// al database: si guarda il tema chiaro e quello scuro, si prova il
// trascinamento in agenda, si controlla che i nomi ci stiano.
// Non finisce nel programma pubblicato: lo carica solo vite.anteprima.config.ts.

import { fascePerDisponibilita } from '@/lib/vetrina';

const oggi = new Date();
const alle = (h: number, m = 0) => {
  const d = new Date(oggi);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const turnoPieno = {
  lunedi:    { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '18:00' }] },
  martedi:   { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '18:00' }] },
  mercoledi: { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '18:00' }] },
  giovedi:   { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '19:30' }] },
  venerdi:   { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '09:00', fine: '19:30' }] },
  sabato:    { attivo: true, tipo: 'lavoro', fasce: [{ inizio: '08:30', fine: '17:00' }] },
  domenica:  { attivo: false, tipo: 'riposo' },
};

const dipendenti = [
  { id: 'd1', nome: 'Rosanna', cognome: 'Di Michele', ruolo: 'Titolare',  colore: '#D400FF', turni: turnoPieno },
  { id: 'd2', nome: 'Giulia',  cognome: 'Ferraro',    ruolo: 'Parrucchiera', colore: '#6B5CFF', turni: turnoPieno },
  // Martina fa solo estetica: serve a provare l'elenco dei servizi per operatrice.
  { id: 'd3', nome: 'Martina', cognome: '',  ruolo: 'Estetista', colore: '#00D8FF', servizi: ['s5'], turni: { ...turnoPieno, mercoledi: { attivo: false, tipo: 'riposo' } } },
];

const catalogo = [
  { id: 's1', nome: 'Colore',        categoria: 'Colore',  prezzo_base: 45, durata_minuti: 75, tempo_lavorazione_minuti: 15, tempo_posa_minuti: 45, tempo_finitura_minuti: 15, attivo: true },
  { id: 's2', nome: 'Piega',         categoria: 'Piega',   prezzo_base: 20, durata_minuti: 30, tempo_lavorazione_minuti: 30, tempo_posa_minuti: 0,  tempo_finitura_minuti: 0, attivo: true },
  { id: 's3', nome: 'Taglio donna',  categoria: 'Taglio',  prezzo_base: 25, durata_minuti: 45, tempo_lavorazione_minuti: 45, tempo_posa_minuti: 0,  tempo_finitura_minuti: 0, attivo: true },
  { id: 's4', nome: 'Meches',        categoria: 'Colore',  prezzo_base: 70, durata_minuti: 105, tempo_lavorazione_minuti: 30, tempo_posa_minuti: 50, tempo_finitura_minuti: 25, attivo: true },
  { id: 's5', nome: 'Trattamento ricostruzione', categoria: 'Cura', prezzo_base: 35, durata_minuti: 40, tempo_lavorazione_minuti: 40, tempo_posa_minuti: 0, tempo_finitura_minuti: 0, attivo: true },
];

const giorniFa = (n: number) => {
  const d = new Date(oggi);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const clienti = [
  { id: 'c1', nome: 'Maria Antonietta', cognome: 'Della Valle Guerrieri', telefono: '3401112233', email: 'maria@example.it', note: 'Preferisce il pomeriggio', createdAt: giorniFa(400), canale_acquisizione: 'Passaparola' },
  { id: 'c2', nome: 'Anna',   cognome: 'Bianchi',  telefono: '3402223344', email: 'anna@example.it', createdAt: giorniFa(3), canale_acquisizione: 'Instagram' },
  { id: 'c3', nome: 'Chiara', cognome: 'Esposito', telefono: '3403334455', createdAt: giorniFa(220), canale_acquisizione: 'Passaparola' },
  { id: 'c4', nome: 'Federica', cognome: 'Lombardi Santangelo', telefono: '3404445566', createdAt: giorniFa(150) },
  { id: 'c5', nome: 'Rita',   cognome: 'Marchetti', telefono: '3405556677', createdAt: giorniFa(500) },
  { id: 'c6', nome: 'Sonia',  cognome: 'Pellegrini', telefono: '3406667788', createdAt: giorniFa(2) },
];

const appuntamenti = [
  // Uno con l'SMS non partito: deve comparire nell'avviso rosso.
  { id: 'a9', id_cliente: 'c1', data_ora: alle(17, 0), stato: 'confermato', idDipendente: 'd2', id_dipendente: 'd2',
    clienti: clienti[0], dipendenti: dipendenti[1], righe_appuntamento: [{ servizi_catalogo: catalogo[1] }],
    messaggi_errore: { promemoria_ora: { quando: new Date().toISOString(), motivo: 'il gettone di Traccar non è più valido: copia il nuovo Cloud token dall\'app sul tablet e mettilo su Vercel (TRACCAR_SMS_TOKEN) (401).' } } },
  // Uno senza operatore: deve comparire nell'avviso sopra il calendario.
  { id: 'a0', id_cliente: 'c2', data_ora: alle(16, 0), stato: 'confermato', clienti: clienti[1], dipendenti: null,
    righe_appuntamento: [{ servizi_catalogo: catalogo[2] }] },
  { id: 'a1', id_cliente: 'c1', data_ora: alle(9, 0),  stato: 'confermato', note: 'Riflessante castano', idDipendente: 'd1',
    clienti: clienti[0], dipendenti: dipendenti[0],
    righe_appuntamento: [{ servizi_catalogo: catalogo[0] }, { servizi_catalogo: catalogo[1] }] },
  { id: 'a2', id_cliente: 'c2', data_ora: alle(9, 30), stato: 'confermato', idDipendente: 'd1',
    clienti: clienti[1], dipendenti: dipendenti[0],
    righe_appuntamento: [{ servizi_catalogo: catalogo[2] }] },
  { id: 'a3', id_cliente: 'c3', data_ora: alle(10, 0), stato: 'in_attesa', idDipendente: 'd2',
    clienti: clienti[2], dipendenti: dipendenti[1],
    righe_appuntamento: [{ servizi_catalogo: catalogo[3] }] },
  { id: 'a4', id_cliente: 'c4', data_ora: alle(11, 0), stato: 'completato', idDipendente: 'd3',
    clienti: clienti[3], dipendenti: dipendenti[2],
    righe_appuntamento: [{ servizi_catalogo: catalogo[4] }] },
  { id: 'a5', id_cliente: 'c1', data_ora: alle(14, 0), stato: 'confermato', idDipendente: 'd2',
    clienti: clienti[0], dipendenti: dipendenti[1],
    righe_appuntamento: [{ servizi_catalogo: catalogo[1] }] },
];

// Qualche visita vecchia, per far comparire le clienti da recuperare.
const appuntamentiVecchi = [
  { id: 'v1', data_ora: giorniFa(95), stato: 'completato', id_cliente: 'c1', clienti: clienti[0], righe_appuntamento: [{ servizi_catalogo: catalogo[1] }] },
  { id: 'v2', data_ora: giorniFa(210), stato: 'completato', id_cliente: 'c3', clienti: clienti[2], righe_appuntamento: [{ servizi_catalogo: catalogo[2] }] },
  { id: 'v3', data_ora: giorniFa(10), stato: 'completato', id_cliente: 'c4', clienti: clienti[3], righe_appuntamento: [{ servizi_catalogo: catalogo[1] }] },
];

const buoni = [
  { id: 'b1', codice: 'RSY-A3K9-QW2F', tipo: 'spa', origine: 'foglio', intestatario: 'Anna Bianchi', telefono: '3401112233', valore: 70, valore_residuo: 70, stato: 'attivo', piega_inclusa: true, data_emissione: alle(9), note: 'Pagato da Stefania Mucci · stefania@example.it' },
  { id: 'b2', codice: 'RSY-7HGT-LM4P', tipo: 'spa', origine: 'manuale', intestatario: 'Chiara Esposito', acquirente: 'Chiara Esposito', valore: 50, valore_residuo: 50, stato: 'attivo', data_emissione: alle(9) },
  { id: 'b4', codice: 'RSY-K2M4-PP91', tipo: 'spa', origine: 'foglio', intestatario: 'Giorgia Fabi', acquirente: 'Marco Fabi', valore: 50, valore_residuo: 50, stato: 'attivo', data_scadenza: '2027-02-14', data_emissione: alle(9) },
  { id: 'b5', codice: 'RSY-T7T7-HJ22', tipo: 'spa', origine: 'foglio', intestatario: 'Elena Russo', acquirente: 'Elena Russo', valore: 70, valore_residuo: 70, piega_inclusa: true, stato: 'attivo', data_scadenza: '2026-12-20', data_emissione: alle(9) },
  { id: 'b6', codice: 'RSY-OLD0-SC44', tipo: 'spa', origine: 'foglio', intestatario: 'Paola Neri', acquirente: 'Franco Neri', valore: 50, valore_residuo: 50, stato: 'attivo', data_scadenza: '2026-03-01', data_emissione: alle(9) },
  { id: 'b7', codice: 'RSY-US3D-AA11', tipo: 'spa', origine: 'foglio', intestatario: 'Marta Gentile', acquirente: 'Luigi Gentile', valore: 70, valore_residuo: 0, piega_inclusa: true, stato: 'usato', data_scadenza: '2026-11-01', data_emissione: alle(9) },
  { id: 'b3', codice: 'RSY-QQ11-ZZ88', tipo: 'salone', origine: 'manuale', intestatario: 'Federica Lombardi', acquirente: 'Marco Lombardi', acquirente_telefono: '333 444 5566', valore: 30, valore_residuo: 0, stato: 'usato', data_emissione: alle(9) },
];

const eco = (v: any) => Promise.resolve(v);
const nulla = () => Promise.resolve({ id: 'nuovo' });

export const reportApi = {
  getOverview: async () => {
    const mese = (i: number) => {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() - i, 1);
      return d.toISOString();
    };
    return {
      overview: {
        incasso_mensile: 3480,
        appuntamenti_oggi: appuntamenti.length,
        ticket_medio: 36.25,
        clienti_totali: clienti.length,
      },
      incassi: [
        { mese: mese(0), totale_incassato: 3480 },
        { mese: mese(1), totale_incassato: 4120 },
        { mese: mese(2), totale_incassato: 2890 },
        { mese: mese(3), totale_incassato: 3660 },
        { mese: mese(4), totale_incassato: 3010 },
        { mese: mese(5), totale_incassato: 2740 },
      ],
      dipendenti: [
        { id: 'd1', nome: 'Rosanna', cognome: 'Di Michele', numero_appuntamenti: 41, totale_incassato: 1780 },
        { id: 'd2', nome: 'Giulia',  cognome: 'Ferraro',    numero_appuntamenti: 33, totale_incassato: 1180 },
        { id: 'd3', nome: 'Martina', cognome: '',  numero_appuntamenti: 22, totale_incassato: 520 },
      ],
      clienti_report: {
        acquisiti_questo_mese: clienti.slice(0, 2).map(c => ({
          ...c, canale_acquisizione: 'Passaparola', data_acquisizione: alle(10),
        })),
        conteggio_per_canale: [
          { canale: 'Passaparola', quantita: 18 },
          { canale: 'Instagram', quantita: 11 },
          { canale: 'Non indicato', quantita: 4 },
        ],
      },
    };
  },
};

export const clientiApi = {
  getAll: async () => eco(clienti),
  getById: async (id: string) => eco(clienti.find(c => c.id === id) || clienti[0]),
  create: async (dati: any) => {
    const nuova = { id: `c${clienti.length + 1}-${Math.random().toString(36).slice(2, 6)}`, ...dati };
    (clienti as any[]).push(nuova);
    return eco(nuova);
  },
  update: async (id: string, dati: any) => {
    const i = clienti.findIndex(c => c.id === id);
    if (i >= 0) clienti[i] = { ...clienti[i], ...dati };
    return eco(clienti[i]);
  },
  delete: nulla, importAi: nulla,
  assicuraDaAppuntamento: async (app: any) => eco(app?.id_cliente || 'c-nuova'),
};

// Nell'anteprima non parte niente: si finge che sia arrivato, così si vede
// che cosa dice l'agenda quando va bene.
export const azzeraPromemoria = () => ({});

// Rosy finta: risponde sempre con una proposta, per vedere il pulsante Conferma.
export const rosyApi = {
  riscalda: async () => {},
  chiedi: async (storia: any[]) => {
    await new Promise(r => setTimeout(r, 600));
    const domanda = (storia[storia.length - 1]?.testo || '').toLowerCase();
    if (/numero|telefono|note|email/.test(domanda)) {
      const c: any = clienti[0];
      return {
        testo: `Per riservatezza non vedo i dati di contatto e le note di ${c.nome} ${c.cognome}: li trovi nella sua scheda, con il pulsante qui sotto.`,
        proposte: [],
        schede: [{ id: c.id, nome: `${c.nome} ${c.cognome}`.trim() }]
      };
    }
    if (!/fiss|prenot|appuntamento/.test(domanda)) {
      return { testo: 'Domani hai 3 appuntamenti:\n• 09:00 Maria Rossi — Piega con Giulia\n• 11:00 Anna Verdi — Colore\n• 15:30 Sara Neri — Taglio', proposte: [], schede: [] };
    }
    const data = new Date(); data.setDate(data.getDate() + 3); data.setHours(10, 0, 0, 0);
    return {
      testo: 'Ho preparato la proposta qui sotto: non è ancora salvata, premi "Conferma" per fissarla.',
      schede: [],
      proposte: [{
        riepilogo: `Maria Rossi · ${data.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })} 10:00 · Piega · con Giulia`,
        cliente: { id: clienti[0]?.id, nome: 'Maria', cognome: 'Rossi', telefono: '+39 333 1234567' },
        appuntamento: {
          data_ora: data.toISOString(), id_cliente: clienti[0]?.id, id_dipendente: 'd2', note: '', stato: 'confermato',
          clienti: { nome: 'Maria', cognome: 'Rossi', telefono: '+39 333 1234567' },
          dipendenti: { id: 'd2', nome: 'Giulia', cognome: 'Ferraro' },
          righe_appuntamento: [{ id_dipendente: null, id_dipendente_finitura: null, servizi_catalogo: { nome: 'Piega', durata_minuti: 30 } }]
        }
      }]
    };
  }
};

export const messaggiApi = {
  manda: async (id: string, tipo?: string) => {
    console.log(`[anteprima] SMS ${tipo || 'conferma'} per ${id}`);
    return eco({ mandato: true, canali: ['sms'], a: ['+39 333 000 0000'] });
  },
};

// La prenotazione dal sito, finta: il codice giusto è sempre 123456, così
// nell'anteprima si prova anche quando lo si sbaglia.
export const prenotazioneApi = {
  chiediCodice: async (_salonId: string, telefono: string) =>
    eco({ serveCodice: true, a: telefono || '+39 333 000 0000' }),
  prenota: async (salonId: string, appuntamento: any, codice?: string) => {
    if (codice && codice !== '123456') throw new Error('Codice sbagliato. Hai ancora 4 tentativi.');
    (globalThis as any).ultimaPrenotazione = { salonId, ...appuntamento, codice };
    return eco({ id: 'finto', verificato: !!codice });
  }
};

let ultimoNumeroFinto = 41;
export const precontoApi = {
  numero: async (_id: string) => eco({ anno: new Date().getFullYear(), numero: ++ultimoNumeroFinto }),
};

export const salonApi = {
  getSettings: async () => eco({
    nome: 'Rosy Parrucchieri', indirizzo: 'Via Roma 12, Chieti',
    telefono: '0871 123456', email: 'info@rosy.it',
    orari: { apertura: '09:00', chiusura: '19:00' },
  }),
  updateSettings: nulla,
};

export const catalogoApi = {
  getPublic: async () => eco(catalogo),
  getAll: async () => eco(catalogo),
  create: nulla, update: nulla, delete: nulla,
  getCategorie: async () => eco(['Colore', 'Piega', 'Taglio', 'Cura']),
  createCategoria: nulla, updateCategoria: nulla, deleteCategoria: nulla,
};

export const dipendentiApi = {
  getPublic: async () => eco(dipendenti),
  getAll: async () => eco(ordinaOperatori(dipendenti)),
  salvaOrdine: async (cambi: { id: string; ordine: number }[]) => {
    cambi.forEach(c => { const d: any = dipendenti.find(x => x.id === c.id); if (d) d.ordine = c.ordine; });
  },
  create: nulla,
  update: async (id: string, dati: any) => {
    const i = dipendenti.findIndex(d => d.id === id);
    if (i >= 0) dipendenti[i] = { ...dipendenti[i], ...dati };
    return eco(dipendenti[i]);
  },
  delete: nulla,
};

export const appuntamentiApi = {
  ascolta: () => () => {},
  getAgendaPublic: async () => eco(appuntamenti),
  getByCliente: async () => eco(appuntamenti.slice(0, 2)),
  getAgenda: async (data?: string, da?: string, a?: string) => {
    const tutti = [...appuntamenti, ...appuntamentiVecchi];
    const daGiorno = da || data;
    const aGiorno = a || data;
    if (!daGiorno || !aGiorno) return eco(tutti);
    const inizio = new Date(`${daGiorno}T00:00:00`).getTime();
    const fine = new Date(`${aGiorno}T23:59:59.999`).getTime();
    return eco(tutti.filter(x => {
      const t = new Date(x.data_ora).getTime();
      return t >= inizio && t <= fine;
    }));
  },
  getRichieste: async () => eco(appuntamenti.filter(a => a.stato === 'in_attesa')),
  // Qui la finzione tiene: le modifiche restano in memoria finché la pagina è
  // aperta, così si può provare davvero a trascinare i servizi.
  create: async (dati: any) => {
    const nuovo = { id: `a${appuntamenti.length + 1}`, ...dati };
    appuntamenti.push(nuovo);
    return eco(nuovo);
  },
  update: async (id: string, dati: any) => {
    const i = appuntamenti.findIndex(a => a.id === id);
    if (i >= 0) appuntamenti[i] = { ...appuntamenti[i], ...dati };
    return eco(appuntamenti[i]);
  },
  delete: async (id: string) => {
    const i = appuntamenti.findIndex(a => a.id === id);
    if (i >= 0) appuntamenti.splice(i, 1);
    return eco({ success: true });
  },
};

// La parte pubblica: la vetrina ripulita e gli orari occupati.
export const vetrinaApi = {
  getPublic: async () => eco({
    userId: 'salone',
    servizi: catalogo.map(s => ({ ...s })),
    operatori: dipendenti.map(d => ({ id: d.id, nome: d.nome, cognome: d.cognome, fotoUrl: '', turni: d.turni, servizi: (d as any).servizi || [] })),
    aggiornato: new Date().toISOString(),
  }),
  aggiorna: async () => {},
};

export const disponibilitaApi = {
  getPublic: async () => eco(
    [...appuntamenti, ...appuntamentiVecchi].map(a => ({
      userId: 'salone',
      giorno: a.data_ora.slice(0, 10),
      fasce: fascePerDisponibilita(a),
    }))
  ),
  scrivi: async () => {},
  elimina: async () => {},
  allinea: async () => 0,
};

const ascoltatoriBuoni = new Set<(b: any[]) => void>();
const avvisaBuoni = () => setTimeout(() => ascoltatoriBuoni.forEach(f => f([...buoni])), 0);

export const buoniApi = {
  getAll: async () => eco([...buoni]),
  ascolta: (quandoCambiano: (b: any[]) => void) => {
    ascoltatoriBuoni.add(quandoCambiano);
    quandoCambiano([...buoni]);
    return () => { ascoltatoriBuoni.delete(quandoCambiano); };
  },
  create: async (dati: any) => {
    const nuovo = { id: `b${buoni.length + 1}`, ...dati };
    (buoni as any[]).push(nuovo);
    avvisaBuoni();
    return eco(nuovo);
  },
  update: async (id: string, dati: any) => {
    const i = buoni.findIndex(b => b.id === id);
    if (i >= 0) (buoni as any[])[i] = { ...buoni[i], ...dati };
    avvisaBuoni();
    return eco(buoni[i]);
  },
  aggiornaDalFoglio: async () => {
    // Nell'anteprima il foglio "porta" un buono nuovo la prima volta.
    if (!buoni.some(b => b.id === 'bf')) {
      (buoni as any[]).push({ id: 'bf', codice: 'RSY-NUOV-O123', tipo: 'spa', origine: 'foglio', intestatario: 'Sara Conti', acquirente: 'Luca Conti', acquirente_telefono: '347 000 1111', valore: 50, valore_residuo: 50, stato: 'attivo', data_emissione: alle(9) });
      avvisaBuoni();
      return eco({ acceso: true, aggiunti: 1, letti: 4 });
    }
    return eco({ acceso: true, aggiunti: 0, letti: 4 });
  },
  delete: async (id: string) => {
    const i = buoni.findIndex(b => b.id === id);
    if (i >= 0) buoni.splice(i, 1);
    avvisaBuoni();
    return eco({ success: true });
  },
};


const oggiIso = new Date().toISOString();
const giornoOggi = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const registro = [
  { id: 'r1', tipo: 'promemoria_ora', cliente: 'Maria Rossi', a: '+393331234567', testo: 'RD Salon: ciao Maria, ti aspettiamo alle 17:00 con Giulia. A tra poco!', esito: 'errore', motivo: "il gettone di Traccar non è più valido: copia il nuovo Cloud token dall'app sul tablet e mettilo su Vercel (TRACCAR_SMS_TOKEN) (401).", quando: oggiIso, giorno: giornoOggi },
  { id: 'r2', tipo: 'avviso_salone', cliente: 'Salone', a: '+393470000000', testo: "Rosy: nuova richiesta online da Anna Bianchi, sab 10/10 alle 10:00 (Piega). Confermala dall'agenda.", esito: 'consegnato', quando: oggiIso, giorno: giornoOggi },
  { id: 'r3', tipo: 'ricevuta', cliente: 'Anna Bianchi', a: '+393409876543', testo: 'RD Salon: grazie Anna! Abbiamo ricevuto la tua richiesta per sab 10/10 alle 10:00. Ti scriveremo appena sarà confermata.', esito: 'consegnato', quando: oggiIso, giorno: giornoOggi },
  { id: 'r4', tipo: 'conferma', cliente: 'Chiara Esposito', a: '+393401112222', testo: 'RD Salon: ciao Chiara, il tuo appuntamento è confermato per lun 12/10 alle 11:00 con Rosanna. Ti aspettiamo! Per info 0775 123456', esito: 'consegnato', quando: oggiIso, giorno: giornoOggi }
];

export const registroSmsApi = {
  ascolta: (_giorni: number, cb: (v: any[]) => void) => { setTimeout(() => cb(registro), 0); return () => {}; },
  prova: async (telefono: string) => eco({ mandato: true, a: `+39${telefono.replace(/\D/g, '')}` })
};

let telefonoAvvisi = '347 000 0000';
export const impostazioniPrivateApi = {
  get: async () => eco({ telefono_avvisi: telefonoAvvisi }),
  salva: async (d: { telefono_avvisi: string }) => { telefonoAvvisi = d.telefono_avvisi; }
};
