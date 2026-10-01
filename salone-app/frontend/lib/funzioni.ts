// Funzioni riservate: pagine che stanno dentro il programma ma restano spente,
// tranne che per i saloni a cui sono state accese.
//
// Il gestionale è uguale per tutti. Alcune pagine però nascono su richiesta di
// un salone preciso — i Buoni sono nati per RD Salon, con il loro foglio, i
// loro codici, la loro piega inclusa — e agli altri saloni non servono e non
// devono comparire.
//
// L'interruttore è l'indirizzo email del **titolare del salone**, non di chi
// sta guardando lo schermo: così le operatrici di quel salone vedono la pagina
// come la vede lui, e un altro salone non la vede nemmeno se gliela nomini.
//
// Questo file serve a far sparire la voce dal menù. La serratura vera sta
// nelle regole del database (`firestore.rules`, blocco `buoni`), che fanno lo
// stesso identico controllo: senza quelle, uno che sa scrivere l'indirizzo a
// mano nella barra leggerebbe comunque i dati.

/** Le pagine che non sono per tutti. */
export type ChiaveFunzione = 'buoni' | 'messaggi_automatici' | 'buoni_dal_foglio';

interface FunzioneRiservata {
  etichetta: string;
  /** A quali saloni è accesa, per indirizzo del titolare. */
  saloni: string[];
  /** Perché è riservata: si legge fra un anno e si capisce ancora. */
  motivo: string;
}

export const FUNZIONI_RISERVATE: Record<ChiaveFunzione, FunzioneRiservata> = {
  buoni: {
    etichetta: 'Buoni',
    saloni: [
      'rdsalon.ceccano@gmail.com',
      'danieledesimone.social@gmail.com'
    ],
    motivo: 'Fatta su misura per RD Salon: buoni spa venduti online, con il loro foglio e la piega inclusa.'
  },
  // Non è una pagina: è il permesso di far partire SMS ed email alle clienti.
  // Il postino (il tablet in salone, o Skebby) è **di un salone solo**: senza
  // questo controllo, un altro salone che usa il gestionale confermerebbe un
  // appuntamento e alla sua cliente arriverebbe un SMS dal numero di RD Salon.
  // Il foglio Google dei buoni pagati online è di RD Salon: la chiave su
  // Vercel punta a quello. Se fosse acceso per un altro salone, i buoni delle
  // clienti di RD Salon finirebbero nel suo registro.
  buoni_dal_foglio: {
    etichetta: 'Buoni letti dal foglio',
    saloni: ['rdsalon.ceccano@gmail.com'],
    motivo: 'Il foglio dei buoni pagati online (riempito da Make con Stripe) è di RD Salon.'
  },
  messaggi_automatici: {
    etichetta: 'Messaggi automatici',
    saloni: ['rdsalon.ceccano@gmail.com'],
    motivo: 'Il tablet che manda gli SMS è di RD Salon: i messaggi partono solo per le sue clienti.'
  }
};

/** True se quella chiave è una funzione riservata (e non una pagina normale). */
export function eRiservata(chiave: string): chiave is ChiaveFunzione {
  return Object.prototype.hasOwnProperty.call(FUNZIONI_RISERVATE, chiave);
}

/**
 * Gli indirizzi si confrontano senza maiuscole e senza spazi attorno:
 * "Rdsalon.Ceccano@gmail.com " e quello scritto qui sopra sono la stessa casella.
 */
export function normalizzaEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * True se quella funzione è accesa per il salone di quell'indirizzo.
 * Senza indirizzo la risposta è no: una funzione riservata sta spenta finché
 * non si sa con certezza di chi è il salone.
 */
export function funzioneAccesa(chiave: string, emailSalone?: string | null): boolean {
  if (!eRiservata(chiave)) return true;
  const email = normalizzaEmail(emailSalone);
  if (!email) return false;
  return FUNZIONI_RISERVATE[chiave].saloni.map(normalizzaEmail).includes(email);
}
