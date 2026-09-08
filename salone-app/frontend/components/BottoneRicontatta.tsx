'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Phone, ChevronDown } from 'lucide-react';
import { linkWhatsApp, linkTelefonata, numeroInternazionale, suTelefono } from '@/lib/contatti';

interface Props {
  telefono?: string | null;
  /** Messaggio già scritto nella conversazione WhatsApp. */
  messaggio?: string;
  etichetta?: string;
  className?: string;
  /** Come si presenta: pulsante pieno o riga discreta accanto al numero. */
  aspetto?: 'pulsante' | 'discreto';
}

/**
 * "Ricontatta": dal computer apre WhatsApp, che è dove si scrive davvero.
 * Dal telefono chiede prima se chiamare o scrivere, perché lì servono
 * tutte e due e la scelta cambia da cliente a cliente.
 */
export default function BottoneRicontatta({
  telefono,
  messaggio,
  etichetta = 'Ricontatta',
  className = '',
  aspetto = 'pulsante'
}: Props) {
  const [aperto, setAperto] = useState(false);
  const [posizione, setPosizione] = useState<{ top: number; left: number } | null>(null);
  const contenitore = useRef<HTMLDivElement>(null);
  const pulsante = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (contenitore.current && !contenitore.current.contains(e.target as Node)) setAperto(false);
    };
    document.addEventListener('mousedown', fuori);
    return () => document.removeEventListener('mousedown', fuori);
  }, [aperto]);

  // Il menù si aggancia alla pagina, non al riquadro che lo contiene:
  // dentro un elenco che scorre verrebbe tagliato a metà.
  const apri = () => {
    if (aperto) { setAperto(false); return; }
    const r = pulsante.current?.getBoundingClientRect();
    if (r) {
      const larghezza = 200;
      setPosizione({
        top: Math.min(r.bottom + 4, window.innerHeight - 120),
        left: Math.max(8, Math.min(r.left, window.innerWidth - larghezza - 8))
      });
    }
    setAperto(true);
  };

  if (!numeroInternazionale(telefono)) return null;

  const whatsapp = linkWhatsApp(telefono, messaggio);
  const chiamata = linkTelefonata(telefono);

  const classiPulsante = aspetto === 'pulsante'
    ? 'px-3 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center justify-center gap-1.5'
    : 'text-sm font-medium text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1.5';

  // Dal computer non c'è niente da scegliere: si va su WhatsApp.
  if (!suTelefono()) {
    return (
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className={`${classiPulsante} ${className}`}
        title="Apri la conversazione WhatsApp"
      >
        <MessageCircle size={15} /> {etichetta}
      </a>
    );
  }

  return (
    <div ref={contenitore} className={`relative ${aspetto === 'pulsante' ? 'flex-1 min-w-[110px]' : ''} ${className}`}>
      <button
        ref={pulsante}
        onClick={apri}
        className={`w-full ${classiPulsante}`}
      >
        <MessageCircle size={15} /> {etichetta}
        <ChevronDown size={13} className={`transition-transform ${aperto ? 'rotate-180' : ''}`} />
      </button>

      {aperto && posizione && (
        <div
          style={{ position: 'fixed', top: posizione.top, left: posizione.left, width: 200 }}
          className="z-[10000] bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <a
            href={chiamata}
            onClick={() => setAperto(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
          >
            <Phone size={16} className="text-zinc-500" /> Chiama
          </a>
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAperto(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
          >
            <MessageCircle size={16} className="text-emerald-600" /> Messaggio WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
