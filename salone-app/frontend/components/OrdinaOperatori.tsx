'use client';

// Il pannello per mettere in ordine le colonne del calendario.
//
// Sta a parte, come ogni modifica: il calendario si guarda, qui si sistema.
// Si trascina una riga o si usano le frecce; niente si salva finché non si
// preme "Salva". L'ordine vale per tutti: calendario, "Nuovo appuntamento" e
// prenotazione online.

import { useState } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { dipendentiApi } from '@/lib/api-client';
import { nomeOperatore, inizialiOperatore, ordinaOperatori, sposta, spostaA, cambiOrdine } from '@/lib/operatori';

interface Props {
  dipendenti: any[];
  onChiudi: () => void;
  onSalvato: () => void;
}

export default function OrdinaOperatori({ dipendenti, onChiudi, onSalvato }: Props) {
  const [lista, setLista] = useState<any[]>(() => ordinaOperatori(dipendenti));
  const [trascinato, setTrascinato] = useState<number | null>(null);
  const [sopra, setSopra] = useState<number | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const cambi = cambiOrdine(lista);

  const salva = async () => {
    setSalvo(true);
    setErrore(null);
    try {
      await dipendentiApi.salvaOrdine(cambi);
      onSalvato();
      onChiudi();
    } catch (e: any) {
      setErrore(e?.message || "Non sono riuscito a salvare l'ordine.");
      setSalvo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onChiudi}>
      <div
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Ordina le colonne</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              Il primo in alto è la prima colonna a sinistra del calendario. Trascina o usa le frecce.
            </p>
          </div>
          <button onClick={onChiudi} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors shrink-0" aria-label="Chiudi">
            <X size={20} />
          </button>
        </div>

        <ol className="p-3 overflow-y-auto flex-1 flex flex-col gap-1.5">
          {lista.map((d, i) => (
            <li
              key={d.id}
              draggable
              onDragStart={e => { setTrascinato(i); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={e => { e.preventDefault(); setSopra(i); }}
              onDragLeave={() => setSopra(s => (s === i ? null : s))}
              onDrop={e => {
                e.preventDefault();
                if (trascinato !== null) setLista(l => spostaA(l, trascinato, i));
                setTrascinato(null);
                setSopra(null);
              }}
              onDragEnd={() => { setTrascinato(null); setSopra(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-colors cursor-grab active:cursor-grabbing ${
                sopra === i && trascinato !== null && trascinato !== i
                  ? 'border-fuchsia-400 bg-fuchsia-50'
                  : trascinato === i ? 'border-zinc-200 opacity-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <GripVertical size={16} className="text-zinc-300 shrink-0" />
              <span className="w-6 text-xs font-mono text-zinc-400 tabular-nums shrink-0">{i + 1}</span>
              <span className="w-8 h-8 rounded-full bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center text-xs font-bold shrink-0">
                {inizialiOperatore(d)}
              </span>
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-zinc-900">
                {nomeOperatore(d)}
                {d.attivo === false && <span className="ml-2 text-xs font-normal text-zinc-400">non attivo</span>}
              </span>
              <span className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setLista(l => sposta(l, i, -1))}
                  disabled={i === 0}
                  className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                  aria-label={`Sposta ${nomeOperatore(d)} più a sinistra`}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setLista(l => sposta(l, i, 1))}
                  disabled={i === lista.length - 1}
                  className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
                  aria-label={`Sposta ${nomeOperatore(d)} più a destra`}
                >
                  <ChevronDown size={16} />
                </button>
              </span>
            </li>
          ))}
          {lista.length === 0 && (
            <li className="p-6 text-center text-sm text-zinc-500">Non ci sono ancora collaboratori.</li>
          )}
        </ol>

        {errore && (
          <div className="mx-5 mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" /> {errore}
          </div>
        )}

        <div className="p-5 border-t border-zinc-100 flex gap-2">
          <button onClick={onChiudi} className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
            Annulla
          </button>
          <button
            onClick={salva}
            disabled={salvo || cambi.length === 0}
            className="flex-1 px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-50"
          >
            {salvo ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
