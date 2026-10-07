// I messaggi che il salone manda alla cliente: le parole, non il mezzo.
//
// Il percorso della cliente, un messaggio per tappa:
//
//   ricevuta        → ha prenotato dal sito: "abbiamo ricevuto la richiesta"
//   conferma        → il salone l'ha messa in agenda (o l'ha fissata lui)
//   rifiuto         → l'orario non va bene: "chiamaci e troviamo un altro orario"
//   spostamento     → il salone ha spostato un appuntamento già confermato
//   promemoria      → 24 ore prima
//   promemoria_ora  → 1 ora prima
//
// Tono caldo e professionale, sempre firmato col nome del salone, e ogni SMS
// sta in un messaggio solo.
//
// Sta qui, e non dentro il server, per un motivo pratico: le stesse parole
// servono da tutte e due le parti. Il server le manda per email; il programma
// le mette dentro WhatsApp quando l'email non c'è o non è ancora accesa. Un
// posto solo da cambiare, e la cliente legge sempre la stessa cosa.

export type TipoMessaggio = 'ricevuta' | 'conferma' | 'rifiuto' | 'spostamento' | 'promemoria' | 'promemoria_ora';

export const TIPI_MESSAGGIO: TipoMessaggio[] = ['ricevuta', 'conferma', 'rifiuto', 'spostamento', 'promemoria', 'promemoria_ora'];

/** Come si chiama ogni messaggio nel registro e negli avvisi. */
export const NOME_MESSAGGIO: Record<TipoMessaggio | 'avviso_salone' | 'prova', string> = {
  ricevuta: 'Richiesta ricevuta',
  conferma: 'Appuntamento confermato',
  rifiuto: 'Orario non disponibile',
  spostamento: 'Appuntamento spostato',
  promemoria: 'Promemoria 24 ore prima',
  promemoria_ora: 'Promemoria 1 ora prima',
  avviso_salone: 'Avviso nuova richiesta al salone',
  prova: 'SMS di prova'
};

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

  const appuntamento = `${quando}${servizi ? ` — ${servizi}` : ''}${con}.`;
  const tel = d.telefonoSalone ? d.telefonoSalone.trim() : '';
  const chiamaci = tel ? `chiamaci allo ${tel}` : 'chiamaci';

  const corpi: Record<TipoMessaggio, string[]> = {
    ricevuta: [
      `grazie per aver prenotato da ${d.nomeSalone}! Abbiamo ricevuto la tua richiesta:`,
      appuntamento,
      '',
      'Ti scriveremo appena sarà confermata.'
    ],
    conferma: [
      `il tuo appuntamento da ${d.nomeSalone} è confermato:`,
      appuntamento,
      '',
      'Ti aspettiamo! Se non puoi più venire, avvisaci in tempo: liberiamo il posto per un\'altra cliente.'
    ],
    rifiuto: [
      `purtroppo l'orario che hai scelto da ${d.nomeSalone} non è più disponibile:`,
      appuntamento,
      '',
      `Ci dispiace! ${chiamaci.charAt(0).toUpperCase() + chiamaci.slice(1)} e troviamo insieme un altro orario.`
    ],
    spostamento: [
      `il tuo appuntamento da ${d.nomeSalone} è stato spostato:`,
      appuntamento,
      '',
      `Se il nuovo orario non ti va bene, ${chiamaci}. Ti aspettiamo!`
    ],
    promemoria: [
      `ti ricordiamo il tuo appuntamento di domani da ${d.nomeSalone}:`,
      appuntamento,
      '',
      `Se devi spostarlo, ${chiamaci}. A domani!`
    ],
    promemoria_ora: [
      `ti aspettiamo da ${d.nomeSalone} tra un'ora:`,
      appuntamento,
      '',
      'A tra poco!'
    ]
  };

  const righe = [ciao, '', ...corpi[tipo]];
  if (dove) righe.push('', dove);
  righe.push('', d.nomeSalone);

  const testo = righe.join('\n');

  // L'SMS si paga a pezzi da 160 caratteri, e i caratteri strani li dimezzano
  // (vedi `segmentiSms`). Quindi non è l'email accorciata: è un'altra frase,
  // scritta per starci dentro una volta sola. Niente trattini lunghi, niente
  // apostrofi ricci, niente emoji. Si prova dalla versione più completa alla
  // più asciutta, e si tiene la prima che sta in un SMS: si lascia per strada
  // prima il telefono (la cliente ce l'ha in rubrica), poi l'operatrice.
  const salone = d.nomeSalone;
  const ciaoSms = nome ? `ciao ${nome}, ` : '';
  const quandoSms = quandoCorto(d.quando);
  const oraSms = oraScritta(orologioDelSalone(d.quando));
  const telSms = tel.replace(/\s+/g, ' ');

  const versioni = (conTel: boolean, conChi: boolean): string => {
    const chi = conChi ? con : '';
    switch (tipo) {
      case 'ricevuta':
        return `${salone}: grazie${nome ? ` ${nome}` : ''}! Abbiamo ricevuto la tua richiesta per ${quandoSms}${chi}. Ti scriveremo appena sarà confermata.`;
      case 'conferma':
        return `${salone}: ${ciaoSms}il tuo appuntamento è confermato per ${quandoSms}${chi}. Ti aspettiamo!${conTel && telSms ? ` Per info ${telSms}` : ''}`;
      case 'rifiuto':
        return `${salone}: ${ciaoSms}purtroppo ${quandoSms} non è più disponibile. ${conTel && telSms ? `Chiamaci allo ${telSms}` : 'Chiamaci'} e troviamo insieme un altro orario.`;
      case 'spostamento':
        return `${salone}: ${ciaoSms}il tuo appuntamento è stato spostato a ${quandoSms}${chi}. Ti aspettiamo!${conTel && telSms ? ` Per info ${telSms}` : ''}`;
      case 'promemoria':
        return `${salone}: ${ciaoSms}ti ricordiamo il tuo appuntamento di domani, ${quandoSms}${chi}. ${conTel && telSms ? `Per spostarlo chiamaci allo ${telSms}.` : 'A domani!'}`;
      case 'promemoria_ora':
        return `${salone}: ${ciaoSms}ti aspettiamo alle ${oraSms}${chi}. A tra poco!`;
    }
  };

  const sms = [versioni(true, true), versioni(true, false), versioni(false, true), versioni(false, false)]
    .find(t => segmentiSms(t).segmenti === 1) || versioni(false, false);

  const oggetti: Record<TipoMessaggio, string> = {
    ricevuta: `Richiesta ricevuta — ${quandoScritto(d.quando)}`,
    conferma: `Appuntamento confermato — ${quandoScritto(d.quando)}`,
    rifiuto: `Orario non disponibile — ${quandoScritto(d.quando)}`,
    spostamento: `Appuntamento spostato — ${quandoScritto(d.quando)}`,
    promemoria: `Promemoria: domani ${quandoScritto(d.quando)}`,
    promemoria_ora: `Ti aspettiamo alle ${oraSms}`
  };
  const oggetto = oggetti[tipo];

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


/**
 * L'SMS al salone quando arriva una richiesta dal sito: chi, quando, che cosa.
 * Firmato "Rosy" perché lo manda il gestionale, non il salone.
 */
export function avvisoNuovaRichiesta(d: { nomeCliente: string; quando: Date; servizi: string[]; operatore?: string; telefonoCliente?: string }): string {
  const chi = (d.nomeCliente || '').trim() || 'una cliente';
  const quando = quandoCorto(d.quando);
  const puliti = (d.servizi || []).filter(Boolean);
  const tutti = elencoScritto(puliti);
  const corti = puliti.length > 1 ? `${puliti[0]} e altro` : (puliti[0] || '');
  const con = d.operatore ? ` con ${d.operatore}` : '';
  const tel = d.telefonoCliente ? ` Tel ${d.telefonoCliente.replace(/\s+/g, '')}.` : '';
  const scrivi = (cosa: string, conChi: boolean, conTel: boolean) =>
    `Rosy: nuova richiesta online da ${chi}, ${quando}${cosa ? ` (${cosa})` : ''}${conChi ? con : ''}.${conTel ? tel : ''} Confermala dall'agenda.`;
  return [scrivi(tutti, true, true), scrivi(tutti, true, false), scrivi(corti, true, false), scrivi(corti, false, false), scrivi('', false, false)]
    .find(t => segmentiSms(t).segmenti === 1) || scrivi('', false, false);
}
