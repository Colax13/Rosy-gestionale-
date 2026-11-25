'use client';

import { useState } from 'react';
import { CalendarPlus, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { dipendentiApi } from '@/lib/api-client';
import { turnoDelGiorno, descriviTurno } from '@/lib/servizi';
import { nomeOperatore } from '@/lib/operatori';
import { giornoSpeciale, conGiornoAperto, senzaGiorno, erroreFasce, Fascia } from '@/lib/giorni-speciali';
import { puoAprirePercorso } from '@/lib/sessione';

interface Props {
  data: Date;
  dipendenti: any[];
  /** Dopo aver salvato: l'agenda rilegge le operatrici. */
  onCambiato: () => void;
}

/**
 * Aprire il salone per UN giorno preciso (un lunedì sotto Natale) senza
 * toccare i turni della settimana. In agenda si vede solo una riga: se quel
 * giorno il salone è chiuso propone di aprirlo, se è un'apertura speciale lo
 * dice. Gli orari si scelgono nel pannello a parte.
 */
export default function GiornataSpeciale({ data, dipendenti, onCambiato }: Props) {
  const [aperto, setAperto] = useState(false);
  const attive = dipendenti.filter(d => d.id !== 'unassigned' && d.attivo !== false);
  const speciali = attive.filter(d => giornoSpeciale(d, data));
  const chiuso = attive.length > 0 && attive.every(d => !turnoDelGiorno(d, data).lavora);
  const puoCambiare = puoAprirePercorso('/dipendenti');

  if (!chiuso && speciali.length === 0) return null;
  const giorno = data.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className={`mb-3 max-md:mx-3 max-md:mt-2 rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm ${speciali.length ? 'bg-fuchsia-50 border-fuchsia-200' : 'bg-zinc-50 border-zinc-200'}`}>
        <CalendarPlus size={16} className={speciali.length ? 'text-fuchsia-600 shrink-0' : 'text-zinc-500 shrink-0'} />
        <p className="min-w-0 flex-1 text-zinc-800">
          {speciali.length
            ? <>Apertura straordinaria: in turno {speciali.map(d => `${nomeOperatore(d)} ${descriviTurno(turnoDelGiorno(d, data))}`).join(', ')}.</>
            : <>Questo giorno il salone è chiuso: nessuna è in turno.</>}
        </p>
        {puoCambiare && (
          <button onClick={() => setAperto(true)} className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-semibold shrink-0">
            {speciali.length ? 'Modifica' : 'Apri solo questa giornata'}
          </button>
        )}
      </div>

      {aperto && (
        <PannelloApertura
          data={data} giorno={giorno} operatrici={attive}
          onChiudi={() => setAperto(false)}
          onFatto={() => { setAperto(false); onCambiato(); }}
        />
      )}
    </>
  );
}

function PannelloApertura({ data, giorno, operatrici, onChiudi, onFatto }: { data: Date; giorno: string; operatrici: any[]; onChiudi: () => void; onFatto: () => void }) {
  const giaSpeciali = operatrici.filter(d => giornoSpeciale(d, data));
  const [scelte, setScelte] = useState<Set<string>>(() => new Set((giaSpeciali.length ? giaSpeciali : operatrici).map(d => d.id)));
  const [fasce, setFasce] = useState<Fascia[]>(() => giornoSpeciale(giaSpeciali[0], data)?.fasce?.map(f => ({ ...f })) || [{ inizio: '09:00', fine: '18:00' }]);
  const [lavoro, setLavoro] = useState(false);
  const [errore, setErrore] = useState('');

  const cambia = (id: string) => setScelte(prima => { const dopo = new Set(prima); dopo.has(id) ? dopo.delete(id) : dopo.add(id); return dopo; });
  const cambiaFascia = (i: number, campo: keyof Fascia, valore: string) => setFasce(f => f.map((x, j) => (j === i ? { ...x, [campo]: valore } : x)));

  const salva = async () => {
    const problema = scelte.size === 0 ? 'Scegli almeno un\'operatrice.' : erroreFasce(fasce);
    if (problema) { setErrore(problema); return; }
    setLavoro(true); setErrore('');
    try {
      for (const d of operatrici) {
        const era = !!giornoSpeciale(d, data);
        if (scelte.has(d.id)) await dipendentiApi.update(d.id, { giorni_speciali: conGiornoAperto(d.giorni_speciali, data, fasce) });
        else if (era) await dipendentiApi.update(d.id, { giorni_speciali: senzaGiorno(d.giorni_speciali, data) });
      }
      onFatto();
    } catch (e: any) {
      setErrore(`Non sono riuscito a salvare: ${e?.message || 'errore'}`);
      setLavoro(false);
    }
  };

  const richiudi = async () => {
    if (!confirm(`Tolgo l'apertura di ${giorno}? Torna a valere il turno della settimana. Gli appuntamenti già fissati restano.`)) return;
    setLavoro(true); setErrore('');
    try {
      for (const d of giaSpeciali) await dipendentiApi.update(d.id, { giorni_speciali: senzaGiorno(d.giorni_speciali, data) });
      onFatto();
    } catch (e: any) {
      setErrore(`Non sono riuscito a salvare: ${e?.message || 'errore'}`);
      setLavoro(false);
    }
  };

  const campo = 'bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-500';

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={() => !lavoro && onChiudi()} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-zinc-900">Apri solo questa giornata</h2>
            <p className="text-xs text-zinc-500 first-letter:uppercase">{giorno} · i turni della settimana non cambiano.</p>
          </div>
          <button onClick={onChiudi} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500" aria-label="Chiudi"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-zinc-900 mb-2">Orario</p>
            <div className="space-y-2">
              {fasce.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="time" value={f.inizio} onChange={e => cambiaFascia(i, 'inizio', e.target.value)} className={campo} aria-label="Dalle" />
                  <span className="text-zinc-500 text-sm">–</span>
                  <input type="time" value={f.fine} onChange={e => cambiaFascia(i, 'fine', e.target.value)} className={campo} aria-label="Alle" />
                  {fasce.length > 1 && (
                    <button onClick={() => setFasce(x => x.filter((_, j) => j !== i))} className="p-2 text-zinc-400 hover:text-red-600" aria-label="Togli questo orario"><Trash2 size={15} /></button>
                  )}
                </div>
              ))}
            </div>
            {fasce.length < 2 && (
              <button onClick={() => setFasce(f => [...f, { inizio: '15:00', fine: '19:00' }])} className="mt-2 text-xs font-semibold text-fuchsia-700 flex items-center gap-1">
                <Plus size={13} /> Aggiungi il pomeriggio (pausa in mezzo)
              </button>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900 mb-2">Chi lavora quel giorno</p>
            <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100">
              {operatrici.map(d => (
                <label key={d.id} className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer">
                  <input type="checkbox" checked={scelte.has(d.id)} onChange={() => cambia(d.id)} className="w-4 h-4 accent-fuchsia-600" />
                  <span className="text-sm text-zinc-900">{nomeOperatore(d)}</span>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs text-zinc-500">Quel giorno si potrà prenotare anche online, negli orari scelti.</p>
          {errore && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{errore}</p>}

          {giaSpeciali.length > 0 && (
            <div className="pt-4 border-t border-zinc-100">
              <button onClick={richiudi} disabled={lavoro} className="px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50">Togli l'apertura di questo giorno</button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button onClick={onChiudi} disabled={lavoro} className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700">Annulla</button>
          <button onClick={salva} disabled={lavoro} className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
            {lavoro && <Loader2 size={15} className="animate-spin" />} Apri la giornata
          </button>
        </div>
      </div>
    </div>
  );
}
