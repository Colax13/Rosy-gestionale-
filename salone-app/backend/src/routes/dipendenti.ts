import { Router, Request, Response } from 'express';
// import { authMiddleware, soloAdmin } from '../middleware/auth';
// import { createClient } from '@/supabase-js';

const router = Router();

// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const defaultTurni = {
  lunedi: { attivo: false, tipo: 'lavoro', fasce: [] },
  martedi: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '09:00', fine: '13:00' }, { id: '2', inizio: '14:00', fine: '19:00' }] },
  mercoledi: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '09:00', fine: '13:00' }, { id: '2', inizio: '14:00', fine: '19:00' }] },
  giovedi: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '09:00', fine: '13:00' }, { id: '2', inizio: '14:00', fine: '19:00' }] },
  venerdi: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '09:00', fine: '13:00' }, { id: '2', inizio: '14:00', fine: '19:00' }] },
  sabato: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '09:00', fine: '13:00' }, { id: '2', inizio: '14:00', fine: '19:00' }] },
  domenica: { attivo: false, tipo: 'lavoro', fasce: [] }
};

// --- MOCK DATA FALLBACK ---
let mockDipendenti = [
  { id: '1', nome: 'Elena', cognome: 'Galli', email: 'elena@salone.it', ruolo: 'admin', attivo: true, created_at: '2025-01-01T00:00:00Z', turni: { ...defaultTurni, lunedi: { attivo: true, tipo: 'lavoro', fasce: [{ id: '1', inizio: '10:00', fine: '18:00' }] } } },
  { id: '2', nome: 'Marco', cognome: 'Rossi', email: 'marco@salone.it', ruolo: 'dipendente', attivo: true, created_at: '2025-02-15T00:00:00Z', turni: { ...defaultTurni, mercoledi: { attivo: false, tipo: 'ferie', fasce: [] } } },
  { id: '3', nome: 'Sofia', cognome: 'Bianchi', email: 'sofia@salone.it', ruolo: 'dipendente', attivo: false, created_at: '2025-06-20T00:00:00Z', turni: defaultTurni },
];
// -------------------------

// GET /api/dipendenti
// Middleware previsti: authMiddleware, soloAdmin
router.get('/', async (req: Request, res: Response) => {
  try {
    // const { data, error } = await supabase
    //   .from('dipendenti')
    //   .select('*')
    //   .order('nome', { ascending: true });
    // if (error) throw error;
    // res.json(data);
    res.json(mockDipendenti);
  } catch (error: any) {
    console.error('[Dipendenti API] Errore fetch dipendenti:', error);
    res.status(500).json({ errore: 'Impossibile caricare i dipendenti. Riprovare.' });
  }
});

// POST /api/dipendenti
// Middleware previsti: authMiddleware, soloAdmin
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, cognome, email, ruolo, attivo, turni } = req.body;

    if (!nome || !cognome || !email) {
      return res.status(400).json({ errore: 'Nome, cognome ed email sono obbligatori' });
    }

    const payload = { 
      nome, 
      cognome, 
      email, 
      ruolo: ruolo === 'admin' ? 'admin' : 'dipendente', 
      attivo: attivo !== false,
      turni: turni || defaultTurni
    };

    // const { data, error } = await supabase
    //   .from('dipendenti')
    //   .insert([payload])
    //   .select()
    //   .single();
    // if (error) throw error;
    // res.status(201).json(data);

    const newDipendente = { 
      id: Math.random().toString(36).substring(7), 
      ...payload,
      created_at: new Date().toISOString()
    };
    mockDipendenti.push(newDipendente);
    res.status(201).json(newDipendente);
  } catch (error: any) {
    console.error('[Dipendenti API] Errore creazione dipendente:', error);
    res.status(500).json({ errore: 'Impossibile creare il dipendente. Riprovare.' });
  }
});

// PUT /api/dipendenti/:id
// Middleware previsti: authMiddleware, soloAdmin
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, cognome, email, ruolo, attivo, turni } = req.body;

    const payload: any = {};
    if (nome !== undefined) payload.nome = nome;
    if (cognome !== undefined) payload.cognome = cognome;
    if (email !== undefined) payload.email = email;
    if (ruolo !== undefined) payload.ruolo = ruolo === 'admin' ? 'admin' : 'dipendente';
    if (attivo !== undefined) payload.attivo = attivo;
    if (turni !== undefined) payload.turni = turni;

    // const { data, error } = await supabase
    //   .from('dipendenti')
    //   .update(payload)
    //   .eq('id', id)
    //   .select()
    //   .single();
    // if (error) throw error;
    // res.json(data);

    let updated = null;
    mockDipendenti = mockDipendenti.map(d => {
      if (d.id === id) {
        updated = { ...d, ...payload };
        return updated;
      }
      return d;
    });

    if (!updated) return res.status(404).json({ errore: 'Dipendente non trovato' });
    res.json(updated);
  } catch (error: any) {
    console.error('[Dipendenti API] Errore aggiornamento dipendente:', error);
    res.status(500).json({ errore: 'Impossibile aggiornare il dipendente. Riprovare.' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = mockDipendenti.findIndex(d => d.id === id);
    if (index === -1) return res.status(404).json({ errore: 'Dipendente non trovato' });
    
    mockDipendenti.splice(index, 1);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Dipendenti API] Errore eliminazione dipendente:', error);
    res.status(500).json({ errore: 'Impossibile eliminare il dipendente. Riprovare.' });
  }
});

export default router;
