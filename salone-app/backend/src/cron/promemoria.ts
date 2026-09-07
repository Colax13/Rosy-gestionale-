import cron from 'node-cron';
// import { createClient } from '@supabase/supabase-js';
// import twilio from 'twilio';
// import { Resend } from 'resend';

// Configurazione Servizi (da inserire nelle variabili d'ambiente)
// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
// const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
// const RESEND_API_KEY = process.env.RESEND_API_KEY;

// const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
// const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
// const resend = new Resend(RESEND_API_KEY);

/**
 * Avvia il Cron Job per i promemoria.
 * Esegue ogni giorno alle 09:00 del mattino (orario del server).
 */
export function initCronPromemoria() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Esecuzione job: Invio promemoria appuntamenti');
    await inviaPromemoria();
  });
  console.log('[CRON] Job promemoria schedulato (ogni giorno alle 09:00)');
}

async function inviaPromemoria() {
  try {
    // 1. Calcoliamo la data di domani
    const oggi = new Date();
    const domani = new Date(oggi);
    domani.setDate(domani.getDate() + 1);
    
    // Formattazione per la query (YYYY-MM-DD)
    const dataInizio = domani.toISOString().split('T')[0] + 'T00:00:00.000Z';
    const dataFine = domani.toISOString().split('T')[0] + 'T23:59:59.999Z';

    // 2. Recuperiamo gli appuntamenti di domani con i dati del cliente
    // const { data: appuntamenti, error } = await supabase
    //   .from('appuntamenti')
    //   .select(`
    //     id,
    //     data_ora,
    //     clienti!inner (
    //       nome,
    //       cognome,
    //       telefono,
    //       email
    //     )
    //   `)
    //   .gte('data_ora', dataInizio)
    //   .lte('data_ora', dataFine)
    //   .eq('stato', 'confermato'); // Manda solo per quelli confermati

    // se (error) throw error;

    // --- MOCK PER TESTING ---
    const appuntamenti = [
      {
        id: '123',
        data_ora: domani.toISOString().split('T')[0] + 'T15:00:00.000Z',
        clienti: {
          nome: 'Giulia',
          cognome: 'Verdi',
          telefono: '+393331234567',
          email: 'giulia.verdi@example.com'
        }
      }
    ];
    // ------------------------

    if (!appuntamenti || appuntamenti.length === 0) {
      console.log('[CRON] Nessun appuntamento per domani.');
      return;
    }

    console.log(`[CRON] Trovati ${appuntamenti.length} appuntamenti per domani. Inizio invio notifiche...`);

    // 3. Invio notifiche per ogni appuntamento
    for (const app of appuntamenti) {
      const { data_ora, clienti: cliente } = app;
      
      const orario = new Date(data_ora).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const messaggio = `Ciao ${cliente.nome}, ti ricordiamo il tuo appuntamento presso Salone App per domani alle ore ${orario}. A presto!`;

      // Invio SMS con Twilio
      if (cliente.telefono) {
        try {
          // await twilioClient.messages.create({
          //   body: messaggio,
          //   from: TWILIO_PHONE_NUMBER,
          //   to: cliente.telefono
          // });
          console.log(`[CRON] SMS inviato a ${cliente.telefono}: ${messaggio}`);
        } catch (smsError) {
          console.error(`[CRON] Errore invio SMS a ${cliente.telefono}:`, smsError);
        }
      }

      // Invio Email con Resend
      if (cliente.email) {
        try {
          // await resend.emails.send({
          //   from: 'Salone App <no-reply@saloneapp.it>',
          //   to: cliente.email,
          //   subject: 'Promemoria Appuntamento - Salone App',
          //   html: `<p>Ciao <strong>${cliente.nome}</strong>,</p><p>Ti ricordiamo il tuo appuntamento per <strong>domani alle ore ${orario}</strong>.</p><p>A presto!</p>`
          // });
          console.log(`[CRON] Email inviata a ${cliente.email}`);
        } catch (emailError) {
          console.error(`[CRON] Errore invio Email a ${cliente.email}:`, emailError);
        }
      }
    }

  } catch (error) {
    console.error('[CRON] Errore generale durante l\'invio promemoria:', error);
  }
}
