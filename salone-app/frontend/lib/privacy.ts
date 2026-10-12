// L'informativa privacy del salone, e i consensi che la cliente dà prenotando.
//
// Il testo è una BOZZA da far controllare a chi segue la privacy del salone:
// il gestionale la riempie con i dati scritti in Impostazioni (ragione
// sociale, partita IVA, sede, email). Quello che manca resta segnalato tra
// parentesi quadre, così si vede subito.
//
// Le basi, in breve:
// - per prenotare e ricevere conferma e promemoria non serve un consenso: è
//   quello che la cliente chiede (art. 6.1.b GDPR). Serve però che abbia
//   potuto leggere l'informativa, e la spunta lo registra;
// - per offerte e promozioni serve un consenso a parte, facoltativo
//   (art. 6.1.a), che si può togliere quando si vuole.

/** Cambia quando cambia il testo: sulla prenotazione resta quale si è letta. */
export const VERSIONE_INFORMATIVA = '2026-10-12';

export interface DatiTitolare {
  nomeSalone?: string;
  ragioneSociale?: string;
  partitaIva?: string;
  indirizzo?: string;
  telefono?: string;
  email?: string;
  emailPrivacy?: string;
}

export interface Sezione { titolo: string; paragrafi: string[] }

const oManca = (v: string | undefined, cosa: string) => (v || '').trim() || `[${cosa} da completare in Impostazioni]`;

/** Che cosa manca in Impostazioni perché l'informativa sia completa. */
export function datiMancanti(d: DatiTitolare): string[] {
  const mancano: string[] = [];
  if (!(d.ragioneSociale || '').trim()) mancano.push('ragione sociale');
  if (!(d.partitaIva || '').trim()) mancano.push('partita IVA');
  if (!(d.indirizzo || '').trim()) mancano.push('indirizzo della sede');
  if (!(d.emailPrivacy || d.email || '').trim()) mancano.push('email per la privacy');
  return mancano;
}

/** Il testo dell'informativa, sezione per sezione. */
export function testoInformativa(d: DatiTitolare): Sezione[] {
  const nome = (d.nomeSalone || '').trim();
  const delSalone = nome ? `di ${nome}` : 'del salone';
  const titolare = oManca(d.ragioneSociale, 'ragione sociale');
  const piva = oManca(d.partitaIva, 'partita IVA');
  const sede = oManca(d.indirizzo, 'indirizzo della sede');
  const contatto = oManca(d.emailPrivacy || d.email, 'email per la privacy');

  return [
    {
      titolo: 'Chi tratta i tuoi dati',
      paragrafi: [
        `Titolare del trattamento è ${titolare}${nome ? ` (${nome})` : ''}, P. IVA ${piva}, con sede in ${sede}.`,
        `Per qualsiasi domanda sui tuoi dati scrivi a ${contatto}${d.telefono ? ` o chiama il ${d.telefono}` : ''}.`
      ]
    },
    {
      titolo: 'Quali dati e perché',
      paragrafi: [
        'Quando prenoti ci lasci nome, cognome, numero di cellulare, eventualmente email e note, e i servizi, il giorno e l\'orario scelti.',
        'Li usiamo per gestire il tuo appuntamento: registrarlo, confermarlo, mandarti promemoria via SMS o email, avvisarti se l\'orario deve cambiare e tenere lo storico dei servizi fatti. La base giuridica è l\'esecuzione del servizio che ci chiedi (art. 6.1.b GDPR): senza questi dati non possiamo prenotare.',
        'Solo se lo accetti con la spunta apposita, facoltativa, useremo il tuo numero e la tua email anche per mandarti offerte, promozioni e novità del salone (art. 6.1.a GDPR). Puoi ritirare questo consenso in qualsiasi momento, senza conseguenze sulle tue prenotazioni.',
        'Ti chiediamo di non scrivere nelle note informazioni sulla salute. Se ci comunichi un\'allergia o un\'altra condizione utile a lavorare in sicurezza, la useremo solo per questo, con il tuo consenso esplicito (art. 9.2.a GDPR).'
      ]
    },
    {
      titolo: 'A chi arrivano',
      paragrafi: [
        `I dati li vede solo il personale ${delSalone}. Non li vendiamo e non li cediamo a nessuno.`,
        'Per far funzionare il servizio ci appoggiamo a fornitori che trattano i dati per nostro conto come responsabili del trattamento: Google (Firebase, archivio dei dati), Vercel (il sito), il sistema di invio degli SMS e, per l\'assistente interno del gestionale, fornitori di intelligenza artificiale ai quali non vengono inviati numeri di telefono, email o note delle clienti. Alcuni di questi fornitori possono trattare dati fuori dall\'Unione Europea, con le garanzie previste dal GDPR (decisioni di adeguatezza o clausole contrattuali standard).'
      ]
    },
    {
      titolo: 'Per quanto tempo',
      paragrafi: [
        'Teniamo i dati dei tuoi appuntamenti finché sei nostra cliente e, dopo l\'ultima visita, per il tempo richiesto dagli obblighi di legge (per esempio fiscali), poi li cancelliamo. Il consenso alle promozioni vale finché non lo ritiri.'
      ]
    },
    {
      titolo: 'I tuoi diritti',
      paragrafi: [
        `Puoi chiedere in ogni momento di vedere i tuoi dati, correggerli, cancellarli, limitarne l'uso, riceverne una copia o opporti al loro trattamento, scrivendo a ${contatto}.`,
        'Se pensi che i tuoi dati non siano trattati correttamente puoi rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).'
      ]
    }
  ];
}

export interface Consensi {
  informativa_letta_il?: string;
  versione_informativa?: string;
  marketing?: boolean;
  marketing_il?: string;
}

/**
 * I consensi della scheda cliente dopo una nuova prenotazione.
 * L'informativa letta si aggiorna all'ultima volta. Le promozioni: una spunta
 * data accende il consenso; una spunta lasciata vuota NON lo spegne (non
 * spuntare non è ritirarlo: per ritirarlo lo si toglie dalla scheda).
 */
export function unisciConsensi(attuali?: Consensi | null, nuovi?: Consensi | null): Consensi | null {
  if (!nuovi) return null;
  const marketingAcceso = nuovi.marketing === true;
  return {
    informativa_letta_il: nuovi.informativa_letta_il || attuali?.informativa_letta_il,
    versione_informativa: nuovi.versione_informativa || attuali?.versione_informativa,
    marketing: marketingAcceso || attuali?.marketing === true,
    marketing_il: marketingAcceso
      ? nuovi.marketing_il
      : (attuali?.marketing_il || nuovi.marketing_il)
  };
}
