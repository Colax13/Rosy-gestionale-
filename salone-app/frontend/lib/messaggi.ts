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

/** "giovedì 2 ottobre alle 15:30", scritto come lo direbbe una persona. */
export function quandoScritto(d: Date): string {
  const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]} alle ${ora}`;
}

/** L'elenco dei servizi come si legge: "colore, piega e taglio". */
export function elencoScritto(servizi: string[]): string {
  const puliti = servizi.filter(Boolean);
  if (puliti.length === 0) return '';
  if (puliti.length === 1) return puliti[0];
  return `${puliti.slice(0, -1).join(', ')} e ${puliti[puliti.length - 1]}`;
}

export interface Messaggio { oggetto: string; testo: string; html: string }

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

  const oggetto = tipo === 'conferma'
    ? `Appuntamento confermato — ${quandoScritto(d.quando)}`
    : `Promemoria: domani ${quandoScritto(d.quando)}`;

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#18181b;max-width:480px">
${righe.map(r => (r === '' ? '<div style="height:12px"></div>' : `<div>${scappa(r)}</div>`)).join('\n')}
</div>`;

  return { oggetto, testo, html };
}

/** Niente HTML per sbaglio dentro un nome scritto dalla cliente. */
function scappa(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
