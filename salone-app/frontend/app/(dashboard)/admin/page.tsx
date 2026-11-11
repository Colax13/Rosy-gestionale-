'use client';

// Il pannello di chi gestisce Rosy: tutti i saloni, con piano, funzioni
// accese e consumi del mese. Da qui si attiva un salone nuovo, senza toccare
// il codice.
//
// La pagina la può aprire chiunque scriva l'indirizzo, ma i dati li dà il
// server, e solo a chi è nell'elenco degli amministratori (ADMIN_EMAILS su
// Vercel): agli altri risponde che è riservata.
//
// Si guarda in un elenco, si cambia in una finestra a parte.

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, RefreshCw, Loader2, Pencil, X, MessageSquare, Sparkles, Search, Lock } from 'lucide-react';
import { adminApi, SaloneNelPannello } from '@/lib/api-client';
import { FUNZIONI_ACCENDIBILI, Piano, pianoDi, statoSms, smsInclusi, leggiAbbonamento } from '@/lib/abbonamento';

const nomeMese = (m: string) => {
  const [anno, mese] = m.split('-').map(Number);
  if (!anno || !mese) return m;
  return new Date(anno, mese - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
};
const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const COLORE_SMS: Record<string, string> = {
  senza: 'text-zinc-500', ok: 'text-zinc-700', quasi: 'text-amber-600 font-semibold', oltre: 'text-red-600 font-semibold'
};

export default function PannelloSaloni() {
  const [saloni, setSaloni] = useState<SaloneNelPannello[] | null>(null);
  const [piani, setPiani] = useState<Piano[]>([]);
  const [mese, setMese] = useState('');
  const [chi, setChi] = useState('');
  const [errore, setErrore] = useState<{ testo: string; riservata: boolean } | null>(null);
  const [cerca, setCerca] = useState('');
  const [aperto, setAperto] = useState<SaloneNelPannello | null>(null);

  const carica = async () => {
    setSaloni(null);
    setErrore(null);
    try {
      const dati = await adminApi.elenco();
      setSaloni(dati.saloni);
      setPiani(dati.piani);
      setMese(dati.mese);
      setChi(dati.chi);
    } catch (e: any) {
      setErrore({ testo: e?.message || 'Il pannello non risponde.', riservata: e?.stato === 403 || e?.stato === 401 });
      setSaloni([]);
    }
  };
  useEffect(() => { carica(); }, []);

  const elenco = useMemo(() => {
    const t = cerca.trim().toLowerCase();
    return (saloni || []).filter(s => !t || `${s.nome} ${s.email}`.toLowerCase().includes(t));
  }, [saloni, cerca]);

  const totali = useMemo(() => {
    const tutti = saloni || [];
    const attivi = tutti.filter(s => pianoDi(s.abbonamento.piano).prezzo > 0);
    return {
      saloni: tutti.length,
      attivi: attivi.length,
      incasso: attivi.reduce((t, s) => t + pianoDi(s.abbonamento.piano).prezzo, 0),
      sms: tutti.reduce((t, s) => t + s.sms.mandati, 0)
    };
  }, [saloni]);

  if (errore?.riservata) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-sm text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center"><Lock size={22} /></div>
          <h1 className="text-xl font-playfair font-bold text-zinc-900">Pagina riservata</h1>
          <p className="text-sm text-zinc-500">{errore.testo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-24">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
            <ShieldCheck className="text-fuchsia-500" size={28} /> Saloni
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Chi usa Rosy, con che piano, e quanto ha consumato{mese ? ` a ${nomeMese(mese)}` : ''}.{chi ? ` Sei entrato come ${chi}.` : ''}
          </p>
        </div>
        <button onClick={carica} disabled={saloni === null} className="self-start sm:self-auto px-3 py-2 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-60 border border-zinc-200 text-zinc-800 text-sm font-medium rounded-lg flex items-center gap-2">
          {saloni === null ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Aggiorna
        </button>
      </header>

      {errore && !errore.riservata && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm">{errore.testo}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { etichetta: 'Saloni', valore: String(totali.saloni) },
          { etichetta: 'Con un piano a pagamento', valore: String(totali.attivi) },
          { etichetta: 'Incasso al mese', valore: `${totali.incasso} €`, accento: true },
          { etichetta: 'SMS mandati nel mese', valore: String(totali.sms) }
        ].map(t => (
          <div key={t.etichetta} className="bg-white border border-zinc-200 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">{t.etichetta}</div>
            <div className={`text-2xl font-playfair font-bold tabular-nums ${t.accento ? 'text-fuchsia-600' : 'text-zinc-900'}`}>{t.valore}</div>
          </div>
        ))}
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={cerca}
          onChange={e => setCerca(e.target.value)}
          placeholder="Cerca per nome o indirizzo…"
          className="w-full bg-white border border-zinc-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
        {saloni === null ? (
          <div className="p-10 text-center text-zinc-400 text-sm animate-pulse">Carico i saloni…</div>
        ) : elenco.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">{cerca ? 'Nessun salone con questo nome.' : 'Nessun salone.'}</div>
        ) : elenco.map(s => {
          const piano = pianoDi(s.abbonamento.piano);
          const sms = statoSms(s.sms.mandati, s.sms_inclusi);
          const accese = FUNZIONI_ACCENDIBILI.filter(f => s.abbonamento.funzioni[f.chiave] || (s.fisse as any)[f.chiave]);
          return (
            <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-900 font-semibold truncate">{s.nome || 'Salone senza nome'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${piano.prezzo > 0 ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-zinc-100 text-zinc-600'}`}>
                    {piano.nome}{piano.prezzo > 0 ? ` · ${piano.prezzo} €` : ''}
                  </span>
                  {accese.map(f => (
                    <span key={f.chiave} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">{f.etichetta}</span>
                  ))}
                  {s.fisse.messaggi_automatici && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">SMS automatici</span>
                  )}
                </div>
                <div className="text-sm text-zinc-500 truncate">{s.email || 'senza indirizzo'} · dal {quando(s.creato)}</div>
                {s.abbonamento.note && <div className="text-xs text-zinc-400 truncate mt-0.5">{s.abbonamento.note}</div>}
              </div>
              <div className="flex items-center gap-4 text-sm shrink-0">
                <span className={`flex items-center gap-1.5 tabular-nums ${COLORE_SMS[sms.livello]}`} title="SMS mandati questo mese">
                  <MessageSquare size={14} /> {sms.mandati}{sms.inclusi ? ` / ${sms.inclusi}` : ''}
                </span>
                <span className="flex items-center gap-1.5 text-zinc-500 tabular-nums" title="Domande a Rosy IA questo mese">
                  <Sparkles size={14} /> {s.domande_ia}
                </span>
                <button onClick={() => setAperto(s)} className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 font-medium rounded-lg flex items-center gap-1.5">
                  <Pencil size={14} /> Modifica
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500 mt-3">
        Gli SMS automatici oggi partono solo per il salone che ha il tablet: si accenderanno da qui quando ogni salone avrà il suo fornitore di SMS.
      </p>

      {aperto && (
        <ModificaSalone
          salone={aperto}
          piani={piani}
          onChiudi={() => setAperto(null)}
          onSalvato={nuovo => {
            setSaloni(prev => (prev || []).map(x => x.id === aperto.id ? { ...x, abbonamento: nuovo, sms_inclusi: smsInclusi(nuovo) } : x));
            setAperto(null);
          }}
        />
      )}
    </div>
  );
}

function ModificaSalone({ salone, piani, onChiudi, onSalvato }: {
  salone: SaloneNelPannello;
  piani: Piano[];
  onChiudi: () => void;
  onSalvato: (a: ReturnType<typeof leggiAbbonamento>) => void;
}) {
  const [piano, setPiano] = useState(salone.abbonamento.piano);
  const [funzioni, setFunzioni] = useState<Record<string, boolean>>({ ...salone.abbonamento.funzioni });
  const [sms, setSms] = useState(salone.abbonamento.sms_inclusi === null ? '' : String(salone.abbonamento.sms_inclusi));
  const [note, setNote] = useState(salone.abbonamento.note);
  const [salvo, setSalvo] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const scelto = piani.find(p => p.chiave === piano) || pianoDi(piano);

  const salva = async () => {
    setSalvo(true);
    setErrore(null);
    try {
      onSalvato(await adminApi.salva(salone.id, {
        piano,
        funzioni: funzioni as any,
        sms_inclusi: sms.trim() === '' ? null : Number(sms),
        note
      }));
    } catch (e: any) {
      setErrore(e?.message || 'Non sono riuscito a salvare.');
      setSalvo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onChiudi}>
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-bold text-zinc-900 font-playfair truncate">{salone.nome || 'Salone senza nome'}</div>
            <div className="text-sm text-zinc-500 truncate">{salone.email}</div>
          </div>
          <button onClick={onChiudi} className="p-1 text-zinc-400 hover:text-zinc-900" aria-label="Chiudi"><X size={20} /></button>
        </div>

        <div className="p-5 flex flex-col gap-5 overflow-y-auto">
          <div>
            <div className="text-sm font-semibold text-zinc-800 mb-2">Piano</div>
            <div className="flex flex-col gap-2">
              {piani.map(p => (
                <label key={p.chiave} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${piano === p.chiave ? 'border-fuchsia-400 bg-fuchsia-50/50' : 'border-zinc-200 hover:bg-zinc-50'}`}>
                  <input type="radio" name="piano" checked={piano === p.chiave} onChange={() => setPiano(p.chiave)} className="mt-1 accent-fuchsia-600" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900">{p.nome}{p.prezzo > 0 ? ` · ${p.prezzo} € al mese` : ''}</span>
                    <span className="block text-xs text-zinc-500">{p.descrizione}{p.sms ? ` ${p.sms} SMS compresi.` : ''}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-zinc-800 mb-2">Funzioni</div>
            {FUNZIONI_ACCENDIBILI.map(f => {
              const fissa = (salone.fisse as any)[f.chiave] === true;
              return (
                <label key={f.chiave} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200">
                  <input
                    type="checkbox"
                    checked={fissa || funzioni[f.chiave] === true}
                    disabled={fissa}
                    onChange={e => setFunzioni({ ...funzioni, [f.chiave]: e.target.checked })}
                    className="mt-1 accent-fuchsia-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-zinc-900">{f.etichetta}</span>
                    <span className="block text-xs text-zinc-500">
                      {f.descrizione}{fissa ? ' Per questo salone è accesa nel codice: da qui non si spegne.' : ''}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-800 mb-2 block" htmlFor="sms-inclusi">SMS compresi nel mese</label>
            <input
              id="sms-inclusi"
              type="number"
              inputMode="numeric"
              min={0}
              value={sms}
              onChange={e => setSms(e.target.value)}
              placeholder={`${scelto.sms} (quelli del piano)`}
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
            />
            <p className="text-xs text-zinc-500 mt-1">Lascia vuoto per usare quelli del piano. Per ora è solo un conteggio: superarli non blocca gli invii.</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-800 mb-2 block" htmlFor="note-salone">Note <span className="font-normal text-zinc-500">· le vedi solo tu</span></label>
            <textarea
              id="note-salone"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Es. paga con bonifico, rinnovo a marzo…"
              className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-fuchsia-400"
            />
          </div>

          {errore && <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">{errore}</div>}
        </div>

        <div className="p-4 border-t border-zinc-100 flex gap-2">
          <button onClick={onChiudi} className="flex-1 px-4 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl">Annulla</button>
          <button onClick={salva} disabled={salvo} className="flex-1 px-4 py-2.5 font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl disabled:opacity-60">
            {salvo ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}
