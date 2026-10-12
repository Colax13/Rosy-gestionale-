import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, CalendarCheck, Check, X, AlertCircle, Loader2, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import RosyLogo from './RosyLogo';
import { auth } from '../lib/firebase';
import { rosyApi, clientiApi, appuntamentiApi, messaggiApi } from '@/lib/api-client';

// La chat con Rosy. Rosy legge e risponde; quando le si chiede di fissare un
// appuntamento mostra una proposta, e l'appuntamento si salva solo premendo
// "Conferma" qui sotto.
//
// Telefoni, email e note non passano dall'IA: quando Rosy trova una cliente,
// sotto la risposta compare "Apri scheda", che porta alla scheda vera.

type StatoProposta = 'da_confermare' | 'salvo' | 'fissato' | 'scartata' | 'errore';

interface Proposta {
  riepilogo: string;
  cliente: { id?: string; nome: string; cognome: string; telefono: string };
  appuntamento: any;
  stato: StatoProposta;
  avvisa: boolean;
  esito?: string;
}

interface Messaggio {
  id: number;
  ruolo: 'utente' | 'rosy';
  testo: string;
  proposte?: Proposta[];
  /** Le clienti trovate: il pulsante per aprirne la scheda. */
  schede?: { id: string; nome: string }[];
  errore?: boolean;
  saluto?: boolean;
}

const SUGGERIMENTI = [
  'Chi ho in agenda domani?',
  'Orari liberi sabato per una piega',
  "Quand'è venuta l'ultima volta Maria Rossi?"
];

/** Gemini scrive in markdown: qui basta togliere gli asterischi e tenere gli elenchi. */
const pulisci = (t: string) => t
  .replace(/\*\*(.+?)\*\*/g, '$1')
  .replace(/^\s*[*-]\s+/gm, '• ')
  .replace(/^#+\s*/gm, '')
  .trim();

export default function RosyChat({ onChiudi }: { onChiudi?: () => void } = {}) {
  const navigate = useNavigate();
  const nome = auth.currentUser?.displayName?.split(' ')[0] || '';
  const [messaggi, setMessaggi] = useState<Messaggio[]>([{
    id: 1,
    ruolo: 'rosy',
    saluto: true,
    testo: `Ciao${nome ? ` ${nome}` : ''}! Sono Rosy. Posso dirti chi hai in agenda, cercare una cliente, trovarti un orario libero e prepararti un appuntamento da confermare.`
  }]);
  const [testo, setTesto] = useState('');
  const [penso, setPenso] = useState(false);
  const fondo = useRef<HTMLDivElement>(null);

  // Appena si apre la chat il server si prepara: la prima domanda è più veloce.
  useEffect(() => { rosyApi.riscalda(); }, []);

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messaggi, penso]);

  const manda = async (domanda?: string) => {
    const t = (domanda ?? testo).trim();
    if (!t || penso) return;
    const mio: Messaggio = { id: Date.now(), ruolo: 'utente', testo: t };
    const storia = [...messaggi, mio]
      .filter(m => !m.saluto && !m.errore)
      .map(m => ({ ruolo: m.ruolo, testo: m.testo }));
    setMessaggi(prev => [...prev, mio]);
    setTesto('');
    setPenso(true);
    try {
      const r = await rosyApi.chiedi(storia);
      setMessaggi(prev => [...prev, {
        id: Date.now() + 1,
        ruolo: 'rosy',
        testo: r.testo,
        proposte: r.proposte.map((p: any) => ({ ...p, stato: 'da_confermare' as StatoProposta, avvisa: true })),
        schede: r.schede || []
      }]);
    } catch (err: any) {
      setMessaggi(prev => [...prev, { id: Date.now() + 1, ruolo: 'rosy', errore: true, testo: err?.message || 'Rosy non ha risposto: riprova fra poco.' }]);
    } finally {
      setPenso(false);
    }
  };

  const cambiaProposta = (idMsg: number, i: number, cambio: Partial<Proposta>) =>
    setMessaggi(prev => prev.map(m => m.id !== idMsg ? m : {
      ...m,
      proposte: m.proposte?.map((p, j) => (j === i ? { ...p, ...cambio } : p))
    }));

  const conferma = async (idMsg: number, i: number, p: Proposta) => {
    cambiaProposta(idMsg, i, { stato: 'salvo', esito: undefined });
    try {
      // Cliente nuova: si scrive in rubrica (o si ritrova, se c'è già con lo
      // stesso numero o lo stesso nome).
      const idCliente = p.appuntamento.id_cliente || p.cliente.id
        || await clientiApi.assicuraDaAppuntamento({ ...p.appuntamento, id_cliente: undefined });
      const dati = { ...p.appuntamento, ...(idCliente ? { id_cliente: idCliente } : {}) };
      const creato = await appuntamentiApi.create(dati);

      let esito = 'Appuntamento fissato in agenda.';
      if (p.avvisa) {
        try {
          const r: any = await messaggiApi.manda(creato.id, 'conferma');
          esito = r?.mandato === false
            ? `Appuntamento fissato. SMS non partito${r?.motivo ? `: ${r.motivo}` : '.'}`
            : 'Appuntamento fissato e SMS di conferma inviato.';
        } catch {
          esito = "Appuntamento fissato, ma l'SMS di conferma non è partito.";
        }
      }
      cambiaProposta(idMsg, i, { stato: 'fissato', esito });
    } catch (err: any) {
      cambiaProposta(idMsg, i, { stato: 'errore', esito: err?.message || "Non sono riuscita a salvare l'appuntamento." });
    }
  };

  const soloSaluto = messaggi.length === 1;

  return (
    <div className="flex flex-col h-full bg-transparent text-zinc-900 relative">
      <div className="flex-1 overflow-y-auto w-full scrollbar-none p-6 pb-4 flex flex-col gap-4">
        <div className="flex flex-col mb-2 bg-zinc-100/80 p-4 rounded-xl border border-zinc-200 pr-12">
          <h3 className="text-zinc-900 font-semibold mb-1">Rosy</h3>
          <p className="text-zinc-500 text-sm">Di cosa ha bisogno il tuo salone oggi?</p>
        </div>

        {messaggi.map(m => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={m.id}
            className={`flex ${m.ruolo === 'utente' ? 'justify-end' : 'justify-start'} w-full items-end gap-2`}
          >
            {m.ruolo === 'rosy' && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center -mb-1 shadow-[0_2px_10px_rgba(212,0,255,0.2)]">
                <RosyLogo size="sm" />
              </div>
            )}
            <div className="max-w-[85%] flex flex-col gap-2">
              <div className={`p-3.5 px-4 rounded-2xl ${
                m.ruolo === 'utente'
                  ? 'bg-zinc-900 text-white rounded-br-none font-medium shadow-md'
                  : m.errore
                    ? 'bg-red-50 text-red-700 rounded-bl-sm border border-red-200'
                    : 'bg-white text-zinc-800 rounded-bl-sm border border-zinc-200 shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                  {m.errore && <AlertCircle size={14} className="inline mr-1.5 -mt-0.5" />}
                  {m.ruolo === 'rosy' ? pulisci(m.testo) : m.testo}
                </p>
              </div>

              {!!m.schede?.length && (
                <div className="flex flex-col gap-1.5">
                  {m.schede.map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => { onChiudi?.(); navigate(`/clienti/${sc.id}`); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-800 hover:border-fuchsia-300 hover:text-fuchsia-700 transition-colors text-left"
                    >
                      <UserRound size={15} className="text-fuchsia-600 shrink-0" />
                      <span className="flex-1 min-w-0 truncate">Apri scheda di <span className="font-semibold">{sc.nome}</span></span>
                      <ChevronRight size={15} className="text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {m.proposte?.map((p, i) => (
                <div key={i} className="bg-fuchsia-50 border border-fuchsia-200 rounded-2xl p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-start gap-2">
                    <CalendarCheck size={16} className="text-fuchsia-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-zinc-900 leading-snug">{p.riepilogo}</p>
                  </div>
                  {!p.cliente.id && p.stato === 'da_confermare' && (
                    <p className="text-xs text-zinc-500">Cliente nuova: verrà aggiunta in rubrica.</p>
                  )}

                  {(p.stato === 'da_confermare' || p.stato === 'errore') && (
                    <>
                      <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={p.avvisa}
                          onChange={e => cambiaProposta(m.id, i, { avvisa: e.target.checked })}
                          className="accent-fuchsia-600"
                        />
                        Avvisa la cliente con SMS
                      </label>
                      {p.stato === 'errore' && <p className="text-xs text-red-600">{p.esito}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => cambiaProposta(m.id, i, { stato: 'scartata' })}
                          className="flex-1 px-3 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-xl transition-colors"
                        >
                          Scarta
                        </button>
                        <button
                          onClick={() => conferma(m.id, i, p)}
                          className="flex-1 px-3 py-2 text-sm font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors"
                        >
                          Conferma
                        </button>
                      </div>
                    </>
                  )}
                  {p.stato === 'salvo' && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Salvo...</p>
                  )}
                  {p.stato === 'fissato' && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1.5"><Check size={14} /> {p.esito}</p>
                  )}
                  {p.stato === 'scartata' && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5"><X size={13} /> Proposta scartata.</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {soloSaluto && (
          <div className="flex flex-wrap gap-2 pl-10">
            {SUGGERIMENTI.map(s => (
              <button
                key={s}
                onClick={() => manda(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 bg-white text-zinc-600 hover:border-fuchsia-300 hover:text-fuchsia-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {penso && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center -mb-1">
              <RosyLogo size="sm" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-zinc-200 shadow-sm flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={fondo} />
      </div>

      <div className="p-4 bg-zinc-50/90 backdrop-blur-md border-t border-zinc-200 mt-auto sticky bottom-0 rounded-b-3xl">
        <div className="relative flex items-center">
          <input
            type="text"
            value={testo}
            onChange={e => setTesto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && manda()}
            placeholder="Chiedi a Rosy (es. 'Fissa una piega a Maria sabato')"
            className="w-full bg-white border border-zinc-200 focus:border-zinc-300 rounded-xl pl-4 pr-12 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none transition-colors shadow-inner"
          />
          <button
            onClick={() => manda()}
            disabled={penso || !testo.trim()}
            aria-label="Invia"
            className="absolute right-2 w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
