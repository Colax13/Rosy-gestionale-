'use client';

import { useState, useMemo } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { X, Upload, Check, AlertCircle, Ticket, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { buoniApi } from '@/lib/api-client';
import {
  leggiCsv, indoviniMappaturaBuoni, preparaImport, CAMPI_BUONO, CampoBuono
} from '@/lib/importa-buoni';
import { euro } from '@/lib/preconto';

interface Props {
  buoniEsistenti: any[];
  onChiudi: () => void;
  onImportato: () => void;
}

/**
 * Portare dentro i buoni pagati online, dal foglio Google esportato.
 *
 * Il foglio esiste già e lo riempie Make quando una cliente paga: qui lo si
 * esporta in CSV (o Excel) e si importa. Le colonne si riconoscono da sole —
 * quelle del foglio in uso sono già note — e restano correggibili a mano.
 * I buoni già presenti non si duplicano: il confronto è sul codice.
 */
export default function ImportaBuoni({ buoniEsistenti, onChiudi, onImportato }: Props) {
  const [fase, setFase] = useState<'scelta' | 'mappatura' | 'importazione' | 'fatto'>('scelta');
  const [errore, setErrore] = useState<string | null>(null);
  const [nomeFile, setNomeFile] = useState('');
  const [intestazioni, setIntestazioni] = useState<string[]>([]);
  const [righe, setRighe] = useState<string[][]>([]);
  const [mappatura, setMappatura] = useState<CampoBuono[]>([]);
  const [avanzamento, setAvanzamento] = useState({ fatti: 0, totale: 0 });
  const [esito, setEsito] = useState<{ importati: number; saltati: number; errori: string[] } | null>(null);

  const caricaFile = async (file: File) => {
    setErrore(null);
    setNomeFile(file.name);
    try {
      let tabella: string[][];
      if (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv') {
        tabella = leggiCsv(await file.text());
      } else {
        const dati = (await readXlsxFile(file)) as unknown as any[][];
        tabella = dati.map(r => r.map(c => (c === null || c === undefined ? '' : String(c))));
      }

      if (tabella.length < 2) {
        setErrore('Il foglio sembra vuoto: serve la riga delle intestazioni e almeno un buono.');
        return;
      }

      const teste = tabella[0].map(t => (t || '').toString().trim());
      setIntestazioni(teste);
      setRighe(tabella.slice(1));
      setMappatura(indoviniMappaturaBuoni(teste));
      setFase('mappatura');
    } catch (e: any) {
      setErrore('Non sono riuscito a leggere il file. Controlla che sia un .csv o un .xlsx.');
    }
  };

  const anteprima = useMemo(
    () => preparaImport(righe, mappatura, buoniEsistenti),
    [righe, mappatura, buoniEsistenti]
  );

  const avvia = async () => {
    setFase('importazione');
    setAvanzamento({ fatti: 0, totale: anteprima.nuovi.length });
    const errori: string[] = [];
    let importati = 0;

    for (let i = 0; i < anteprima.nuovi.length; i++) {
      const b = anteprima.nuovi[i];
      try {
        await buoniApi.create({
          codice: b.codice,
          tipo: b.tipo,
          valore: b.valore,
          valore_residuo: b.valore_residuo,
          intestatario: b.intestatario,
          telefono: b.telefono,
          data_emissione: b.data_emissione || new Date().toISOString().slice(0, 10),
          data_scadenza: b.data_scadenza,
          stato: b.stato,
          piega_inclusa: b.piega_inclusa,
          note: b.note,
          origine: b.origine
        });
        importati++;
      } catch (e: any) {
        errori.push(`${b.codice}: ${e?.message || 'errore'}`);
      }
      setAvanzamento({ fatti: i + 1, totale: anteprima.nuovi.length });
    }

    setEsito({ importati, saltati: anteprima.doppioni.length, errori });
    setFase('fatto');
    onImportato();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">

        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/60 flex items-start justify-between gap-3 shrink-0 rounded-t-2xl">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 font-playfair flex items-center gap-2">
              <Ticket size={19} className="text-fuchsia-600" /> Importa i buoni
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {fase === 'scelta' && 'Dal foglio Google, esportato in CSV o Excel.'}
              {fase === 'mappatura' && `${nomeFile} · ${righe.length} righe`}
              {fase === 'importazione' && 'Sto scrivendo i buoni…'}
              {fase === 'fatto' && 'Finito.'}
            </p>
          </div>
          <button onClick={onChiudi} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-full transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {errore && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{errore}</span>
          </div>
        )}

        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">

          {fase === 'scelta' && (
            <>
              <label className="block border-2 border-dashed border-zinc-300 rounded-2xl p-10 text-center cursor-pointer hover:border-fuchsia-400 hover:bg-fuchsia-50/40 transition-colors">
                <Upload className="mx-auto text-zinc-400 mb-3" size={30} />
                <div className="font-semibold text-zinc-900">Scegli il file</div>
                <div className="text-sm text-zinc-500 mt-1">.csv oppure .xlsx</div>
                <input
                  type="file"
                  accept=".csv,.xlsx,text/csv"
                  className="sr-only"
                  onChange={e => { const f = e.target.files?.[0]; if (f) caricaFile(f); }}
                />
              </label>

              <div className="mt-5 text-sm text-zinc-600 leading-relaxed">
                <p className="font-semibold text-zinc-900 mb-1">Come si esporta il foglio</p>
                <p>
                  Dal foglio Google: <strong>File → Scarica → Valori separati da virgole (.csv)</strong>.
                  Poi scegli qui il file scaricato.
                </p>
                <p className="mt-3 text-zinc-500">
                  I buoni già in elenco non vengono duplicati: si riconoscono dal codice.
                  Puoi rifare l'importazione ogni volta che vuoi, arrivano solo quelli nuovi.
                </p>
              </div>
            </>
          )}

          {fase === 'mappatura' && (
            <>
              <p className="text-sm text-zinc-600 mb-4">
                Ho riconosciuto le colonne. Controlla che sia tutto giusto e correggi quello che serve.
              </p>

              <div className="border border-zinc-200 rounded-xl overflow-hidden mb-5">
                {intestazioni.map((testa, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">{testa || <em className="text-zinc-400">colonna senza nome</em>}</div>
                      <div className="text-xs text-zinc-500 truncate font-mono">{righe[0]?.[i] || '—'}</div>
                    </div>
                    <select
                      value={mappatura[i] || ''}
                      onChange={e => {
                        const nuova = [...mappatura];
                        nuova[i] = e.target.value as CampoBuono;
                        setMappatura(nuova);
                      }}
                      className="shrink-0 p-2 text-sm border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500"
                    >
                      {CAMPI_BUONO.map(c => (
                        <option key={c.chiave} value={c.chiave}>{c.etichetta}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700 tabular-nums">{anteprima.nuovi.length}</div>
                  <div className="text-xs text-emerald-700">da importare</div>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-zinc-600 tabular-nums">{anteprima.doppioni.length}</div>
                  <div className="text-xs text-zinc-600">già presenti</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-700 tabular-nums">{anteprima.scartati.length}</div>
                  <div className="text-xs text-amber-700">non valide</div>
                </div>
              </div>

              {anteprima.scartati.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800">
                  {anteprima.scartati.slice(0, 5).map((s, i) => (
                    <div key={i}>Riga {s.riga}: {s.motivo}</div>
                  ))}
                  {anteprima.scartati.length > 5 && <div className="mt-1">…e altre {anteprima.scartati.length - 5}.</div>}
                </div>
              )}

              {anteprima.nuovi.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Anteprima</div>
                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    {anteprima.nuovi.slice(0, 4).map((b, i) => (
                      <div key={i} className="px-4 py-2.5 border-b border-zinc-100 last:border-b-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-mono font-semibold text-zinc-900">{b.codice}</div>
                          <div className="text-xs text-zinc-500 truncate">
                            {b.intestatario || '—'}
                            {b.piega_inclusa && ' · piega compresa'}
                            {b.data_scadenza && ` · scade il ${b.data_scadenza}`}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900 tabular-nums shrink-0">{euro(b.valore)}</div>
                      </div>
                    ))}
                    {anteprima.nuovi.length > 4 && (
                      <div className="px-4 py-2 text-xs text-zinc-500 bg-zinc-50">…e altri {anteprima.nuovi.length - 4}.</div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {fase === 'importazione' && (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="text-zinc-900 font-semibold">{avanzamento.fatti} di {avanzamento.totale}</div>
              <div className="text-sm text-zinc-500 mt-1">Non chiudere la finestra.</div>
            </div>
          )}

          {fase === 'fatto' && esito && (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={40} />
              <div className="text-lg font-bold text-zinc-900">
                {esito.importati} {esito.importati === 1 ? 'buono importato' : 'buoni importati'}
              </div>
              {esito.saltati > 0 && (
                <div className="text-sm text-zinc-500 mt-1">
                  {esito.saltati} erano già in elenco e non sono stati rifatti.
                </div>
              )}
              {esito.errori.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-left text-xs text-red-700">
                  {esito.errori.slice(0, 5).map((e, i) => <div key={i}>{e}</div>)}
                  {esito.errori.length > 5 && <div className="mt-1">…e altri {esito.errori.length - 5}.</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/60 flex justify-between gap-3 shrink-0 rounded-b-2xl">
          {fase === 'mappatura' ? (
            <>
              <button
                onClick={() => setFase('scelta')}
                className="px-4 py-2.5 font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Cambia file
              </button>
              <button
                onClick={avvia}
                disabled={anteprima.nuovi.length === 0}
                className="px-5 py-2.5 font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Check size={16} /> Importa {anteprima.nuovi.length > 0 && `(${anteprima.nuovi.length})`}
              </button>
            </>
          ) : (
            <button
              onClick={onChiudi}
              disabled={fase === 'importazione'}
              className="ml-auto px-5 py-2.5 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {fase === 'fatto' ? 'Chiudi' : 'Annulla'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
