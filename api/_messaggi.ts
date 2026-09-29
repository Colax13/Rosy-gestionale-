// I messaggi che il salone manda alla cliente.
//
// Due soli, per ora, e sono la stessa cosa scritta in due momenti diversi:
// la **conferma**, quando il salone accetta la richiesta arrivata dal sito, e
// il **promemoria**, il giorno prima. Il testo sta qui e non nel programma,
// così si cambia in un posto solo e vale per tutti i canali.
//
// Il canale di oggi è l'email. L'SMS e WhatsApp si agganciano qui sotto senza
// riscrivere niente: cambia come parte, non che cosa dice.

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

export type EsitoInvio =
  | { mandato: true; canale: 'email'; a: string }
  | { mandato: false; motivo: string };

/**
 * Manda l'email con Resend.
 *
 * Se la chiave non c'è non è un errore da urlare: vuol dire che quel pezzo non
 * è ancora acceso, e il programma deve continuare a funzionare lo stesso.
 */
export async function mandaEmail(a: string, messaggio: Messaggio): Promise<EsitoInvio> {
  const chiave = process.env.RESEND_API_KEY;
  if (!chiave) return { mandato: false, motivo: 'La chiave RESEND_API_KEY non è impostata su Vercel.' };
  if (!a || !a.includes('@')) return { mandato: false, motivo: 'La cliente non ha lasciato un indirizzo email.' };

  const mittente = process.env.MITTENTE_EMAIL;
  if (!mittente) return { mandato: false, motivo: 'La variabile MITTENTE_EMAIL non è impostata su Vercel.' };

  const risposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chiave}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: mittente,
      to: [a],
      subject: messaggio.oggetto,
      text: messaggio.testo,
      html: messaggio.html
    })
  });

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => '');
    return { mandato: false, motivo: `Resend ha rifiutato l'invio (${risposta.status}). ${dettaglio}`.trim() };
  }

  return { mandato: true, canale: 'email', a };
}
