// Impostazioni → SMS: il telefono da cui partono i messaggi alle clienti.
//
// Ogni salone collega il suo: conferme, promemoria e codici di verifica
// partono dal numero del salone, non da quello di qualcun altro. E c'è la
// prova, che manda un SMS vero e mostra che cosa ha risposto chi doveva
// consegnarlo: è il modo di vedere dove si ferma un messaggio che non arriva.

import { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle2, AlertTriangle, Loader2, Send, Smartphone, Unplug } from 'lucide-react';
import { smsApi, EsitoProvaSms } from '@/lib/api-client';

export default function ImpostazioniSms() {
  const [stato, setStato] = useState<{ collegato: boolean; origine: string | null } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [modifica, setModifica] = useState(false);
  const [gettone, setGettone] = useState('');
  const [salvo, setSalvo] = useState(false);

  const [telefonoProva, setTelefonoProva] = useState('');
  const [provaInCorso, setProvaInCorso] = useState(false);
  const [esitoProva, setEsitoProva] = useState<EsitoProvaSms | null>(null);

  const carica = () => smsApi.stato().then(setStato).catch(e => setErrore(e.message));
  useEffect(() => { carica(); }, []);

  const collega = async () => {
    setSalvo(true); setErrore(null);
    try {
      await smsApi.collega(gettone);
      setGettone(''); setModifica(false); setEsitoProva(null);
      await carica();
    } catch (e: any) { setErrore(e.message); } finally { setSalvo(false); }
  };

  const scollega = async () => {
    if (!confirm('Scollegare il telefono? Da quel momento gli SMS alle clienti non partono più.')) return;
    setSalvo(true); setErrore(null);
    try { await smsApi.scollega(); await carica(); } catch (e: any) { setErrore(e.message); } finally { setSalvo(false); }
  };

  const prova = async () => {
    setProvaInCorso(true); setEsitoProva(null); setErrore(null);
    try { setEsitoProva(await smsApi.prova(telefonoProva)); } catch (e: any) { setErrore(e.message); } finally { setProvaInCorso(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2"><MessageSquare size={20} className="text-fuchsia-600" /> SMS alle clienti</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Conferme, promemoria del giorno prima e codici di verifica partono da un telefono Android in salone,
          con la sua SIM. Non si paga niente a messaggio, e alla cliente arrivano dal vostro numero.
        </p>
      </div>

      {errore && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errore}</div>
      )}

      {/* Lo stato, da leggere. Per cambiarlo si apre il modulo apposta. */}
      <div className="p-4 border border-zinc-200 rounded-xl flex items-start justify-between gap-4">
        {!stato ? (
          <span className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Controllo…</span>
        ) : stato.collegato ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-zinc-900">Telefono collegato</p>
              <p className="text-sm text-zinc-500">
                {stato.origine === 'vercel'
                  ? 'Con le chiavi messe su Vercel. Puoi collegarlo anche da qui: vale questo.'
                  : 'Collegato da questa pagina.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Smartphone className="text-zinc-400 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-zinc-900">Nessun telefono collegato</p>
              <p className="text-sm text-zinc-500">Per ora alle clienti non parte nessun SMS: le avvisi tu con Ricontatta.</p>
            </div>
          </div>
        )}
        {stato && !modifica && (
          <div className="flex gap-2 shrink-0">
            {stato.collegato && stato.origine === 'salone' && (
              <button onClick={scollega} disabled={salvo} className="px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg flex items-center gap-1.5">
                <Unplug size={15} /> Scollega
              </button>
            )}
            <button onClick={() => setModifica(true)} className="px-4 py-2 text-sm font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg">
              {stato.collegato ? 'Cambia telefono' : 'Collega il telefono'}
            </button>
          </div>
        )}
      </div>

      {modifica && (
        <div className="p-5 border border-fuchsia-200 bg-fuchsia-50/40 rounded-xl space-y-4">
          <ol className="text-sm text-zinc-700 space-y-2 list-decimal pl-5">
            <li>Sul telefono Android del salone installa <strong>Traccar SMS Gateway</strong> dal Play Store.</li>
            <li>Rendila l'<strong>app predefinita per gli SMS</strong> (Impostazioni → App → App predefinite → SMS). Senza questo, Android non le lascia spedire.</li>
            <li>Impostazioni → App → Traccar SMS Gateway → Batteria → <strong>Senza restrizioni</strong>.</li>
            <li>Nell'app apri il menù <strong>Gateway</strong>, accendilo, e copia il <strong>Cloud token</strong>.</li>
            <li>Incollalo qui sotto.</li>
          </ol>
          <div>
            <label className="block text-sm font-medium text-zinc-600 mb-1">Cloud token</label>
            <input
              value={gettone}
              onChange={e => setGettone(e.target.value)}
              type="password"
              autoComplete="off"
              className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-fuchsia-500 font-mono"
              placeholder="incolla qui il gettone"
            />
            <p className="text-xs text-zinc-400 mt-1">Una volta salvato non si vede più: resta solo sul server.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setModifica(false); setGettone(''); }} className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg">Annulla</button>
            <button onClick={collega} disabled={salvo || gettone.trim().length < 8} className="px-4 py-2 text-sm font-semibold text-white bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 rounded-lg flex items-center gap-2">
              {salvo && <Loader2 size={15} className="animate-spin" />} Collega
            </button>
          </div>
        </div>
      )}

      {/* La prova: un SMS vero, e la risposta di chi doveva consegnarlo. */}
      {stato?.collegato && (
        <div className="p-5 border border-zinc-200 rounded-xl space-y-3">
          <div>
            <p className="font-semibold text-zinc-900">Manda un SMS di prova</p>
            <p className="text-sm text-zinc-500">Ti dice esattamente dove si ferma un messaggio che non arriva.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={telefonoProva}
              onChange={e => setTelefonoProva(e.target.value)}
              type="tel"
              placeholder="Il tuo cellulare"
              className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm outline-none focus:border-fuchsia-500"
            />
            <button onClick={prova} disabled={provaInCorso || telefonoProva.replace(/\D/g, '').length < 6} className="px-4 py-2 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-xl flex items-center gap-2 shrink-0">
              {provaInCorso ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Manda
            </button>
          </div>
          {esitoProva && <EsitoProva esito={esitoProva} />}
        </div>
      )}
    </div>
  );
}

/**
 * La risposta, tradotta in "dove si ferma". Un messaggio fa tre tappe:
 * gestionale → servizio che fa da ponte (Traccar) → telefono del salone → cliente.
 */
function EsitoProva({ esito }: { esito: EsitoProvaSms }) {
  const d = esito.dettaglio;
  const tecnico = d && (
    <p className="mt-2 text-xs text-zinc-500 font-mono break-all">
      {d.postino}{d.stato ? ` · risposta ${d.stato}` : ''}{d.risposta ? ` · ${d.risposta}` : ''}
    </p>
  );

  if (esito.mandato) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
        <p className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle2 size={16} /> {d?.postino || 'Il ponte'} ha preso il messaggio</p>
        <p className="text-emerald-900 mt-1">Il gestionale ha fatto la sua parte. Se entro un minuto non ti arriva, il blocco è sul <strong>telefono del salone</strong>:</p>
        <ul className="list-disc pl-5 mt-1 text-emerald-900 space-y-0.5">
          <li>Traccar è l'<strong>app predefinita per gli SMS</strong>?</li>
          <li>La batteria per Traccar è <strong>senza restrizioni</strong>? (sui Samsung: anche fuori da "App in sospensione")</li>
          <li>Il telefono è <strong>connesso a internet</strong> e la SIM ha <strong>credito/SMS</strong>?</li>
          <li>Apri Traccar: il messaggio compare? Se c'è ed è "non inviato", il problema è la SIM.</li>
        </ul>
        {tecnico}
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm">
      <p className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle size={16} /> Il messaggio non è partito</p>
      <p className="text-red-900 mt-1">{esito.motivo}</p>
      {d?.stato === 401 || d?.stato === 403 || d?.stato === 404
        ? <p className="text-red-900 mt-1">Di solito vuol dire che il <strong>gettone è sbagliato</strong>: ricopialo dall'app e collegalo di nuovo.</p>
        : null}
      {tecnico}
    </div>
  );
}
