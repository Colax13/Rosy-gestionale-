import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Store,
  UserCog,
  FileText,
  MessageSquare,
  Settings,
  Scissors,
  Sparkles
} from "lucide-react";
import { auth } from "../../../../../src/lib/firebase";

export default function DashboardHub() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Rosie Board",
      route: "/rosie",
      icon: Sparkles,
      color: "text-[#00D8FF]",
      bg: "bg-[#00D8FF]/10",
    },
    {
      title: "Agenda",
      route: "/agenda",
      icon: CalendarDays,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      title: "Clienti",
      route: "/clienti",
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "Servizi",
      route: "/catalogo",
      icon: Scissors,
      color: "text-fuchsia-500",
      bg: "bg-fuchsia-500/10",
    },
    {
      title: "Dipendenti",
      route: "/dipendenti",
      icon: UserCog,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Report",
      route: "/report",
      icon: FileText,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Prodotti",
      route: "/prodotti",
      icon: Store,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Automazioni",
      route: "/automazioni",
      icon: MessageSquare,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    }
  ];

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 overflow-y-auto w-full relative scrollbar-none p-4 md:p-8 min-h-screen flex items-center justify-center">
        {/* Wow Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="max-w-[1200px] mx-auto w-full flex flex-col items-center relative z-10 pb-20 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-playfair font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-300 to-fuchsia-200 tracking-tight drop-shadow-sm mb-4">
              Benvenuto in Rosy
            </h1>
            <p className="text-zinc-500 font-sans mt-2 max-w-lg mx-auto">
              Il tuo ecosistema di gestione. Scegli un modulo per iniziare.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 px-2 md:px-8 max-w-5xl mx-auto w-full">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.title}
                  onClick={() => navigate(card.route)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.05, ease: "easeOut" }}
                  whileHover={{
                    scale: 1.05,
                    y: -5,
                    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-800/60 to-zinc-900 border border-zinc-200/80 rounded-[28px] p-6 transition-all hover:border-zinc-300/80 group relative overflow-hidden aspect-square shadow-[0_8px_30px_rgb(0,0,0,0.5)] shadow-black/40"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-br ${card.bg}`} />
                  
                  <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-inner ring-1 ring-white/5`}>
                    <Icon size={26} className={`${card.color}`} strokeWidth={1.5} />
                  </div>
                  
                  <span className="font-sans font-semibold text-sm md:text-base text-zinc-900 tracking-wide drop-shadow-sm pointer-events-none">
                    {card.title}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
