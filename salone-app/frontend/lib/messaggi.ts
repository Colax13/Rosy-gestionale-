// I messaggi che il salone manda alla cliente: le parole, non il mezzo.
//
// Due soli, per ora, e sono la stessa cosa detta in due momenti diversi: la
// **conferma**, quando il salone accetta la richiesta arrivata dal sito, e il
// **promemoria**, il giorno prima.
//
// Sta qui, e non dentro il server, per un motivo pratico: le stesse parole
// servono da tutte e due le parti. Il server le manda per email; il programma
// le mette dentro WhatsApp quando l'email non c'è o non è ancora accesa. Un
// posto solo da cambiare, e la cliente legge sempre la stessa cosa.

export type TipoMessaggio = 'conferma' | 'promemoria';

export interface DatiMessaggio {
  nomeCliente: string;
  nomeSalone: string;
  indirizzo?: string;
  telefonoSalone?: string;
  quando: Date;
  servizi: string[];
  operatore?: string;
}

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
              'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/**
 * Il fuso orario del salone.
 *
 * Serve perché i messaggi li scrive anche il server, e il server vive in UTC:
 * chiedendogli l'ora "e basta", un appuntamento alle 15:30 finirebbe nell'SMS
 * come "13:30" d'estate e "14:30" d'inverno. Qui si dice una volta per tutte
 * che l'ora da scrivere è quella che legge la cliente sul muro del salone.
 */
export const FUSO_SALONE = 'Europe/Rome';

export interface Orologio { giornoSettimana: number; giorno: number; mese: number; anno: number; ore: number; minuti: number }

const SIGLE_INGLESI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Che ore sono, e che giorno è, sull'orologio del salone in quell'istante. */
export function orologioDelSalone(d: Date, fuso = FUSO_SALONE): Orologio {
  // Si chiede in inglese e a numeri solo perché così le parti tornano sempre
  // uguali, qualunque lingua abbia il computer: le parole le mettiamo noi.
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(d);
  const pezzo = (tipo: string) => parti.find(p => p.type === tipo)?.value || '';
  return {
    giornoSettimana: SIGLE_INGLESI.indexOf(pezzo('weekday')),
    giorno: Number(pezzo('day')),
    mese: Number(pezzo('month')) - 1,
    anno: Number(pezzo('year')),
    ore: Number(pezzo('hour')),
    minuti: Number(pezzo('minute'))
  };
}

/** Il giorno sul calendario del salone, scritto 2026-10-01. */
export function giornoDelSalone(d: Date, fuso = FUSO_SALONE): string {
  const o = orologioDelSalone(d, fuso);
  return `${o.anno}-${String(o.mese + 1).padStart(2, '0')}-${String(o.giorno).padStart(2, '0')}`;
}

/** Il giorno dopo, sul calendario: 2026-10-31 → 2026-11-01. Niente fusi in mezzo. */
export function giornoDopo(giorno: string): string {
  const [a, m, g] = giorno.split('-').map(Number);
  const dopo = new Date(Date.UTC(a, m - 1, g + 1));
  return dopo.toISOString().slice(0, 10);
}

/** "giovedì 2 ottobre alle 15:30", scritto come lo direbbe una persona. */
export function quandoScritto(d: Date): string {
  const o = orologioDelSalone(d);
  return `${GIORNI[o.giornoSettimana]} ${o.giorno} ${MESI[o.mese]} alle ${oraScritta(o)}`;
}

/** "gio 2/10 alle 15:30": la stessa cosa, ma dentro un SMS si pagano i caratteri. */
export function quandoCorto(d: Date): string {
  const o = orologioDelSalone(d);
  return `${GIORNI[o.giornoSettimana].slice(0, 3)} ${o.giorno}/${o.mese + 1} alle ${oraScritta(o)}`;
}

const oraScritta = (o: Orologio) =>
  `${String(o.ore).padStart(2, '0')}:${String(o.minuti).padStart(2, '0')}`;

/** L'elenco dei servizi come si legge: "colore, piega e taglio". */
export function elencoScritto(servizi: string[]): string {
  const puliti = servizi.filter(Boolean);
  if (puliti.length === 0) return '';
  if (puliti.length === 1) return puliti[0];
  return `${puliti.slice(0, -1).join(', ')} e ${puliti[puliti.length - 1]}`;
}

export interface Messaggio {
  oggetto: string;
  /** Testo disteso: email, e WhatsApp quando si avvisa a mano. */
  testo: string;
  html: string;
  /** Testo corto, pensato per stare in **un** SMS. Vedi `segmentiSms`. */
  sms: string;
}

/**
 * Il messaggio, in testo semplice e in HTML.
 *
 * Il testo semplice non è un ripiego: è quello che si riuserà pari pari per
 * l'SMS e per WhatsApp, quindi deve stare in piedi da solo, senza grassetti e
 * senza link da cliccare.
 */
export function componi(tipo: TipoMessaggio, d: DatiMessaggio): Messaggio {
  const quando = quandoScritto(d.quando);
  const servizi = elencoScritto(d.servizi);
  const con = d.operatore ? ` con ${d.operatore}` : '';
  const nome = (d.nomeCliente || '').trim().split(/\s+/)[0] || '';
  const ciao = nome ? `Ciao ${nome},` : 'Ciao,';

  const dove = [d.indirizzo, d.telefonoSalone ? `tel. ${d.telefonoSalone}` : '']
    .filter(Boolean).join(' · ');

  const righe = tipo === 'conferma'
    ? [
        ciao,
        '',
        `il tuo appuntamento da ${d.nomeSalone} è confermato:`,
        `${quando}${servizi ? ` — ${servizi}` : ''}${con}.`,
        '',
        'Se non puoi più venire, avvisaci in tempo: liberiamo il posto per un\'altra cliente.',
      ]
    : [
        ciao,
        '',
        `ti ricordiamo l'appuntamento da ${d.nomeSalone}:`,
        `${quando}${servizi ? ` — ${servizi}` : ''}${con}.`,
        '',
        'A domani!',
      ];

  if (dove) righe.push('', dove);
  righe.push('', d.nomeSalone);

  const testo = righe.join('\n');

  // L'SMS si paga a pezzi da 160 caratteri, e i caratteri strani li dimezzano
  // (vedi `segmentiSms`). Quindi non è l'email accorciata: è un'altra frase,
  // scritta per starci dentro una volta sola. Niente trattini lunghi, niente
  // apostrofi ricci, niente puntini di separazione.
  // Quando l'elenco è lungo si tiene il primo e si dice che ce n'è dell'altro:
  // la cliente sa già che cosa ha prenotato, il messaggio serve a ricordarle
  // quando.
  const puliti = d.servizi.filter(Boolean);
  const serviziCorti = puliti.length > 1 ? `${puliti[0]} e altro` : (puliti[0] || '');

  const scrivi = (conTelefono: boolean, conOperatore: boolean, conServizi: 'tutti' | 'corti' | 'no') => {
    const tel = conTelefono && d.telefonoSalone ? ` Tel ${d.telefonoSalone.replace(/\s+/g, '')}` : '';
    const chi = conOperatore ? con : '';
    const elenco = conServizi === 'tutti' ? servizi : conServizi === 'corti' ? serviziCorti : '';
    const cosa = elenco ? ` (${elenco})` : '';
    return tipo === 'conferma'
      ? `${d.nomeSalone}: appuntamento confermato ${quandoCorto(d.quando)}${cosa}${chi}. Se non puoi venire avvisaci.${tel}`
      : `${d.nomeSalone}: ti ricordiamo l'appuntamento di domani ${quandoCorto(d.quando)}${cosa}${chi}. A domani!`;
  };

  // Se non ci sta in un SMS solo si lascia per strada qualcosa, partendo da
  // ciò che la cliente può ricavare da sé: il telefono ce l'ha in rubrica, il
  // nome dell'operatrice se lo ricorda. Quando e che cosa non si toccano
  // finché si può. Meglio un messaggio più asciutto che due crediti.
  const sms = [
    scrivi(true, true, 'tutti'),
    scrivi(false, true, 'tutti'),
    scrivi(false, false, 'tutti'),
    scrivi(false, false, 'corti'),
    scrivi(false, false, 'no')
  ].find(t => segmentiSms(t).segmenti === 1) || scrivi(false, false, 'no');

  const oggetto = tipo === 'conferma'
    ? `Appuntamento confermato — ${quandoScritto(d.quando)}`
    : `Promemoria: domani ${quandoScritto(d.quando)}`;

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#18181b;max-width:480px">
${righe.map(r => (r === '' ? '<div style="height:12px"></div>' : `<div>${scappa(r)}</div>`)).join('\n')}
</div>`;

  return { oggetto, testo, html, sms };
}

/**
 * Quanti SMS si paga davvero un messaggio.
 *
 * Un SMS non è "un messaggio": è un pezzo da **160 caratteri**, ma solo se
 * tutte le lettere stanno nell'alfabeto che i telefoni usano da sempre
 * (GSM 03.38). Basta un carattere fuori — un trattino lungo, un apostrofo
 * ricco, un'emoji — e si passa all'alfabeto largo, dove i pezzi sono da
 * **70 caratteri**. Un messaggio da 150 lettere può quindi costare 1 credito
 * o 3, a seconda di un solo apostrofo.
 *
 * Serve a controllarlo prima di mandare, non dopo aver visto la bolletta.
 */
export interface ContoSms { alfabeto: 'normale' | 'largo'; caratteri: number; segmenti: number }

const GSM =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
/** Questi ci sono, ma contano doppio. */
const GSM_DOPPI = '^{}\\[~]|€';

export function segmentiSms(testo: string): ContoSms {
  let caratteri = 0;
  let largo = false;

  for (const c of testo) {
    if (GSM.includes(c)) caratteri += 1;
    else if (GSM_DOPPI.includes(c)) caratteri += 2;
    else { largo = true; break; }
  }

  if (largo) {
    // Nell'alfabeto largo si contano le unità da 16 bit, non i "caratteri"
    // come li vede una persona: un'emoji ne occupa due, ed è così che la
    // conta anche il telefono.
    const lunghezza = testo.length;
    return {
      alfabeto: 'largo',
      caratteri: lunghezza,
      segmenti: lunghezza <= 70 ? 1 : Math.ceil(lunghezza / 67)
    };
  }

  return {
    alfabeto: 'normale',
    caratteri,
    segmenti: caratteri <= 160 ? 1 : Math.ceil(caratteri / 153)
  };
}

/** Niente HTML per sbaglio dentro un nome scritto dalla cliente. */
function scappa(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
