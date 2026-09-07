import { Router, Request, Response } from 'express';
// import { authMiddleware, soloAdmin } from '../middleware/auth';
// import { createClient } from '@/supabase-js';

const router = Router();

// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- MOCK DATA FALLBACK ---
let mockCatalogo = [
  { id: '1', nome: 'Piega', prezzo_base: 20.00, durata_minuti: 30, categoria: 'Piega', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '2', nome: 'Taglio', prezzo_base: 20.00, durata_minuti: 15, categoria: 'Taglio', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '3', nome: 'Tonalizzante', prezzo_base: 20.00, durata_minuti: 15, categoria: 'Colore', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '4', nome: 'Colore', prezzo_base: 25.00, durata_minuti: 45, categoria: 'Colore', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '5', nome: 'Colpi di Sole', prezzo_base: 130.00, durata_minuti: 120, categoria: 'Effetti Luce', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '6', nome: 'Schiariture permanenti', prezzo_base: 130.00, durata_minuti: 90, categoria: 'Effetti Luce', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '7', nome: 'Permanente', prezzo_base: 70.00, durata_minuti: 75, categoria: 'Trattamento Forma', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '8', nome: 'Stiratura alla cheratina', prezzo_base: 100.00, durata_minuti: 70, categoria: 'Trattamento Forma', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '9', nome: 'Ri-applicazione extension', prezzo_base: 15.00, durata_minuti: 60, categoria: 'Extension capelli', attivo: true, note_private: 'Il costo è orario, non include il prezzo delle extension dal fornitore X.', note_pubbliche: 'Il prezzo è variabile in base al fornitore (extension fisiche non incluse nel prezzo base); si consiglia di contattare l\'operatore per un preventivo approssimativo o recarsi in salone.' },
  { id: '10', nome: 'Trattamento capelli', prezzo_base: 25.00, durata_minuti: 20, categoria: 'Trattamenti Specifici per Capelli', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '11', nome: 'Taglio uomo', prezzo_base: 15.00, durata_minuti: 25, categoria: 'Barba e Capelli Uomo', attivo: true, note_private: '', note_pubbliche: '' },
  { id: '12', nome: 'Acconciature', prezzo_base: 25.00, durata_minuti: 60, categoria: 'Acconciatura', attivo: true, note_private: '', note_pubbliche: 'Prezzo base indicativo, dipendente dalla complessità.' }
];
// -------------------------

let mockCategorie = [
  'Piega',
  'Taglio',
  'Colore',
  'Effetti Luce',
  'Trattamento Forma',
  'Extension capelli',
  'Trattamenti Specifici per Capelli',
  'Barba e Capelli Uomo',
  'Acconciatura',
  'Trattamenti Specifici'
];

router.get('/categorie', async (req: Request, res: Response) => {
  try {
    res.json(mockCategorie);
  } catch (error: any) {
    res.status(500).json({ errore: 'Impossibile caricare le categorie.' });
  }
});

router.post('/categorie', async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    if (nome && !mockCategorie.includes(nome)) {
      mockCategorie.push(nome);
    }
    res.status(201).json({ nome });
  } catch (error: any) {
    res.status(500).json({ errore: 'Errore' });
  }
});

router.put('/categorie', async (req: Request, res: Response) => {
  try {
    const { vecchioNome, nuovoNome } = req.body;
    if (vecchioNome && nuovoNome && vecchioNome !== nuovoNome) {
      mockCategorie = mockCategorie.map(c => c === vecchioNome ? nuovoNome : c);
      mockCatalogo = mockCatalogo.map(s => s.categoria === vecchioNome ? { ...s, categoria: nuovoNome } : s);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ errore: 'Errore' });
  }
});

router.delete('/categorie/:nome', async (req: Request, res: Response) => {
  try {
    const { nome } = req.params;
    mockCategorie = mockCategorie.filter(c => c !== nome);
    mockCatalogo = mockCatalogo.filter(s => s.categoria !== nome); // O potremmo spostarli in 'Generico'
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ errore: 'Errore' });
  }
});

// GET /api/catalogo
// Middleware previsti: authMiddleware, soloAdmin
router.get('/', async (req: Request, res: Response) => {
  try {
    // const { data, error } = await supabase
    //   .from('servizi_catalogo')
    //   .select('*')
    //   .order('categoria', { ascending: true })
    //   .order('nome', { ascending: true });
    // if (error) throw error;
    // res.json(data);
    res.json(mockCatalogo);
  } catch (error: any) {
    console.error('[Catalogo API] Errore fetch catalogo:', error);
    res.status(500).json({ errore: 'Impossibile caricare il catalogo. Riprovare.' });
  }
});

// POST /api/catalogo
// Middleware previsti: authMiddleware, soloAdmin
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, prezzo_base, durata_minuti, categoria, attivo } = req.body;

    if (!nome || prezzo_base == null || durata_minuti == null) {
      return res.status(400).json({ errore: 'Nome, prezzo base e durata sono obbligatori' });
    }

    const payload = { 
      nome, 
      prezzo_base: Number(prezzo_base), 
      durata_minuti: Number(durata_minuti), 
      categoria: categoria || 'Generico', 
      attivo: attivo !== false,
      note_private: req.body.note_private || '',
      note_pubbliche: req.body.note_pubbliche || ''
    };

    // const { data, error } = await supabase
    //   .from('servizi_catalogo')
    //   .insert([payload])
    //   .select()
    //   .single();
    // if (error) throw error;
    // res.status(201).json(data);

    const newService = { id: Math.random().toString(36).substring(7), ...payload };
    mockCatalogo.push(newService);
    res.status(201).json(newService);
  } catch (error: any) {
    console.error('[Catalogo API] Errore creazione servizio:', error);
    res.status(500).json({ errore: 'Impossibile creare il servizio. Riprovare.' });
  }
});

// PUT /api/catalogo/:id
// Middleware previsti: authMiddleware, soloAdmin
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, prezzo_base, durata_minuti, categoria, attivo } = req.body;

    if (!nome || prezzo_base == null || durata_minuti == null) {
      return res.status(400).json({ errore: 'Nome, prezzo base e durata sono obbligatori' });
    }

    const payload = { 
      nome, 
      prezzo_base: Number(prezzo_base), 
      durata_minuti: Number(durata_minuti), 
      categoria: categoria || 'Generico', 
      attivo,
      note_private: req.body.note_private || '',
      note_pubbliche: req.body.note_pubbliche || ''
    };

    // const { data, error } = await supabase
    //   .from('servizi_catalogo')
    //   .update(payload)
    //   .eq('id', id)
    //   .select()
    //   .single();
    // if (error) throw error;
    // res.json(data);

    let updatedService = null;
    mockCatalogo = mockCatalogo.map(s => {
      if (s.id === id) {
        updatedService = { ...s, ...payload };
        return updatedService;
      }
      return s;
    });

    if (!updatedService) return res.status(404).json({ errore: 'Servizio non trovato' });
    res.json(updatedService);
  } catch (error: any) {
    console.error('[Catalogo API] Errore aggiornamento servizio:', error);
    res.status(500).json({ errore: 'Impossibile aggiornare il servizio. Riprovare.' });
  }
});

// DELETE /api/catalogo/:id
// Middleware previsti: authMiddleware, soloAdmin
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // const { error } = await supabase.from('servizi_catalogo').delete().eq('id', id);
    // if (error) throw error;
    // res.json({ success: true });

    mockCatalogo = mockCatalogo.filter(s => s.id !== id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Catalogo API] Errore eliminazione servizio:', error);
    res.status(500).json({ errore: 'Impossibile eliminare il servizio. Riprovare.' });
  }
});

export default router;
