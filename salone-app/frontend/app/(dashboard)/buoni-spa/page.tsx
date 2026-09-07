'use client';

import { useState, useEffect, useMemo } from 'react';
import { buoniApi } from '@/lib/api-client';
import FloatingActionBar from '@/components/FloatingActionBar';
import {
  Ticket, Plus, Search, X, Edit2, Trash2, Check, AlertCircle,
  Euro, Calendar, User, Sparkles, Scissors
} from 'lucide-react';

interface Buono {
  id: string;
  codice: string;
  tipo: 'spa' | 'salone';
  valore: number;
  valore_residuo: number;
  intestatario?: string;
  telefono?: string;
  data_emissione?: string;
  data_scadenza?: string;
  stato: 'attivo' | 'usato' | 'annullato';
  origine?: string;
  note?: string;
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

const isScaduto = (b: Buono) => !!b.data_scadenza && b.data_scadenza < oggi() && b.stato === 'attivo';

export default function BuoniSpa() {
  const [buoni, setBuoni] = useState<Buono[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const [ricerca, setRicerca] = useState('');
  const [filtro, setFiltro] = useState<'tutti' | 'attivo' | 'usato' | 'annullato'>('tutti');

  const [dettaglio, setDettaglio] = useState<Buono | null>(null);
  const [modaleAperta, setModaleAperta] = useState(false);
  const [inModifica, setInModifica] = useState<Buono | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);
  const [erroreForm, setErroreForm] = useState<string | null>(null);
  const [confermaEliminazione, setConfermaEliminazione] = useState<Buono | null>(null);

  const [utilizzo, setUtilizzo] = useState<{ buono: Buono; importo: string } | null>(null);

  const [form, setForm] = useState({
    codice: '',
    tipo: 'spa' as 'spa' | 'salone',
    valore: 50,
    intestatario: '',
    telefono: '',
    data_scadenza: fraUnAnno(),
    note: ''
  });

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

  useEffect(() => { caricaBuoni(); }, []);

  const apriNuovo = () => {
    setInModifica(null);
    setForm({
      codice: generaCodice(),
      tipo: 'spa',
      valore: 50,
      intestatario: '',
      telefono: '',
      data_scadenza: fraUnAnno(),
      note: ''
    });
    setErroreForm(null);
    setModaleAperta(true);
  };

  const apriModifica = (b: Buono) => {
    setInModifica(b);
    setForm({
      codice: b.codice,
      tipo: b.tipo || 'spa',
      valore: b.valore,
      intestatario: b.intestatario || '',
      telefono: b.telefono || '',
      data_scadenza: b.data_scadenza || '',
      note: b.note || ''
    });
    setErroreForm(null);
    setModaleAperta(true);
  };

  const salva = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreForm(null);

    if (!form.codice.trim()) { setErroreForm('Il codice è obbligatorio.'); return; }
    if (!(Number(form.valore) > 0)) { setErroreForm('Il valore deve essere maggiore di zero.'); return; }

    const doppione = buoni.find(b => b.codice.toUpperCase() === form.codice.trim().toUpperCase() && b.id !== inModifica?.id);
    if (doppione) { setErroreForm('Esiste già un buono con questo codice.'); return; }

    setSalvataggio(true);
    try {
      const dati: any = {
        codice: form.codice.trim().toUpperCase(),
        tipo: form.tipo,
        valore: Number(form.valore),
        intestatario: form.intestatario.trim(),
        telefono: form.telefono.trim(),
        data_scadenza: form.data_scadenza,
        note: form.note.trim()
      };

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
          origine: 'manuale'
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

  const elencoFiltrato = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    return buoni.filter(b => {
      if (filtro !== 'tutti' && b.stato !== filtro) return false;
      if (!q) return true;
      return b.codice.toLowerCase().includes(q)
        || (b.intestatario || '').toLowerCase().includes(q)
        || (b.telefono || '').includes(q);
    });
  }, [buoni, ricerca, filtro]);

  const attivi = buoni.filter(b => b.stato === 'attivo');
  const inCircolazione = attivi.reduce((acc, b) => acc + (Number(b.valore_residuo) || 0), 0);

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

      {/* Riepilogo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Buoni attivi</div>
          <div className="text-2xl font-playfair font-bold text-zinc-900 tabular-nums">{attivi.length}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Da scalare</div>
          <div className="text-2xl font-playfair font-bold text-fuchsia-600 tabular-nums">{euro(inCircolazione)}</div>
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">Scaduti</div>
          <div className="text-2xl font-playfair font-bold text-amber-600 tabular-nums">
            {buoni.filter(isScaduto).length}
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
            placeholder="Cerca per codice, nome o telefono..."
            className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
          {([['tutti', 'Tutti'], ['attivo', 'Attivi'], ['usato', 'Usati'], ['annullato', 'Annullati']] as const).map(([chiave, etichetta]) => (
            <button
              key={chiave}
              onClick={() => setFiltro(chiave as any)}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                filtro === chiave ? 'bg-fuchsia-50 text-fuchsia-700' : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {etichetta}
            </button>
          ))}
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
              {buoni.length === 0 ? 'Nessun buono registrato' : 'Nessun buono trovato'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm">
              {buoni.length === 0
                ? 'Quando vendi un buono registralo qui: lo ritrovi cercando il codice.'
                : 'Prova a cambiare filtro o testo di ricerca.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {elencoFiltrato.map(b => {
              const scaduto = isScaduto(b);
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
                      </div>
                      <div className="text-xs text-zinc-500 truncate mt-0.5">
                        {b.intestatario || 'Senza intestatario'}
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
          onClick={apriNuovo}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm"
        >
          <div className="bg-white/20 p-1.5 rounded-full"><Plus size={16} strokeWidth={2.5} /></div>
          <span>Nuovo buono</span>
        </button>
      </FloatingActionBar>

      {/* Dettaglio del buono */}
      {dettaglio && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDettaglio(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 gap-3">
                <span className="text-sm text-zinc-500 flex items-center gap-2 shrink-0"><User size={15} className="text-zinc-400" /> Intestatario</span>
                <span className="text-sm text-zinc-900 text-right truncate">
                  {dettaglio.intestatario || '—'}{dettaglio.telefono ? ` · ${dettaglio.telefono}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100">
                <span className="text-sm text-zinc-500 flex items-center gap-2"><Calendar size={15} className="text-zinc-400" /> Scadenza</span>
                <span className="text-sm text-zinc-900">{formattaData(dettaglio.data_scadenza)}</span>
              </div>
              {dettaglio.note && (
                <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg p-3 whitespace-pre-wrap">{dettaglio.note}</p>
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
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
                      onClick={() => setForm({ ...form, tipo: valore })}
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
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Valore</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.valore}
                      onChange={e => setForm({ ...form, valore: Number(e.target.value) })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 tabular-nums"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">€</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Intestatario</label>
                  <input
                    value={form.intestatario}
                    onChange={e => setForm({ ...form, intestatario: e.target.value })}
                    placeholder="Nome e cognome"
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Telefono</label>
                  <input
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 font-mono"
                  />
                </div>
              </div>

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
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center flex flex-col gap-3 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
