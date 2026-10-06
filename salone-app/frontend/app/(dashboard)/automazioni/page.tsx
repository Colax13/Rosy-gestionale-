'use client';

// Automazioni: i messaggi che il gestionale manda da solo, e il registro di
// tutto quello che è partito (o no).
//
// Il registro si legge e basta: le righe le scrive il server a ogni invio.
// L'unica azione è l'SMS di prova, che apre una finestra a parte.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, MessageSquare, CheckCircle2, AlertTriangle, Send, X, Clock, Bell } from 'lucide-react';
import { registroSmsApi, VoceRegistroSms } from '@/lib/api-client';
import { NOME_MESSAGGIO } from '@/lib/messaggi';

const PERCORSO = [
  { tipo: 'ricevuta', quando: 'Appena la cliente prenota online', per: 'Cliente' },
  { tipo: 'avviso_salone', quando: 'Appena arriva una richiesta online', per: 'Salone (cellulare in Impostazioni)' },
  { tipo: 'conferma', quando: 'Quando confermi la richiesta, o fissi tu l\'appuntamento', per: 'Cliente' },
  { tipo: 'rifiuto', quando: 'Quando rifiuti una richiesta online', per: 'Cliente' },
  { tipo: 'promemoria', quando: '24 ore prima dell\'appuntamento', per: 'Cliente' },
  { tipo: 'promemoria_ora', quando: '1 ora prima dell\'appuntamento', per: 'Cliente' }
] as const;

const ora = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AutomazioniPage() {
  const [parametri] = useSearchParams();
  const [voci, setVoci] = useState<VoceRegistroSms[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [soloErrori, setSoloErrori] = useState(parametri.get('vista') === 'registro');
  const [aperta, setAperta] = useState<VoceRegistroSms | null>(null);
  const [prova, setProva] = useState<{ telefono: string; invio: boolean; esito?: { mandato: boolean; a?: string; motivo?: string } } | null>(null);

  useEffect(() => {
    let smetti: (() => void) | undefined;
    try {
      smetti = registroSmsApi.ascolta(7, v => { setVoci(v); setCaricamento(false); setErrore(null); },
        () => { setErrore('Non riesco a leggere il registro. Hai ripubblicato le regole di Firestore?'); setCaricamento(false); });
    } catch {
      setCaricamento(false);
    }
    return () => smetti?.();
  }, []);

  useEffect(() => {
    if (parametri.get('vista') === 'registro') document.getElementById('registro')?.scrollIntoView();
  }, [parametri]);

  const elenco = useMemo(() => (soloErrori ? voci.filter(v => v.esito === 'errore') : voci), [voci, soloErrori]);
  const errori = voci.filter(v => v.esito === 'errore').length;
  const oggi = new Date();
  const chiaveOggi = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
  const diOggi = voci.filter(v => v.giorno === chiaveOggi);

  const mandaProva = async () => {
    if (!prova) return;
    setProva({ ...prova, invio: true, esito: undefined });
    try {
      const esito = await registroSmsApi.prova(prova.telefono);
      setProva(p => p && { ...p, invio: false, esito });
    } catch (e: any) {
      setProva(p => p && { ...p, invio: false, esito: { mandato: false, motivo: e?.message || 'il server non risponde' } });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
          <Zap className="text-fuchsia-500" size={28} />
          Automazioni
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">I messaggi che partono da soli, e il registro di ogni SMS.</p>
      </header>

      {/* Il percorso dei messaggi, in sola lettura */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2"><Bell size={15} className="text-fuchsia-500" /> Messaggi automatici</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PERCORSO.map(p => (
            <div key={p.tipo} className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-zinc-900">{NOME_MESSAGGIO[p.tipo]}</div>
              <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5"><Clock size={12} /> {p.quando}</div>
              <div className="text-xs text-zinc-400 mt-0.5">A: {p.per}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Registro */}
      <section id="registro">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 flex-1">
            <MessageSquare size={15} className="text-fuchsia-500" /> Registro SMS
            <span className="font-normal text-zinc-500">· ultimi 7 giorni</span>
          </h2>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1">
              <button onClick={() => setSoloErrori(false)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${!soloErrori ? 'bg-fuchsia-50 text-fuchsia-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                Tutti <span className="text-xs opacity-60 tabular-nums">{voci.length}</span>
              </button>
              <button onClick={() => setSoloErrori(true)} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${soloErrori ? 'bg-red-50 text-red-700' : 'text-zinc-500 hover:bg-zinc-100'}`}>
                Non partiti <span className="text-xs opacity-60 tabular-nums">{errori}</span>
              </button>
            </div>
            <button
              onClick={() => setProva({ telefono: '', invio: false })}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5"
            >
              <Send size={14} /> SMS di prova
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">Oggi</div>
            <div className="text-xl font-bold text-zinc-900 tabular-nums">{diOggi.length}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">Consegnati</div>
            <div className="text-xl font-bold text-emerald-600 tabular-nums">{diOggi.filter(v => v.esito === 'consegnato').length}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400">Non partiti</div>
            <div className={`text-xl font-bold tabular-nums ${diOggi.some(v => v.esito === 'errore') ? 'text-red-600' : 'text-zinc-900'}`}>{diOggi.filter(v => v.esito === 'errore').length}</div>
          </div>
        </div>

        {errore && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" /> {errore}
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {caricamento ? (
            <div className="p-10 text-center text-zinc-400 text-sm animate-pulse">Carico il registro...</div>
          ) : elenco.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500">
              {soloErrori ? 'Nessun SMS fallito negli ultimi 7 giorni.' : 'Nessun SMS negli ultimi 7 giorni.'}
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {elenco.map(v => (
                <li key={v.id}>
                  <button onClick={() => setAperta(v)} className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors flex items-center gap-3">
                    {v.esito === 'consegnato'
                      ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      : <AlertTriangle size={18} className="text-red-500 shrink-0" />}
                    <span className="w-24 shrink-0 font-mono text-xs text-zinc-500 tabular-nums">{ora(v.quando)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-zinc-900 truncate">
                        {NOME_MESSAGGIO[v.tipo as keyof typeof NOME_MESSAGGIO] || v.tipo}
                        <span className="font-normal text-zinc-500"> · {v.cliente || v.a}</span>
                      </span>
                      <span className={`block text-xs truncate ${v.esito === 'errore' ? 'text-red-600' : 'text-zinc-500'}`}>
                        {v.esito === 'errore' ? `Non partito: ${v.motivo || 'motivo sconosciuto'}` : `Consegnato al tablet · ${v.a}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          "Consegnato al tablet" vuol dire che il messaggio è arrivato a Traccar. Se la cliente non lo riceve, il blocco è sul tablet:
          app SMS predefinita, batteria senza restrizioni, connessione, credito della SIM.
        </p>
      </section>

      {/* Dettaglio di un SMS */}
      {aperta && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAperta(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-zinc-900 font-playfair">{NOME_MESSAGGIO[aperta.tipo as keyof typeof NOME_MESSAGGIO] || aperta.tipo}</div>
                <div className="text-sm text-zinc-500">{ora(aperta.quando)} · {aperta.cliente || ''} · {aperta.a}</div>
              </div>
              <button onClick={() => setAperta(null)} className="p-1 text-zinc-400 hover:text-zinc-900" aria-label="Chiudi"><X size={20} /></button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <div className={`text-sm font-medium flex items-center gap-2 ${aperta.esito === 'errore' ? 'text-red-700' : 'text-emerald-700'}`}>
                {aperta.esito === 'errore' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                {aperta.esito === 'errore' ? 'Non partito' : 'Consegnato al tablet'}
              </div>
              {aperta.motivo && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">{aperta.motivo}</p>}
              <p className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-100 rounded-lg p-3 whitespace-pre-wrap">{aperta.testo}</p>
            </div>
          </div>
        </div>
      )}

      {/* SMS di prova */}
      {prova && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setProva(null)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 font-playfair">SMS di prova</h3>
              <p className="text-sm text-zinc-500 mt-1">Parte dal tablet del salone, come gli SMS veri.</p>
            </div>
            <input
              autoFocus
              type="tel"
              inputMode="tel"
              placeholder="Il tuo cellulare"
              value={prova.telefono}
              onChange={e => setProva({ ...prova, telefono: e.target.value, esito: undefined })}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400 font-mono"
            />
            {prova.esito && (
              <div className={`p-3 rounded-lg text-sm border ${prova.esito.mandato ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                {prova.esito.mandato
                  ? `Consegnato al tablet per ${prova.esito.a}. Se entro un minuto non arriva, il problema è sul tablet.`
                  : `Non partito: ${prova.esito.motivo}`}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setProva(null)} className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">Chiudi</button>
              <button
                onClick={mandaProva}
                disabled={prova.invio || prova.telefono.replace(/\D/g, '').length < 6}
                className="flex-1 px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-50"
              >
                {prova.invio ? 'Mando...' : 'Manda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
