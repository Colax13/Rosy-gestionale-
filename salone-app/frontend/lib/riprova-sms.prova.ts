// Gli SMS si riprovano solo quando è certo che non sono partiti: mai doppioni.
import { siPuoRiprovare, conRiprova } from '../../../api/_messaggi';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

const risposta = (status: number) => ({ ok: status < 400, status } as Response);
const errore = (code: string) => Object.assign(new TypeError('fetch failed'), { cause: { code } });

(async () => {
  check('503 / 502 / 504: si riprova', [true, true, true], [503, 502, 504].map(stato => siPuoRiprovare({ stato })));
  check('500 generico: NO (potrebbe essere partito)', false, siPuoRiprovare({ stato: 500 }));
  check('401 gettone sbagliato: NO', false, siPuoRiprovare({ stato: 401 }));
  check('server non trovato / connessione rifiutata: si riprova', [true, true], [siPuoRiprovare({ errore: errore('ENOTFOUND') }), siPuoRiprovare({ errore: errore('ECONNREFUSED') })]);
  check('connessione caduta a metà: NO', false, siPuoRiprovare({ errore: errore('ECONNRESET') }));
  check('tempo scaduto: NO', false, siPuoRiprovare({ errore: errore('UND_ERR_HEADERS_TIMEOUT') }));

  const senzaAttese = [0, 0];

  let chiamate = 0;
  let r = await conRiprova(async () => { chiamate++; return risposta(200); }, senzaAttese);
  check('va bene subito: una sola chiamata', [1, 200], [chiamate, r.risposta.status]);

  chiamate = 0;
  r = await conRiprova(async () => { chiamate++; return risposta(chiamate === 1 ? 503 : 200); }, senzaAttese);
  check('503 poi ok: due chiamate, partito', [2, 200, 2], [chiamate, r.risposta.status, r.tentativi]);

  chiamate = 0;
  r = await conRiprova(async () => { chiamate++; return risposta(503); }, senzaAttese);
  check('sempre 503: al massimo 3 chiamate', [3, 503, 3], [chiamate, r.risposta.status, r.tentativi]);

  chiamate = 0;
  r = await conRiprova(async () => { chiamate++; return risposta(500); }, senzaAttese);
  check('500: una sola chiamata, nessun doppione', [1, 500], [chiamate, r.risposta.status]);

  chiamate = 0;
  let preso: any = null;
  try { await conRiprova(async () => { chiamate++; throw errore('ECONNRESET'); }, senzaAttese); } catch (e) { preso = e; }
  check('connessione caduta: una sola chiamata, errore', [1, true], [chiamate, !!preso]);

  chiamate = 0;
  r = await conRiprova(async () => { chiamate++; if (chiamate === 1) throw errore('ENOTFOUND'); return risposta(200); }, senzaAttese);
  check('server non trovato poi ok: partito al secondo', [2, 200], [chiamate, r.risposta.status]);

  console.log(`\n${ok} passate, ${ko} fallite`);
  process.exit(ko ? 1 : 0);
})();
