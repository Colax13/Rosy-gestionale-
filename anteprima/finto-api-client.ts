// Sostituto dell'accesso a Firestore, usato solo dall'anteprima (npm run anteprima).
//
// Serve per aprire le schermate vere, con dati veri, senza doversi collegare
// al database: si guarda il tema chiaro e quello scuro, si prova il
// trascinamento in agenda, si controlla che i nomi ci stiano.
// Non finisce nel programma pubblicato: lo carica solo vite.anteprima.config.ts.

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
  { id: 'd3', nome: 'Martina', cognome: 'Colasanti',  ruolo: 'Estetista', colore: '#00D8FF', servizi: ['s5'], turni: { ...turnoPieno, mercoledi: { attivo: false, tipo: 'riposo' } } },
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
  { id: 'b1', codice: 'RSY-A3K9-QW2F', intestatario: 'Anna Bianchi', valore: 50, valore_residuo: 50, stato: 'attivo',  data_emissione: alle(9), note: 'Regalo compleanno' },
  { id: 'b2', codice: 'RSY-7HGT-LM4P', intestatario: 'Chiara Esposito', valore: 100, valore_residuo: 35, stato: 'attivo', data_emissione: alle(9) },
  { id: 'b3', codice: 'RSY-QQ11-ZZ88', intestatario: 'Federica Lombardi', valore: 30, valore_residuo: 0, stato: 'usato', data_emissione: alle(9) },
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
        { id: 'd3', nome: 'Martina', cognome: 'Colasanti',  numero_appuntamenti: 22, totale_incassato: 520 },
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
  create: nulla,
  update: async (id: string, dati: any) => {
    const i = clienti.findIndex(c => c.id === id);
    if (i >= 0) clienti[i] = { ...clienti[i], ...dati };
    return eco(clienti[i]);
  },
  delete: nulla, importAi: nulla,
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
  getAll: async () => eco(dipendenti),
  create: nulla,
  update: async (id: string, dati: any) => {
    const i = dipendenti.findIndex(d => d.id === id);
    if (i >= 0) dipendenti[i] = { ...dipendenti[i], ...dati };
    return eco(dipendenti[i]);
  },
  delete: nulla,
};

export const appuntamentiApi = {
  getAgendaPublic: async () => eco(appuntamenti),
  createPublic: nulla,
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

export const buoniApi = {
  getAll: async () => eco(buoni),
  create: nulla, update: nulla, delete: nulla,
};
