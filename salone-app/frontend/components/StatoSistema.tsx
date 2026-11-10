// Stato del sistema: le spie di quello che lavora dietro le quinte.
//
// Quando "Rosy non risponde" o "gli SMS non partono", qui si vede subito qual
// è il pezzo fermo e che cosa serve per riaccenderlo. Sola lettura: non
// cambia niente, chiede solo al server come sta.

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, MinusCircle, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { righeStato, rigaRiserva, RigaStato, Spia } from '@/lib/stato-sistema';
import { urlRiserva, urlPrincipale, leggiProblemi, svuotaProblemi, Problema } from '@/lib/riserva';

const ICONA: Record<Spia, { Icona: typeof CheckCircle2; colore: string }> = {
  ok: { Icona: CheckCircle2, colore: 'text-emerald-500' },
  spento: { Icona: MinusCircle, colore: 'text-amber-500' },
  guasto: { Icona: AlertTriangle, colore: 'text-red-500' }
};

const quando = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function StatoSistema() {
  const [righe, setRighe] = useState<RigaStato[] | null>(null);
  const [grezzo, setGrezzo] = useState<any>(null);
  const [problemi, setProblemi] = useState<Problema[]>([]);
  const [copiato, setCopiato] = useState(false);

  const controlla = async () => {
    setRighe(null);
    setProblemi(leggiProblemi());
    let salute: any = null;
    try {
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), 20000);
      const risposta = await fetch('/api/salute', { cache: 'no-store', signal: stop.signal });
      clearTimeout(timer);
      // Anche quando manca una chiave il server risponde (503) dicendo quale.
      const dati = await risposta.json().catch(() => null);
      salute = dati && typeof dati === 'object' && dati.servizio === 'rosy' ? dati : null;
    } catch {
      salute = null;
    }
    setGrezzo(salute);
    setRighe([...righeStato(salute), rigaRiserva(urlRiserva(), urlPrincipale())]);
  };

  useEffect(() => { controlla(); }, []);

  const copia = async () => {
    const testo = [
      `Stato di Rosy — ${new Date().toLocaleString('it-IT')} — ${window.location.host}`,
      '',
      ...(righe || []).map(r => `[${r.spia}] ${r.nome}: ${r.stato}${r.rimedio ? ` → ${r.rimedio}` : ''}`),
      '',
      'Risposta del server:',
      grezzo ? JSON.stringify(grezzo, null, 1) : 'nessuna',
      '',
      'Ultimi problemi su questo computer:',
      ...(problemi.length ? problemi.map(p => `- ${quando(p.quando)} ${p.dove} — ${p.cosa}${p.dettaglio ? `\n${p.dettaglio.split('\n').slice(0, 8).join('\n')}` : ''}`) : ['nessuno'])
    ].join('\n');
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch { /* niente */ }
  };

  const daGuardare = (righe || []).filter(r => r.spia === 'guasto').length;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-zinc-900 mb-2 flex items-center gap-2">
            <Activity size={20} className="text-fuchsia-500" /> Stato del sistema
          </h3>
          <p className="text-zinc-500 text-sm">
            {righe === null
              ? 'Chiedo al server come sta…'
              : daGuardare
                ? `${daGuardare === 1 ? 'C\'è una cosa' : `Ci sono ${daGuardare} cose`} da sistemare: sotto c'è scritto quale e come.`
                : 'Quello che lavora dietro le quinte. Verde: funziona. Giallo: spento o non ancora configurato.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={controlla}
            disabled={righe === null}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-60 border border-zinc-200 text-zinc-800 text-sm font-medium rounded-lg flex items-center gap-2"
          >
            {righe === null ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Ricontrolla
          </button>
          <button
            onClick={copia}
            disabled={righe === null}
            title="Copia tutto, da incollare a chi segue il programma"
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-60 border border-zinc-200 text-zinc-800 text-sm font-medium rounded-lg flex items-center gap-2"
          >
            {copiato ? <Check size={15} /> : <Copy size={15} />} {copiato ? 'Copiato' : 'Copia per l\'assistenza'}
          </button>
        </div>
      </div>

      {righe !== null && (
        <ul className="border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {righe.map(r => {
            const { Icona, colore } = ICONA[r.spia];
            return (
              <li key={r.nome} className="p-3 sm:p-4 flex items-start gap-3">
                <Icona size={18} className={`${colore} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">{r.nome}</p>
                  <p className="text-sm text-zinc-600 break-words">{r.stato}</p>
                  {r.rimedio && <p className="text-xs text-zinc-500 mt-1 break-words">{r.rimedio}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {problemi.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer select-none text-zinc-600 hover:text-zinc-900">
            Problemi capitati su questo computer ({problemi.length})
          </summary>
          <ul className="mt-2 border border-zinc-200 rounded-lg divide-y divide-zinc-100">
            {problemi.map((p, i) => (
              <li key={`${p.quando}-${i}`} className="p-3 text-xs text-zinc-600 break-words">
                <span className="font-mono text-zinc-500">{quando(p.quando)}</span> · <span className="text-zinc-500">{p.dove}</span>
                <div className="text-zinc-800 mt-0.5">{p.cosa}</div>
              </li>
            ))}
          </ul>
          <button
            onClick={() => { svuotaProblemi(); setProblemi([]); }}
            className="mt-2 text-xs text-zinc-500 underline hover:text-zinc-800"
          >
            Svuota l'elenco
          </button>
        </details>
      )}
    </div>
  );
}
