// Il paracadute: quando un pezzo del programma si rompe, si ferma solo quello.
//
// Prima un errore in una pagina qualsiasi (un dato scritto in modo strano, una
// svista in una versione nuova) lasciava lo schermo bianco, agenda compresa, e
// in salone non si lavorava più. Adesso l'errore resta chiuso dove è nato:
//
//   - "riquadro":  si spegne solo quel riquadro, il resto della pagina resta;
//   - "pagina":    si spegne la pagina, menu e altre pagine funzionano;
//   - "programma": ultima rete, a tutto schermo, con il rimando alla riserva.
//
// I dati non c'entrano: stanno sul database, e un errore di schermo non li tocca.

import { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, CalendarDays, LifeBuoy, Copy, Check } from 'lucide-react';
import { urlRiserva, ePaginaPubblica, indirizzoSullaRiserva, segnaProblema } from '@/lib/riserva';
import { saloneDelDominio } from '@/lib/domini';

type Livello = 'riquadro' | 'pagina' | 'programma';

interface Props {
  livello: Livello;
  /** Cambiando pagina l'errore si dimentica: la pagina nuova parte pulita. */
  percorso?: string;
  /** Per il riquadro: che cosa non si vede ("il riepilogo"). */
  nome?: string;
  children: ReactNode;
}

interface Stato {
  errore: Error | null;
  pila: string;
}

export default class Paracadute extends Component<Props, Stato> {
  state: Stato = { errore: null, pila: '' };

  static getDerivedStateFromError(errore: unknown): Partial<Stato> {
    return { errore: errore instanceof Error ? errore : new Error(String(errore)) };
  }

  componentDidCatch(errore: Error, info: ErrorInfo) {
    const pila = `${errore?.stack || ''}\n${info?.componentStack || ''}`.trim();
    this.setState({ pila });
    console.error(`Rosy: errore (${this.props.livello})`, errore, info?.componentStack);
    segnaProblema(`${this.props.livello}${this.props.nome ? ` · ${this.props.nome}` : ''}: ${errore?.message || errore}`, pila);
  }

  componentDidUpdate(prima: Props) {
    if (this.state.errore && prima.percorso !== this.props.percorso) {
      this.setState({ errore: null, pila: '' });
    }
  }

  riprova = () => this.setState({ errore: null, pila: '' });

  render() {
    const { errore, pila } = this.state;
    if (!errore) return this.props.children;
    if (this.props.livello === 'riquadro') {
      return <RiquadroGuasto nome={this.props.nome} onRiprova={this.riprova} />;
    }
    return <SchermataGuasto livello={this.props.livello} errore={errore} pila={pila} onRiprova={this.riprova} />;
  }
}

function RiquadroGuasto({ nome, onRiprova }: { nome?: string; onRiprova: () => void }) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="flex items-center gap-2 flex-1">
        <AlertTriangle size={16} className="shrink-0" />
        Non riesco a mostrare {nome || 'questo riquadro'}. Il resto della pagina funziona.
      </span>
      <button onClick={onRiprova} className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg font-medium shrink-0">
        Riprova
      </button>
    </div>
  );
}

const SECONDI_PRIMA_DELLA_RISERVA = 12;

function SchermataGuasto({ livello, errore, pila, onRiprova }: { livello: Livello; errore: Error; pila: string; onRiprova: () => void }) {
  const percorso = window.location.pathname;
  // La cliente che prenota (anche dall'indirizzo tutto del salone) non va mai
  // mandata sul gestionale di riserva.
  const pubblica = ePaginaPubblica(percorso) || !!saloneDelDominio(window.location.hostname);
  const riserva = pubblica ? null : urlRiserva();
  const versoRiserva = riserva ? indirizzoSullaRiserva(riserva, percorso) : null;
  const [copiato, setCopiato] = useState(false);

  // Solo quando è caduto tutto il programma si passa alla riserva da soli:
  // per una pagina sola no, perché il resto qui funziona ancora.
  const [secondi, setSecondi] = useState<number | null>(livello === 'programma' && versoRiserva ? SECONDI_PRIMA_DELLA_RISERVA : null);
  useEffect(() => {
    if (secondi === null || !versoRiserva) return;
    if (secondi <= 0) { window.location.href = versoRiserva; return; }
    const t = setTimeout(() => setSecondi(s => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondi, versoRiserva]);

  const dettagli = [
    `Quando: ${new Date().toLocaleString('it-IT')}`,
    `Pagina: ${percorso}`,
    `Errore: ${errore?.message || errore}`,
    pila ? `\n${pila.split('\n').slice(0, 14).join('\n')}` : ''
  ].filter(Boolean).join('\n');

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(dettagli);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch { /* si può sempre selezionare a mano */ }
  };

  const bottone = 'px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors';
  const secondario = `${bottone} bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200`;

  return (
    <div className={`${livello === 'programma' ? 'min-h-[100dvh]' : 'flex-1 min-h-[60vh]'} w-full flex items-center justify-center p-4 bg-white`}>
      <div role="alert" className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-playfair font-bold text-zinc-900">
            {livello === 'programma' ? 'Rosy ha avuto un problema' : 'Questa pagina ha avuto un problema'}
          </h2>
          <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
            {pubblica
              ? 'La pagina non si è aperta come doveva. Riprova: di solito basta ricaricare.'
              : livello === 'programma'
                ? `I dati sono al sicuro: clienti e appuntamenti stanno sul database e non sono stati toccati. Ricarica la pagina; se non basta, ${versoRiserva ? 'usa il gestionale di riserva' : 'avvisa chi segue il programma'}.`
                : 'I dati sono al sicuro e il resto del gestionale funziona: puoi riprovare, oppure tornare all\'agenda dal menu.'}
          </p>
        </div>

        {secondi !== null && versoRiserva && (
          <div className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-900 rounded-xl p-3 text-sm flex items-center gap-3">
            <span className="flex-1">Ti porto al gestionale di riserva fra <strong className="tabular-nums">{secondi}</strong> secondi.</span>
            <button onClick={() => setSecondi(null)} className="px-3 py-1.5 bg-white border border-fuchsia-200 hover:bg-fuchsia-100 rounded-lg font-medium shrink-0">
              Resta qui
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {livello === 'pagina' && (
            <button onClick={onRiprova} className={`${bottone} bg-fuchsia-600 hover:bg-fuchsia-700 text-white`}>
              <RefreshCw size={16} /> Riprova
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className={livello === 'pagina' ? secondario : `${bottone} bg-fuchsia-600 hover:bg-fuchsia-700 text-white`}
          >
            <RefreshCw size={16} /> Ricarica la pagina
          </button>
          {!pubblica && percorso !== '/agenda' && (
            <a href="/agenda" className={secondario}>
              <CalendarDays size={16} /> Vai all'agenda
            </a>
          )}
          {versoRiserva && (
            <a href={versoRiserva} className={secondario}>
              <LifeBuoy size={16} /> Apri il gestionale di riserva
            </a>
          )}
        </div>

        {!pubblica && (
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer select-none hover:text-zinc-800">Dettagli per l'assistenza</summary>
            <pre className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg whitespace-pre-wrap break-words max-h-48 overflow-y-auto text-[11px] leading-relaxed text-zinc-700">{dettagli}</pre>
            <button onClick={copia} className="mt-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-medium text-zinc-700 flex items-center gap-1.5">
              {copiato ? <Check size={13} /> : <Copy size={13} />} {copiato ? 'Copiato' : 'Copia i dettagli'}
            </button>
          </details>
        )}
      </div>
    </div>
  );
}
