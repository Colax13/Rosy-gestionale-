import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Scissors,
  Clock,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon
} from "lucide-react";
import { auth } from "../../../../../src/lib/firebase";
import { appuntamentiApi, clientiApi, dipendentiApi } from "@/lib/api-client";
import { aData, daQuanto, giorniDa } from "@/lib/tempo";
import { intervalliOccupati, turnoDelGiorno, dentroTurno } from "@/lib/servizi";
import RosySidebar from "../../../../../src/components/RosySidebar";
import RosyLogo from "../../../../../src/components/RosyLogo";

// Da quanto tempo una cliente deve mancare per considerarla da recuperare.
const GIORNI_ASSENZA = 60;

export default function RosieHub() {
  const [appuntamenti, setAppuntamenti] = useState<any[]>([]);
  const [tuttiAppuntamenti, setTuttiAppuntamenti] = useState<any[]>([]);
  const [clienti, setClienti] = useState<any[]>([]);
  const [dipendenti, setDipendenti] = useState<any[]>([]);
  const [mostraDormienti, setMostraDormienti] = useState(false);

  useEffect(() => {
    const oggi = new Date().toISOString().split('T')[0];
    appuntamentiApi.getAgenda(oggi).then(setAppuntamenti).catch(console.error);
    appuntamentiApi.getAgenda().then(setTuttiAppuntamenti).catch(console.error);
    clientiApi.getAll().then(setClienti).catch(console.error);
    dipendentiApi.getAll().then(setDipendenti).catch(console.error);
  }, []);

  // --- Clienti da recuperare -------------------------------------------------
  // Prima il numero era scritto nel codice e il pulsante portava all'elenco
  // completo: prometteva "vedi chi sono" e mostrava tutti. Adesso il conto è
  // vero e il pulsante apre proprio quelle clienti, con l'ultima visita.
  const ultimaVisita = new Map<string, Date>();
  const giaPrenotate = new Set<string>();
  tuttiAppuntamenti.forEach(app => {
    const id = app.id_cliente || app.clienti?.id;
    if (!id || app.stato === 'annullato') return;
    const d = aData(app.data_ora);
    if (!d) return;
    // Chi ha già un appuntamento in calendario non è da recuperare.
    if (d.getTime() > Date.now()) { giaPrenotate.add(id); return; }
    const attuale = ultimaVisita.get(id);
    if (!attuale || d > attuale) ultimaVisita.set(id, d);
  });

  const dormienti = clienti
    .filter(c => !giaPrenotate.has(c.id))
    .map(c => {
      const visita = ultimaVisita.get(c.id);
      const riferimento = visita || aData(c.createdAt);
      return { cliente: c, ultimaVisita: visita || null, giorni: giorniDa(riferimento) };
    })
    .filter(r => r.giorni !== null && r.giorni >= GIORNI_ASSENZA)
    .sort((a, b) => (b.giorni || 0) - (a.giorni || 0));

  // --- Clienti nuovi di questa settimana -------------------------------------
  const nuoviSettimana = clienti.filter(c => {
    const g = giorniDa(c.createdAt);
    return g !== null && g <= 7;
  }).length;

  // --- Spazi ancora liberi oggi ----------------------------------------------
  // Si contano le mezz'ore in turno che nessuno sta ancora occupando, da adesso
  // in poi: quelle già passate non sono spazi liberi, sono tempo perso.
  const adesso = new Date();
  const slotLiberi = dipendenti.reduce((totale, dip) => {
    const turno = turnoDelGiorno(dip, adesso);
    if (!turno.lavora) return totale;

    const occupati = appuntamenti
      .filter(a => (a.id_dipendente || a.idDipendente || a.dipendenti?.id) === dip.id && a.stato !== 'annullato')
      .flatMap(a => intervalliOccupati(new Date(a.data_ora).getTime(), a.righe_appuntamento || []));

    let liberi = 0;
    for (let minuti = 0; minuti < 24 * 60; minuti += 30) {
      if (!dentroTurno(turno, minuti)) continue;
      const inizio = new Date(adesso);
      inizio.setHours(0, minuti, 0, 0);
      const fine = inizio.getTime() + 30 * 60000;
      if (inizio.getTime() < adesso.getTime()) continue;
      if (occupati.some(o => o.inizio < fine && inizio.getTime() < o.fine)) continue;
      liberi++;
    }
    return totale + liberi;
  }, 0);

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
          <h1 className="text-4xl md:text-5xl font-playfair font-black text-zinc-900 tracking-tight">
            Buongiorno, {auth.currentUser?.displayName || 'Professionista'}
          </h1>
          <p className="text-zinc-500 font-sans mt-2 max-w-lg">
            Ecco la situazione del tuo salone oggi.
          </p>
        </motion.div>

        <div className="flex flex-col gap-6">
          {/* Rosy Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-50/40 border border-zinc-200/80 p-8 flex flex-col md:flex-row items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)] shadow-black/40 backdrop-blur-sm group">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#00D8FF]/10 via-[#6B5CFF]/10 to-[#D400FF]/10 blur-[100px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2 transition-opacity group-hover:opacity-70 opacity-40"></div>
             
            <div className="w-20 h-20 rounded-[24px] relative flex items-center justify-center flex-shrink-0 bg-white border border-zinc-300/50 shadow-2xl overflow-hidden">
               <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-400 via-zinc-900 to-zinc-950"></div>
               <div className="absolute inset-0 gradient-ai blur-[12px] opacity-60"></div>
               <div className="absolute inset-[2px] rounded-[22px] bg-white flex flex-col items-center justify-center">
                 <RosyLogo size="lg" />
               </div>
            </div>

            <div className="flex-1 z-10 w-full relative">
               <h3 className="text-2xl font-bold font-playfair text-zinc-900 flex items-center gap-2 tracking-tight">
                Promemoria Rosie <span className="text-[#00D8FF] animate-pulse">✨</span>
               </h3>
               <p className="text-base text-zinc-500 mt-2 max-w-2xl leading-relaxed">
                 {dormienti.length === 0 ? (
                   <>Nessuna cliente manca da più di {GIORNI_ASSENZA} giorni: sono tutte passate di recente.</>
                 ) : (
                   <>
                     Hai <strong className="text-zinc-800">{dormienti.length} {dormienti.length === 1 ? 'cliente' : 'clienti'}</strong> che non {dormienti.length === 1 ? 'prenota' : 'prenotano'} da oltre {GIORNI_ASSENZA} giorni.<br/>
                     Vuoi inviare un promemoria automatico per recuperare le visite?
                   </>
                 )}
               </p>
            </div>

            <div className="flex items-center justify-end gap-3 w-full md:w-auto relative z-10 mt-4 md:mt-0">
               <button
                 disabled
                 title="L'invio automatico dei messaggi non è ancora attivo"
                 className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-zinc-100 text-zinc-400 font-semibold text-sm cursor-not-allowed"
               >
                 Invia messaggi · in arrivo
               </button>
               <button
                 onClick={() => setMostraDormienti(v => !v)}
                 disabled={dormienti.length === 0}
                 className="px-5 py-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-900 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {mostraDormienti ? 'Nascondi' : 'Vedi chi sono'}
                 <ChevronRight size={16} className={`text-zinc-500 transition-transform ${mostraDormienti ? 'rotate-90' : ''}`} />
               </button>
            </div>
          </div>

          {/* L'elenco vero delle clienti da recuperare, aperto dal pulsante. */}
          {mostraDormienti && dormienti.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm"
            >
              <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-900">
                  Chi non passa da più di {GIORNI_ASSENZA} giorni
                </span>
                <span className="text-xs text-zinc-500">{dormienti.length} in tutto</span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-80 overflow-y-auto">
                {dormienti.map(({ cliente, ultimaVisita: visita }) => (
                  <Link
                    key={cliente.id}
                    to={`/clienti/${cliente.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {(cliente.nome || '?').charAt(0)}{(cliente.cognome || '').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900 truncate">
                        {cliente.nome} {cliente.cognome}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {visita ? `Ultima visita ${daQuanto(visita)}` : 'Non è mai passata'}
                        {cliente.telefono ? ` · ${cliente.telefono}` : ''}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
            <div className="bg-zinc-50/40 rounded-2xl p-6 border border-zinc-200/80 shadow-lg relative overflow-hidden group hover:border-[#D400FF]/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-[#D400FF]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-white border border-[#D400FF]/20 flex items-center justify-center text-[#D400FF] shadow-[0_0_15px_rgba(212,0,255,0.1)]">
                   <CalendarIcon size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-700 tracking-wide uppercase">Appuntamenti</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-900 tracking-tight">{appuntamenti.length}</div>
                 <div className="text-xs text-zinc-500 font-medium">Oggi</div>
               </div>
            </div>

            <div className="bg-zinc-50/40 rounded-2xl p-6 border border-zinc-200/80 shadow-lg relative overflow-hidden group hover:border-[#00D8FF]/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-[#00D8FF]/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-white border border-[#00D8FF]/20 flex items-center justify-center text-[#00D8FF] shadow-[0_0_15px_rgba(0,216,255,0.1)]">
                   <Scissors size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-700 tracking-wide uppercase">Servizi</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-900 tracking-tight">
                   {appuntamenti.reduce((acc, app) => acc + (app.righe_appuntamento?.length || 0), 0)}
                 </div>
                 <div className="text-xs text-zinc-500 font-medium">Da eseguire</div>
               </div>
            </div>

            <div className="bg-zinc-50/40 rounded-2xl p-6 border border-zinc-200/80 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-emerald-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-white border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                   <Users size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-700 tracking-wide uppercase">Nuovi clienti</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-900 tracking-tight">{nuoviSettimana}</div>
                 <div className="text-xs text-zinc-500 font-medium">Questa settimana</div>
               </div>
            </div>

            <div className="bg-zinc-50/40 rounded-2xl p-6 border border-zinc-200/80 shadow-lg relative overflow-hidden group hover:border-amber-400/30 transition-all">
               <div className="absolute right-0 bottom-0 top-0 w-32 bg-gradient-to-l from-amber-400/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-[14px] bg-white border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                   <Clock size={18} />
                 </div>
                 <h4 className="text-sm font-semibold text-zinc-700 tracking-wide uppercase">Slot liberi</h4>
               </div>
               <div className="flex items-baseline gap-2">
                 <div className="text-4xl font-playfair font-black text-zinc-900 tracking-tight">{slotLiberi}</div>
                 <div className="text-xs text-zinc-500 font-medium">Mezz'ore libere da adesso</div>
               </div>
            </div>
          </div>
        </div>

        {/* Action Board container right below the KPIs */}
        <div className="mt-6 flex flex-col xl:flex-row gap-6 w-full">
           <div className="flex-1 w-full flex flex-col bg-zinc-50/20 border border-zinc-200/50 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
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
