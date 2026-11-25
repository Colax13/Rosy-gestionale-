import { capisciProvenienza, nomeProvenienza, pulisciEtichetta, contaProvenienze, canaleDaProvenienza } from './provenienza';

let ok = 0, ko = 0;
const check = (nome: string, atteso: any, avuto: any) => {
  const uguale = JSON.stringify(atteso) === JSON.stringify(avuto);
  console.log(uguale ? `  OK   ${nome}` : `  KO   ${nome}\n       atteso: ${JSON.stringify(atteso)}\n       avuto:  ${JSON.stringify(avuto)}`);
  uguale ? ok++ : ko++;
};
const P = 'https://prenotaora.rdsalon.com/';
const da = (i: any) => capisciProvenienza({ url: P, ...i }).provenienza;

check('app di Instagram', 'instagram', da({ userAgent: 'Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 Instagram 300.0.0.0' }));
check('app di Facebook', 'facebook', da({ userAgent: 'Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/400.0]' }));
check('app di TikTok', 'tiktok', da({ userAgent: 'Mozilla/5.0 musical_ly_30 BytedanceWebview' }));
check('link da instagram.com (computer)', 'instagram', da({ referrer: 'https://l.instagram.com/?u=x' }));
check('ricerca Google', 'google', da({ referrer: 'https://www.google.it/' }));
check('Google da Android', 'google', da({ referrer: 'android-app://com.google.android.googlequicksearchbox/' }) === 'google' ? 'google' : da({ referrer: 'https://www.google.com/' }));
check('scheda Google con gclid', 'google', capisciProvenienza({ url: `${P}?gclid=abc` }).provenienza);
check('sito del salone (stesso dominio di casa)', { provenienza: 'sito', dettaglio: 'rdsalon.com' }, capisciProvenienza({ url: P, referrer: 'https://www.rdsalon.com/contatti' }));
check('un altro sito', { provenienza: 'altro', dettaglio: 'paginegialle.it' }, capisciProvenienza({ url: P, referrer: 'https://www.paginegialle.it/x' }));
check('WhatsApp non lascia traccia: link diretto', 'diretto', da({ userAgent: 'Mozilla/5.0 (iPhone) Safari/604.1', referrer: '' }));
check('navigare dentro la pagina non è una provenienza', 'diretto', da({ referrer: `${P}privacy` }));
check('etichetta scritta nel link vince', 'whatsapp', capisciProvenienza({ url: `${P}?da=wa`, userAgent: 'Instagram' }).provenienza);
check('etichetta libera', 'volantino-natale', capisciProvenienza({ url: `${P}?da=Volantino Natale!` }).provenienza);
check('utm_source', 'instagram', capisciProvenienza({ url: `${P}?utm_source=ig` }).provenienza);
check('fbclid', 'facebook', capisciProvenienza({ url: `${P}?fbclid=xyz` }).provenienza);

check('nome da mostrare', 'Instagram', nomeProvenienza('instagram'));
check('nome di un\'etichetta libera', 'Volantino-natale', nomeProvenienza('volantino-natale'));
check('etichetta ripulita e corta', 30, pulisciEtichetta('a'.repeat(80)).length);

const apps = [
  { source: 'web_public', provenienza: 'instagram' }, { source: 'web_public', provenienza: 'instagram' },
  { source: 'web_public', provenienza: 'google' }, { source: 'web_public' }, { provenienza: 'instagram' }
];
check('conteggio: solo le prenotazioni online', [['instagram', 2], ['google', 1], ['non-indicata', 1]], contaProvenienze(apps).map(x => [x.provenienza, x.quante]));

check('canale della cliente nuova', ['Instagram', 'Prenotazione online', 'Prenotazione online'], [canaleDaProvenienza('instagram'), canaleDaProvenienza('diretto'), canaleDaProvenienza(undefined)]);

console.log(`\n${ok} ok, ${ko} ko`);
if (ko) process.exit(1);
