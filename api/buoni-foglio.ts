// POST /api/buoni-foglio — porta nel gestionale i buoni pagati online.
//
// Il foglio Google lo riempie Make ogni volta che una cliente paga un buono
// con Stripe: una scheda per i buoni spa, una per i buoni del salone. Qui il server lo legge e aggiunge i buoni che non ha mai visto,
// con prezzo, piega, chi regala e per chi è. Lo chiama la pagina Buoni ogni
// volta che si apre, e il pulsante "Aggiorna".
//
// Il foglio è di RD Salon: si legge solo per il suo salone (funzione
// `buoni_dal_foglio`). Le scritture le fa il server, con id fissi: due
// pagine aperte insieme non creano lo stesso buono due volte.

import { FieldValue } from 'firebase-admin/firestore';
import { database, chiEntra, saloneDi, credenziali } from './_firebase';
import { leggiFoglio, idDelFoglio, schedeDelFoglio, scegliSchede } from './_fogli';
import { buoniDaFoglio } from '../salone-app/frontend/lib/importa-buoni';
import { funzioneAccesa } from '../salone-app/frontend/lib/funzioni';
import { normalizza } from '../salone-app/frontend/lib/importa';
import { orologioDelSalone } from '../salone-app/frontend/lib/messaggi';

interface Richiesta { method?: string; body?: any; headers?: Record<string, string | string[] | undefined> }
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

/** Dove il server si ricorda i codici già letti. Dal browser non si legge. */
const COLLEZIONE_VISTI = 'buoni_foglio_visti';

export default async function handler(req: Richiesta, res: Risposta) {
  res.setHeader('Cache-Control', 'no-store');
  if ((req.method || '').toUpperCase() !== 'POST') {
    res.status(405).json({ errore: 'Questo indirizzo risponde solo in POST.' });
    return;
  }

  try {
    const auth = req.headers?.authorization;
    const chi = await chiEntra(Array.isArray(auth) ? auth[0] : auth);
    const salone = await saloneDi(chi.uid);
    const db = database();

    // Le operatrici passano solo se hanno il permesso sulla pagina Buoni.
    if (chi.uid !== salone) {
      const membro = (await db.collection('membri').doc(chi.uid).get()).data() as any;
      if (!Array.isArray(membro?.permessi) || !membro.permessi.includes('buoni')) {
        res.status(403).json({ errore: 'Non hai il permesso sulla pagina Buoni.' });
        return;
      }
    }

    const scheda = (await db.collection('salons').doc(salone).get()).data() as any;
    if (!funzioneAccesa('buoni_dal_foglio', scheda?.ownerEmail)) {
      res.status(200).json({ acceso: false });
      return;
    }

    const idFoglio = idDelFoglio(process.env.BUONI_FOGLIO_ID);
    const chiave = credenziali();
    if (!idFoglio || !chiave) {
      res.status(200).json({
        acceso: false,
        motivo: !chiave ? 'Manca FIREBASE_SERVICE_ACCOUNT su Vercel.' : 'Manca BUONI_FOGLIO_ID su Vercel.'
      });
      return;
    }

    const titoli = await schedeDelFoglio(chiave, idFoglio);
    const schede = scegliSchede(titoli, process.env.BUONI_FOGLIO_SCHEDA, process.env.BUONI_FOGLIO_SCHEDA_SALONE);

    const rifVisti = db.collection(COLLEZIONE_VISTI).doc(salone);
    const [esistenti, visti] = await Promise.all([
      db.collection('buoni').where('userId', '==', salone).select('codice', 'intestatario', 'telefono', 'valore').get(),
      rifVisti.get()
    ]);
    const giaVisti: string[] = (visti.data() as any)?.codici || [];
    const datiEsistenti = esistenti.docs.map(d => d.data());

    const { anno, mese, giorno } = orologioDelSalone(new Date());
    // Il mese dell'orologio parte da 0, come in JavaScript.
    const oggi = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;

    let aggiunti = 0;
    let letti = 0;
    const codiciLetti: string[] = [];
    const problemi: string[] = [];

    // Prima la spa, poi il salone: ogni scheda porta il suo tipo di buono.
    for (const tipo of ['spa', 'salone'] as const) {
      const scheda = schede[tipo];
      if (!scheda) continue;
      const tabella = await leggiFoglio(chiave, idFoglio, scheda);
      const lettura = buoniDaFoglio(tabella, datiEsistenti, [...giaVisti, ...codiciLetti], tipo);
      if (lettura.motivo) { problemi.push(`scheda "${scheda}": ${lettura.motivo}`); continue; }
      letti += lettura.codici.length;
      codiciLetti.push(...lettura.codici);

      for (const b of lettura.nuovi) {
        const id = `foglio_${salone}_${normalizza(b.codice)}`.slice(0, 128);
        try {
          await db.collection('buoni').doc(id).create({
            ...b,
            data_emissione: b.data_emissione || oggi,
            userId: salone,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          });
          aggiunti++;
        } catch (err: any) {
          // 6 = c'è già: l'ha scritto un'altra pagina aperta nello stesso momento.
          if (err?.code !== 6) throw err;
        }
      }
    }

    // Si ricordano tutti i codici del foglio, anche quelli già presenti: se
    // domani qualcuno ne cancella uno dal gestionale, non deve tornare.
    const tutti = Array.from(new Set([...giaVisti, ...codiciLetti]));
    if (tutti.length !== giaVisti.length) {
      await rifVisti.set({ codici: tutti, aggiornato: FieldValue.serverTimestamp() });
    }

    if (aggiunti) console.log(`Buoni dal foglio per ${salone}: ${aggiunti} nuovi`);
    res.status(200).json({
      acceso: true, aggiunti, letti,
      schede,
      ...(problemi.length ? { errore: problemi.join(' · ') } : {})
    });
  } catch (err: any) {
    const messaggio = err?.message || '';
    if (messaggio === 'chiave-mancante') { res.status(503).json({ errore: 'Il server non è configurato: manca FIREBASE_SERVICE_ACCOUNT.' }); return; }
    if (!err?.daSpiegare && (messaggio === 'senza-tesserino' || /id token|auth\/|argument-error/i.test(messaggio))) { res.status(401).json({ errore: 'Esci e rientra nel programma.' }); return; }
    if (messaggio === 'accesso-sospeso') { res.status(403).json({ errore: 'Il tuo accesso è sospeso.' }); return; }
    console.error('Errore nella lettura del foglio dei buoni:', err);
    res.status(200).json({ acceso: true, aggiunti: 0, errore: err?.daSpiegare ? messaggio : `Non sono riuscito a leggere il foglio: ${messaggio}` });
  }
}
