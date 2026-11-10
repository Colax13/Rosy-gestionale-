import { righeStato, rigaRiserva } from './stato-sistema';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};
const spie = (righe: { nome: string; spia: string }[]) => righe.map(r => `${r.nome}=${r.spia}`);

// La risposta vera di /api/salute quando è tutto a posto.
const tuttoBene = {
  servizio: 'rosy', chiave: 'a posto', progetto: 'x',
  email: 'spenta', sms: 'a posto (tablet con Traccar)', promemoria: 'acceso',
  buoni_dal_foglio: 'acceso',
  rosy_ia: 'a posto (gemini-3.8-flash, 240 ms)',
  rosy_ia_riserve: { groq: 'a posto (openai/gpt-oss-120b)', openrouter: 'spenta (manca OPENROUTER_API_KEY)' }
};

console.log('\nLe spie');
check('tutto a posto',
  ['Server=ok', 'Rosy IA=ok', 'SMS alle clienti=ok', 'Promemoria automatici=ok', 'Buoni dal foglio Google=ok'],
  spie(righeStato(tuttoBene)));
check('Rosy accesa: dice quante riserve ha', 'Accesa, con una riserva (groq).', righeStato(tuttoBene)[1].stato);
check('SMS: dice da dove partono', 'Attivi: tablet con Traccar.', righeStato(tuttoBene)[2].stato);

check('il server non risponde: una riga sola, rossa', ['Server=guasto'], spie(righeStato(null)));
check('risposta che non è un oggetto', ['Server=guasto'], spie(righeStato('<!doctype html>' as any)));

const senzaChiavi = {
  chiave: 'manca', spiegazione: 'La variabile FIREBASE_SERVICE_ACCOUNT non è impostata su Vercel.',
  email: 'spenta', sms: 'spento', promemoria: 'spento (manca CRON_SECRET)', buoni_dal_foglio: 'spento (manca BUONI_FOGLIO_ID)',
  rosy_ia: 'spenta (manca GEMINI_API_KEY)',
  rosy_ia_riserve: { groq: 'spenta (manca GROQ_API_KEY)', openrouter: 'spenta (manca OPENROUTER_API_KEY)' }
};
check('niente configurato: server rosso, il resto spento',
  ['Server=guasto', 'Rosy IA=spento', 'SMS alle clienti=spento', 'Promemoria automatici=spento'],
  spie(righeStato(senzaChiavi)));
check('ogni riga spenta dice che cosa fare', true, righeStato(senzaChiavi).every(r => !!r.rimedio));

check('Rosy: chiave rifiutata da Google → rossa', 'guasto',
  righeStato({ ...tuttoBene, rosy_ia: 'non funziona — gemini-3.8-flash: 400 API key not valid', rosy_ia_riserve: {} })[1].spia);
check('Rosy: Gemini rotto ma una riserva funziona → verde', 'ok',
  righeStato({ ...tuttoBene, rosy_ia: 'non funziona — 429 quota' })[1].spia);
check('Rosy: Gemini spento ma una riserva funziona → verde', 'ok',
  righeStato({ ...tuttoBene, rosy_ia: 'spenta (manca GEMINI_API_KEY)' })[1].spia);
check('Rosy: Google non risponde e nessuna riserva → rossa', 'guasto',
  righeStato({ ...tuttoBene, rosy_ia: 'Google non risponde (più di 8 secondi)', rosy_ia_riserve: { groq: 'non funziona — 401' } })[1].spia);
check('email configurata a metà: si vede, rossa', 'Email alle clienti=guasto',
  spie(righeStato({ ...tuttoBene, email: 'manca il mittente' })).find(x => x.startsWith('Email')));
check('campi mancanti non rompono niente', 4, righeStato({}).length);

console.log('\nLa riserva');
check('non configurata', 'spento', rigaRiserva(null, null).spia);
check('configurata', 'Pronto su riserva.esempio.it: se questo si blocca, si lavora da lì con gli stessi dati.',
  rigaRiserva('https://riserva.esempio.it', null).stato);
check('questa è la riserva', 'Stai usando la riserva. Il principale è rosy.esempio.it.',
  rigaRiserva(null, 'https://rosy.esempio.it').stato);

console.log(`\n${ok} passate, ${ko} fallite`);
if (ko > 0) process.exit(1);
