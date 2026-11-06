import { contoDelMese, costoChiamata, tokenDi, meseDi, idConsumo } from './consumi-ia';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};

check('nessun consumo', { domande: 0, gratuite: 100, restanti: 100, extra: 0, da_addebitare: 0, stato: 'ok' }, contoDelMese(null));
check('dentro la quota', ['ok', 50, 0], (c => [c.stato, c.restanti, c.da_addebitare])(contoDelMese({ domande: 50 })));
check('quasi finita', 'quasi', contoDelMese({ domande: 85 }).stato);
check('quota esatta: niente da pagare', [0, 0, 'quasi'], (c => [c.extra, c.da_addebitare, c.stato])(contoDelMese({ domande: 100 })));
check('oltre la quota', [40, 2, 'oltre'], (c => [c.extra, c.da_addebitare, c.stato])(contoDelMese({ domande: 140 })));
check('arrotondato ai centesimi', 0.15, contoDelMese({ domande: 103 }).da_addebitare);
check('quota e prezzo diversi', 1.5, contoDelMese({ domande: 30 }, 0, 0.05).da_addebitare);

check('token Gemini (con ragionamento)', { entrata: 1000, uscita: 300 }, tokenDi({ usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 100 } }));
check('token OpenAI', { entrata: 800, uscita: 50 }, tokenDi({ usage: { prompt_tokens: 800, completion_tokens: 50 } }));
check('token assenti', { entrata: 0, uscita: 0 }, tokenDi({}));

check('costo Gemini', true, Math.abs(costoChiamata('gemini', 1_000_000, 0) - 0.3 * 0.92) < 1e-9);
check('riserve gratis', 0, costoChiamata('groq', 1_000_000, 1_000_000));

check('mese in ora italiana (31 ottobre 23:30 UTC = 1 novembre)', '2026-11', meseDi(new Date('2026-10-31T23:30:00Z')));
check('id del documento', 'abc_2026-11', idConsumo('abc', '2026-11'));

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
