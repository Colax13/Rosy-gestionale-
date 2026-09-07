import { Router, Request, Response } from 'express';
// import { authMiddleware, soloAdmin } from '../middleware/auth';
// import { createClient } from '@/supabase-js';

const router = Router();

// In un ambiente reale, decommentare il setup di Supabase e i middleware
// const supabaseUrl = process.env.SUPABASE_URL || '';
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// GET /api/report
// Middleware previsti: authMiddleware, soloAdmin
router.get('/', async (req: Request, res: Response) => {
  try {
    /*
      Sfruttiamo due Viste SQL create in Supabase per delegare
      l'heavy lifting (raggruppamenti e somme) direttamente a PostgreSQL.
      Questo garantisce altissime performance e un backend Express pulito.
    */
    
    // 1. Dati Incassati per Mese (limite ultimi 12 mesi)
    // const { data: incassi, error: incassiError } = await supabase
    //   .from('vista_incassi_mensili')
    //   .select('*')
    //   .limit(12);
    // if (incassiError) throw incassiError;

    // 2. Tabella Totali Dipendenti
    // const { data: dipendenti, error: dipendentiError } = await supabase
    //   .from('vista_totali_dipendenti')
    //   .select('*');
    // if (dipendentiError) throw dipendentiError;

    // --- MOCK DATA FALLBACK (Per test locale senza Supabase collegato) ---
    const incassi = [
      { mese: '2026-05-01T00:00:00.000Z', totale_incassato: 4200.50 },
      { mese: '2026-04-01T00:00:00.000Z', totale_incassato: 3800.00 },
      { mese: '2026-03-01T00:00:00.000Z', totale_incassato: 4500.25 },
      { mese: '2026-02-01T00:00:00.000Z', totale_incassato: 3100.00 },
      { mese: '2026-01-01T00:00:00.000Z', totale_incassato: 4800.00 },
      { mese: '2025-12-01T00:00:00.000Z', totale_incassato: 6200.00 }, // Boom Natale
    ];

    const dipendenti = [
      { id: '1', nome: 'Elena', cognome: 'Galli', numero_appuntamenti: 145, totale_incassato: 5100.00 },
      { id: '2', nome: 'Marco', cognome: 'Rossi', numero_appuntamenti: 98, totale_incassato: 3450.50 },
      { id: '3', nome: 'Sofia', cognome: 'Bianchi', numero_appuntamenti: 112, totale_incassato: 4200.00 },
    ];

    const clienti_report = {
      acquisiti_questo_mese: [
        { id: '1-acq', nome: 'Arianna', cognome: 'Neri', telefono: '3331112233', email: 'arianna.neri@example.com', canale_acquisizione: 'Instagram', data_acquisizione: '2026-06-01T10:30:00.000Z' },
        { id: '2-acq', nome: 'Lorenzo', cognome: 'Gialli', telefono: '3204445566', email: 'lorenzo.g@example.com', canale_acquisizione: 'Google', data_acquisizione: '2026-06-02T14:15:00.000Z' },
        { id: '3-acq', nome: 'Martina', cognome: 'Blu', telefono: '3478889900', email: 'marty.blue@example.com', canale_acquisizione: 'Passaparola', data_acquisizione: '2026-06-02T16:00:00.000Z' },
        { id: '4-acq', nome: 'Clara', cognome: 'Russo', telefono: '3397778899', email: 'clara.russo@example.com', canale_acquisizione: 'Facebook', data_acquisizione: '2026-06-03T09:45:00.000Z' },
        { id: '5-acq', nome: 'Sofia', cognome: 'Moretti', telefono: '3312223344', email: 'sofia.m@example.com', canale_acquisizione: 'Instagram', data_acquisizione: '2026-06-03T11:20:00.000Z' },
        { id: '6-acq', nome: 'Gabriele', cognome: 'Ferrari', telefono: '3405556677', email: 'g.ferrari@example.com', canale_acquisizione: 'Instagram', data_acquisizione: '2026-06-03T15:30:00.000Z' },
      ],
      conteggio_per_canale: [
        { canale: 'Instagram', quantita: 3 },
        { canale: 'Google', quantita: 1 },
        { canale: 'Passaparola', quantita: 1 },
        { canale: 'Facebook', quantita: 1 },
        { canale: 'Altro / Off-line', quantita: 0 }
      ]
    };
    // -------------------------------------------------------------------

    res.json({
      incassi,
      dipendenti,
      clienti_report
    });

  } catch (error: any) {
    console.error('[Report API] Errore:', error);
    res.status(500).json({ errore: 'Impossibile generare il report. Riprovare.' });
  }
});

export default router;
