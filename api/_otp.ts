// La verifica del numero di chi prenota. Solo le regole, senza database e
// senza SMS: così si provano da sole.
//
// Il codice non si salva mai in chiaro: si salva la sua impronta (hash) con un
// po' di sale. Chi leggesse il database non troverebbe codici da usare.

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const DURATA_CODICE_MS = 10 * 60 * 1000;   // il codice vale 10 minuti
export const ATTESA_FRA_CODICI_MS = 60 * 1000;    // un codice nuovo al minuto, non di più
export const MAX_CODICI_ORA = 5;                   // per numero di telefono
export const MAX_CODICI_ORA_SALONE = 40;           // per salone, per non far bloccare la SIM
export const MAX_TENTATIVI = 5;                    // poi il codice si brucia
export const SENZA_CODICE_MS = 15 * 60 * 1000;     // se l'SMS non parte, si prenota lo stesso

export interface StatoCodice {
  sale?: string;
  hash?: string;
  scade?: number;
  tentativi?: number;
  invii?: number[];
  /** Se l'SMS non è partito, fino a quando si può prenotare senza codice. */
  senzaCodiceFinoA?: number;
}

/** Il nome del documento: l'impronta di salone+numero, non il numero in chiaro. */
export function idVerifica(salonId: string, numero: string): string {
  return createHash('sha256').update(`${salonId}:${numero}`).digest('hex').slice(0, 40);
}

export function nuovoCodice(): { codice: string; sale: string; hash: string } {
  const codice = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const sale = randomBytes(16).toString('hex');
  return { codice, sale, hash: impronta(codice, sale) };
}

export function impronta(codice: string, sale: string): string {
  return createHash('sha256').update(`${sale}:${codice}`).digest('hex');
}

/** Gli invii dell'ultima ora, gli altri si dimenticano. */
export function inviiRecenti(invii: number[] | undefined, adesso: number): number[] {
  return (invii || []).filter(t => adesso - t < 60 * 60 * 1000);
}

export type Esito = { ok: true } | { ok: false; motivo: string };

/** Si può mandare un codice nuovo a questo numero adesso? */
export function puoMandareCodice(stato: StatoCodice | undefined, adesso: number): Esito {
  const invii = inviiRecenti(stato?.invii, adesso);
  const ultimo = invii.length ? Math.max(...invii) : 0;
  if (ultimo && adesso - ultimo < ATTESA_FRA_CODICI_MS) {
    const secondi = Math.ceil((ATTESA_FRA_CODICI_MS - (adesso - ultimo)) / 1000);
    return { ok: false, motivo: `Ti abbiamo appena mandato un codice. Per un altro aspetta ${secondi} secondi.` };
  }
  if (invii.length >= MAX_CODICI_ORA) {
    return { ok: false, motivo: 'Hai chiesto troppi codici. Riprova fra un\'ora, oppure chiama il salone.' };
  }
  return { ok: true };
}

/** Il codice scritto è giusto? Confronto a tempo costante, per non dare indizi. */
export function controllaCodice(stato: StatoCodice | undefined, codice: string, adesso: number): Esito {
  if (!stato?.hash || !stato.sale || !stato.scade) {
    return { ok: false, motivo: 'Prima chiedi il codice: non ne risulta uno per questo numero.' };
  }
  if (adesso > stato.scade) return { ok: false, motivo: 'Il codice è scaduto. Chiedine uno nuovo.' };
  if ((stato.tentativi || 0) >= MAX_TENTATIVI) {
    return { ok: false, motivo: 'Troppi tentativi sbagliati. Chiedi un codice nuovo.' };
  }
  const pulito = String(codice || '').replace(/\D/g, '');
  if (pulito.length !== 6) return { ok: false, motivo: 'Il codice è di 6 cifre.' };

  const atteso = Buffer.from(stato.hash, 'hex');
  const arrivato = Buffer.from(impronta(pulito, stato.sale), 'hex');
  if (atteso.length !== arrivato.length || !timingSafeEqual(atteso, arrivato)) {
    const restano = MAX_TENTATIVI - (stato.tentativi || 0) - 1;
    return { ok: false, motivo: restano > 0 ? `Codice sbagliato. Hai ancora ${restano} tentativi.` : 'Codice sbagliato. Chiedine uno nuovo.' };
  }
  return { ok: true };
}

/** L'SMS del codice: corto, niente caratteri che costano doppio. */
export function testoCodice(nomeSalone: string, codice: string): string {
  return `${nomeSalone || 'Il salone'}: il tuo codice per prenotare è ${codice}. Vale 10 minuti. Se non l'hai chiesto tu, ignora questo messaggio.`;
}

export interface Prenotazione {
  data_ora: string;
  note: string;
  clienti: { nome: string; cognome: string; telefono: string; email: string };
  id_dipendente: string;
  dipendenti: { nome: string; cognome: string };
  righe_appuntamento: { servizi_catalogo: { nome: string; durata_minuti: number; prezzo_base: number } }[];
}

const testo = (v: any, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cifra = (v: any, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : 0;
};

/**
 * Quello che arriva dal browser, ripulito. Si tiene solo quello che serve,
 * con lunghezze massime: la pagina di prenotazione è aperta a tutti, e
 * quello che scrive finisce nell'agenda del salone.
 */
export function pulisciPrenotazione(dati: any, adesso: number): { ok: true; app: Prenotazione } | { ok: false; motivo: string } {
  const quando = new Date(dati?.data_ora);
  if (!Number.isFinite(quando.getTime())) return { ok: false, motivo: 'Manca la data dell\'appuntamento.' };
  if (quando.getTime() < adesso - 5 * 60 * 1000) return { ok: false, motivo: 'Quell\'orario è già passato.' };
  if (quando.getTime() > adesso + 400 * 24 * 60 * 60 * 1000) return { ok: false, motivo: 'Quell\'orario è troppo lontano.' };

  const nome = testo(dati?.clienti?.nome, 100);
  const cognome = testo(dati?.clienti?.cognome, 100);
  const telefono = testo(dati?.clienti?.telefono, 40);
  if (!nome || !cognome) return { ok: false, motivo: 'Servono nome e cognome.' };
  if (telefono.replace(/\D/g, '').length < 6) return { ok: false, motivo: 'Serve un numero di telefono valido.' };

  const righe = Array.isArray(dati?.righe_appuntamento) ? dati.righe_appuntamento.slice(0, 10) : [];
  const servizi = righe
    .map((r: any) => ({
      servizi_catalogo: {
        nome: testo(r?.servizi_catalogo?.nome, 120),
        durata_minuti: cifra(r?.servizi_catalogo?.durata_minuti, 600),
        prezzo_base: cifra(r?.servizi_catalogo?.prezzo_base, 10000)
      }
    }))
    .filter((r: any) => r.servizi_catalogo.nome);
  if (!servizi.length) return { ok: false, motivo: 'Scegli almeno un servizio.' };

  return {
    ok: true,
    app: {
      data_ora: quando.toISOString(),
      note: testo(dati?.note, 500),
      clienti: { nome, cognome, telefono, email: testo(dati?.clienti?.email, 200) },
      id_dipendente: testo(dati?.id_dipendente, 128),
      dipendenti: { nome: testo(dati?.dipendenti?.nome, 100), cognome: '' },
      righe_appuntamento: servizi
    }
  };
}
