'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { buoniApi } from '@/lib/api-client';
import { aNumero, aTesto } from '@/lib/numeri';
import FloatingActionBar from '@/components/FloatingActionBar';
import ImportaBuoni from '@/components/ImportaBuoni';
import {
  PREZZO_SPA, PREZZO_PIEGA, prezzoSpa, canaleDi, persone, noteVisibili,
  filtraBuoni, riepilogo, isScaduto, tipoDi, type Tipo, type Canale
} from '@/lib/buoni';
import {
  Ticket, Plus, Search, X, Edit2, Trash2, Check, AlertCircle,
  Euro, Calendar, User, Sparkles, Scissors, Upload, Gift, Globe, Store, RefreshCw
} from 'lucide-react';

interface Buono {
  id: string;
  codice: string;
  tipo: 'spa' | 'salone';
  valore: number;
  valore_residuo: number;
  /** Per chi è. */
  intestatario?: string;
  telefono?: string;
  /** Chi lo regala, cioè chi ha pagato. */
  acquirente?: string;
  acquirente_telefono?: string;
  acquirente_email?: string;
  data_emissione?: string;
  data_scadenza?: string;
  stato: 'attivo' | 'usato' | 'annullato';
  origine?: string;
  note?: string;
  /** Il buono comprende anche la piega: dipende da quanto è stato pagato. */
  piega_inclusa?: boolean;
}

const STATI = {
  attivo: { etichetta: 'Attivo', classe: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  usato: { etichetta: 'Usato', classe: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  annullato: { etichetta: 'Annullato', classe: 'bg-red-50 text-red-700 border-red-200' }
};

const oggi = () => new Date().toISOString().split('T')[0];

const fraUnAnno = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

/** Codice leggibile al telefono: niente caratteri che si confondono. */
function generaCodice() {
  const alfabeto = 'ACDEFGHJKLMNPQRTUVWXY3456789';
  const gruppo = () => Array.from({ length: 4 }, () => alfabeto[Math.floor(Math.random() * alfabeto.length)]).join('');
  return `RSY-${gruppo()}-${gruppo()}`;
}

const euro = (n: number) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;

const formattaData = (iso?: string) => {
  if (!iso) return '—';
  const [a, m, g] = iso.split('-');
  return `${g}/${m}/${a}`;
};

export default function BuoniSpa() {
  const [buoni, setBuoni] = useState<Buono[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const [ricerca, setRicerca] = useState('');
  const [filtro, setFiltro] = useState<'tutti' | 'attivo' | 'usato' | 'annullato'>('tutti');
  // Spa e salone sono due registri separati: non si vedono mai mescolati.
  const [tipoAttivo, setTipoAttivo] = useState<Tipo>('spa');
  const [canale, setCanale] = useState<'tutti' | Canale>('tutti');

  const [dettaglio, setDettaglio] = useState<Buono | null>(null);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Buono | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [erroreForm, setErroreForm] = useState<string | null>(null);
  const [confermaEliminazione, setConfermaEliminazione] = useState<Buono | null>(null);
  const [importAperto, setImportAperto] = useState(false);

  // Il foglio Google dei buoni pagati online: si legge da solo all'apertura.
  const [foglio, setFoglio] = useState<{
    stato: 'spento' | 'leggo' | 'fatto' | 'errore';
    aggiunti?: number;
    ora?: string;
    errore?: string;
  }>({ stato: 'spento' });

  const [utilizzo, setUtilizzo] = useState<{ buono: Buono; importo: string } | null>(null);

  const [form, setForm] = useState({
    codice: '',
    tipo: 'spa' as Tipo,
    valore: String(PREZZO_SPA),
    piega_inclusa: false,
    canale: 'salone' as Canale,
    acquirente: '',
    acquirente_telefono: '',
    acquirente_email: '',
    stessaPersona: true,
    intestatario: '',
    telefono: '',
    data_scadenza: fraUnAnno(),
    note: ''
  });
  // Il prezzo di un buono spa lo decide la piega. In modifica si tiene quello
  // salvato finché non si cambia la spunta: i buoni vecchi potevano costare
  // diversamente e non si devono ritoccare da soli.
  const [prezzoLibero, setPrezzoLibero] = useState(false);

  const caricaBuoni = async () => {
    setCaricamento(true);
    setErrore(null);
    try {
      const dati = await buoniApi.getAll();
      dati.sort((a: any, b: any) => (b.data_emissione || '').localeCompare(a.data_emissione || ''));
      setBuoni(dati);
    } catch (e: any) {
      setErrore(e.message || 'Non sono riuscito a caricare i buoni.');
    } finally {
      setCaricamento(false);
    }
  };

  const aggiornaDalFoglio = async () => {
    setFoglio(f => ({ ...f, stato: f.stato === 'spento' ? 'spento' : 'leggo' }));
    try {
      const esito = await buoniApi.aggiornaDalFoglio();
      if (!esito.acceso) { setFoglio({ stato: 'spento' }); return; }
      const ora = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      if (esito.errore) { setFoglio({ stato: 'errore', errore: esito.errore, ora }); return; }
      setFoglio({ stato: 'fatto', aggiunti: esito.aggiunti || 0, ora });
      if (esito.aggiunti) caricaBuoni();
    } catch {
      // Senza rete o senza server la pagina funziona lo stesso: il foglio si
      // rilegge la prossima volta.
      setFoglio(f => (f.stato === 'spento' ? f : { ...f, stato: 'errore', errore: 'Non riesco a raggiungere il server.' }));
    }
  };

  // Il foglio si legge una volta sola all'apertura, anche se React monta la
  // pagina due volte: la seconda lettura direbbe "nessuno nuovo" e
  // nasconderebbe quelli appena arrivati.
  const foglioLetto = useRef(false);
  useEffect(() => {
    caricaBuoni();
    if (!foglioLetto.current) { foglioLetto.current = true; aggiornaDalFoglio(); }
  }, []);

  const apriNuovo = () => {
    setInModifica(null);
    setForm({
      codice: generaCodice(),
      tipo: tipoAttivo,
      valore: tipoAttivo === 'spa' ? String(PREZZO_SPA) : '',
      piega_inclusa: false,
      canale: 'salone',
      acquirente: '',
      acquirente_telefono: '',
      acquirente_email: '',
      stessaPersona: true,
      intestatario: '',
      telefono: '',
      data_scadenza: fraUnAnno(),
      note: ''
    });
    setPrezzoLibero(false);
    setErroreForm(null);
    setModaleAperta(true);
  };

  const apriModifica = (b: Buono) => {
    setInModifica(b);
    const { regala, riceve, stessa } = persone(b);
    setForm({
      codice: b.codice,
      tipo: tipoDi(b),
      valore: aTesto(b.valore),
      piega_inclusa: !!b.piega_inclusa,
      canale: canaleDi(b),
      acquirente: regala.nome,
      acquirente_telefono: regala.telefono,
      acquirente_email: regala.email,
      stessaPersona: stessa,
      intestatario: riceve.nome,
      telefono: riceve.telefono,
      data_scadenza: b.data_scadenza || '',
      note: noteVisibili(b)
    });
    // Un buono spa che costa già il prezzo giusto segue la spunta; uno
    // vecchio con un importo diverso lo tiene.
    setPrezzoLibero(tipoDi(b) === 'spa' && aNumero(b.valore) !== prezzoSpa(!!b.piega_inclusa));
    setErroreForm(null);
    setModaleAperta(true);
  };

  const valoreForm = form.tipo === 'spa' && !prezzoLibero
    ? prezzoSpa(form.piega_inclusa)
    : aNumero(form.valore);

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreForm(null);

    if (!form.codice.trim()) { setErroreForm('Il codice è obbligatorio.'); return; }
    if (!(valoreForm > 0)) { setErroreForm('Il valore deve essere maggiore di zero.'); return; }

    const doppione = buoni.find(b => b.codice.toUpperCase() === form.codice.trim().toUpperCase() && b.id !== inModifica?.id);
    if (doppione) { setErroreForm('Esiste già un buono con questo codice.'); return; }

    if (!form.acquirente.trim()) { setErroreForm('Scrivi chi regala il buono.'); return; }
    if (!form.stessaPersona && !form.intestatario.trim()) { setErroreForm('Scrivi per chi è il buono.'); return; }

    setSalvataggio(true);
    try {
      const acquirente = form.acquirente.trim();
      const acquirenteTelefono = form.acquirente_telefono.trim();
      const dati: any = {
        codice: form.codice.trim().toUpperCase(),
        tipo: form.tipo,
        valore: valoreForm,
        piega_inclusa: form.piega_inclusa,
        acquirente,
        acquirente_telefono: acquirenteTelefono,
        acquirente_email: form.acquirente_email.trim(),
        intestatario: form.stessaPersona ? acquirente : form.intestatario.trim(),
        telefono: form.stessaPersona ? acquirenteTelefono : form.telefono.trim(),
        data_scadenza: form.data_scadenza,
        note: form.note.trim()
      };
      // Online o in salone si sceglie solo per i buoni fatti a mano: quelli
      // arrivati dal foglio restano "foglio", che vuol dire già online.
      if (!inModifica || canaleDi(inModifica) !== form.canale) {
        dati.origine = form.canale === 'online' ? 'online' : 'manuale';
      }

      if (inModifica) {
        // Se cambia il valore, il residuo lo segue solo se il buono è intatto.
        if (inModifica.valore_residuo === inModifica.valore) dati.valore_residuo = dati.valore;
        await buoniApi.update(inModifica.id, dati);
      } else {
        await buoniApi.create({
          ...dati,
          valore_residuo: dati.valore,
          data_emissione: oggi(),
          stato: 'attivo',
          origine: dati.origine
        });
      }
      setModaleAperta(false);
      caricaBuoni();
    } catch (err: any) {
      setErroreForm(err.message || 'Errore durante il salvataggio.');
    } finally {
      setSalvataggio(false);
    }
  };

  const registraUtilizzo = async () => {
    if (!utilizzo) return;
    const importo = Number(utilizzo.importo.replace(',', '.'));
    if (!(importo > 0)) return;

    const residuo = Math.max(0, utilizzo.buono.valore_residuo - importo);
    try {
      await buoniApi.update(utilizzo.buono.id, {
        valore_residuo: residuo,
        stato: residuo === 0 ? 'usato' : 'attivo'
      });
      setUtilizzo(null);
      setDettaglio(null);
      caricaBuoni();
    } catch {
      setErrore("Non sono riuscito a registrare l'utilizzo.");
    }
  };

  const elimina = async (b: Buono) => {
    try {
      await buoniApi.delete(b.id);
      setConfermaEliminazione(null);
      setDettaglio(null);
      caricaBuoni();
    } catch {
      setErrore('Non sono riuscito a eliminare il buono.');
    }
  };

  const delTipo = useMemo(() => buoni.filter(b => tipoDi(b) === tipoAttivo), [buoni, tipoAttivo]);
  const elencoFiltrato = useMemo(
    () => filtraBuoni(buoni, { tipo: tipoAttivo, canale, stato: filtro, ricerca }),
    [buoni, tipoAttivo, canale, filtro, ricerca]
  );
  const totali = riepilogo(delTipo);
  const quanti = (t: Tipo) => buoni.filter(b => tipoDi(b) === t).length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">

      <header className="mb-6">
        <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
          <Ticket className="text-fuchsia-500" size={28} />
          Buoni
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Il registro dei buoni spa e salone, al posto del foglio di carta.
        </p>
      </header>

      {/* Spa e salone: due registri, uno alla volta */}
      <div className="grid grid-cols-2 gap-2 mb-6 bg-white border border-zinc-200 rounded-xl p-1.5 max-w-md">
        {([['spa', 'Buoni Spa', Sparkles], ['salone', 'Buoni Salone', Scissors]] as const).map(([valore, etichetta, Icona]) => (
          <button
            key={valore}
            onClick={() => { setTipoAttivo(valore); setDettaglio(null); }}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              tipoAttivo === valore
                ? valore === 'spa' ? 'bg-cyan-50 text-cyan-700' : 'bg-fuchsia-50 text-fuchsia-700'
                : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <Icona size={16} /> {etichetta}
            <span className="text-xs font-medium tabular-nums opacity-70">{quanti(valore)}</span>
          </button>
        ))}
      </div>

      {foglio.stato !== 'spento' && (
        <div className={`mb-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${
          foglio.stato === 'errore' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-sky-50/60 border-sky-100 text-sky-900'
        }`}>
          {foglio.stato === 'errore' ? <AlertCircle size={15} className="shrink-0" /> : <Globe size={15} className="shrink-0 text-sky-600" />}
          <span className="flex-1 min-w-0">
            {foglio.stato === 'leggo' && 'Leggo i buoni online dal foglio...'}
            {foglio.stato === 'fatto' && (
              <>
                Buoni online aggiornati dal foglio alle {foglio.ora}
                {foglio.aggiunti ? <strong> · {foglio.aggiunti} {foglio.aggiunti === 1 ? 'nuovo' : 'nuovi'}</strong> : ' · nessuno nuovo'}
              </>
            )}
            {foglio.stato === 'errore' && <>Il foglio dei buoni online non si legge: {foglio.errore}</>}
          </span>
          <button
            onClick={aggiornaDalFoglio}
            disabled={foglio.stato === 'leggo'}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={12} className={foglio.stato === 'leggo' ? 'animate-spin' : ''} /> Aggiorna
          </button>
        </div>
      )}

      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Buoni attivi</div>
          <div className="text-2xl font-playfair font-bold text-zinc-900 tabular-nums">{totali.attivi}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Da scalare</div>
          <div className="text-2xl font-playfair font-bold text-fuchsia-600 tabular-nums">{euro(totali.daScalare)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Scaduti</div>
          <div className="text-2xl font-playfair font-bold text-amber-600 tabular-nums">
            {totali.scaduti}
          </div>
        </div>
      </div>

      {/* Ricerca e filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={ricerca}
            onChange={e => setRicerca(e.target.value)}
            placeholder="Cerca codice, nome o telefono..."
            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
            {([['tutti', 'Tutti'], ['online', 'Online'], ['salone', 'In salone']] as const).map(([chiave, etichetta]) => (
              <button
                key={chiave}
                onClick={() => setCanale(chiave)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                  canale === chiave ? 'bg-fuchsia-50 text-fuchsia-700' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {etichetta}
              </button>
            ))}
          </div>
          <select
            value={filtro}
            onChange={e => setFiltro(e.target.value as any)}
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:border-fuchsia-400"
            aria-label="Stato del buono"
          >
            <option value="tutti">Tutti gli stati</option>
            <option value="attivo">Attivi</option>
            <option value="usato">Usati</option>
            <option value="annullato">Annullati</option>
          </select>
        </div>
      </div>

      {errore && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {errore}
        </div>
      )}

      {/* Elenco in sola lettura: la modifica si apre a parte */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {caricamento ? (
          <div className="p-10 text-center text-zinc-400 text-sm animate-pulse">Carico i buoni...</div>
        ) : elencoFiltrato.length === 0 ? (
          <div className="p-10 flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-zinc-100 rounded-full text-zinc-400"><Ticket size={22} /></div>
            <p className="text-sm font-medium text-zinc-700">
              {delTipo.length === 0 ? `Nessun buono ${tipoAttivo} registrato` : 'Nessun buono trovato'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm">
              {delTipo.length === 0
                ? 'Quando vendi un buono registralo qui: lo ritrovi cercando il codice.'
                : 'Prova a cambiare filtro o testo di ricerca.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {elencoFiltrato.map(b => {
              const scaduto = isScaduto(b);
              const { regala, riceve, stessa } = persone(b);
              const online = canaleDi(b) === 'online';
              const stato = STATI[b.stato] || STATI.attivo;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => setDettaglio(b)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      b.tipo === 'spa' ? 'bg-cyan-50 text-cyan-600' : 'bg-fuchsia-50 text-fuchsia-600'
                    }`}>
                      {b.tipo === 'spa' ? <Sparkles size={16} /> : <Scissors size={16} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm text-zinc-900">{b.codice}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${stato.classe}`}>
                          {stato.etichetta}
                        </span>
                        {scaduto && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                            Scaduto
                          </span>
                        )}
                        {online && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border bg-sky-50 text-sky-700 border-sky-200 inline-flex items-center gap-1">
                            <Globe size={10} /> Online
                          </span>
                        )}
                        {b.piega_inclusa && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">
                            Piega compresa
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate mt-0.5">
                        {stessa
                          ? (riceve.nome || regala.nome || 'Senza nome')
                          : <>Da <span className="text-zinc-700">{regala.nome}</span> per <span className="text-zinc-700">{riceve.nome}</span></>}
                        {b.data_scadenza ? ` · scade il ${formattaData(b.data_scadenza)}` : ''}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-zinc-900 tabular-nums">{euro(b.valore_residuo)}</div>
                      {b.valore_residuo !== b.valore && (
                        <div className="text-[11px] text-zinc-400 tabular-nums">su {euro(b.valore)}</div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FloatingActionBar>
        <button
          onClick={() => setImportAperto(true)}
          className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm"
        >
          <Upload size={16} /> <span>Importa dal foglio</span>
        </button>
        <button
          onClick={apriNuovo}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm"
        >
          <div className="bg-white/20 p-1.5 rounded-full"><Plus size={16} strokeWidth={2.5} /></div>
          <span>Nuovo buono</span>
        </button>
      </FloatingActionBar>

      {importAperto && (
        <ImportaBuoni
          buoniEsistenti={buoni}
          onChiudi={() => setImportAperto(false)}
          onImportato={caricaBuoni}
        />
      )}

      {/* Dettaglio del buono */}
      {dettaglio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDettaglio(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-lg font-bold text-zinc-900">{dettaglio.codice}</div>
                <div className="text-sm text-zinc-500 capitalize">Buono {dettaglio.tipo}</div>
              </div>
              <button onClick={() => setDettaglio(null)} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 flex items-center gap-2"><Euro size={15} className="text-zinc-400" /> Residuo</span>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {euro(dettaglio.valore_residuo)} <span className="text-zinc-400 font-normal">su {euro(dettaglio.valore)}</span>
                </span>
              </div>
              {(() => {
                const { regala, riceve, stessa } = persone(dettaglio);
                const riga = (Icona: any, etichetta: string, p: { nome: string; telefono: string; email?: string }) => (
                  <div className="flex items-start justify-between py-2 border-b border-zinc-100 gap-3">
                    <span className="text-sm text-zinc-500 flex items-center gap-2 shrink-0"><Icona size={15} className="text-zinc-400" /> {etichetta}</span>
                    <span className="text-sm text-zinc-900 text-right min-w-0">
                      <span className="block truncate">{p.nome || '—'}</span>
                      {(p.telefono || p.email) && (
                        <span className="block text-xs text-zinc-500 truncate">{[p.telefono, p.email].filter(Boolean).join(' · ')}</span>
                      )}
                    </span>
                  </div>
                );
                return stessa
                  ? riga(User, 'Chi lo regala e lo usa', { nome: regala.nome || riceve.nome, telefono: regala.telefono || riceve.telefono, email: regala.email })
                  : <>{riga(Gift, 'Chi lo regala', regala)}{riga(User, 'Per chi è', riceve)}</>;
              })()}
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 flex items-center gap-2">
                  {canaleDi(dettaglio) === 'online' ? <Globe size={15} className="text-zinc-400" /> : <Store size={15} className="text-zinc-400" />} Venduto
                </span>
                <span className="text-sm text-zinc-900">{canaleDi(dettaglio) === 'online' ? 'online' : 'in salone'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 flex items-center gap-2"><Calendar size={15} className="text-zinc-400" /> Scadenza</span>
                <span className="text-sm text-zinc-900">{formattaData(dettaglio.data_scadenza)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 flex items-center gap-2"><Scissors size={15} className="text-zinc-400" /> Piega</span>
                <span className={`text-sm font-medium ${dettaglio.piega_inclusa ? 'text-fuchsia-700' : 'text-zinc-500'}`}>
                  {dettaglio.piega_inclusa ? 'compresa nel buono' : 'non compresa'}
                </span>
              </div>
              {noteVisibili(dettaglio) && (
                <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg p-3 whitespace-pre-wrap">{noteVisibili(dettaglio)}</p>
              )}
            </div>

            <div className="p-5 pt-0 flex flex-col gap-2">
              {dettaglio.stato === 'attivo' && (
                <button
                  onClick={() => setUtilizzo({ buono: dettaglio, importo: String(dettaglio.valore_residuo).replace('.', ',') })}
                  className="w-full px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={16} /> Registra utilizzo
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { const b = dettaglio; setDettaglio(null); apriModifica(b); }}
                  className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={15} /> Modifica
                </button>
                <button
                  onClick={() => setConfermaEliminazione(dettaglio)}
                  className="px-4 py-2.5 font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  title="Elimina il buono"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Registrazione utilizzo */}
      {utilizzo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setUtilizzo(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 font-playfair">Registra utilizzo</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Buono <span className="font-mono font-semibold text-zinc-700">{utilizzo.buono.codice}</span>, residuo {euro(utilizzo.buono.valore_residuo)}.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-600 mb-1">Importo da scalare</label>
              <div className="relative">
                <input
                  autoFocus
                  value={utilizzo.importo}
                  onChange={e => setUtilizzo({ ...utilizzo, importo: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 tabular-nums"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">€</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1.5">
                Se scali tutto il residuo il buono risulta usato, altrimenti resta attivo con quello che avanza.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={registraUtilizzo} className="w-full px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors">
                Conferma
              </button>
              <button onClick={() => setUtilizzo(null)} className="w-full px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nuovo buono e modifica */}
      {modaleAperta && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModaleAperta(false)}>
          <form
            onSubmit={salva}
            onClick={e => e.stopPropagation()}
            className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
          >
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 font-playfair">
                {inModifica ? 'Modifica buono' : 'Nuovo buono'}
              </h3>
              <button type="button" onClick={() => setModaleAperta(false)} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Tipo di buono</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['spa', 'Spa', Sparkles], ['salone', 'Salone', Scissors]] as const).map(([valore, etichetta, Icona]) => (
                    <button
                      key={valore}
                      type="button"
                      onClick={() => {
                        if (valore === form.tipo) return;
                        setForm({ ...form, tipo: valore, valore: valore === 'spa' ? String(prezzoSpa(form.piega_inclusa)) : '' });
                        setPrezzoLibero(false);
                      }}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        form.tipo === valore
                          ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <Icona size={15} /> {etichetta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Codice</label>
                  <div className="flex gap-2">
                    <input
                      value={form.codice}
                      onChange={e => setForm({ ...form, codice: e.target.value })}
                      className="flex-1 min-w-0 bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 font-mono"
                    />
                    {!inModifica && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, codice: generaCodice() })}
                        className="px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium transition-colors whitespace-nowrap"
                        title="Genera un altro codice"
                      >
                        Genera
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">{form.tipo === 'spa' ? 'Prezzo' : 'Valore'}</label>
                  {form.tipo === 'spa' && !prezzoLibero ? (
                    <div className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-zinc-900 tabular-nums">
                      {euro(valoreForm)}
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={form.valore}
                        onChange={e => setForm({ ...form, valore: e.target.value })}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">€</span>
                    </div>
                  )}
                </div>
              </div>

              {form.tipo === 'spa' && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.piega_inclusa}
                    onChange={e => {
                      setForm({ ...form, piega_inclusa: e.target.checked });
                      setPrezzoLibero(false);
                    }}
                    className="accent-fuchsia-600 mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-zinc-800">Piega compresa</span>
                    <span className="block text-xs text-zinc-500">
                      Spa {euro(PREZZO_SPA)}, con la piega +{euro(PREZZO_PIEGA)}.
                      {prezzoLibero && ' Questo buono ha un prezzo suo: cambiando la spunta torna al prezzo fisso.'}
                    </span>
                  </span>
                </label>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Dove è stato venduto</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['salone', 'In salone', Store], ['online', 'Online', Globe]] as const).map(([valore, etichetta, Icona]) => (
                    <button
                      key={valore}
                      type="button"
                      onClick={() => setForm({ ...form, canale: valore })}
                      className={`py-2 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        form.canale === valore
                          ? 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700'
                          : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <Icona size={15} /> {etichetta}
                    </button>
                  ))}
                </div>
              </div>

              <fieldset className="flex flex-col gap-3 pt-1">
                <legend className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2"><Gift size={15} className="text-fuchsia-500" /> Chi lo regala</legend>
                <input
                  value={form.acquirente}
                  onChange={e => setForm({ ...form, acquirente: e.target.value })}
                  placeholder="Nome e cognome"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={form.acquirente_telefono}
                    onChange={e => setForm({ ...form, acquirente_telefono: e.target.value })}
                    placeholder="Telefono"
                    inputMode="tel"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 font-mono"
                  />
                  <input
                    value={form.acquirente_email}
                    onChange={e => setForm({ ...form, acquirente_email: e.target.value })}
                    placeholder="Email (facoltativa)"
                    inputMode="email"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.stessaPersona}
                    onChange={e => setForm({ ...form, stessaPersona: e.target.checked })}
                    className="accent-fuchsia-600"
                  />
                  Lo usa la stessa persona
                </label>
              </fieldset>

              {!form.stessaPersona && (
                <fieldset className="flex flex-col gap-3">
                  <legend className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-2"><User size={15} className="text-fuchsia-500" /> Per chi è</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={form.intestatario}
                      onChange={e => setForm({ ...form, intestatario: e.target.value })}
                      placeholder="Nome e cognome"
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
                    />
                    <input
                      value={form.telefono}
                      onChange={e => setForm({ ...form, telefono: e.target.value })}
                      placeholder="Telefono (facoltativo)"
                      inputMode="tel"
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 font-mono"
                    />
                  </div>
                </fieldset>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Scadenza</label>
                <input
                  type="date"
                  value={form.data_scadenza}
                  onChange={e => setForm({ ...form, data_scadenza: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-600 mb-1">Note</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="Es. regalo di compleanno, pagato in contanti..."
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 resize-none"
                />
              </div>

              {erroreForm && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {erroreForm}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-2">
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={salvataggio}
                className="flex-1 px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-60"
              >
                {salvataggio ? 'Salvo...' : inModifica ? 'Salva modifiche' : 'Crea buono'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Conferma eliminazione */}
      {confermaEliminazione && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setConfermaEliminazione(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center flex flex-col gap-3 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Elimini il buono?</h3>
            <p className="text-zinc-600 text-sm">
              <span className="font-mono font-semibold">{confermaEliminazione.codice}</span> — {euro(confermaEliminazione.valore_residuo)} di residuo.
            </p>
            <p className="text-zinc-500 text-sm mb-2">L'operazione non si può annullare.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => elimina(confermaEliminazione)} className="w-full px-4 py-2.5 font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors">
                Sì, elimina
              </button>
              <button onClick={() => setConfermaEliminazione(null)} className="w-full px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                No, annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
