import { Router, Request, Response } from 'express';

const router = Router();

// --- MOCK DATA FALLBACK ---
let mockAppuntamenti: any[] = [
  {
    id: '1',
    data_ora: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    stato: 'confermato',
    note: 'Prima volta',
    clienti: { id: '2', nome: 'Lucrezia', cognome: 'Bianchi', telefono: '3209876543' },
    dipendenti: { nome: 'Marco', cognome: 'Rossi' },
    righe_appuntamento: [
      { servizi_catalogo: { nome: 'Taglio Donna', durata_minuti: 30 } }
    ]
  },
  {
    id: '1_hist',
    data_ora: '2026-05-15T10:00:00Z',
    stato: 'completato',
    note: '',
    id_cliente: '1',
    clienti: { nome: 'Mario', cognome: 'Rossi' },
    dipendenti: { nome: 'Elena' },
    righe_appuntamento: [
      { servizi_catalogo: { nome: 'Taglio Uomo', durata_minuti: 20 } },
      { servizi_catalogo: { nome: 'Barba', durata_minuti: 15 } }
    ],
    importo: 35
  },
  {
    id: '2_hist1',
    data_ora: '2026-04-02T15:30:00Z',
    stato: 'completato',
    note: '',
    id_cliente: '2',
    clienti: { nome: 'Lucrezia', cognome: 'Bianchi' },
    dipendenti: { nome: 'Marco' },
    righe_appuntamento: [
      { servizi_catalogo: { nome: 'Colore', durata_minuti: 40 } },
      { servizi_catalogo: { nome: 'Piega', durata_minuti: 30 } }
    ],
    importo: 70,
    miscela_colore: '60g 6.33 + 30g 7.0 + 90g Ossigeno 20 Vol (Rapporto 1:1.5). Tempo di posa: 35 minuti.'
  },
  {
    id: '2_hist2',
    data_ora: '2026-03-10T11:00:00Z',
    stato: 'completato',
    id_cliente: '2',
    clienti: { nome: 'Lucrezia', cognome: 'Bianchi' },
    dipendenti: { nome: 'Marco' },
    righe_appuntamento: [
      { servizi_catalogo: { nome: 'Tonalizzante', durata_minuti: 20 } },
      { servizi_catalogo: { nome: 'Trattamento Capelli', durata_minuti: 20 } }
    ],
    importo: 45,
    miscela_colore: '30g Dialight 9.12 + 45g Rivelatore 9 Vol. Applicato su capello umido per 15 min.'
  }
];

const saveMockDb = () => {
  // Disabilitato per prevenire scritture fs (serverless limit)
};

// -------------------------

// GET /api/appuntamenti
router.get('/', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const date = req.query.date as string;
    const id_cliente = req.query.id_cliente as string;
    
    // Filtro mock in base alla data
    let filtered = mockAppuntamenti;
    if (date) {
      const targetDate = new Date(date).toISOString().split('T')[0];
      filtered = mockAppuntamenti.filter(app => app.data_ora.startsWith(targetDate));
    } else if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + 86400000 - 1; // End of the day
      filtered = mockAppuntamenti.filter(app => {
        const d = new Date(app.data_ora).getTime();
        return d >= start && d <= end;
      });
    }

    if (id_cliente) {
      filtered = filtered.filter(app => app.id_cliente === id_cliente || (app.clienti && app.clienti.id === id_cliente));
    }
    
    res.json(filtered);
  } catch (error: any) {
    console.error('[Appuntamenti API] Errore fetch appuntamenti:', error);
    res.status(500).json({ errore: 'Impossibile caricare gli appuntamenti.' });
  }
});

// POST /api/appuntamenti
router.post('/', async (req: Request, res: Response) => {
  try {
    const { data_ora, id_cliente, id_dipendente, note, clienti, dipendenti, righe_appuntamento, stato } = req.body;
    
    const newApp = {
      id: Math.random().toString(36).substring(7),
      data_ora,
      stato: stato || 'confermato',
      note: note || '',
      clienti: clienti || { nome: 'Nuovo', cognome: 'Cliente', telefono: '' },
      dipendenti: dipendenti || { nome: 'Staff', cognome: '' },
      idDipendente: dipendenti?.id || id_dipendente,
      righe_appuntamento: righe_appuntamento || []
    };
    
    mockAppuntamenti.push(newApp);
    saveMockDb();
    res.status(201).json(newApp);
  } catch (error) {
    res.status(500).json({ errore: 'Impossibile creare l\'appuntamento' });
  }
});


// DELETE /api/appuntamenti/:id
router.get('/cliente/:clienteId', async (req: Request, res: Response) => {
  try {
    const { clienteId } = req.params;
    let filtered = mockAppuntamenti.filter(app => app.id_cliente === clienteId || (app.clienti && app.clienti.id === clienteId));
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ errore: 'Impossibile caricare gli appuntamenti del cliente.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    mockAppuntamenti = mockAppuntamenti.filter(app => app.id !== id);
    saveMockDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ errore: 'Impossibile eliminare l\'appuntamento' });
  }
});

// PUT /api/appuntamenti/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    let found = false;
    mockAppuntamenti = mockAppuntamenti.map(app => {
      if (app.id === id) {
        found = true;
        return {
          ...app,
          ...updateData,
          clienti: updateData.clienti || app.clienti,
          dipendenti: updateData.dipendenti || app.dipendenti,
          righe_appuntamento: updateData.righe_appuntamento || app.righe_appuntamento
        };
      }
      return app;
    });

    if (!found) {
       return res.status(404).json({ errore: 'Appuntamento non trovato' });
    }

    saveMockDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ errore: 'Impossibile aggiornare l\'appuntamento' });
  }
});

export default router;
