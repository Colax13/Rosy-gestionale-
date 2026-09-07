'use client';

import { useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { clientiApi } from '@/lib/api-client';
import { X, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { Campo, CAMPI, leggiCsv, indoviniMappatura, aCliente, chiaviCliente } from '@/lib/importa';

interface Props {
  clientiEsistenti: any[];
  onChiudi: () => void;
  onImportato: () => void;
}

export default function ImportaClienti({ clientiEsistenti, onChiudi, onImportato }: Props) {
  const [fase, setFase] = useState<'scelta' | 'mappatura' | 'importazione' | 'fatto'>('scelta');
  const [errore, setErrore] = useState<string | null>(null);
  const [nomeFile, setNomeFile] = useState('');
  const [intestazioni, setIntestazioni] = useState<string[]>([]);
  const [righe, setRighe] = useState<string[][]>([]);
  const [mappatura, setMappatura] = useState<Campo[]>([]);
  const [saltaDoppioni, setSaltaDoppioni] = useState(true);
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
        setErrore('Il file sembra vuoto: serve una riga di intestazione e almeno un cliente.');
        return;
      }

      const teste = tabella[0].map(t => (t || '').toString().trim());
      setIntestazioni(teste);
      setRighe(tabella.slice(1));
      setMappatura(indoviniMappatura(teste));
      setFase('mappatura');
    } catch (e: any) {
      setErrore("Non sono riuscito a leggere il file. Controlla che sia un .xlsx o un .csv.");
    }
  };

  const candidati = righe.map(r => aCliente(r, mappatura));
  const validi = candidati.filter(c => c.nome || c.cognome);
  const senzaNome = candidati.length - validi.length;

  const chiaviEsistenti = new Set(clientiEsistenti.flatMap(chiaviCliente));
  const isDoppione = (c: any) => chiaviCliente(c).some(k => chiaviEsistenti.has(k));

  const doppioni = validi.filter(isDoppione).length;
  const daImportare = saltaDoppioni ? validi.filter(c => !isDoppione(c)) : validi;

  const avvia = async () => {
    setFase('importazione');
    setAvanzamento({ fatti: 0, totale: daImportare.length });
    const errori: string[] = [];
    let importati = 0;

    for (let i = 0; i < daImportare.length; i++) {
      const c = daImportare[i];
      try {
        await clientiApi.create({
          nome: c.nome || '—',
          cognome: c.cognome || '',
          telefono: c.telefono || '',
          email: c.email || '',
          note: c.note || '',
          canale_acquisizione: c.canale_acquisizione || 'Importato'
        });
        importati++;
      } catch (e: any) {
        errori.push(`${c.nome} ${c.cognome}: ${e?.message || 'errore'}`);
      }
      setAvanzamento({ fatti: i + 1, totale: daImportare.length });
    }

    setEsito({ importati, saltati: validi.length - daImportare.length, errori });
    setFase('fatto');
    onImportato();
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200">

        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Importa clienti</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {fase === 'scelta' && 'Da un file Excel o CSV.'}
              {fase === 'mappatura' && nomeFile}
              {fase === 'importazione' && 'Sto importando, non chiudere la pagina.'}
              {fase === 'fatto' && 'Importazione conclusa.'}
            </p>
          </div>
          {fase !== 'importazione' && (
            <button onClick={onChiudi} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">

          {errore && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {errore}
            </div>
          )}

          {/* 1. scelta del file */}
          {fase === 'scelta' && (
            <label className="border-2 border-dashed border-zinc-300 rounded-xl p-10 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-fuchsia-400 hover:bg-fuchsia-50/40 transition-colors">
              <div className="p-3 bg-zinc-100 rounded-full text-zinc-400"><Upload size={24} /></div>
              <span className="text-sm font-medium text-zinc-800">Scegli il file</span>
              <span className="text-xs text-zinc-500 max-w-sm">
                Excel (.xlsx) o CSV, con una riga di intestazione e un cliente per riga.
                Le colonne le riconosco da sole, poi controlli tu prima di confermare.
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) caricaFile(f); }}
              />
            </label>
          )}

          {/* 2. abbinamento colonne e anteprima */}
          {fase === 'mappatura' && (
            <div className="flex flex-col gap-5">
              <div>
                <h4 className="text-sm font-semibold text-zinc-800 mb-2">Che cos'è ogni colonna</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {intestazioni.map((testa, i) => (
                    <div key={i} className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-zinc-500 truncate flex-1" title={testa}>
                        {testa || `Colonna ${i + 1}`}
                      </span>
                      <select
                        value={mappatura[i] || ''}
                        onChange={e => {
                          const m = [...mappatura];
                          m[i] = e.target.value as Campo;
                          setMappatura(m);
                        }}
                        className="text-xs bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-800 outline-none focus:border-fuchsia-400 w-[170px] shrink-0"
                      >
                        {CAMPI.map(c => <option key={c.chiave} value={c.chiave}>{c.etichetta}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-800 mb-2">Anteprima</h4>
                <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                  {validi.slice(0, 4).map((c, i) => (
                    <div key={i} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-zinc-900 truncate">
                        {c.nome} {c.cognome}
                        {isDoppione(c) && <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">già presente</span>}
                      </span>
                      <span className="text-zinc-500 font-mono text-xs truncate shrink-0">{c.telefono || c.email || '—'}</span>
                    </div>
                  ))}
                  {validi.length === 0 && (
                    <div className="px-3 py-4 text-sm text-zinc-500 text-center">
                      Nessun cliente riconosciuto: controlla di aver indicato la colonna del nome.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-600">Righe nel file</span><span className="font-semibold tabular-nums">{righe.length}</span></div>
                <div className="flex justify-between"><span className="text-zinc-600">Clienti riconosciuti</span><span className="font-semibold tabular-nums">{validi.length}</span></div>
                {senzaNome > 0 && (
                  <div className="flex justify-between"><span className="text-amber-700">Righe senza nome, saltate</span><span className="font-semibold tabular-nums text-amber-700">{senzaNome}</span></div>
                )}
                {doppioni > 0 && (
                  <label className="flex items-center gap-2 pt-2 border-t border-zinc-200 cursor-pointer">
                    <input type="checkbox" checked={saltaDoppioni} onChange={e => setSaltaDoppioni(e.target.checked)} className="accent-fuchsia-600" />
                    <span className="text-zinc-700">Salta i {doppioni} già presenti in anagrafica</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* 3. importazione in corso */}
          {fase === 'importazione' && (
            <div className="py-8 flex flex-col items-center gap-4">
              <div className="p-3 bg-fuchsia-50 rounded-full text-fuchsia-600 animate-pulse"><FileSpreadsheet size={24} /></div>
              <p className="text-sm text-zinc-700 font-medium tabular-nums">
                {avanzamento.fatti} di {avanzamento.totale}
              </p>
              <div className="w-full max-w-sm h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-fuchsia-600 transition-all duration-200"
                  style={{ width: `${avanzamento.totale ? (avanzamento.fatti / avanzamento.totale) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* 4. esito */}
          {fase === 'fatto' && esito && (
            <div className="py-6 flex flex-col items-center gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-full text-emerald-600"><CheckCircle2 size={26} /></div>
              <p className="text-base font-semibold text-zinc-900">
                {esito.importati} {esito.importati === 1 ? 'cliente importato' : 'clienti importati'}
              </p>
              {esito.saltati > 0 && <p className="text-sm text-zinc-500">{esito.saltati} saltati perché già presenti.</p>}
              {esito.errori.length > 0 && (
                <div className="w-full text-left bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <p className="text-sm font-medium text-red-700 mb-1">{esito.errori.length} non importati:</p>
                  <ul className="text-xs text-red-600 list-disc pl-4 max-h-32 overflow-y-auto">
                    {esito.errori.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-zinc-100 flex gap-2">
          {fase === 'mappatura' && (
            <>
              <button onClick={() => setFase('scelta')} className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
                Cambia file
              </button>
              <button
                onClick={avvia}
                disabled={daImportare.length === 0}
                className="flex-1 px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-50"
              >
                Importa {daImportare.length} {daImportare.length === 1 ? 'cliente' : 'clienti'}
              </button>
            </>
          )}
          {fase === 'scelta' && (
            <button onClick={onChiudi} className="w-full px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
              Annulla
            </button>
          )}
          {fase === 'fatto' && (
            <button onClick={onChiudi} className="w-full px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors">
              Chiudi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
