// Le spie del sistema, in parole semplici.
//
// Il server ha una pagina (/api/salute) che dice se le chiavi sono a posto, ma
// è scritta per chi programma. Qui la si traduce in righe con una spia:
// verde (funziona), gialla (spento apposta o non configurato), rossa (c'è un
// problema), così in Impostazioni si vede subito che cosa non va e perché.

export type Spia = 'ok' | 'spento' | 'guasto';

export interface RigaStato {
  nome: string;
  spia: Spia;
  /** Una frase che dice com'è messa la cosa. */
  stato: string;
  /** Che cosa fare, quando c'è qualcosa da fare. */
  rimedio?: string;
}

const testo = (v: unknown) => (typeof v === 'string' ? v : '');

/** "a posto (...)" → verde; "spenta/spento" → gialla; il resto → rossa. */
function spiaDi(valore: string): Spia {
  if (/^(a posto|acceso)/i.test(valore)) return 'ok';
  if (/^spent[oa]/i.test(valore)) return 'spento';
  return 'guasto';
}

/** Le righe da mostrare, a partire dalla risposta di /api/salute (o da niente). */
export function righeStato(salute: any | null): RigaStato[] {
  if (!salute || typeof salute !== 'object') {
    return [{
      nome: 'Server',
      spia: 'guasto',
      stato: 'Il server non risponde.',
      rimedio: 'Agenda, clienti e servizi funzionano lo stesso. Non partono SMS, Rosy IA e prenotazioni dal sito: controlla lo stato del progetto su Vercel.'
    }];
  }

  const righe: RigaStato[] = [];

  const chiave = testo(salute.chiave);
  righe.push(chiave === 'a posto'
    ? { nome: 'Server', spia: 'ok', stato: 'Collegato al database.' }
    : {
        nome: 'Server', spia: 'guasto',
        stato: testo(salute.spiegazione) || `La chiave del database ${chiave || 'non è leggibile'}.`,
        rimedio: 'Va sistemata la variabile FIREBASE_SERVICE_ACCOUNT su Vercel (vedi docs/SERVER-SU-VERCEL.md). Senza, non partono SMS, Rosy IA e prenotazioni dal sito.'
      });

  // Rosy IA: basta che funzioni Gemini oppure una delle riserve.
  const rosy = testo(salute.rosy_ia);
  const riserve = salute.rosy_ia_riserve && typeof salute.rosy_ia_riserve === 'object' ? salute.rosy_ia_riserve : {};
  const riserveBuone = Object.keys(riserve).filter(k => spiaDi(testo(riserve[k])) === 'ok');
  if (spiaDi(rosy) === 'ok') {
    righe.push({
      nome: 'Rosy IA', spia: 'ok',
      stato: `Accesa${riserveBuone.length ? `, con ${riserveBuone.length === 1 ? 'una riserva' : `${riserveBuone.length} riserve`} (${riserveBuone.join(', ')})` : ', senza riserve'}.`
    });
  } else if (riserveBuone.length) {
    righe.push({
      nome: 'Rosy IA', spia: 'ok',
      stato: `Funziona con le riserve (${riserveBuone.join(', ')}). Gemini: ${rosy || 'non configurato'}.`
    });
  } else if (spiaDi(rosy) === 'spento') {
    righe.push({
      nome: 'Rosy IA', spia: 'spento',
      stato: 'Non è accesa: manca la chiave.',
      rimedio: 'Va messa GEMINI_API_KEY su Vercel (gratuita, da Google AI Studio), poi Redeploy. Finché manca, la chat risponde con un errore.'
    });
  } else {
    righe.push({
      nome: 'Rosy IA', spia: 'guasto',
      stato: `Gemini non accetta la richiesta: ${rosy.replace(/^non funziona\s*—\s*/i, '').replace(/[.\s]+$/, '') || 'motivo sconosciuto'}.`,
      rimedio: 'Di solito è la chiave scaduta o sbagliata, o il modello che non esiste più: va rifatta GEMINI_API_KEY su Vercel (o tolta GEMINI_MODEL), poi Redeploy.'
    });
  }

  const sms = testo(salute.sms);
  righe.push(spiaDi(sms) === 'ok'
    ? { nome: 'SMS alle clienti', spia: 'ok', stato: `Attivi: ${sms.replace(/^a posto\s*/i, '').replace(/[()]/g, '') || 'configurati'}.` }
    : { nome: 'SMS alle clienti', spia: 'spento', stato: 'Spenti: non parte nessun messaggio.', rimedio: 'Serve il gettone del tablet (TRACCAR_SMS_TOKEN) su Vercel.' });

  const promemoria = testo(salute.promemoria);
  righe.push(spiaDi(promemoria) === 'ok'
    ? { nome: 'Promemoria automatici', spia: 'ok', stato: 'Accesi.' }
    : { nome: 'Promemoria automatici', spia: 'spento', stato: 'Spenti.', rimedio: 'Manca CRON_SECRET su Vercel.' });

  // Email e buoni dal foglio sono facoltativi: si mostrano solo se accesi o rotti.
  const email = testo(salute.email);
  if (email && spiaDi(email) !== 'spento') {
    righe.push({ nome: 'Email alle clienti', spia: spiaDi(email), stato: spiaDi(email) === 'ok' ? 'Attive.' : `Da sistemare: ${email}.` });
  }
  const foglio = testo(salute.buoni_dal_foglio);
  if (foglio && spiaDi(foglio) === 'ok') {
    righe.push({ nome: 'Buoni dal foglio Google', spia: 'ok', stato: 'Collegati.' });
  }

  return righe;
}

/** La riga della riserva: non dipende dal server ma da come è pubblicato il sito. */
export function rigaRiserva(urlRiserva: string | null, urlPrincipale: string | null): RigaStato {
  if (urlPrincipale) {
    return { nome: 'Gestionale di riserva', spia: 'ok', stato: `Stai usando la riserva. Il principale è ${urlPrincipale.replace(/^https:\/\//, '')}.` };
  }
  if (urlRiserva) {
    return { nome: 'Gestionale di riserva', spia: 'ok', stato: `Pronto su ${urlRiserva.replace(/^https:\/\//, '')}: se questo si blocca, si lavora da lì con gli stessi dati.` };
  }
  return {
    nome: 'Gestionale di riserva', spia: 'spento',
    stato: 'Non ancora configurato.',
    rimedio: 'Si prepara una volta sola, in dieci minuti: i passi sono in docs/RISERVA.md.'
  };
}
