import { useEffect, useMemo, useState } from 'react';
import { Tag, Plus, Search, X, Pencil, Loader2, AlertTriangle, PackagePlus, PackageMinus, Trash2 } from 'lucide-react';
import { prodottiApi } from '@/lib/api-client';
import {
  Prodotto, ModuloProdotto, moduloVuoto, moduloDa, validaProdotto,
  statoScorta, riepilogoMagazzino, filtraProdotti
} from '@/lib/prodotti';

const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

const ETICHETTA_SCORTA = {
  esaurito: { testo: 'Esaurito', classe: 'bg-red-50 text-red-700 border-red-200' },
  in_esaurimento: { testo: 'Sta finendo', classe: 'bg-amber-50 text-amber-700 border-amber-200' },
  ok: { testo: '', classe: '' }
} as const;

/**
 * Prodotti: il magazzino del salone. L'elenco si guarda e basta; per
 * cambiare un prodotto o caricarne/scaricarne dei pezzi si apre il pannello
 * a parte (mai caselle da scrivere dentro l'elenco).
 */
export default function ProdottiPage() {
  const [prodotti, setProdotti] = useState<Prodotto[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [cerca, setCerca] = useState('');
  const [aperto, setAperto] = useState<Prodotto | 'nuovo' | null>(null);

  useEffect(() => {
    try {
      return prodottiApi.ascolta(
        p => { setProdotti(p as Prodotto[]); setErrore(null); },
        e => setErrore(e.message.includes('permission')
          ? 'Il database non permette ancora di leggere i prodotti: vanno pubblicate le regole aggiornate.'
          : e.message)
      );
    } catch (e: any) {
      setErrore(e?.message || 'Prodotti non disponibili.');
    }
  }, []);

  const elenco = useMemo(() => filtraProdotti(prodotti || [], cerca), [prodotti, cerca]);
  const riepilogo = useMemo(() => riepilogoMagazzino(prodotti || []), [prodotti]);
  // Il pannello mostra sempre la versione aggiornata del prodotto aperto.
  const inModifica = aperto && aperto !== 'nuovo' ? (prodotti || []).find(p => p.id === aperto.id) || aperto : aperto;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
            <Tag className="text-fuchsia-500" size={28} />
            Prodotti
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">Il magazzino del salone: prezzi, pezzi disponibili e quelli da riordinare.</p>
        </div>
        <button
          onClick={() => setAperto('nuovo')}
          className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 self-start"
        >
          <Plus size={16} /> Nuovo prodotto
        </button>
      </header>

      {errore && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {errore}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { etichetta: 'Prodotti', valore: String(riepilogo.prodotti) },
          { etichetta: 'Pezzi in magazzino', valore: String(riepilogo.pezzi) },
          { etichetta: 'Valore (prezzo di vendita)', valore: euro(riepilogo.valore_vendita) },
          { etichetta: 'Da riordinare', valore: String(riepilogo.da_riordinare), avviso: riepilogo.da_riordinare > 0 }
        ].map(k => (
          <div key={k.etichetta} className="bg-white border border-zinc-200 rounded-xl p-4">
            <p className="text-xs text-zinc-500">{k.etichetta}</p>
            <p className={`text-2xl font-bold mt-1 ${k.avviso ? 'text-amber-600' : 'text-zinc-900'}`}>{k.valore}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          value={cerca}
          onChange={e => setCerca(e.target.value)}
          placeholder="Cerca per nome, marca, categoria o codice…"
          className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-fuchsia-500"
        />
      </div>

      {prodotti === null && !errore ? (
        <p className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carico i prodotti…</p>
      ) : elenco.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 flex flex-col items-center gap-2 text-center">
          <div className="p-3 bg-zinc-100 rounded-full text-zinc-400"><Tag size={22} /></div>
          <p className="text-sm font-medium text-zinc-700">{cerca ? 'Nessun prodotto trovato' : 'Ancora nessun prodotto'}</p>
          {!cerca && <p className="text-xs text-zinc-500 max-w-sm">Aggiungi i prodotti che vendi o usi in salone con "Nuovo prodotto".</p>}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
          {elenco.map(p => {
            const scorta = ETICHETTA_SCORTA[statoScorta(p)];
            return (
              <div key={p.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${p.attivo === false ? 'opacity-50' : ''}`}>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{p.nome}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {[p.marca, p.categoria, p.codice].filter(Boolean).join(' · ') || '—'}
                    {p.attivo === false ? ' · non più in vendita' : ''}
                  </p>
                </div>
                <div className="text-sm text-zinc-900 w-24 text-right">{euro(p.prezzo)}</div>
                <div className="w-36 flex items-center justify-end gap-2">
                  {scorta.testo && <span className={`text-[11px] px-2 py-0.5 rounded-full border ${scorta.classe}`}>{scorta.testo}</span>}
                  <span className="text-sm font-medium text-zinc-900">{p.giacenza} pz</span>
                </div>
                <button
                  onClick={() => setAperto(p)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5"
                >
                  <Pencil size={13} /> Modifica
                </button>
              </div>
            );
          })}
        </div>
      )}

      {inModifica && (
        <PannelloProdotto
          prodotto={inModifica === 'nuovo' ? null : inModifica}
          onClose={() => setAperto(null)}
        />
      )}
    </div>
  );
}

function PannelloProdotto({ prodotto, onClose }: { prodotto: Prodotto | null; onClose: () => void }) {
  const [modulo, setModulo] = useState<ModuloProdotto>(() => (prodotto ? moduloDa(prodotto) : moduloVuoto()));
  const [errori, setErrori] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [quanti, setQuanti] = useState('1');

  const campo = (chiave: keyof ModuloProdotto, etichetta: string, opzioni: { placeholder?: string; mezzo?: boolean; tipo?: string } = {}) => (
    <label className={`flex flex-col gap-1 ${opzioni.mezzo ? '' : 'col-span-2'}`}>
      <span className="text-xs font-medium text-zinc-600">{etichetta}</span>
      <input
        type="text"
        inputMode={opzioni.tipo as any}
        value={modulo[chiave]}
        placeholder={opzioni.placeholder}
        onChange={e => setModulo(m => ({ ...m, [chiave]: e.target.value }))}
        className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-500"
      />
    </label>
  );

  const salva = async () => {
    const { errori, dati } = validaProdotto(modulo);
    setErrori(errori);
    if (!dati) return;
    setSalvo(true);
    try {
      // I pezzi si cambiano con Carica/Scarica: qui si tiene quello che c'è adesso.
      if (prodotto) await prodottiApi.update(prodotto.id, { ...dati, giacenza: prodotto.giacenza, attivo: prodotto.attivo !== false });
      else await prodottiApi.create(dati);
      onClose();
    } catch (e: any) {
      setErrori([`Non sono riuscito a salvare: ${e?.message || 'errore sconosciuto'}`]);
    } finally {
      setSalvo(false);
    }
  };

  const muovi = async (segno: 1 | -1) => {
    if (!prodotto) return;
    const n = Math.trunc(Number(quanti));
    if (!Number.isFinite(n) || n <= 0) { setErrori(['Scrivi quanti pezzi (un numero intero).']); return; }
    if (segno < 0 && n > prodotto.giacenza) { setErrori([`In magazzino ce ne sono solo ${prodotto.giacenza}.`]); return; }
    setErrori([]);
    setSalvo(true);
    try { await prodottiApi.muovi(prodotto.id, segno * n); setQuanti('1'); }
    catch (e: any) { setErrori([`Non sono riuscito ad aggiornare i pezzi: ${e?.message || 'errore'}`]); }
    finally { setSalvo(false); }
  };

  const cambiaAttivo = async () => {
    if (!prodotto) return;
    const { dati } = validaProdotto(moduloDa(prodotto));
    if (!dati) return;
    setSalvo(true);
    try { await prodottiApi.update(prodotto.id, { ...dati, attivo: prodotto.attivo === false }); }
    finally { setSalvo(false); }
  };

  const elimina = async () => {
    if (!prodotto || !confirm(`Elimino "${prodotto.nome}"? Non si torna indietro.`)) return;
    setSalvo(true);
    try { await prodottiApi.delete(prodotto.id); onClose(); }
    catch (e: any) { setErrori([`Non sono riuscito a eliminarlo: ${e?.message || 'errore'}`]); setSalvo(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-zinc-900/30" onClick={() => !salvo && onClose()} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{prodotto ? 'Modifica prodotto' : 'Nuovo prodotto'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500" aria-label="Chiudi"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {prodotto && (
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="text-sm font-semibold text-zinc-900 mb-1">Magazzino: {prodotto.giacenza} pezzi</p>
              <p className="text-xs text-zinc-500 mb-3">Carica i pezzi arrivati, scarica quelli venduti o usati.</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={quanti}
                  onChange={e => setQuanti(e.target.value)}
                  className="w-20 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-500"
                  aria-label="Quanti pezzi"
                />
                <button onClick={() => muovi(1)} disabled={salvo} className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <PackagePlus size={15} /> Carica
                </button>
                <button onClick={() => muovi(-1)} disabled={salvo} className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-300 text-zinc-800 hover:bg-white flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <PackageMinus size={15} /> Scarica
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {campo('nome', 'Nome *', { placeholder: 'Es. Shampoo ristrutturante 250 ml' })}
            {campo('marca', 'Marca', { mezzo: true })}
            {campo('categoria', 'Categoria', { mezzo: true, placeholder: 'Es. Shampoo' })}
            {campo('prezzo', 'Prezzo di vendita (€) *', { mezzo: true, tipo: 'decimal', placeholder: '0,00' })}
            {campo('costo', 'Costo per il salone (€)', { mezzo: true, tipo: 'decimal' })}
            {!prodotto && campo('giacenza', 'Pezzi in magazzino', { mezzo: true, tipo: 'numeric' })}
            {campo('scorta_minima', 'Avvisa quando ne restano', { mezzo: true, tipo: 'numeric', placeholder: 'Es. 2' })}
            {campo('codice', 'Codice / EAN')}
            <label className="flex flex-col gap-1 col-span-2">
              <span className="text-xs font-medium text-zinc-600">Note</span>
              <textarea
                value={modulo.note}
                onChange={e => setModulo(m => ({ ...m, note: e.target.value }))}
                rows={3}
                className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-fuchsia-500"
              />
            </label>
          </div>

          {errori.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-1">
              {errori.map(e => <p key={e}>{e}</p>)}
            </div>
          )}

          {prodotto && (
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2">
              <button onClick={cambiaAttivo} disabled={salvo} className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50">
                {prodotto.attivo === false ? 'Rimetti in vendita' : 'Non più in vendita'}
              </button>
              <button onClick={elimina} disabled={salvo} className="px-3 py-2 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50 flex items-center gap-1.5">
                <Trash2 size={13} /> Elimina
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={salvo} className="px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-700">Annulla</button>
          <button onClick={salva} disabled={salvo} className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
            {salvo && <Loader2 size={15} className="animate-spin" />} Salva
          </button>
        </div>
      </div>
    </div>
  );
}
