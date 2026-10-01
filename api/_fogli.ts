// Leggere un foglio Google dal server.
//
// Si entra con la stessa chiave di servizio di Firebase: il foglio va
// condiviso (in sola lettura) con l'indirizzo di quella chiave, quello che
// finisce in "@….iam.gserviceaccount.com". Nessuna libreria in più: si firma
// una richiesta di accesso, Google dà un permesso valido un'ora, e con quello
// si chiedono le celle.

import { createSign } from 'crypto';

const SCOPO = 'https://www.googleapis.com/auth/spreadsheets.readonly';

const base64url = (dati: string | Buffer) =>
  Buffer.from(dati).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

let permesso: { token: string; scade: number } | null = null;

async function tokenGoogle(chiave: { client_email: string; private_key: string }): Promise<string> {
  const adesso = Math.floor(Date.now() / 1000);
  if (permesso && permesso.scade - 60 > adesso) return permesso.token;

  const testa = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(JSON.stringify({
    iss: chiave.client_email,
    scope: SCOPO,
    aud: 'https://oauth2.googleapis.com/token',
    iat: adesso,
    exp: adesso + 3600
  }));
  const firma = base64url(createSign('RSA-SHA256').update(`${testa}.${corpo}`).sign(chiave.private_key));

  const risposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${testa}.${corpo}.${firma}`
    })
  });
  const dati: any = await risposta.json().catch(() => ({}));
  if (!risposta.ok || !dati.access_token) {
    throw new Error(`Google non ha dato il permesso di leggere i fogli: ${dati.error_description || dati.error || risposta.status}`);
  }
  permesso = { token: dati.access_token, scade: adesso + (Number(dati.expires_in) || 3600) };
  return permesso.token;
}

/** Su Vercel si può incollare il link intero o solo l'ID: va bene tutto. */
export function idDelFoglio(valore?: string | null): string {
  const testo = (valore || '').trim();
  const dalLink = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(testo);
  if (dalLink) return dalLink[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(testo) ? testo : '';
}

/** Da una risposta di errore di Google, la frase che fa capire che cosa fare. */
export function spiegaErroreFoglio(stato: number, messaggio: string, emailChiave: string): string {
  if (/has not been used|SERVICE_DISABLED|is disabled/i.test(messaggio)) {
    return 'La lettura dei fogli non è accesa: abilita "Google Sheets API" su console.cloud.google.com, nello stesso progetto di Firebase.';
  }
  if (stato === 403) return `Il foglio non è condiviso con ${emailChiave}: aprilo, premi Condividi e aggiungi quell'indirizzo come Visualizzatore.`;
  if (stato === 404) return "Il foglio non si trova: controlla BUONI_FOGLIO_ID su Vercel (è il pezzo del link tra /d/ e /edit).";
  if (stato === 400) return 'Il nome della scheda del foglio non è giusto: controlla BUONI_FOGLIO_SCHEDA su Vercel, o toglila.';
  return `Google ha risposto ${stato}: ${messaggio || 'senza spiegazione'}`;
}

/**
 * Le celle del foglio come le vede una persona (importi con il simbolo
 * dell'euro, date all'italiana). Senza scheda si legge la prima.
 */
export async function leggiFoglio(
  chiave: { client_email: string; private_key: string },
  idFoglio: string,
  scheda?: string
): Promise<string[][]> {
  const token = await tokenGoogle(chiave);
  const intervallo = scheda ? `'${scheda.replace(/'/g, "''")}'` : 'A:ZZ';
  const indirizzo = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(idFoglio)}`
    + `/values/${encodeURIComponent(intervallo)}?valueRenderOption=FORMATTED_VALUE`;

  const risposta = await fetch(indirizzo, { headers: { Authorization: `Bearer ${token}` } });
  const dati: any = await risposta.json().catch(() => ({}));
  if (!risposta.ok) {
    const errore = new Error(spiegaErroreFoglio(risposta.status, dati?.error?.message || '', chiave.client_email));
    (errore as any).daSpiegare = true;
    throw errore;
  }
  return (dati.values || []).map((riga: any[]) => riga.map(c => (c ?? '').toString()));
}
