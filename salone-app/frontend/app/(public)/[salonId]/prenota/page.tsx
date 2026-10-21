"use client";

// La pagina con cui le clienti prenotano da sole: quella che finisce su
// Instagram, sul sito e su Google.
//
// Quattro passi, sempre nello stesso ordine in cui si prenota al telefono —
// che cosa, con chi, quando, chi sei — più la verifica del numero quando il
// salone manda gli SMS. Niente schermata di benvenuto: chi apre il link è già
// lì per prenotare, ogni tocco in più è una cliente in meno.
//
// Lo stile è quello del gestionale: stessi colori, stessi bottoni, stesse
// distanze. E la pagina si può aggiungere alla schermata Home del telefono:
// da lì si apre come un'app, direttamente su questo salone.

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Check, ChevronLeft, Clock, Phone, MapPin, Scissors, CalendarDays,
  ShieldCheck, AlertCircle, Loader2, Share, PlusSquare, Sparkles
} from 'lucide-react';
import { db } from '../../../../../../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { catalogoApi, dipendentiApi, disponibilitaApi, prenotazioneApi } from '@/lib/api-client';
import { faServizio } from '@/lib/operatori';
import { linkWhatsApp, whatsappDelSalone, cellulareValido } from '@/lib/contatti';
import { Fascia } from '@/lib/vetrina';
import { orariLiberi, operatoreLibero, chiaveGiorno, istante } from '@/lib/prenotazione';

interface Servizio {
  id: string;
  nome: string;
  prezzo_base: number;
  durata_minuti: number;
  categoria: string;
  note_pubbliche?: string;
  attivo?: boolean;
}

interface Salone { nome: string; indirizzo: string; telefono: string; logo: string; descrizione: string; whatsapp: string }

// Il benvenuto viene prima di tutto e non è un passo della barra.
type Passo = 'benvenuto' | 'servizi' | 'operatore' | 'quando' | 'dati' | 'verifica' | 'fatto';
const PASSI: { chiave: Passo; etichetta: string }[] = [
  { chiave: 'servizi', etichetta: 'Servizi' },
  { chiave: 'operatore', etichetta: 'Con chi' },
  { chiave: 'quando', etichetta: 'Quando' },
  { chiave: 'dati', etichetta: 'I tuoi dati' }
];

const QUALSIASI = 'qualsiasi';
const GIORNI_AVANTI = 30;

const euro = (n: number) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;
const durataScritta = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/** Il telefono da chiamare, ripulito per il link `tel:`. */
const linkTelefono = (t: string) => `tel:${(t || '').replace(/[^\d+]/g, '')}`;

export default function PrenotazionePubblica({ salonIdFisso }: { salonIdFisso?: string } = {}) {
  const parametri = useParams();
  // Su un indirizzo tutto del salone (prenota.rdsalon.com) il salone non sta
  // nel percorso: lo dice l'indirizzo.
  const salonId = salonIdFisso || parametri.salonId || '';
  const linkPrivacy = salonIdFisso ? '/privacy' : `/${salonId}/privacy`;

  const [salone, setSalone] = useState<Salone>({ nome: '', indirizzo: '', telefono: '', logo: '', descrizione: '', whatsapp: '' });
  const [catalogo, setCatalogo] = useState<Servizio[]>([]);
  const [operatori, setOperatori] = useState<any[]>([]);
  const [fasceOccupate, setFasceOccupate] = useState<Fascia[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  // Il benvenuto aspetta solo la scheda del salone, non listino e orari.
  const [caricamentoSalone, setCaricamentoSalone] = useState(true);

  const [passo, setPasso] = useState<Passo>('benvenuto');
  const [serviziScelti, setServiziScelti] = useState<string[]>([]);
  const [operatoreScelto, setOperatoreScelto] = useState<string>(QUALSIASI);
  const [giornoScelto, setGiornoScelto] = useState<string>('');
  const [oraScelta, setOraScelta] = useState<string>('');

  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  // GDPR: l'informativa letta è obbligatoria, le promozioni no.
  const [privacyLetta, setPrivacyLetta] = useState(false);
  const [promozioni, setPromozioni] = useState(false);

  const [codice, setCodice] = useState('');
  const [codiceMandatoA, setCodiceMandatoA] = useState('');
  const [attesaRinvio, setAttesaRinvio] = useState(0);
  // Secondi da quando è partito l'ultimo codice: dopo 90 si può inviare
  // lo stesso la richiesta, se il codice non arriva.
  const [secondiDalCodice, setSecondiDalCodice] = useState(0);
  const [telefonoToccato, setTelefonoToccato] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [smsAttivi, setSmsAttivi] = useState(false);

  const cima = useRef<HTMLDivElement>(null);

  // --- Caricamento ---------------------------------------------------------

  useEffect(() => {
    if (!salonId) return;
    const oggi = chiaveGiorno(new Date());
    Promise.all([
      catalogoApi.getPublic(salonId).then(d => setCatalogo(d.filter((s: Servizio) => s.attivo))).catch(() => {}),
      dipendentiApi.getPublic(salonId).then(d => setOperatori(d.filter((o: any) => o.attivo !== false))).catch(() => {}),
      disponibilitaApi.getPublic(salonId, oggi).then(el => setFasceOccupate(el.flatMap(d => d.fasce || []))).catch(() => {}),
      getDoc(doc(db, 'salons', salonId)).then(snap => {
        const d = (snap.data() as any)?.salonDetails || {};
        setSalone({
          nome: d.nomeSalone || '', indirizzo: d.indirizzo || '', telefono: d.telefono || '',
          logo: d.logoUrl || '', descrizione: d.descrizioneGenerale || '', whatsapp: d.whatsapp || ''
        });
      }).catch(() => {}).finally(() => setCaricamentoSalone(false))
    ]).finally(() => setCaricamento(false));
  }, [salonId]);

  // La pagina si presenta col nome del salone: nella scheda del browser, e
  // quando la si aggiunge alla schermata Home del telefono.
  useEffect(() => {
    if (!salonId) return;
    document.title = salone.nome ? `${salone.nome} · Prenota` : 'Prenota';
    impostaMeta('apple-mobile-web-app-title', salone.nome || 'Prenota');
    impostaMeta('apple-mobile-web-app-capable', 'yes');
    impostaMeta('theme-color', '#c026d3');
    // Il manifest dice al telefono che cosa aprire dall'icona: questa pagina,
    // di questo salone. Quello generico aprirebbe il gestionale.
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) { link = document.createElement('link'); link.rel = 'manifest'; document.head.appendChild(link); }
    link.href = `/api/manifest?salone=${encodeURIComponent(salonId)}`;
  }, [salonId, salone.nome]);

  useEffect(() => {
    if (passo !== 'verifica') return;
    const t = setInterval(() => setSecondiDalCodice(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [passo]);

  // Il conto alla rovescia per rimandare il codice.
  useEffect(() => {
    if (attesaRinvio <= 0) return;
    const t = setTimeout(() => setAttesaRinvio(a => a - 1), 1000);
    return () => clearTimeout(t);
  }, [attesaRinvio]);

  const vaiA = (p: Passo) => {
    setErrore(null);
    setPasso(p);
    window.scrollTo({ top: 0 });
  };

  // --- Quello che si è scelto ----------------------------------------------

  const categorie = useMemo(() => {
    const gruppi: Record<string, Servizio[]> = {};
    for (const s of catalogo) (gruppi[s.categoria || 'Altro'] ||= []).push(s);
    return gruppi;
  }, [catalogo]);

  const scelti = serviziScelti.map(id => catalogo.find(s => s.id === id)).filter((s): s is Servizio => !!s);
  const durata = scelti.reduce((t, s) => t + (s.durata_minuti || 0), 0);
  const prezzo = scelti.reduce((t, s) => t + (s.prezzo_base || 0), 0);

  // Solo chi sa fare tutti i servizi scelti: altrimenti la cliente prenota
  // con chi non può farglieli. Vale anche per "prima disponibile".
  const operatoriAdatti = operatori.filter(o => scelti.every(s => faServizio(o, s.id)));
  const operatoriPerOrari = operatoreScelto === QUALSIASI
    ? operatoriAdatti
    : operatoriAdatti.filter(o => o.id === operatoreScelto);

  // Se cambiando servizi l'operatrice scelta non li fa più, si torna a
  // "prima disponibile" invece di tenere una scelta impossibile.
  useEffect(() => {
    if (operatoreScelto !== QUALSIASI && !operatoriAdatti.some(o => o.id === operatoreScelto)) {
      setOperatoreScelto(QUALSIASI);
    }
  }, [serviziScelti.join(','), operatori]);

  const giorni = useMemo(() => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    return Array.from({ length: GIORNI_AVANTI }, (_, i) => {
      const d = new Date(oggi);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const chiaveOperatori = operatoriPerOrari.map(o => o.id).join(',');
  const liberiPerGiorno = useMemo(() => {
    const mappa: Record<string, string[]> = {};
    for (const g of giorni) mappa[chiaveGiorno(g)] = orariLiberi(g, operatoriPerOrari, durata, fasceOccupate);
    return mappa;
  }, [giorni, chiaveOperatori, durata, fasceOccupate]);

  // Si apre sul primo giorno che ha posto, non su un "oggi" già pieno.
  useEffect(() => {
    if (passo !== 'quando') return;
    if (giornoScelto && liberiPerGiorno[giornoScelto]?.length) return;
    const primo = giorni.find(g => liberiPerGiorno[chiaveGiorno(g)]?.length);
    setGiornoScelto(primo ? chiaveGiorno(primo) : chiaveGiorno(giorni[0]));
    setOraScelta('');
  }, [passo, liberiPerGiorno]);

  const giornoData = giorni.find(g => chiaveGiorno(g) === giornoScelto) || giorni[0];
  const orari = liberiPerGiorno[giornoScelto] || [];
  const nomeOperatore = operatoreScelto === QUALSIASI
    ? 'Prima disponibile'
    : (operatori.find(o => o.id === operatoreScelto)?.nome || '');

  const quandoScritto = giornoData && oraScelta
    ? `${giornoData.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} alle ${oraScelta}`
    : '';

  // --- Prenotazione --------------------------------------------------------

  const appuntamento = () => {
    const id = operatoreScelto === QUALSIASI
      ? operatoreLibero(giornoData, oraScelta, operatoriAdatti, durata, fasceOccupate)
      : operatoreScelto;
    const op = operatori.find(o => o.id === id);
    return {
      data_ora: istante(giornoData, oraScelta).toISOString(),
      note,
      clienti: { nome, cognome, telefono, email },
      id_dipendente: id || '',
      dipendenti: { nome: op?.nome || '', cognome: '' },
      righe_appuntamento: scelti.map(s => ({
        servizi_catalogo: { nome: s.nome, durata_minuti: s.durata_minuti, prezzo_base: s.prezzo_base }
      })),
      privacy: privacyLetta,
      marketing: promozioni
    };
  };

  // Il cellulare deve essere giusto (10 cifre, inizia con 3): a un fisso o a
  // un numero sbagliato il codice non arriverebbe mai.
  const controlloCellulare = cellulareValido(telefono);
  const datiCompleti = !!(nome.trim() && cognome.trim() && controlloCellulare.ok);

  const prenotaDavvero = async (conCodice: string, senzaCodice = false) => {
    await prenotazioneApi.prenota(salonId, appuntamento(), conCodice, senzaCodice);
    vaiA('fatto');
  };

  /** Il codice non arriva: si manda lo stesso la richiesta, il salone la vede "non verificata". */
  const inviaSenzaCodice = async () => {
    setInCorso(true);
    setErrore(null);
    try {
      await prenotaDavvero('', true);
    } catch (err: any) {
      setErrore(err?.message || 'Non sono riuscito a inviare la richiesta. Chiama il salone.');
    } finally {
      setInCorso(false);
    }
  };

  /** Primo tocco su "Conferma": si chiede il codice, se il salone lo usa. */
  const conferma = async () => {
    if (!datiCompleti) {
      setErrore(controlloCellulare.ok === false && telefono.trim() ? controlloCellulare.motivo : 'Servono nome, cognome e un numero di cellulare.');
      return;
    }
    setInCorso(true);
    setErrore(null);
    try {
      const risposta = await prenotazioneApi.chiediCodice(salonId, telefono);
      if (risposta.serveCodice) {
        setSmsAttivi(true);
        setCodiceMandatoA(risposta.a || telefono);
        setCodice('');
        setAttesaRinvio(60);
        setSecondiDalCodice(0);
        vaiA('verifica');
      } else {
        await prenotaDavvero('');
      }
    } catch (err: any) {
      setErrore(err?.message || 'Qualcosa non è andato. Riprova.');
    } finally {
      setInCorso(false);
    }
  };

  const verifica = async () => {
    setInCorso(true);
    setErrore(null);
    try {
      await prenotaDavvero(codice);
    } catch (err: any) {
      setErrore(err?.message || 'Codice non valido.');
    } finally {
      setInCorso(false);
    }
  };

  const rimanda = async () => {
    setInCorso(true);
    setErrore(null);
    try {
      const risposta = await prenotazioneApi.chiediCodice(salonId, telefono);
      if (!risposta.serveCodice) { await prenotaDavvero(''); return; }
      setAttesaRinvio(60);
      setSecondiDalCodice(0);
    } catch (err: any) {
      setErrore(err?.message || 'Non sono riuscito a rimandare il codice.');
    } finally {
      setInCorso(false);
    }
  };

  const ricomincia = () => {
    setServiziScelti([]); setOperatoreScelto(QUALSIASI); setGiornoScelto(''); setOraScelta('');
    setNote(''); setCodice(''); setErrore(null);
    vaiA('servizi');
  };

  const avanti = () => {
    if (passo === 'servizi') vaiA('operatore');
    else if (passo === 'operatore') vaiA('quando');
    else if (passo === 'quando') vaiA('dati');
    else if (passo === 'dati') conferma();
    else if (passo === 'verifica') verifica();
  };

  // --- Disegno -------------------------------------------------------------

  const indicePasso = PASSI.findIndex(p => p.chiave === passo);
  const indietro: Record<Passo, Passo | null> = {
    benvenuto: null, servizi: 'benvenuto', operatore: 'servizi', quando: 'operatore', dati: 'quando', verifica: 'dati', fatto: null
  };
  const bloccato =
    (passo === 'servizi' && scelti.length === 0) ||
    (passo === 'quando' && !oraScelta) ||
    (passo === 'dati' && (!datiCompleti || !privacyLetta)) ||
    (passo === 'verifica' && codice.length !== 6);

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900 font-sans" ref={cima}>

      {/* Il salone: chi è, dove sta, come si chiama. Nel benvenuto lo dice
          già la pagina, in grande: la testata serve dai passi in poi. */}
      {passo !== 'benvenuto' && (
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-xl mx-auto px-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-4 flex items-center gap-3">
          {salone.logo ? (
            <img src={salone.logo} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-200 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center font-playfair font-bold text-lg shrink-0">
              {(salone.nome || 'S').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-playfair font-bold text-lg leading-tight truncate">{salone.nome || 'Prenota il tuo appuntamento'}</h1>
            {salone.indirizzo && (
              <p className="text-xs text-zinc-500 flex items-center gap-1 truncate"><MapPin size={12} className="shrink-0" /> {salone.indirizzo}</p>
            )}
          </div>
          {salone.telefono && (
            <a href={linkTelefono(salone.telefono)} className="shrink-0 w-10 h-10 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50" aria-label="Chiama il salone">
              <Phone size={18} />
            </a>
          )}
        </div>

        {indicePasso >= 0 && (
          <nav className="max-w-xl mx-auto px-4 pb-3" aria-label="Passi della prenotazione">
            <ol className="grid grid-cols-4 gap-2">
              {PASSI.map((p, i) => (
                <li key={p.chiave} className="flex flex-col gap-1.5">
                  <span className={`h-1 rounded-full ${i <= indicePasso ? 'bg-fuchsia-600' : 'bg-zinc-200'}`} />
                  <span className={`text-[11px] font-medium ${i === indicePasso ? 'text-zinc-900' : 'text-zinc-400'}`}>{p.etichetta}</span>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>
      )}

      <main className="max-w-xl mx-auto px-4 py-5 pb-40">
        {indietro[passo] && (
          <button onClick={() => vaiA(indietro[passo]!)} className="mb-3 -ml-1 inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900">
            <ChevronLeft size={16} /> Indietro
          </button>
        )}

        {errore && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{errore}</span>
          </div>
        )}

        {(passo === 'benvenuto' ? caricamentoSalone : caricamento) && (
          <div className="py-16 flex justify-center text-zinc-400"><Loader2 className="animate-spin" /></div>
        )}

        {/* ---------- 1. Servizi ---------- */}
        {/* ---------- 0. Benvenuto ---------- */}
        {!caricamentoSalone && passo === 'benvenuto' && (
          <Benvenuto salone={salone} linkPrivacy={linkPrivacy} onPrenota={() => vaiA('servizi')} />
        )}

        {!caricamento && passo === 'servizi' && (
          <section>
            <h2 className="font-playfair font-bold text-2xl mb-1">Che cosa ti facciamo?</h2>
            <p className="text-sm text-zinc-500 mb-5">Puoi sceglierne più di uno: li facciamo di seguito, nello stesso appuntamento.</p>

            {catalogo.length === 0 && (
              <div className="p-8 bg-white border border-dashed border-zinc-300 rounded-2xl text-center text-sm text-zinc-500">
                <Scissors size={24} className="mx-auto mb-2 text-zinc-300" />
                Il listino online non è ancora pronto.
                {salone.telefono && <> Chiamaci al <a className="text-fuchsia-700 font-semibold" href={linkTelefono(salone.telefono)}>{salone.telefono}</a>.</>}
              </div>
            )}

            <div className="space-y-6">
              {Object.entries(categorie).map(([categoria, servizi]) => (
                <div key={categoria}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">{categoria}</h3>
                  <ul className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
                    {servizi.map(s => {
                      const scelto = serviziScelti.includes(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => setServiziScelti(p => scelto ? p.filter(x => x !== s.id) : [...p, s.id])}
                            className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors ${scelto ? 'bg-fuchsia-50' : 'hover:bg-zinc-50'}`}
                            aria-pressed={scelto}
                          >
                            <span className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${scelto ? 'bg-fuchsia-600 border-fuchsia-600' : 'border-zinc-300'}`}>
                              {scelto && <Check size={13} className="text-white" strokeWidth={3} />}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-semibold text-[15px]">{s.nome}</span>
                              <span className="block text-xs text-zinc-500 mt-0.5">{durataScritta(s.durata_minuti)}</span>
                              {s.note_pubbliche && <span className="block text-xs text-zinc-400 mt-1">{s.note_pubbliche}</span>}
                            </span>
                            <span className="text-sm font-semibold text-zinc-700 shrink-0">{s.prezzo_base > 0 ? euro(s.prezzo_base) : 'da definire'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- 2. Con chi ---------- */}
        {!caricamento && passo === 'operatore' && (
          <section>
            <h2 className="font-playfair font-bold text-2xl mb-1">Con chi?</h2>
            <p className="text-sm text-zinc-500 mb-5">Se non hai preferenze, ti diamo il primo orario libero.</p>
            <ul className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
              {[{ id: QUALSIASI, nome: 'Prima disponibile', sotto: 'Il primo orario libero, con chiunque' },
                ...operatoriAdatti.map(o => ({ id: o.id, nome: o.nome || '', sotto: o.ruolo || '' }))].map(o => {
                const scelta = operatoreScelto === o.id;
                return (
                  <li key={o.id}>
                    <button onClick={() => setOperatoreScelto(o.id)} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 ${scelta ? 'bg-fuchsia-50' : 'hover:bg-zinc-50'}`} aria-pressed={scelta}>
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${o.id === QUALSIASI ? 'bg-zinc-100 text-zinc-500' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                        {o.id === QUALSIASI ? <Sparkles size={16} /> : o.nome.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold">{o.nome}</span>
                        {o.sotto && <span className="block text-xs text-zinc-500">{o.sotto}</span>}
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${scelta ? 'bg-fuchsia-600 border-fuchsia-600' : 'border-zinc-300'}`}>
                        {scelta && <Check size={12} className="text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* ---------- 3. Quando ---------- */}
        {!caricamento && passo === 'quando' && (
          <section>
            <h2 className="font-playfair font-bold text-2xl mb-1">Quando ti va bene?</h2>
            <p className="text-sm text-zinc-500 mb-4">{durataScritta(durata)} · {nomeOperatore}</p>

            {/* I giorni scorrono di lato: si vede subito quali hanno posto. */}
            <div className="-mx-4 px-4 overflow-x-auto pb-2">
              <div className="flex gap-2 w-max">
                {giorni.map((g, i) => {
                  const chiave = chiaveGiorno(g);
                  const pieno = !(liberiPerGiorno[chiave]?.length);
                  const scelto = chiave === giornoScelto;
                  return (
                    <button
                      key={chiave}
                      onClick={() => { setGiornoScelto(chiave); setOraScelta(''); }}
                      disabled={pieno}
                      className={`w-16 py-2.5 rounded-xl border text-center transition-colors ${
                        scelto ? 'bg-fuchsia-600 border-fuchsia-600 text-white'
                        : pieno ? 'bg-zinc-50 border-zinc-200 text-zinc-300'
                        : 'bg-white border-zinc-200 text-zinc-800 hover:border-fuchsia-400'}`}
                    >
                      <span className="block text-[11px] uppercase font-semibold">{i === 0 ? 'Oggi' : i === 1 ? 'Domani' : g.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                      <span className="block text-lg font-bold leading-tight">{g.getDate()}</span>
                      <span className="block text-[11px]">{g.toLocaleDateString('it-IT', { month: 'short' })}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <h3 className="mt-5 mb-2 text-sm font-semibold text-zinc-700 capitalize">
              {giornoData?.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            {orari.length === 0 ? (
              <div className="p-6 bg-white border border-dashed border-zinc-300 rounded-2xl text-center text-sm text-zinc-500">
                In questo giorno non c'è posto. Prova un altro giorno{operatoreScelto !== QUALSIASI ? ', o scegli "Prima disponibile"' : ''}.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {orari.map(o => (
                  <button
                    key={o}
                    onClick={() => setOraScelta(o)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
                      oraScelta === o ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'bg-white border-zinc-200 hover:border-fuchsia-400'}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---------- 4. I tuoi dati ---------- */}
        {!caricamento && passo === 'dati' && (
          <section>
            <h2 className="font-playfair font-bold text-2xl mb-4">Ultimo passo</h2>

            <Riepilogo scelti={scelti} durata={durata} prezzo={prezzo} quando={quandoScritto} operatore={nomeOperatore} />

            <form className="mt-5 space-y-3" onSubmit={e => { e.preventDefault(); conferma(); }}>
              <div className="grid grid-cols-2 gap-3">
                <Campo etichetta="Nome" valore={nome} cambia={setNome} autocomplete="given-name" />
                <Campo etichetta="Cognome" valore={cognome} cambia={setCognome} autocomplete="family-name" />
              </div>
              <Campo etichetta="Cellulare" valore={telefono} cambia={setTelefono} tipo="tel" autocomplete="tel" segnaposto="333 123 4567"
                alUscire={() => setTelefonoToccato(true)}
                errore={(telefonoToccato || telefono.replace(/\D/g, '').length >= 10) && controlloCellulare.ok === false ? controlloCellulare.motivo : undefined} />
              <Campo etichetta="Email" facoltativo valore={email} cambia={setEmail} tipo="email" autocomplete="email" />
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Note <span className="text-zinc-400 font-normal">· facoltative</span></label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                  className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-[15px] outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 resize-none"
                  placeholder="Preferenze, richieste particolari…" />
              </div>
              <div className="pt-1 space-y-2.5">
                <label className="flex items-start gap-2.5 text-sm text-zinc-700 cursor-pointer select-none">
                  <input type="checkbox" checked={privacyLetta} onChange={e => setPrivacyLetta(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-fuchsia-600 shrink-0" />
                  <span>
                    Ho letto l'<a href={linkPrivacy} target="_blank" rel="noopener noreferrer" className="text-fuchsia-700 font-medium underline underline-offset-2">informativa privacy</a>
                    <span className="text-zinc-400"> · obbligatorio</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-sm text-zinc-700 cursor-pointer select-none">
                  <input type="checkbox" checked={promozioni} onChange={e => setPromozioni(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-fuchsia-600 shrink-0" />
                  <span>
                    Voglio ricevere offerte e novità del salone
                    <span className="text-zinc-400"> · facoltativo</span>
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-400 flex items-start gap-1.5">
                <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                Usiamo i tuoi dati per questo appuntamento e per ricordartelo; per le offerte solo se lo scegli tu.
              </p>
              <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
            </form>
          </section>
        )}

        {/* ---------- Verifica del numero ---------- */}
        {passo === 'verifica' && (
          <section>
            <h2 className="font-playfair font-bold text-2xl mb-1">Controlla i messaggi</h2>
            <p className="text-sm text-zinc-500 mb-5">
              Ti abbiamo mandato un codice di 6 cifre al <strong className="text-zinc-800 whitespace-nowrap">{codiceMandatoA}</strong>.
              Serve a sapere che il numero è giusto: è lì che ti confermiamo l'appuntamento.
            </p>
            <form onSubmit={e => { e.preventDefault(); if (codice.length === 6) verifica(); }}>
              <input
                value={codice}
                onChange={e => setCodice(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                aria-label="Codice di 6 cifre"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] tabular-nums py-4 bg-white border border-zinc-300 rounded-2xl outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500"
                placeholder="••••••"
              />
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <button onClick={() => vaiA('dati')} className="text-zinc-500 hover:text-zinc-900 font-medium">Cambia numero</button>
              <button onClick={rimanda} disabled={attesaRinvio > 0 || inCorso} className="font-semibold text-fuchsia-700 disabled:text-zinc-400">
                {attesaRinvio > 0 ? `Rimanda fra ${attesaRinvio}s` : 'Rimanda il codice'}
              </button>
            </div>

            {/* Il codice a volte non arriva (tablet del salone senza rete o
                in risparmio energetico): dopo 90 secondi non si resta bloccati. */}
            {secondiDalCodice >= 90 ? (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-semibold text-zinc-900">Non ti arriva il codice?</p>
                <p className="text-sm text-zinc-600 mt-1">
                  Invia lo stesso la richiesta: il salone la riceve e ti conferma l'appuntamento.
                </p>
                <button
                  onClick={inviaSenzaCodice}
                  disabled={inCorso}
                  className="mt-3 w-full py-3 rounded-xl bg-white border border-amber-300 text-sm font-semibold text-zinc-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Invia lo stesso la richiesta
                </button>
                {salone.telefono && (
                  <a href={linkTelefono(salone.telefono)} className="mt-2 block text-center text-sm text-zinc-600">
                    oppure chiamaci al <span className="font-semibold text-zinc-900">{salone.telefono}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-6 text-xs text-zinc-400 text-center">
                Se il codice non arriva, fra {90 - secondiDalCodice} secondi potrai inviare lo stesso la richiesta.
              </p>
            )}
          </section>
        )}

        {/* ---------- Fatto ---------- */}
        {passo === 'fatto' && (
          <section className="text-center pt-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="font-playfair font-bold text-2xl mb-2">Richiesta inviata</h2>
            <p className="text-sm text-zinc-600 mb-6 max-w-sm mx-auto">
              {smsAttivi
                ? "Il salone controlla l'agenda e ti conferma con un SMS. Il giorno prima ti mandiamo un promemoria."
                : `Il salone controlla l'agenda e ti ricontatta al ${telefono}.`}
            </p>
            <div className="text-left">
              <Riepilogo scelti={scelti} durata={durata} prezzo={prezzo} quando={quandoScritto} operatore={nomeOperatore} />
            </div>

            <AggiungiAllaHome nomeSalone={salone.nome} />

            <button onClick={ricomincia} className="mt-6 text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800">
              Prenota un altro appuntamento
            </button>
          </section>
        )}
      </main>

      {/* La barra in fondo: che cosa si è scelto e il bottone per andare avanti. */}
      {passo !== 'fatto' && passo !== 'benvenuto' && !caricamento && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-zinc-200 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="max-w-xl mx-auto px-4 pt-3 flex items-center gap-3">
            <div className="flex-1 min-w-0 text-sm">
              {scelti.length > 0 ? (
                <>
                  <div className="font-semibold truncate">{scelti.length === 1 ? scelti[0].nome : `${scelti.length} servizi`}</div>
                  <div className="text-xs text-zinc-500">{durataScritta(durata)}{prezzo > 0 ? ` · ${euro(prezzo)}` : ''}</div>
                </>
              ) : <span className="text-zinc-400">Nessun servizio scelto</span>}
            </div>
            <button
              onClick={avanti}
              disabled={bloccato || inCorso}
              className="shrink-0 px-6 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-zinc-300 text-white font-semibold text-[15px] flex items-center gap-2 transition-colors"
            >
              {inCorso && <Loader2 size={16} className="animate-spin" />}
              {passo === 'dati' ? 'Conferma' : passo === 'verifica' ? 'Prenota' : 'Continua'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pezzi -----------------------------------------------------------------

/** Il simbolo di WhatsApp, nel suo verde: si riconosce al volo. */
function IconaWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0" fill="#25D366">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

/**
 * La prima cosa che vede la cliente: il salone, un grazie, e un pulsante solo.
 * Tutto viene dalle Impostazioni del salone (nome, logo, via, telefono,
 * descrizione), così vale per ogni salone senza scrivere niente a mano.
 */
function Benvenuto({ salone, linkPrivacy, onPrenota }: { salone: Salone; linkPrivacy: string; onPrenota: () => void }) {
  const whatsapp = whatsappDelSalone(salone.whatsapp, salone.telefono);
  const linkWa = whatsapp ? linkWhatsApp(whatsapp, `Ciao ${salone.nome || ''}! `.replace(' !', '!')) : '';
  const mappa = salone.indirizzo
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salone.nome} ${salone.indirizzo}`.trim())}`
    : '';
  return (
    <section className="pt-[max(env(safe-area-inset-top),1.5rem)] flex flex-col items-center text-center">
      {salone.logo ? (
        <img src={salone.logo} alt="" className="w-28 h-28 rounded-3xl object-cover border border-zinc-200 shadow-sm bg-white" />
      ) : (
        <div className="w-28 h-28 rounded-3xl bg-fuchsia-600 text-white flex items-center justify-center font-playfair font-bold text-5xl shadow-[0_10px_30px_rgba(192,38,211,0.35)]">
          {(salone.nome || 'S').trim().charAt(0).toUpperCase()}
        </div>
      )}

      <h1 className="mt-6 font-playfair font-bold text-3xl leading-tight break-words">{salone.nome || 'Il tuo salone'}</h1>
      <p className="mt-5 text-lg font-semibold text-zinc-900">Ti diamo il benvenuto!</p>
      <p className="mt-1.5 text-[15px] text-zinc-600 max-w-sm leading-relaxed">
        Grazie per averci scelto. Prenota il tuo servizio online in pochi passaggi.
      </p>

      <button
        onClick={onPrenota}
        className="mt-7 w-full max-w-sm py-4 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 active:scale-[0.99] text-white font-semibold text-lg shadow-[0_10px_25px_rgba(192,38,211,0.35)] transition flex items-center justify-center gap-2"
      >
        <CalendarDays size={20} /> Prenota ora
      </button>

      {(salone.indirizzo || salone.telefono || linkWa) && (
        <div className="mt-8 w-full max-w-sm bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 text-left">
          {salone.indirizzo && (
            <a href={mappa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 rounded-t-2xl">
              <MapPin size={18} className="text-fuchsia-600 shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-zinc-800 break-words">{salone.indirizzo}</span>
              <span className="text-xs text-zinc-400 shrink-0">Mappa</span>
            </a>
          )}
          {salone.telefono && (
            <a href={linkTelefono(salone.telefono)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 last:rounded-b-2xl">
              <Phone size={18} className="text-fuchsia-600 shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-zinc-800">{salone.telefono}</span>
              <span className="text-xs text-zinc-400 shrink-0">Chiama</span>
            </a>
          )}
          {linkWa && (
            <a href={linkWa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 last:rounded-b-2xl">
              <IconaWhatsApp />
              <span className="flex-1 min-w-0 text-sm text-zinc-800">Scrivici su WhatsApp</span>
              <span className="text-xs text-zinc-400 shrink-0">Apri</span>
            </a>
          )}
        </div>
      )}

      {salone.descrizione.trim() && (
        <p className="mt-6 w-full max-w-sm text-sm text-zinc-500 leading-relaxed whitespace-pre-line text-left">{salone.descrizione}</p>
      )}

      <a href={linkPrivacy} target="_blank" rel="noopener noreferrer" className="mt-10 text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-600">
        Informativa privacy
      </a>
    </section>
  );
}

function impostaMeta(nome: string, contenuto: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${nome}"]`);
  if (!meta) { meta = document.createElement('meta'); meta.name = nome; document.head.appendChild(meta); }
  meta.content = contenuto;
}

function Riepilogo({ scelti, durata, prezzo, quando, operatore }: { scelti: Servizio[]; durata: number; prezzo: number; quando: string; operatore: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
      <ul className="space-y-1">
        {scelti.map(s => (
          <li key={s.id} className="flex justify-between gap-3 text-sm">
            <span className="font-semibold">{s.nome}</span>
            <span className="text-zinc-500 shrink-0">{s.prezzo_base > 0 ? euro(s.prezzo_base) : ''}</span>
          </li>
        ))}
      </ul>
      <div className="pt-3 border-t border-zinc-100 grid grid-cols-1 gap-1.5 text-sm text-zinc-600">
        {quando && <span className="flex items-center gap-2 first-letter:uppercase"><CalendarDays size={15} className="text-fuchsia-600 shrink-0" /> {quando}</span>}
        <span className="flex items-center gap-2"><Clock size={15} className="text-fuchsia-600 shrink-0" /> {durataScritta(durata)}{operatore ? ` · ${operatore}` : ''}</span>
      </div>
      {prezzo > 0 && (
        <div className="pt-3 border-t border-zinc-100 flex justify-between text-sm">
          <span className="text-zinc-500">Totale indicativo</span>
          <span className="font-bold">{euro(prezzo)}</span>
        </div>
      )}
    </div>
  );
}

function Campo({ etichetta, valore, cambia, tipo = 'text', autocomplete, segnaposto, facoltativo, errore, alUscire }: {
  etichetta: string; valore: string; cambia: (v: string) => void; tipo?: string; autocomplete?: string; segnaposto?: string; facoltativo?: boolean;
  /** Un problema con quello che è scritto: si dice sotto il campo, in rosso. */
  errore?: string;
  alUscire?: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-600 mb-1">
        {etichetta} {facoltativo && <span className="text-zinc-400 font-normal">· facoltativa</span>}
      </label>
      <input
        type={tipo}
        value={valore}
        onChange={e => cambia(e.target.value)}
        autoComplete={autocomplete}
        inputMode={tipo === 'tel' ? 'tel' : undefined}
        placeholder={segnaposto}
        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-[15px] outline-none focus:ring-1 ${errore ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-zinc-300 focus:border-fuchsia-500 focus:ring-fuchsia-500'}`}
        aria-invalid={!!errore}
        onBlur={alUscire}
      />
      {errore && <p className="mt-1 text-xs text-red-600">{errore}</p>}
    </div>
  );
}

/**
 * L'invito ad aggiungere la pagina alla schermata Home.
 *
 * Su Android il telefono offre da sé di installarla, e il bottone la installa
 * con un tocco. Su iPhone non esiste un bottone del genere: si spiega il
 * gesto, Condividi → Aggiungi alla schermata Home. Se la pagina è già aperta
 * come app, l'invito non compare.
 */
function AggiungiAllaHome({ nomeSalone }: { nomeSalone: string }) {
  const [richiesta, setRichiesta] = useState<any>(null);
  const [fatto, setFatto] = useState(false);

  const giaApp = typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
  const iPhone = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const prendi = (e: Event) => { e.preventDefault(); setRichiesta(e); };
    window.addEventListener('beforeinstallprompt', prendi);
    return () => window.removeEventListener('beforeinstallprompt', prendi);
  }, []);

  if (giaApp || fatto) return null;
  if (!richiesta && !iPhone) return null;

  return (
    <div className="mt-6 p-4 bg-fuchsia-50 border border-fuchsia-100 rounded-2xl text-left">
      <p className="text-sm font-semibold text-zinc-900 mb-1">La prossima volta, prenota con un tocco</p>
      {richiesta ? (
        <>
          <p className="text-sm text-zinc-600 mb-3">Metti {nomeSalone || 'il salone'} fra le app del telefono.</p>
          <button
            onClick={async () => { richiesta.prompt(); await richiesta.userChoice?.catch?.(() => null); setFatto(true); }}
            className="px-4 py-2 rounded-xl bg-fuchsia-600 text-white text-sm font-semibold"
          >
            Aggiungi alla schermata Home
          </button>
        </>
      ) : (
        <p className="text-sm text-zinc-600">
          Tocca <Share size={14} className="inline -mt-0.5" /> <strong>Condividi</strong> in basso, poi
          {' '}<PlusSquare size={14} className="inline -mt-0.5" /> <strong>Aggiungi alla schermata Home</strong>.
        </p>
      )}
    </div>
  );
}
