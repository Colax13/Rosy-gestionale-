'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Send, Loader2, MessageCircle, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { messaggiApi, salonApi } from '@/lib/api-client';
import { funzioneAccesa } from '@/lib/funzioni';
import { sessioneCorrente } from '@/lib/sessione';
import { linkWhatsApp, numeroInternazionale } from '@/lib/contatti';
import { daQuanto } from '@/lib/tempo';
import { TESTO_RECUPERO, LUNGHEZZA_MASSIMA, haConsensoMarketing, testoPer, erroreTesto } from '@/lib/recupero';

interface Riga { cliente: any; ultimaVisita: Date | null }

type Esito = { stato: 'invio' | 'mandato' | 'errore'; motivo?: string };

/**
 * "Invia messaggi" della pagina Rosy: un pannello a parte (non si modifica
 * dentro l'elenco) per scrivere il messaggio di recupero e mandarlo.
 *
 * - Con gli SMS attivi per il salone: si spuntano le clienti e il server
 *   manda un SMS a ciascuna, una dopo l'altra.
 * - Senza: si apre WhatsApp una cliente alla volta, col testo già scritto.
 * In tutti e due i casi l'invio di gruppo va solo a chi ha dato il consenso
 * al marketing; le altre si possono ricontattare a mano, una per una.
 */
export default function InviaRecupero({ righe, onClose }: { righe: Riga[]; onClose: () => void }) {
  const smsAttivi = funzioneAccesa('messaggi_automatici', sessioneCorrente()?.emailSalone);
  const [nomeSalone, setNomeSalone] = useState('il salone');
  const [testo, setTesto] = useState(TESTO_RECUPERO);
  const [esiti, setEsiti] = useState<Record<string, Esito>>({});
  const [inCorso, setInCorso] = useState(false);
  const [mostraSenzaConsenso, setMostraSenzaConsenso] = useState(false);

  useEffect(() => {
    salonApi.getSettings()
      .then(s => { const n = s?.salonDetails?.nomeSalone; if (n) setNomeSalone(n); })
      .catch(() => {});
  }, []);

  const raggiungibili = useMemo(() => righe.filter(r => numeroInternazionale(r.cliente.telefono)), [righe]);
  const conConsenso = useMemo(() => raggiungibili.filter(r => haConsensoMarketing(r.cliente)), [raggiungibili]);
  const senzaConsenso = useMemo(() => raggiungibili.filter(r => !haConsensoMarketing(r.cliente)), [raggiungibili]);

  const [scelte, setScelte] = useState<Set<string>>(() => new Set(conConsenso.map(r => r.cliente.id)));
  const problema = erroreTesto(testo);
  const esempio = testoPer(testo, conConsenso[0]?.cliente || { nome: 'Maria' }, nomeSalone);
  const scelteDaMandare = conConsenso.filter(r => scelte.has(r.cliente.id) && esiti[r.cliente.id]?.stato !== 'mandato');

  const cambia = (id: string) => setScelte(prima => {
    const dopo = new Set(prima);
    dopo.has(id) ? dopo.delete(id) : dopo.add(id);
    return dopo;
  });

  const mandaSms = async () => {
    if (problema || !scelteDaMandare.length) return;
    if (!confirm(`Mando l'SMS a ${scelteDaMandare.length} ${scelteDaMandare.length === 1 ? 'cliente' : 'clienti'}?`)) return;
    setInCorso(true);
    for (const r of scelteDaMandare) {
      const id = r.cliente.id;
      setEsiti(e => ({ ...e, [id]: { stato: 'invio' } }));
      try {
        const esito = await messaggiApi.recupero(id, testo);
        setEsiti(e => ({ ...e, [id]: esito.mandato ? { stato: 'mandato' } : { stato: 'errore', motivo: esito.motivo || 'non partito' } }));
      } catch (err: any) {
        setEsiti(e => ({ ...e, [id]: { stato: 'errore', motivo: err?.message || 'errore' } }));
      }
    }
    setInCorso(false);
  };

  const apriWhatsApp = (r: Riga) => {
    const link = linkWhatsApp(r.cliente.telefono, testoPer(testo, r.cliente, nomeSalone));
    if (link) window.open(link, '_blank', 'noopener');
    setEsiti(e => ({ ...e, [r.cliente.id]: { stato: 'mandato' } }));
  };

  const mandati = Object.values(esiti).filter(e => e.stato === 'mandato').length;

  const rigaCliente = (r: Riga, conSpunta: boolean) => {
    const id = r.cliente.id;
    const esito = esiti[id];
    return (
      <div key={id} className="flex items-center gap-3 px-4 py-2.5">
        {conSpunta && smsAttivi && (
          <input
            type="checkbox"
            checked={scelte.has(id)}
            disabled={inCorso || esito?.stato === 'mandato'}
            onChange={() => cambia(id)}
            className="w-4 h-4 accent-fuchsia-600 shrink-0"
            aria-label={`Scegli ${r.cliente.nome} ${r.cliente.cognome || ''}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 truncate">{r.cliente.nome} {r.cliente.cognome}</p>
          <p className="text-xs text-zinc-500 truncate">
            {r.ultimaVisita ? `Ultima visita ${daQuanto(r.ultimaVisita)}` : 'Non è mai passata'} · {r.cliente.telefono}
          </p>
        </div>
        {esito?.stato === 'invio' && <Loader2 size={16} className="animate-spin text-zinc-400 shrink-0" />}
        {esito?.stato === 'mandato' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
        {esito?.stato === 'errore' && (
          <span className="text-xs text-red-600 flex items-center gap-1 shrink-0" title={esito.motivo}>
            <AlertTriangle size={14} /> non partito
          </span>
        )}
        {(!smsAttivi || !conSpunta) && esito?.stato !== 'mandato' && (
          <button
            onClick={() => apriWhatsApp(r)}
            disabled={!!problema}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <MessageCircle size={14} /> WhatsApp
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={() => !inCorso && onClose()} />
      <div className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">Recupera le clienti</h2>
            <p className="text-xs text-zinc-500">
              {smsAttivi ? 'Gli SMS partono dal numero del salone.' : 'Si apre WhatsApp con il messaggio già scritto, una cliente alla volta.'}
            </p>
          </div>
          <button onClick={onClose} disabled={inCorso} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-2 border-b border-zinc-100">
            <label className="text-sm font-semibold text-zinc-900" htmlFor="testo-recupero">Messaggio</label>
            <textarea
              id="testo-recupero"
              value={testo}
              onChange={e => setTesto(e.target.value)}
              rows={4}
              disabled={inCorso}
              className="w-full bg-white border border-zinc-300 rounded-xl p-3 text-sm text-zinc-900 outline-none focus:border-fuchsia-500"
            />
            <div className="flex justify-between gap-2 text-xs">
              <span className="text-zinc-500">{'{nome}'} diventa il nome della cliente, {'{salone}'} il nome del salone.</span>
              <span className={testo.length > LUNGHEZZA_MASSIMA ? 'text-red-600' : 'text-zinc-400'}>{testo.length}/{LUNGHEZZA_MASSIMA}</span>
            </div>
            {problema
              ? <p className="text-xs text-red-600">{problema}</p>
              : <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5"><span className="font-medium">Anteprima:</span> {esempio}</p>}
          </div>

          <div className="px-5 pt-4 pb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <ShieldCheck size={16} className="text-emerald-600" />
            Con consenso ai messaggi promozionali ({conConsenso.length})
          </div>
          {conConsenso.length === 0 ? (
            <p className="px-5 pb-4 text-xs text-zinc-500">
              Nessuna di queste clienti ha dato il consenso al marketing. Si registra nella scheda della cliente
              (o lo spunta lei prenotando online). Intanto puoi ricontattarle a mano qui sotto.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">{conConsenso.map(r => rigaCliente(r, true))}</div>
          )}

          {senzaConsenso.length > 0 && (
            <div className="border-t border-zinc-100 mt-2">
              <button
                onClick={() => setMostraSenzaConsenso(v => !v)}
                className="w-full text-left px-5 py-3 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                {mostraSenzaConsenso ? 'Nascondi' : 'Mostra'} le {senzaConsenso.length} senza consenso (solo contatto a mano, una alla volta)
              </button>
              {mostraSenzaConsenso && <div className="divide-y divide-zinc-100">{senzaConsenso.map(r => rigaCliente(r, false))}</div>}
            </div>
          )}

          {righe.length > raggiungibili.length && (
            <p className="px-5 py-3 text-xs text-zinc-400">{righe.length - raggiungibili.length} senza un numero di telefono valido: non si possono contattare.</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">{mandati > 0 ? `${mandati} contattate` : ''}</span>
          {smsAttivi ? (
            <button
              onClick={mandaSms}
              disabled={inCorso || !!problema || scelteDaMandare.length === 0}
              className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
            >
              {inCorso ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {inCorso ? 'Invio in corso…' : `Manda SMS a ${scelteDaMandare.length}`}
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl">Fatto</button>
          )}
        </div>
      </div>
    </div>
  );
}
