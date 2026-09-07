'use client';

import { useState, useEffect } from 'react';
import { reportApi } from '@/lib/api-client';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, Users, TrendingUp, Sparkles, Mail, Phone, BarChart3 } from 'lucide-react';

interface IncassoMese {
  mese: string;
  totale_incassato: number;
}

interface TotaleDipendente {
  id: string;
  nome: string;
  cognome: string;
  numero_appuntamenti: number;
  totale_incassato: number;
}

interface ClienteAcquisito {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
  canale_acquisizione: string;
  data_acquisizione: string;
}

interface ConteggioCanale {
  canale: string;
  quantita: number;
}

interface ClientiReport {
  acquisiti_questo_mese: ClienteAcquisito[];
  conteggio_per_canale: ConteggioCanale[];
}

export default function PaginaReport() {
  const [incassi, setIncassi] = useState<IncassoMese[]>([]);
  const [dipendenti, setDipendenti] = useState<TotaleDipendente[]>([]);
  const [clientiReport, setClientiReport] = useState<ClientiReport | null>(null);
  const [riepilogo, setRiepilogo] = useState<{ incasso_mensile: number; appuntamenti_oggi: number; ticket_medio: number; clienti_totali: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportApi.getOverview();
      
      // Formatta i mesi per il grafico (es: "2026-05-01..." in "Mag 26")
      const incassiFormattati = data.incassi.map((inc: any) => {
        const d = new Date(inc.mese);
        return {
          ...inc,
          meseFormattato: d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
        };
      }).reverse(); // Dal più vecchio al più recente

      setIncassi(incassiFormattati);
      setDipendenti(data.dipendenti);
      setRiepilogo(data.overview);
      setClientiReport(data.clienti_report || null);
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento del report');
    } finally {
      setLoading(false);
    }
  };

  const esportaCSV = () => {
    if (dipendenti.length === 0) return;
    
    const headers = ['Nome', 'Cognome', 'Appuntamenti', 'Totale incassato (€)'];
    const rows = dipendenti.map(d => [
      d.nome,
      d.cognome,
      d.numero_appuntamenti.toString(),
      d.totale_incassato.toFixed(2)
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_dipendenti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <p className="text-zinc-500 font-sans animate-pulse">Caricamento report in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-playfair font-bold text-zinc-900 mb-6">Report</h1>
        <div className="card p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
          <p>{error}</p>
          <button onClick={caricaDati} className="mt-2 text-sm underline font-semibold">Riprova</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-full w-full pb-24"
    >
      <div className="w-full px-4 md:px-6 pt-4 md:pt-6">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-4 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
            <div>
              <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3"><BarChart3 className="text-fuchsia-500" size={28} />Report</h1>
              <p className="text-zinc-500 mt-1 text-sm">Panoramica incassi e performance dipendenti</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 flex-1">

        {/* Riepilogo del mese */}
        {riepilogo && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[
              { etichetta: 'Incassato questo mese', valore: `${riepilogo.incasso_mensile.toFixed(2).replace('.', ',')} €`, accento: true },
              { etichetta: 'Appuntamenti oggi', valore: String(riepilogo.appuntamenti_oggi) },
              { etichetta: 'Scontrino medio', valore: `${riepilogo.ticket_medio.toFixed(2).replace('.', ',')} €` },
              { etichetta: 'Clienti in anagrafica', valore: String(riepilogo.clienti_totali) }
            ].map(t => (
              <div key={t.etichetta} className="bg-white border border-zinc-200 rounded-xl p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">{t.etichetta}</div>
                <div className={`text-2xl font-playfair font-bold tabular-nums ${t.accento ? 'text-fuchsia-600' : 'text-zinc-900'}`}>
                  {t.valore}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Grafico Incassi Mese */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200"
        >
          <h2 className="text-xl font-playfair text-zinc-900 mb-6">Incassi ultimi mesi</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incassi} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis 
                  dataKey="meseFormattato" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  tickFormatter={(value) => `€${value}`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.12)' }}
                  formatter={(value: number) => [`€${value.toFixed(2)}`, 'Incassato']}
                  labelStyle={{ color: '#18181b', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="totale_incassato" fill="#d946ef" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tabella Dipendenti */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200"
        >
          <h2 className="text-xl font-playfair text-zinc-900 mb-6">Totali per operatore</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-3 px-4 font-semibold text-sm">Operatore</th>
                  <th className="py-3 px-4 font-semibold text-sm text-right">Appuntamenti</th>
                  <th className="py-3 px-4 font-semibold text-sm text-right">Totale incassato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {dipendenti.length > 0 ? dipendenti.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-100 transition-colors">
                    <td className="py-4 px-4 text-zinc-900 font-medium">
                      {d.nome} {d.cognome}
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-500">
                      {d.numero_appuntamenti}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-zinc-900">
                      €{d.totale_incassato.toFixed(2)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-500 text-sm">
                      Nessun dato disponibile
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* SEZIONE REPORT CLIENTI */}
      {clientiReport && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          
          <div className="mt-12 border-t border-zinc-200 pt-8 mb-6">
            <h2 className="text-2xl font-playfair text-zinc-900 flex items-center gap-2">
              <Users className="text-fuchsia-500" size={24} />
              Clienti e canali di acquisizione
            </h2>
            <p className="text-zinc-500 mt-1 text-sm font-sans">
              Statistiche di crescita e provenienza dei clienti registrati questo mese ({new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })})
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Canali di Provenienza (Progress Bar Visualizer) */}
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-playfair text-zinc-900">Canali di acquisizione</h3>
                <span className="text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-fuchsia-400" />
                  Totale: {clientiReport.acquisiti_questo_mese.length} nuovi clienti
                </span>
              </div>

              <div className="space-y-5">
                {clientiReport.conteggio_per_canale.map((c, idx) => {
                  const maxVal = Math.max(...clientiReport.conteggio_per_canale.map(o => o.quantita)) || 1;
                  const percentuale = (c.quantita / (clientiReport.acquisiti_questo_mese.length || 1)) * 100;
                  
                  // Colori associati a ciascun canale per un design super-curato
                  let barColor = "bg-zinc-200";
                  let textColor = "text-zinc-500";
                  if (c.canale === "Instagram") { barColor = "bg-gradient-to-r from-pink-500 to-fuchsia-500"; textColor = "text-pink-400"; }
                  else if (c.canale === "Facebook") { barColor = "bg-gradient-to-r from-blue-600 to-blue-400"; textColor = "text-blue-400"; }
                  else if (c.canale === "Google") { barColor = "bg-gradient-to-r from-emerald-500 to-teal-500"; textColor = "text-emerald-400"; }
                  else if (c.canale === "Passaparola") { barColor = "bg-gradient-to-r from-violet-500 to-indigo-500"; textColor = "text-violet-400"; }
                  else if (c.canale === "Altro" || c.canale.includes("Altro")) { barColor = "bg-gradient-to-r from-zinc-500 to-zinc-600"; textColor = "text-zinc-500"; }

                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-zinc-700 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${barColor}`} />
                          {c.canale}
                        </span>
                        <span className="text-zinc-500 font-sans">
                          <strong className="text-zinc-900">{c.quantita}</strong> ({percentuale.toFixed(0)}%)
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border border-zinc-200">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                          style={{ width: `${percentuale}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Lista Ultimi Clienti Acquisiti */}
            <motion.div 
               initial={{ x: 20, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ duration: 0.5, delay: 0.5 }}
               className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200"
            >
              <h3 className="text-lg font-playfair text-zinc-900 mb-6 flex items-center gap-2">
                <Sparkles size={16} className="text-fuchsia-400" />
                Ultimi clienti acquisiti questo mese
              </h3>

              <div className="overflow-x-auto font-sans text-sm">
                <table className="w-full text-left font-sans">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-2 pb-3 px-3">Cliente</th>
                      <th className="py-2 pb-3 px-3">Data</th>
                      <th className="py-2 pb-3 px-3">Canale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60">
                    {clientiReport.acquisiti_questo_mese.map((cli) => {
                      const dataFormat = new Date(cli.data_acquisizione).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                      
                      let badgeStyle = "bg-zinc-100 text-zinc-700 border-zinc-300";
                      if (cli.canale_acquisizione === "Instagram") badgeStyle = "bg-pink-500/10 text-pink-400 border-pink-500/10";
                      else if (cli.canale_acquisizione === "Google") badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
                      else if (cli.canale_acquisizione === "Passaparola") badgeStyle = "bg-violet-500/10 text-violet-400 border-violet-500/10";
                      else if (cli.canale_acquisizione === "Facebook") badgeStyle = "bg-blue-500/10 text-blue-400 border-blue-500/10";

                      return (
                        <tr key={cli.id} className="hover:bg-zinc-100/30 transition-colors">
                          <td className="py-3 px-3 font-medium text-zinc-900">
                            <div>
                              <span>{cli.nome} {cli.cognome}</span>
                              <div className="flex gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                                {cli.telefono && <span className="flex items-center gap-0.5"><Phone size={8} /> {cli.telefono}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-500 text-xs shrink-0 whitespace-nowrap">
                            {dataFormat}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${badgeStyle}`}>
                              {cli.canale_acquisizione}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}

      {/* Centered Export Button */}
      <div className="flex justify-center mt-12 mb-8 relative z-10">
        <button 
          onClick={esportaCSV}
          className="flex items-center gap-2 bg-white border border-zinc-300 hover:bg-zinc-100 hover:border-zinc-500 text-zinc-900 rounded-full px-6 py-3 transition-colors text-sm font-medium shadow-xl"
        >
          <Download size={18} />
          Esporta CSV Dipendenti
        </button>
      </div>

      </div>

    </motion.div>
  );
}
