import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, MessageSquare, Plus, ChevronRight, BarChart2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import RosyLogo from './RosyLogo';

export default function RosySidebar() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col text-zinc-100 p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-playfair font-bold flex items-center gap-2">
          Rosy AI
        </h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          <span className="text-xs font-mono text-zinc-400">Online</span>
        </div>
      </div>

      {/* Orb Container */}
      <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-8 flex items-center justify-center">
        {/* Outer Glows */}
        <motion.div 
          animate={{ scale: pulse ? 1.05 : 0.95, opacity: pulse ? 0.6 : 0.3 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full blur-3xl gradient-ai opacity-30"
        />
        <motion.div 
          animate={{ scale: !pulse ? 1.05 : 0.95, opacity: !pulse ? 0.6 : 0.3 }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-4 rounded-full blur-2xl gradient-brand opacity-30"
        />
        
        {/* The Orb itself */}
        <div className="relative flex items-center justify-center z-10 w-36 h-36">
           <RosyLogo size="xl" />
        </div>
      </div>

      {/* Greeting and Context */}
      <div className="mb-8">
        <h3 className="text-xl font-bold font-playfair mb-1 tracking-tight">Ciao {auth.currentUser?.displayName?.split(' ')[0] || 'Ludovico'}! 👋</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">Ecco cosa posso fare per te oggi.</p>
      </div>

      {/* Hero Suggestion Card */}
      <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-[#00D8FF]/40 via-[#6B5CFF]/20 to-[#D400FF]/40 mb-8 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00D8FF]/10 to-[#D400FF]/10 opacity-50 blur-xl group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative bg-zinc-900/90 backdrop-blur-md p-5 rounded-[15px] border border-zinc-800/50">
          <p className="text-xs text-zinc-300 mb-1 font-medium">Potresti recuperare circa</p>
          <div className="text-3xl font-bold text-gradient-ai font-playfair tracking-tight mb-2">€220</div>
          <p className="text-xs text-zinc-400 mb-4">contattando 3 clienti inattivi.</p>
          
          <button className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all border border-zinc-700 group-hover:border-[#6B5CFF]/50 shadow-sm">
            Vedi clienti <ChevronRight size={14} className="text-[#00D8FF]" />
          </button>
        </div>
      </div>

      {/* Actions List */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Azioni suggerite</h4>
        <div className="space-y-3">
          {[
            { icon: CalendarIcon, title: "Invia promemoria", desc: "2 clienti da contattare", color: "text-[#D400FF]" },
            { icon: Plus, title: "Riempi slot vuoti", desc: "4 slot disponibili oggi", color: "text-zinc-300" },
            { icon: MessageSquare, title: "Recupera clienti persi", desc: "3 clienti inattivi", color: "text-[#00D8FF]" },
            { icon: BarChart2, title: "Genera promo ", desc: "Crea offerta personalizzata", color: "text-[#FF3EF7]" },
          ].map((action, i) => (
            <button key={i} className="w-full flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl hover:bg-zinc-800/50 transition-all text-left group">
              <div className={`w-10 h-10 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:bg-zinc-800/80 transition-colors ${action.color}`}>
                <action.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-100 truncate">{action.title}</div>
                <div className="text-xs text-zinc-500 truncate">{action.desc}</div>
              </div>
              <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8 bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-xl">
        <h4 className="text-xs font-semibold text-zinc-200 mb-2">Insights di oggi</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Il momento migliore per nuove prenotazioni è tra le 16:00 e le 18:00.
        </p>
        <div className="flex items-end gap-1.5 h-10 mt-4 mx-2">
           {[3, 4, 2, 5, 8, 12, 10, 6, 4, 3].map((val, i) => (
             <div key={i} className={`flex-1 rounded-t-sm ${i === 5 || i === 6 ? 'bg-gradient-to-t from-[#6B5CFF] to-[#D400FF]' : 'bg-zinc-800'}`} style={{ height: `${val * 8}%` }}></div>
           ))}
        </div>
      </div>

      {/* Chat Input */}
      <div className="mt-auto pt-8">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Chiedi a Rosy..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg gradient-premium flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
}
