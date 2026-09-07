import { Router, Request, Response } from 'express';
// import { authMiddleware } from '../middleware/auth';
// import { createClient } from '@/supabase-js';

const router = Router();

// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- MOCK DATA FALLBACK ---
const mockClienti = [
  { id: '1', nome: 'Mario', cognome: 'Rossi', telefono: '3331234567', email: 'mario.rossi@example.com', note: 'Allergia a certi prodotti', canale_acquisizione: 'Instagram', created_at: '2026-06-01T10:00:00.000Z' },
  { id: '2', nome: 'Lucrezia', cognome: 'Bianchi', telefono: '3209876543', email: 'lucreziab@example.com', note: 'Preferisce mattina', canale_acquisizione: 'Google', created_at: '2026-06-02T11:00:00.000Z' },
];
// -------------------------

// GET /api/clienti
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(mockClienti);
  } catch (error: any) {
    res.status(500).json({ errore: 'Impossibile recuperare i clienti.' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = mockClienti.find(c => c.id === id);
    if (!client) {
      return res.status(404).json({ errore: 'Cliente non trovato' });
    }
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ errore: 'Impossibile recuperare il cliente.' });
  }
});

// POST /api/clienti
// Middleware previsti: authMiddleware
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, cognome, telefono, email, note, canale_acquisizione } = req.body;

    if (!nome || !cognome) {
      return res.status(400).json({ errore: 'Nome e cognome sono obbligatori' });
    }

    // const { data, error } = await supabase
    //   .from('clienti')
    //   .insert([{ nome, cognome, telefono, email, note, canale_acquisizione }])
    //   .select()
    //   .single();

    // if (error) throw error;
    
    // --- MOCK DATA FALLBACK ---
    const mockCreatedClient = {
      id: Math.random().toString(36).substring(7),
      nome,
      cognome,
      telefono: telefono || null,
      email: email || null,
      note: note || null,
      canale_acquisizione: canale_acquisizione || 'Altro',
      created_at: new Date().toISOString()
    };
    mockClienti.push(mockCreatedClient);
    // -------------------------
    
    res.status(201).json(mockCreatedClient);

  } catch (error: any) {
    console.error('[Clienti API] Errore creazione cliente:', error);
    res.status(500).json({ errore: 'Impossibile creare il cliente. Riprovare.' });
  }
});

// PUT /api/clienti/:id
// Middleware previsti: authMiddleware
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, cognome, telefono, email, note, canale_acquisizione } = req.body;

    if (!nome || !cognome) {
      return res.status(400).json({ errore: 'Nome e cognome sono obbligatori' });
    }

    // const { data, error } = await supabase
    //   .from('clienti')
    //   .update({ nome, cognome, telefono, email, note, canale_acquisizione })
    //   .eq('id', id)
    //   .select()
    //   .single();

    // if (error) throw error;

    // --- MOCK DATA FALLBACK ---
    let updated = null;
    const mockUpdatedClient = {
      id,
      nome,
      cognome,
      telefono: telefono || null,
      email: email || null,
      note: note || null,
      canale_acquisizione: canale_acquisizione || null,
      updated_at: new Date().toISOString()
    };
    
    for (let i = 0; i < mockClienti.length; i++) {
       if (mockClienti[i].id === id) {
           mockClienti[i] = { ...mockClienti[i], ...mockUpdatedClient };
           updated = mockClienti[i];
           break;
       }
    }
    // -------------------------

    res.json(updated || mockUpdatedClient);

  } catch (error: any) {
    console.error('[Clienti API] Errore aggiornamento cliente:', error);
    res.status(500).json({ errore: 'Impossibile aggiornare il cliente. Riprovare.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const index = mockClienti.findIndex(c => c.id === id);
    if (index !== -1) {
      mockClienti.splice(index, 1);
    }

    res.json({ success: true, message: 'Cliente eliminato con successo' });

  } catch (error: any) {
    console.error('[Clienti API] Errore eliminazione cliente:', error);
    res.status(500).json({ errore: 'Impossibile eliminare il cliente. Riprovare.' });
  }
});

export default router;
