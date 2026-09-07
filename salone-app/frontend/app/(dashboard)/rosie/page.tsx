import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  Users,
  Scissors,
  Clock,
  ChevronDown,
  Calendar as CalendarIcon
} from "lucide-react";
import { auth } from "../../../../../src/lib/firebase";
import { appuntamentiApi } from "@/lib/api-client";
import RosySidebar from "../../../../../src/components/RosySidebar";
import RosyLogo from "../../../../../src/components/RosyLogo";

export default function RosieHub() {
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);

  useEffect(() => {
    appuntamentiApi.getAgenda(new Date().toISOString().split('T')[0]).then(setAppuntamenti).catch(console.error);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto w-full relative scrollbar-none p-4 md:p-8 min-h-screen">
      {/* Wow Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-[#00D8FF]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#D400FF]/5 blur-[100px]" />
      </div>

      <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-8 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-fuchsia-200 tracking-tight drop-shadow-sm">
            Buongiorno, {auth.currentUser?.displayName || 'Professionista'}
          </h1>
          <p className="text-zinc-400 font-sans mt-2 max-w-lg">
            Ecco la situazione del tuo salone oggi.
          </p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* Rosy Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)] shadow-black/40 backdrop-blur-sm group">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#00D8FF]/10 via-[#6B5CFF]/10 to-[#D400FF]/10 blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-70 opacity-40"></div>
             
            <div className="w-20 h-20 rounded-[24px] relative flex items-center justify-center flex-shrink-0 bg-zinc-900 border border-zinc-700/50 shadow-2xl overflow-hidden">
               <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-400 via-zinc-900 to-zinc-950"></div>
               <div className="absolute inset-0 gradient-ai blur-[12px] opacity-60"></div>
               <div className="absolute inset-[2px] rounded-[22px] bg-zinc-950 flex flex-col items-center justify-center">
                 <RosyLogo size="lg" />
               </div>
            </div>

            <div className="flex-1 z-10 w-full relative">
               <h3 className="text-2xl font-bold font-playfair text-zinc-100 flex items-center gap-2 tracking-tight">
                Promemoria Rosie <span className="text-[#00D8FF] animate-pulse">✨</span>
               </h3>
               <p className="text-base text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                 Hai <strong className="text-zinc-200">2 clienti</strong> che non prenotano da oltre 60 giorni.<br/>
                 Vuoi inviare un promemoria automatico per recuperare le visite?
               </p>
            </div>

            <div className="flex items-center justify-end gap-3 w-full md:w-auto relative z-10 mt-4 md:mt-0">
               <button className="flex-1 md:flex-none px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm shadow-[0_0_15px_rgba(212,0,255,0.3)] hover:shadow-[0_0_25px_rgba(212,0,255,0.5)] hover:-translate-y-0.5 transition-all">
                 Invia messaggi
               </button>
               <button className="px-5 py-3 bg-zinc-100 dark:bg-[#1A1E2B] hover:bg-zinc-200 dark:hover:bg-[#252B3D] border border-zinc-300 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                 Vedi chi sono <ChevronDown size={16} className="text-zinc-500" />
               </button>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
            <div className="bg-zinc-900/40 rounded-2xl p-6 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-[#D400FF]/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-[#D400FF]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-[#D400FF]/20 flex items-center justify-center text-[#D400FF] shadow-[0_0_15px_rgba(212,0,255,0.1)]">
                   <CalendarIcon size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">Appuntamenti</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-100 tracking-tight">{appuntamenti.length}</div>
                 <div className="text-xs text-zinc-500 font-medium">Oggi</div>
               </div>
            </div>

            <div className="bg-zinc-900/40 rounded-2xl p-6 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-[#00D8FF]/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-[#00D8FF]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-[#00D8FF]/20 flex items-center justify-center text-[#00D8FF] shadow-[0_0_15px_rgba(0,216,255,0.1)]">
                   <Scissors size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">Servizi</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-100 tracking-tight">
                   {appuntamenti.reduce((acc, app) => acc + (app.righe_appuntamento?.length || 0), 0)}
                 </div>
                 <div className="text-xs text-zinc-500 font-medium">Da eseguire</div>
               </div>
            </div>

            <div className="bg-zinc-900/40 rounded-2xl p-6 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-emerald-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                   <Users size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">Nuovi clienti</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-100 tracking-tight">3</div>
                 <div className="text-xs text-zinc-500 font-medium">Questa settimana</div>
               </div>
            </div>

            <div className="bg-zinc-900/40 rounded-2xl p-6 border border-zinc-800/80 shadow-lg relative overflow-hidden group hover:border-amber-400/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-amber-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-zinc-900 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                   <Clock size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">Slot liberi</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-100 tracking-tight">4</div>
                 <div className="text-xs text-zinc-500 font-medium">Disponibili oggi</div>
               </div>
            </div>
          </div>
        </div>

        {/* Action Board container right below the KPIs */}
        <div className="mt-6 flex flex-col xl:flex-row gap-6 w-full">
           <div className="flex-1 w-full flex flex-col bg-zinc-900/20 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
             {/* Decorative glow */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#FF3EF7]/20 to-transparent"></div>
             
             {/* Mount the RosySidebar directly here, it will act as an inline board */}
             <RosySidebar />
           </div>
        </div>
        
        <div className="h-10"></div>
      </div>
    </div>
  );
}
