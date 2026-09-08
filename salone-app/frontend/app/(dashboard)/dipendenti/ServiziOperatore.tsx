'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, Save, Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';
import { catalogoApi, dipendentiApi } from '@/lib/api-client';
import { haElencoServizi } from '@/lib/operatori';

interface Props {
  dipendenti: any[];
  refreshData: () => void;
}

/**
 * Quali servizi sa fare ogni operatrice.
 *
 * Si sceglie la persona a sinistra e si spuntano i servizi a destra, divisi
 * per categoria come nel catalogo. Chi non ha ancora l'elenco compilato fa
 * tutto: è il comportamento di prima, e nessun salone si ritrova l'agenda
 * bloccata il giorno dopo l'aggiornamento.
 */
export default function ServiziOperatore({ dipendenti, refreshData }: Props) {
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const [sceltoId, setSceltoId] = useState<string | null>(null);
  const [spuntati, setSpuntati] = useState<string[]>([]);
  const [salvataggio, setSalvataggio] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    catalogoApi.getAll()
      .then(setCatalogo)
      .catch(e => setErrore(e.message || 'Non sono riuscito a caricare il catalogo.'))
      .finally(() => setCaricamento(false));
  }, []);

  // Alla prima apertura si parte dalla prima operatrice dell'elenco.
  useEffect(() => {
    if (!sceltoId && dipendenti.length > 0) setSceltoId(dipendenti[0].id);
  }, [dipendenti, sceltoId]);

  const scelto = dipendenti.find(d => d.id === sceltoId) || null;

  useEffect(() => {
    if (!scelto) return;
    if (salvataggio) return;
    // Elenco vuoto = fa tutto: si aprono tutte le caselle già spuntate, così
    // togliere quelle che non fa è più veloce che spuntarne venti.
    setSpuntati(haElencoServizi(scelto) ? [...scelto.servizi] : catalogo.map(s => s.id));
    setSalvato(false);
  }, [sceltoId, catalogo]);

  const perCategoria = useMemo(() => {
    const gruppi = new Map<string, any[]>();
    catalogo.forEach(s => {
      const cat = s.categoria || 'Senza categoria';
      if (!gruppi.has(cat)) gruppi.set(cat, []);
      gruppi.get(cat)!.push(s);
    });
    return Array.from(gruppi.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalogo]);

  const cambia = (id: string) => {
    setSalvato(false);
    setSpuntati(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const cambiaCategoria = (servizi: any[], tutti: boolean) => {
    setSalvato(false);
    const ids = servizi.map(s => s.id);
    setSpuntati(prev => tutti
      ? Array.from(new Set([...prev, ...ids]))
      : prev.filter(x => !ids.includes(x)));
  };

  const salva = async () => {
    if (!scelto) return;
    setSalvataggio(true);
    setErrore(null);
    try {
      await dipendentiApi.update(scelto.id, { servizi: spuntati });
      setSalvato(true);
      refreshData();
    } catch (e: any) {
      setErrore(e.message || 'Non sono riuscito a salvare.');
    } finally {
      setSalvataggio(false);
    }
  };

  if (caricamento) {
    return <div className="text-center py-20 text-zinc-500">Carico il catalogo…</div>;
  }

  if (catalogo.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center">
        <Scissors className="mx-auto text-zinc-300 mb-3" size={32} />
        <p className="text-zinc-600">Il catalogo è vuoto: aggiungi prima i servizi, poi qui scegli chi li fa.</p>
      </div>
    );
  }

  const tuttiSpuntati = spuntati.length === catalogo.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-24">
      {/* Chi */}
      <div className="lg:w-64 shrink-0">
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 text-xs uppercase tracking-wider font-semibold text-zinc-500">
            Operatrice
          </div>
          <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto">
            {dipendenti.map(d => {
              const attiva = d.id === sceltoId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSceltoId(d.id)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${attiva ? 'bg-fuchsia-50' : 'hover:bg-zinc-50'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${attiva ? 'bg-fuchsia-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                    {(d.nome || '?').charAt(0)}{(d.cognome || '').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-sm font-medium truncate ${attiva ? 'text-fuchsia-700' : 'text-zinc-900'}`}>
                      {d.nome} {d.cognome}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {haElencoServizi(d)
                        ? `${d.servizi.length} ${d.servizi.length === 1 ? 'servizio' : 'servizi'}`
                        : 'fa tutto'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Che cosa */}
      <div className="flex-1 min-w-0">
        {!scelto ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center text-zinc-500">
            Scegli un'operatrice.
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-zinc-900 truncate">
                  Che cosa fa {scelto.nome}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {spuntati.length} {spuntati.length === 1 ? 'servizio' : 'servizi'} su {catalogo.length}
                  {!haElencoServizi(scelto) && ' · elenco non ancora salvato: al momento fa tutto'}
                </p>
              </div>
              <button
                onClick={() => { setSalvato(false); setSpuntati(tuttiSpuntati ? [] : catalogo.map(s => s.id)); }}
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
              >
                {tuttiSpuntati ? 'Togli tutti' : 'Spunta tutti'}
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {perCategoria.map(([categoria, servizi]) => {
                const tuttiQui = servizi.every(s => spuntati.includes(s.id));
                return (
                  <div key={categoria} className="border-b border-zinc-100 last:border-b-0">
                    <div className="px-5 py-2 bg-zinc-50 flex items-center justify-between gap-3 sticky top-0 z-10">
                      <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">{categoria}</span>
                      <button
                        onClick={() => cambiaCategoria(servizi, !tuttiQui)}
                        className="text-[11px] font-medium text-zinc-500 hover:text-fuchsia-600 transition-colors"
                      >
                        {tuttiQui ? 'togli' : 'spunta'} tutta la categoria
                      </button>
                    </div>
                    {servizi.map(s => {
                      const spuntato = spuntati.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
                        >
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${spuntato ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'border-zinc-300 bg-white'}`}>
                            {spuntato && <Check size={13} strokeWidth={3} />}
                          </span>
                          <input type="checkbox" className="sr-only" checked={spuntato} onChange={() => cambia(s.id)} />
                          <span className="text-sm text-zinc-900 flex-1 min-w-0 truncate">{s.nome}</span>
                          <span className="text-xs text-zinc-400 tabular-nums shrink-0">{s.durata_minuti || 0} min</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 border-t border-zinc-200 bg-zinc-50/60 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm min-h-[20px]">
                {errore && (
                  <span className="text-red-600 flex items-center gap-1.5">
                    <AlertCircle size={15} /> {errore}
                  </span>
                )}
                {salvato && !errore && (
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Salvato.
                  </span>
                )}
                {spuntati.length === 0 && !errore && !salvato && (
                  <span className="text-amber-600 flex items-center gap-1.5">
                    <AlertCircle size={15} /> Nessun servizio spuntato: salvando, tornerà a fare tutto.
                  </span>
                )}
              </div>
              <button
                onClick={salva}
                disabled={salvataggio}
                className="px-5 py-2.5 font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
              >
                <Save size={16} /> {salvataggio ? 'Salvo…' : 'Salva'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
