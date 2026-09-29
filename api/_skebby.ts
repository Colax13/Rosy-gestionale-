// Il collegamento con Skebby, che è il postino degli SMS.
//
// Skebby non sa niente di appuntamenti: riceve "manda questo testo a questo
// numero" e lo manda. Quando mandarlo, a chi, e che cosa c'è scritto lo decide
// il nostro codice — le parole stanno in `salone-app/frontend/lib/messaggi.ts`.
//
// Come funziona il loro servizio: prima ci si presenta con utente e password e
// si riceve una coppia di chiavi buone per un po' (`login`), poi si manda
// (`sms`) mettendo quelle chiavi nelle intestazioni. Le chiavi si tengono da
// parte finché la funzione resta calda, così non si rifà il giro ogni volta;
// se scadono, ci si ripresenta una volta e si riprova.

const BASE = process.env.SKEBBY_URL || 'https://api.skebby.it/API/v1.0/REST';

export interface Chiavi { userKey: string; sessionKey: string }

/**
 * Legge la risposta del login.
 *
 * Il loro servizio risponde `user_key;session_key` in testo semplice, ma su
 * alcuni account risponde in JSON. Si reggono tutte e due invece di fidarsi:
 * se cambia la forma, non si smette di mandare messaggi.
 */
export function leggiRispostaLogin(corpo: string): Chiavi | null {
  const testo = (corpo || '').trim();
  if (!testo) return null;

  if (testo.startsWith('{')) {
    try {
      const dati = JSON.parse(testo);
      const userKey = dati.user_key || dati.userKey;
      const sessionKey = dati.session_key || dati.sessionKey || dati.access_token;
      return userKey && sessionKey ? { userKey, sessionKey } : null;
    } catch {
      return null;
    }
  }

  const pezzi = testo.split(';').map(p => p.trim()).filter(Boolean);
  return pezzi.length >= 2 ? { userKey: pezzi[0], sessionKey: pezzi[1] } : null;
}

/** Il mittente alfanumerico: al massimo 11 caratteri, e solo lettere e numeri. */
export function mittenteValido(nome: string | undefined): string {
  return (nome || '').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 11);
}

let chiaviInCorso: Chiavi | null = null;

async function entra(): Promise<Chiavi> {
  const utente = process.env.SKEBBY_USER;
  const password = process.env.SKEBBY_PASSWORD;
  if (!utente || !password) throw new Error('skebby-non-configurato');

  const risposta = await fetch(`${BASE}/login`, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${Buffer.from(`${utente}:${password}`).toString('base64')}` }
  });

  const corpo = await risposta.text();
  if (!risposta.ok) throw new Error(`Skebby non accetta utente e password (${risposta.status}). ${corpo}`.trim());

  const chiavi = leggiRispostaLogin(corpo);
  if (!chiavi) throw new Error('Skebby ha risposto al login in un modo che non riconosco.');

  chiaviInCorso = chiavi;
  return chiavi;
}

export interface EsitoSkebby { mandato: boolean; motivo?: string; creditiRimasti?: number }

async function provaAMandare(chiavi: Chiavi, numero: string, testo: string) {
  const mittente = mittenteValido(process.env.SKEBBY_MITTENTE);
  return fetch(`${BASE}/sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'user_key': chiavi.userKey,
      'Session_key': chiavi.sessionKey
    },
    body: JSON.stringify({
      // GP = "Classic Plus", quello con la conferma di consegna e il mittente
      // scritto a lettere. Si cambia da Vercel se il salone compra un altro
      // tipo di pacchetto.
      message_type: process.env.SKEBBY_TIPO || 'GP',
      message: testo,
      recipient: [numero],
      ...(mittente ? { sender: mittente } : {}),
      returnCredits: true
    })
  });
}

/** Manda un SMS. `numero` va scritto internazionale, con il più davanti. */
export async function mandaConSkebby(numero: string, testo: string): Promise<EsitoSkebby> {
  let chiavi = chiaviInCorso || await entra();

  let risposta = await provaAMandare(chiavi, numero, testo);

  // Le chiavi scadono. Se è quello, ci si ripresenta una volta sola: se
  // riprovassimo all'infinito, un utente sbagliato diventerebbe un ciclo.
  if (risposta.status === 401 || risposta.status === 403) {
    chiaviInCorso = null;
    chiavi = await entra();
    risposta = await provaAMandare(chiavi, numero, testo);
  }

  const corpo = await risposta.text();
  if (!risposta.ok) {
    return { mandato: false, motivo: `Skebby ha rifiutato l'invio (${risposta.status}). ${corpo}`.trim() };
  }

  try {
    const dati = JSON.parse(corpo);
    if (dati.result && dati.result !== 'OK') {
      return { mandato: false, motivo: `Skebby dice: ${dati.result}` };
    }
    return { mandato: true, creditiRimasti: dati.remaining_credits };
  } catch {
    // Risposta senza JSON ma con esito buono: si prende per buona.
    return { mandato: true };
  }
}
