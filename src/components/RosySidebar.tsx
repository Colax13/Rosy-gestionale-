import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, MessageSquare, ChevronRight, Inbox, Users, Sparkles } from 'lucide-react';
import { auth } from '../lib/firebase';
import RosyLogo from './RosyLogo';

/** Il nome dell'evento con cui una pagina apre la chat di Rosy. */
export const EVENTO_APRI_CHAT = 'rosy:apri-chat';

/** Apre la chat di Rosy (quella del Layout), con una domanda già pronta se c'è. */
export function apriChatRosy(domanda?: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_APRI_CHAT, { detail: domanda }));
}

interface Props {
  daRecuperare: number;
  spaziLiberi: number;
  appuntamentiOggi: number;
  richieste: number;
  onRecupera: () => void;
  onVediDaRecuperare: () => void;
}

/**
 * Il riquadro di Rosy nella sua pagina. Prima era tutto scritto a mano
 * ("3 clienti inattivi", "4 slot", un saluto fisso) e i pulsanti non
 * facevano niente. Adesso i numeri sono quelli del salone, ogni azione
 * porta dove dice, e "Chiedi a Rosy" apre la chat vera.
 */
export default function RosySidebar({ daRecuperare, spaziLiberi, appuntamentiOggi, richieste, onRecupera, onVediDaRecuperare }: Props) {
  const [domanda, setDomanda] = useState('');
  const nome = auth.currentUser?.displayName?.split(' ')[0] || '';

  const chiedi = (testo?: string) => {
    const t = (testo ?? domanda).trim();
    apriChatRosy(t || undefined);
    setDomanda('');
  };

  const azioni = [
    {
      icon: MessageSquare,
      titolo: 'Recupera clienti',
      descrizione: daRecuperare ? `${daRecuperare} non passano da oltre 60 giorni` : 'Nessuna da recuperare',
      colore: 'text-[#00D8FF]',
      azione: onRecupera,
      spento: daRecuperare === 0
    },
    {
      icon: CalendarIcon,
      titolo: 'Riempi gli spazi liberi',
      descrizione: spaziLiberi ? `${spaziLiberi} mezz'ore libere oggi` : 'Oggi è tutto pieno',
      colore: 'text-[#D400FF]',
      azione: () => chiedi('Quali orari sono ancora liberi oggi?'),
      spento: spaziLiberi === 0
    },
    {
      icon: Inbox,
      titolo: 'Richieste dal sito',
      descrizione: richieste ? `${richieste} da confermare` : 'Nessuna in attesa',
      colore: 'text-zinc-700',
      link: '/agenda',
      spento: false
    },
    {
      icon: Sparkles,
      titolo: 'Chi ho in agenda oggi?',
      descrizione: `${appuntamentiOggi} appuntamenti oggi`,
      colore: 'text-[#FF3EF7]',
      azione: () => chiedi('Chi ho in agenda oggi?'),
      spento: false
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 relative z-10 p-6">
      {/* Intestazione */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-playfair font-bold flex items-center gap-2">Rosy AI</h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
          <motion.div
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full blur-3xl gradient-ai opacity-30"
          />
          <RosyLogo size="xl" />
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-xl font-bold font-playfair mb-1 tracking-tight">Ciao{nome ? ` ${nome}` : ''}! 👋</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Posso dirti chi hai in agenda, cercare una cliente, trovarti un orario libero e prepararti un appuntamento.
          </p>
        </div>
      </div>

      {/* Suggerimento principale: le clienti da recuperare, vere */}
      {daRecuperare > 0 && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[#6B5CFF]" />
            <p className="text-sm font-semibold text-zinc-900">{daRecuperare} {daRecuperare === 1 ? 'cliente da recuperare' : 'clienti da recuperare'}</p>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Non prenotano da oltre 60 giorni e non hanno appuntamenti in calendario.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onRecupera}
              className="flex-1 py-2.5 px-4 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Manda un messaggio
            </button>
            <button
              onClick={onVediDaRecuperare}
              className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-colors border border-zinc-300"
            >
              Vedi chi sono <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Azioni con i numeri veri */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Azioni suggerite</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {azioni.map(a => {
            const contenuto = (
              <>
                <a.icon size={18} className={`${a.colore} shrink-0`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">{a.titolo}</p>
                  <p className="text-xs text-zinc-500 truncate">{a.descrizione}</p>
                </div>
                <ChevronRight size={16} className="text-zinc-400 shrink-0" />
              </>
            );
            const stile = 'w-full flex items-center gap-3 p-3 bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-xl hover:bg-zinc-50 transition-all text-left disabled:opacity-50 disabled:hover:bg-white';
            return a.link
              ? <Link key={a.titolo} to={a.link} className={stile}>{contenuto}</Link>
              : <button key={a.titolo} onClick={a.azione} disabled={a.spento} className={stile}>{contenuto}</button>;
          })}
        </div>
      </div>

      {/* Chiedi a Rosy: apre la chat vera */}
      <form
        onSubmit={e => { e.preventDefault(); chiedi(); }}
        className="relative"
      >
        <input
          type="text"
          value={domanda}
          onChange={e => setDomanda(e.target.value)}
          placeholder="Chiedi a Rosy… (es. chi ho domani pomeriggio?)"
          className="w-full bg-white border border-zinc-200 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-300 transition-colors"
        />
        <button
          type="submit"
          aria-label="Chiedi a Rosy"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg gradient-premium flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity"
        >
          <ChevronRight size={16} />
        </button>
      </form>
    </div>
  );
}
