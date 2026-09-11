'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Plus, Printer, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Receipt } from 'lucide-react';
import { catalogoApi, clientiApi, appuntamentiApi } from '@/lib/api-client';
import { righeDaAppuntamento, contiPreconto, prezzoDiListino, euro, RigaPreconto } from '@/lib/preconto';
import { aNumero } from '@/lib/numeri';

interface Props {
  app: any;
  nomeSalone?: string;
  onChiudi: () => void;
  onCompletato: () => void;
}

/**
 * Fine appuntamento: due schermate, una dopo l'altra.
 *
 * 1. Il PRECONTO, come al ristorante: arriva con i trattamenti già spuntati,
 *    si toglie quello che non è stato fatto, si aggiunge quello fatto in più,
 *    si stampa. I prezzi sono quelli del catalogo.
 * 2. La CHIUSURA: quanto ha speso davvero, i colori usati, e quello che serve
 *    sapere la prossima volta — che finisce nella scheda della cliente, non
 *    solo su questo appuntamento.
 *
 * La strada è una sola: non c'è "completa" da una parte e "preconto"
 * dall'altra, così non capita di fare l'uno e dimenticare l'altro.
 */
export default function ChiusuraAppuntamento({ app, nomeSalone, onChiudi, onCompletato }: Props) {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvataggio, setSalvataggio] = useState(false);

  // Se l'appuntamento è già stato chiuso una volta si riparte da quel conto,
  // non da capo: si riapre proprio per correggere qualcosa.
  const giaChiuso = app?.preconto?.righe?.length > 0;

  const [righe, setRighe] = useState<RigaPreconto[]>([]);
  const [notePreconto, setNotePreconto] = useState(app?.preconto?.note || '');
  const [sconto, setSconto] = useState(
    app?.preconto?.sconto ? String(app.preconto.sconto) : ''
  );

  const [colori, setColori] = useState(app?.colori_utilizzati || '');
  const [noteCliente, setNoteCliente] = useState('');
  const [noteCaricate, setNoteCaricate] = useState(false);

  // Aggiunta di un servizio fuori programma
  const [aggiuntaAperta, setAggiuntaAperta] = useState(false);
  const [cercaServizio, setCercaServizio] = useState('');

  useEffect(() => {
    catalogoApi.getAll()
      .then(elenco => {
        const attivi = (elenco || []).filter((s: any) => s.attivo !== false);
        setCatalogo(attivi);
        setRighe(giaChiuso
          ? app.preconto.righe.map((r: any, i: number) => ({
              id: `salvata-${i}`,
              nome: r.nome,
              prezzo: aNumero(r.prezzo),
              daCatalogo: prezzoDiListino(r.nome, attivi) !== null,
              scelta: true
            }))
          : righeDaAppuntamento(app, attivi));
      })
      .catch(e => setErrore(e.message || 'Non sono riuscito a leggere il listino.'))
      .finally(() => setCaricamento(false));
  }, [app?.id]);

  // Le note della cliente si mostrano già scritte: si aggiunge a quello che
  // c'è, non si ricomincia da capo ogni volta.
  useEffect(() => {
    const idCliente = app?.id_cliente || app?.clienti?.id;
    if (!idCliente) { setNoteCaricate(true); return; }
    clientiApi.getById(idCliente)
      .then(c => setNoteCliente(c?.note || ''))
      .catch(() => {})
      .finally(() => setNoteCaricate(true));
  }, [app?.id]);

  const conti = useMemo(() => contiPreconto(righe, sconto), [righe, sconto]);

  const nomeCliente = [app?.clienti?.nome, app?.clienti?.cognome].filter(Boolean).join(' ') || 'Cliente';
  const quando = app?.data_ora ? new Date(app.data_ora) : new Date();

  const serviziAggiungibili = catalogo.filter(s =>
    s.nome.toLowerCase().includes(cercaServizio.toLowerCase())
  );

  const spunta = (id: string) =>
    setRighe(prev => prev.map(r => r.id === id ? { ...r, scelta: !r.scelta } : r));

  const cambiaPrezzo = (id: string, valore: string) =>
    setRighe(prev => prev.map(r => r.id === id ? { ...r, prezzo: aNumero(valore) } : r));

  const togli = (id: string) => setRighe(prev => prev.filter(r => r.id !== id));

  const aggiungi = (servizio: any) => {
    setRighe(prev => [...prev, {
      id: `agg-${Date.now()}-${prev.length}`,
      nome: servizio.nome,
      prezzo: prezzoDiListino(servizio.nome, catalogo) ?? 0,
      daCatalogo: true,
      scelta: true
    }]);
    setAggiuntaAperta(false);
    setCercaServizio('');
  };

  const aggiungiLibero = () => {
    const nome = cercaServizio.trim();
    if (!nome) return;
    setRighe(prev => [...prev, {
      id: `libero-${Date.now()}-${prev.length}`,
      nome,
      prezzo: 0,
      daCatalogo: false,
      scelta: true
    }]);
    setAggiuntaAperta(false);
    setCercaServizio('');
  };

  const stampa = () => window.print();

  const salva = async () => {
    setSalvataggio(true);
    setErrore(null);
    try {
      const scelte = righe.filter(r => r.scelta);
      await appuntamentiApi.update(app.id, {
        stato: 'completato',
        prezzo_finale: conti.daPagare,
        colori_utilizzati: colori,
        preconto: {
          righe: scelte.map(r => ({ nome: r.nome, prezzo: r.prezzo })),
          totale: conti.totale,
          sconto: conti.sconto,
          totale_finale: conti.daPagare,
          note: notePreconto,
          chiuso_il: new Date().toISOString()
        }
      });

      // Quello che serve sapere la prossima volta sta sulla CLIENTE, non
      // sull'appuntamento: è lì che si va a cercarlo fra sei mesi.
      const idCliente = app?.id_cliente || app?.clienti?.id;
      if (idCliente && noteCaricate) {
        await clientiApi.update(idCliente, { note: noteCliente });
      }

      onCompletato();
    } catch (err: any) {
      setErrore(err?.message || 'Non sono riuscito a chiudere l\'appuntamento.');
    } finally {
      setSalvataggio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 chiusura-appuntamento">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Intestazione */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-3 shrink-0 rounded-t-2xl">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-zinc-900 font-playfair flex items-center gap-2">
              {passo === 1 ? <><Receipt size={19} className="text-fuchsia-600" /> Preconto</>
                           : <><CheckCircle2 size={19} className="text-emerald-600" /> Chiudi l'appuntamento</>}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {nomeCliente} · {quando.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} alle{' '}
              {quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button onClick={onChiudi} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-full transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Due passi */}
        <div className="px-6 pt-3 shrink-0 flex items-center gap-2 text-xs font-semibold">
          <span className={passo === 1 ? 'text-fuchsia-600' : 'text-zinc-400'}>1 · Preconto</span>
          <span className="text-zinc-300">›</span>
          <span className={passo === 2 ? 'text-fuchsia-600' : 'text-zinc-400'}>2 · Cosa resta scritto</span>
        </div>

        {errore && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{errore}</span>
          </div>
        )}

        {/* ---------------- PASSO 1: il preconto ---------------- */}
        {passo === 1 && (
          <>
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
              {caricamento ? (
                <div className="py-10 text-center text-zinc-500 text-sm">Carico il listino…</div>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 mb-3">
                    Arrivano già spuntati i servizi fissati. Togli quello che non hai fatto,
                    aggiungi quello fatto in più.
                  </p>

                  <div className="border border-zinc-200 rounded-xl overflow-hidden">
                    {righe.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-zinc-500">
                        Nessun servizio. Aggiungine uno qui sotto.
                      </div>
                    )}
                    {righe.map(riga => (
                      <div
                        key={riga.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-100 last:border-b-0 transition-colors ${riga.scelta ? '' : 'bg-zinc-50/70'}`}
                      >
                        <button
                          onClick={() => spunta(riga.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${riga.scelta ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'border-zinc-300 bg-white'}`}
                        >
                          {riga.scelta && <Check size={13} strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${riga.scelta ? 'text-zinc-900 font-medium' : 'text-zinc-400 line-through'}`}>
                            {riga.nome}
                          </div>
                          {!riga.daCatalogo && (
                            <div className="text-[11px] text-amber-700">Non è a listino: scrivi tu il prezzo</div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number" step="0.01" min="0" inputMode="decimal"
                            value={riga.prezzo === 0 ? '' : riga.prezzo}
                            placeholder="0,00"
                            onChange={e => cambiaPrezzo(riga.id, e.target.value)}
                            className="w-24 p-2 text-right border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 tabular-nums text-sm"
                          />
                          <span className="text-zinc-400 text-sm">€</span>
                          <button
                            onClick={() => togli(riga.id)}
                            title="Togli la riga"
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Aggiungi un servizio */}
                  {!aggiuntaAperta ? (
                    <button
                      onClick={() => setAggiuntaAperta(true)}
                      className="mt-3 px-3 py-2 text-sm font-semibold text-fuchsia-600 hover:bg-fuchsia-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={16} /> Aggiungi un servizio
                    </button>
                  ) : (
                    <div className="mt-3 border border-zinc-200 rounded-xl overflow-hidden">
                      <input
                        autoFocus
                        value={cercaServizio}
                        onChange={e => setCercaServizio(e.target.value)}
                        placeholder="Cerca nel listino, o scrivi una voce nuova…"
                        className="w-full p-3 text-sm outline-none border-b border-zinc-100"
                      />
                      <div className="max-h-44 overflow-y-auto">
                        {serviziAggiungibili.map(s => (
                          <button
                            key={s.id}
                            onClick={() => aggiungi(s)}
                            className="w-full px-3 py-2.5 text-left hover:bg-zinc-50 flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="truncate">{s.nome}</span>
                            <span className="text-zinc-500 tabular-nums shrink-0">{euro(aNumero(s.prezzo_base ?? s.prezzo))}</span>
                          </button>
                        ))}
                        {cercaServizio.trim() && serviziAggiungibili.length === 0 && (
                          <button
                            onClick={aggiungiLibero}
                            className="w-full px-3 py-2.5 text-left hover:bg-zinc-50 text-sm text-fuchsia-600 font-medium"
                          >
                            Aggiungi «{cercaServizio.trim()}» come voce fuori listino
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => { setAggiuntaAperta(false); setCercaServizio(''); }}
                        className="w-full px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 border-t border-zinc-100"
                      >
                        Annulla
                      </button>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Nota sul preconto</label>
                    <input
                      value={notePreconto}
                      onChange={e => setNotePreconto(e.target.value)}
                      placeholder="Es. sconto fedeltà, prodotto portato dalla cliente…"
                      className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 text-sm"
                    />
                  </div>

                  <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-600">Totale</span>
                    <span className="text-xl font-bold text-zinc-900 tabular-nums">{euro(conti.totale)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/60 flex flex-wrap justify-end gap-3 shrink-0 rounded-b-2xl">
              <button
                onClick={stampa}
                disabled={righe.filter(r => r.scelta).length === 0}
                className="px-5 py-2.5 font-bold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Printer size={16} /> Stampa preconto
              </button>
              <button
                onClick={() => setPasso(2)}
                className="px-5 py-2.5 font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors"
              >
                Avanti
              </button>
            </div>
          </>
        )}

        {/* ---------------- PASSO 2: cosa resta scritto ---------------- */}
        {passo === 2 && (
          <>
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0 space-y-5">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Totale dei servizi</span>
                  <span className="font-semibold text-zinc-900 tabular-nums">{euro(conti.totale)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <label className="text-zinc-600">Sconto</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.01" min="0" inputMode="decimal"
                      value={sconto}
                      placeholder="0,00"
                      onChange={e => setSconto(e.target.value)}
                      className="w-28 p-2 text-right border border-zinc-300 bg-white text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 tabular-nums"
                    />
                    <span className="text-zinc-400">€</span>
                  </div>
                </div>
                <div className="h-px bg-zinc-200 my-1"></div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-700">Ha speso</span>
                  <span className="text-2xl font-bold text-fuchsia-600 tabular-nums">{euro(conti.daPagare)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Colori e codici usati</label>
                <textarea
                  value={colori}
                  onChange={e => setColori(e.target.value)}
                  placeholder="Es. 7.3 + 8.1 in parti uguali, ossigeno 20 vol, posa 35'"
                  className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 text-sm min-h-[76px] resize-y"
                />
                <p className="text-xs text-zinc-500 mt-1">Resta su questo appuntamento: la prossima volta si ripesca da qui.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                  Da ricordare su {app?.clienti?.nome || 'questa cliente'}
                </label>
                <textarea
                  value={noteCliente}
                  onChange={e => setNoteCliente(e.target.value)}
                  placeholder="Preferenze, sensibilità, carattere, come le piace il taglio…"
                  className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 text-sm min-h-[100px] resize-y"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Va nella sua scheda, non su questo appuntamento: è quello che si legge fra sei mesi.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/60 flex flex-wrap justify-between gap-3 shrink-0 rounded-b-2xl">
              <button
                onClick={() => setPasso(1)}
                className="px-4 py-2.5 font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Torna al preconto
              </button>
              <button
                onClick={salva}
                disabled={salvataggio}
                className="px-5 py-2.5 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> {salvataggio ? 'Salvo…' : 'Chiudi appuntamento'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Il foglio che esce dalla stampante. Sullo schermo non si vede mai:
          compare solo quando si stampa (vedi @media print in index.css).
          Sta appeso direttamente alla pagina, fuori dal riquadro: così in
          stampa si nasconde tutto il resto senza portarsi via anche lui. */}
      {createPortal(
      <div className="foglio-preconto" aria-hidden="true">
        <h1>{nomeSalone || 'Preconto'}</h1>
        <p className="intestazione">
          {nomeCliente}<br />
          {quando.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {quando.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <table>
          <tbody>
            {righe.filter(r => r.scelta).map(r => (
              <tr key={r.id}>
                <td>{r.nome}</td>
                <td className="cifra">{euro(r.prezzo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {conti.sconto > 0 && (
          <p className="riga-sconto">Sconto <span className="cifra">− {euro(conti.sconto)}</span></p>
        )}
        <p className="totale">Totale <span className="cifra">{euro(conti.daPagare)}</span></p>
        {notePreconto && <p className="nota">{notePreconto}</p>}
        <p className="piede">Documento non fiscale · non vale come ricevuta</p>
      </div>,
      document.body)}
    </div>
  );
}
