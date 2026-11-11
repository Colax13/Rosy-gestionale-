// La testa dell'agenda sul telefono, alla maniera dei calendari che si usano
// ogni giorno: in alto il mese (si tocca e si apre il calendario), sotto la
// striscia dei giorni della settimana, poi i pallini delle operatrici.
//
// Si vede solo sotto i 768 pixel. Da computer l'agenda ha la sua intestazione
// di sempre e questo file non entra in gioco.

import { useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

type Vista = 'giorno' | 'settimana' | 'mese';

interface Operatrice { id: string; nome?: string; cognome?: string }

interface Props {
  giorno: Date;
  vista: Vista;
  operatrici: Operatrice[];
  /** 'tutti' oppure l'id dell'operatrice che si sta guardando. */
  operatrice: string;
  /** La classe del colore di un'operatrice (lo stesso pallino della colonna). */
  coloreDi: (id: string) => string;
  richieste: number;
  onGiorno: (d: Date) => void;
  onVista: (v: Vista) => void;
  onOggi: () => void;
  onOperatrice: (id: string) => void;
  onRichieste: () => void;
}

const LETTERE = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const stessoGiorno = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const lunediDi = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const piu = (d: Date, giorni: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + giorni);
const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function BarraTelefono({
  giorno, vista, operatrici, operatrice, coloreDi, richieste,
  onGiorno, onVista, onOggi, onOperatrice, onRichieste
}: Props) {
  const oggi = new Date();
  const [meseAperto, setMeseAperto] = useState(false);
  // Il mese che si sta sfogliando nel calendario aperto (non cambia il giorno
  // scelto finché non se ne tocca uno).
  const [sfoglia, setSfoglia] = useState(() => new Date(giorno.getFullYear(), giorno.getMonth(), 1));
  const tocco = useRef<{ x: number; y: number } | null>(null);

  const apriMese = () => {
    setSfoglia(new Date(giorno.getFullYear(), giorno.getMonth(), 1));
    setMeseAperto(v => !v);
  };

  const titolo = maiuscola(giorno.toLocaleDateString('it-IT', {
    month: 'long',
    ...(giorno.getFullYear() !== oggi.getFullYear() ? { year: 'numeric' } : {})
  }));

  const lunedi = lunediDi(giorno);
  const settimana = Array.from({ length: 7 }, (_, i) => piu(lunedi, i));

  // Le caselle del mese aperto: dal lunedì della prima settimana, sei righe.
  const primaCasella = lunediDi(sfoglia);
  const caselle = Array.from({ length: 42 }, (_, i) => piu(primaCasella, i));
  const righe = caselle.slice(35).some(d => d.getMonth() === sfoglia.getMonth()) ? 42 : 35;

  const scegli = (d: Date) => {
    onGiorno(d);
    if (vista !== 'giorno') onVista('giorno');
    setMeseAperto(false);
  };

  return (
    <div className="md:hidden bg-white border-b border-zinc-200 shrink-0 select-none">
      {/* Mese, oggi, vista */}
      <div className="flex items-center gap-2 px-3 pt-2 pb-1">
        <button
          onClick={apriMese}
          aria-expanded={meseAperto}
          className="flex items-center gap-1 min-w-0 py-1.5 pr-2 text-[19px] font-playfair font-bold text-zinc-900 active:opacity-60"
        >
          {/* Sui telefoni più stretti il mese si scrive corto: "Nov". */}
          <span className="truncate max-[359px]:hidden">{titolo}</span>
          <span className="min-[360px]:hidden">{maiuscola(giorno.toLocaleDateString('it-IT', { month: 'short' }).replace('.', ''))}</span>
          <ChevronDown size={18} className={`shrink-0 text-zinc-500 transition-transform ${meseAperto ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => { onOggi(); setMeseAperto(false); }}
          aria-label="Vai a oggi"
          className="w-9 h-9 shrink-0 rounded-lg border-2 border-zinc-700 text-zinc-800 text-[13px] font-bold tabular-nums flex items-center justify-center active:bg-zinc-100"
        >
          {oggi.getDate()}
        </button>
        <div className="flex shrink-0 text-[13px] border border-zinc-200 rounded-lg overflow-hidden" role="tablist" aria-label="Vista">
          {([['giorno', 'Giorno'], ['settimana', 'Sett.'], ['mese', 'Mese']] as const).map(([v, nome]) => (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              onClick={() => { onVista(v); setMeseAperto(false); }}
              className={`px-2.5 py-2 font-medium ${vista === v ? 'bg-fuchsia-100 text-fuchsia-800' : 'text-zinc-500 active:bg-zinc-100'}`}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>

      {/* Il calendario del mese, quando si tocca il titolo */}
      {meseAperto && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setSfoglia(new Date(sfoglia.getFullYear(), sfoglia.getMonth() - 1, 1))} aria-label="Mese prima" className="w-10 h-10 flex items-center justify-center text-zinc-600 active:bg-zinc-100 rounded-full">
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-zinc-800">
              {maiuscola(sfoglia.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))}
            </span>
            <button onClick={() => setSfoglia(new Date(sfoglia.getFullYear(), sfoglia.getMonth() + 1, 1))} aria-label="Mese dopo" className="w-10 h-10 flex items-center justify-center text-zinc-600 active:bg-zinc-100 rounded-full">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center">
            {LETTERE.map((l, i) => <span key={i} className="text-[11px] font-semibold text-zinc-400 py-1">{l}</span>)}
            {caselle.slice(0, righe).map(d => {
              const fuori = d.getMonth() !== sfoglia.getMonth();
              const scelto = stessoGiorno(d, giorno);
              const eOggi = stessoGiorno(d, oggi);
              return (
                <button key={d.toISOString()} onClick={() => scegli(d)} className="h-10 flex items-center justify-center">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm tabular-nums ${
                    scelto ? 'bg-fuchsia-600 text-white font-bold'
                    : eOggi ? 'text-fuchsia-700 font-bold ring-1 ring-fuchsia-300'
                    : fuori ? 'text-zinc-300' : 'text-zinc-800'}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* La settimana: si tocca un giorno, o si striscia per cambiare settimana */}
      {!meseAperto && vista !== 'mese' && (
        <div
          className="grid grid-cols-7 px-1 pb-1.5"
          onTouchStart={e => { tocco.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={e => {
            const da = tocco.current; tocco.current = null;
            if (!da) return;
            const dx = e.changedTouches[0].clientX - da.x, dy = e.changedTouches[0].clientY - da.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onGiorno(piu(giorno, dx < 0 ? 7 : -7));
          }}
        >
          {settimana.map((d, i) => {
            const scelto = stessoGiorno(d, giorno);
            const eOggi = stessoGiorno(d, oggi);
            return (
              <button
                key={d.toISOString()}
                onClick={() => scegli(d)}
                aria-label={d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                aria-current={scelto ? 'date' : undefined}
                className="flex flex-col items-center gap-0.5 py-0.5"
              >
                <span className={`text-[11px] font-semibold ${eOggi ? 'text-fuchsia-600' : 'text-zinc-400'}`}>{LETTERE[i]}</span>
                <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] tabular-nums ${
                  scelto && vista === 'giorno' ? 'bg-fuchsia-600 text-white font-bold'
                  : eOggi ? 'text-fuchsia-700 font-bold ring-1 ring-fuchsia-300'
                  : 'text-zinc-800 font-medium'}`}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Richieste dal sito e operatrici: una riga che si scorre col dito */}
      <div className="flex items-center gap-2 px-3 pb-2 overflow-x-auto scrollbar-none">
        {richieste > 0 && (
          <button
            onClick={onRichieste}
            className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[13px] font-semibold active:bg-amber-200"
          >
            <Inbox size={15} /> {richieste} {richieste === 1 ? 'richiesta' : 'richieste'}
          </button>
        )}
        <button
          onClick={() => onOperatrice('tutti')}
          aria-pressed={operatrice === 'tutti'}
          className={`shrink-0 h-9 px-3.5 rounded-full border text-[13px] font-semibold ${operatrice === 'tutti' ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700 active:bg-zinc-100'}`}
        >
          Tutte
        </button>
        {operatrici.map(o => {
          const scelta = operatrice === o.id;
          return (
            <button
              key={o.id}
              onClick={() => onOperatrice(scelta ? 'tutti' : o.id)}
              aria-pressed={scelta}
              className={`shrink-0 flex items-center gap-1.5 h-9 pl-2.5 pr-3.5 rounded-full border text-[13px] font-semibold ${scelta ? 'bg-zinc-900 border-zinc-900 text-white' : 'bg-white border-zinc-200 text-zinc-700 active:bg-zinc-100'}`}
            >
              <span className={`w-3 h-3 rounded-full ${coloreDi(o.id)}`} />
              {o.nome || 'Operatrice'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
