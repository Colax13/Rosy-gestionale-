import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Package,
  UserCog,
  FileText,
  MessageSquare,
  Settings,
  Scissors,
  Sparkles,
  Ticket,
  type LucideIcon
} from "lucide-react";
import { auth } from "../../../../../src/lib/firebase";
import { appuntamentiApi, prodottiApi } from "@/lib/api-client";
import { puoAprirePercorso, sessioneCorrente } from "@/lib/sessione";
import { statoScorta } from "@/lib/prodotti";

interface Carta {
  title: string;
  route: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  /** Una riga sotto il nome, con i numeri di oggi. */
  info?: string;
  /** Il numero va guardato (richieste da confermare, prodotti finiti). */
  avviso?: boolean;
}

const giornoLocale = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * La schermata iniziale del gestionale. Prima mostrava sempre le stesse otto
 * carte a tutti, anche le pagine che un'operatrice non può aprire (e che la
 * rimandavano indietro), senza Buoni né Impostazioni. Adesso ognuno vede solo
 * le sue, e le carte dicono già quello che serve sapere: quanti appuntamenti
 * oggi, quante richieste dal sito aspettano, quali prodotti stanno finendo.
 */
export default function DashboardHub() {
  const navigate = useNavigate();
  const sessione = sessioneCorrente();
  const nome = (sessione?.nome || auth.currentUser?.displayName || "").split(" ")[0];

  const puoAgenda = puoAprirePercorso("/agenda");
  const puoProdotti = puoAprirePercorso("/prodotti");

  const [oggi, setOggi] = useState<number | null>(null);
  const [richieste, setRichieste] = useState<number | null>(null);
  const [daRiordinare, setDaRiordinare] = useState<number | null>(null);

  // Pochi numeri, letture piccole: gli appuntamenti di oggi, le richieste in
  // attesa e i prodotti. Solo per le pagine che questa persona può aprire.
  useEffect(() => {
    if (puoAgenda) {
      const g = giornoLocale(new Date());
      appuntamentiApi.getAgenda(undefined, g, g)
        .then(a => setOggi(a.filter((x: any) => x.stato !== "annullato" && x.id_cliente !== "block-client").length))
        .catch(() => {});
      appuntamentiApi.getRichieste().then(r => setRichieste(r.length)).catch(() => {});
    }
    if (puoProdotti) {
      prodottiApi.getAll()
        .then(p => setDaRiordinare(p.filter((x: any) => x.attivo !== false && statoScorta(x) !== "ok").length))
        .catch(() => {});
    }
  }, [puoAgenda, puoProdotti]);

  const infoAgenda = [
    oggi !== null ? `${oggi} ${oggi === 1 ? "appuntamento" : "appuntamenti"} oggi` : "",
    richieste ? `${richieste} da confermare` : ""
  ].filter(Boolean).join(" · ");

  const carte: Carta[] = [
    { title: "Rosy", route: "/rosy", icon: Sparkles, color: "text-[#00D8FF]", bg: "bg-[#00D8FF]/10", info: "Clienti da recuperare e chat" },
    { title: "Agenda", route: "/agenda", icon: CalendarDays, color: "text-sky-500", bg: "bg-sky-500/10", info: infoAgenda || undefined, avviso: !!richieste },
    { title: "Clienti", route: "/clienti", icon: Users, color: "text-violet-500", bg: "bg-violet-500/10" },
    { title: "Servizi", route: "/catalogo", icon: Scissors, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
    {
      title: "Prodotti", route: "/prodotti", icon: Package, color: "text-amber-500", bg: "bg-amber-500/10",
      info: daRiordinare ? `${daRiordinare} da riordinare` : daRiordinare === 0 ? "Magazzino a posto" : undefined,
      avviso: !!daRiordinare
    },
    { title: "Buoni", route: "/buoni-spa", icon: Ticket, color: "text-pink-500", bg: "bg-pink-500/10" },
    { title: "Operatori", route: "/dipendenti", icon: UserCog, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Report", route: "/report", icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Automazioni", route: "/automazioni", icon: MessageSquare, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Impostazioni", route: "/settings", icon: Settings, color: "text-zinc-600", bg: "bg-zinc-500/10" }
  ].filter(c => puoAprirePercorso(c.route));

  const data = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 overflow-y-auto w-full relative scrollbar-none p-4 md:p-8 min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-600/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="max-w-[1200px] mx-auto w-full flex flex-col items-center relative z-10 pb-20 mt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <p className="text-sm text-zinc-500 mb-2 first-letter:uppercase">{data}</p>
            <h1 className="text-4xl md:text-5xl font-playfair font-black text-zinc-900 tracking-tight mb-4">
              Ciao{nome ? ` ${nome}` : ""}, questo è{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D400FF] to-[#6B5CFF]">Rosy</span>
            </h1>
            <p className="text-zinc-500 font-sans mt-2 max-w-lg mx-auto">Il gestionale del tuo salone. Da dove cominciamo?</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5 px-2 md:px-8 max-w-6xl mx-auto w-full">
            {carte.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.title}
                  onClick={() => navigate(card.route)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.04, ease: "easeOut" }}
                  whileHover={{ scale: 1.04, y: -4, boxShadow: "0 18px 40px -12px rgba(24,24,27,0.18)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex flex-col items-center justify-center gap-3 bg-white border border-zinc-200 rounded-[28px] p-5 transition-all hover:border-zinc-300 group relative overflow-hidden aspect-square shadow-sm"
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${card.bg}`} />
                  <div className={`w-14 h-14 rounded-2xl ${card.bg} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 relative z-10`}>
                    <Icon size={26} className={card.color} strokeWidth={1.5} />
                  </div>
                  <span className="font-sans font-semibold text-sm md:text-base text-zinc-800 tracking-wide pointer-events-none relative z-10">
                    {card.title}
                  </span>
                  {card.info && (
                    <span className={`text-[11px] md:text-xs leading-snug text-center pointer-events-none relative z-10 ${card.avviso ? "text-amber-600 font-semibold" : "text-zinc-500"}`}>
                      {card.info}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
