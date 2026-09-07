import { useState, useRef, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { dipendentiApi } from '@/lib/api-client';

interface FasciaOraria {
  id: string;
  inizio: string;
  fine: string;
  tipo?: 'lavoro' | 'permesso';
}

interface TurnoGiorno {
  attivo: boolean;
  tipo: 'riposo' | 'lavoro' | 'lavoro_permesso' | 'ferie' | 'malattia';
  fasce: FasciaOraria[];
  orarioBase?: { inizio: string; fine: string };
  orarioPermesso?: { inizio: string; fine: string };
}

interface TurniSettimana {
  [key: string]: TurnoGiorno;
}

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  turni?: any;
}

const giorni = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const giorniLabel = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const giorniLabelLong = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const CustomDropdown = ({ value, options, onChange }: { value: string, options: string[], onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative w-16" ref={ref}>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full text-center text-zinc-900 py-1.5 cursor-pointer hover:bg-zinc-100 transition-colors select-none"
      >
        {value}
      </div>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[5.5rem] max-h-48 overflow-y-auto bg-white border border-zinc-300 rounded-lg shadow-xl z-[60]">
          <div className="p-1 pr-1.5">
            {options.map(o => (
              <div 
                key={o} 
                onClick={() => { onChange(o); setOpen(false); }}
                className={`text-center py-2 rounded cursor-pointer text-sm hover:bg-zinc-100 transition-colors ${value === o ? 'bg-fuchsia-600/10 text-fuchsia-400 font-bold' : 'text-zinc-700'}`}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TimeSelect = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const [h, m] = (value || '09:00').split(':');
  const hours = Array.from({length: 24}).map((_, i) => i.toString().padStart(2, '0'));
  const mins = ['00', '10', '15', '20', '30', '40', '45', '50'];

  return (
    <div className="flex items-center bg-white border border-zinc-300 rounded-lg focus-within:border-fuchsia-500 shadow-inner group transition-colors">
      <CustomDropdown value={h} options={hours} onChange={val => onChange(`${val}:${m}`)} />
      <span className="text-zinc-400 font-bold -mx-1 select-none">:</span>
      <CustomDropdown value={m} options={mins} onChange={val => onChange(`${h}:${val}`)} />
    </div>
  );
};

export default function TurniCalendario({ dipendenti, refreshData }: { dipendenti: Dipendente[], refreshData: () => void }) {
  const [editingDipendente, setEditingDipendente] = useState<Dipendente | null>(null);
  const [saving, setSaving] = useState(false);
  const [editFormTurni, setEditFormTurni] = useState<TurniSettimana>({});

  const migrateTurno = (t: any): TurnoGiorno => {
    if (!t) return { attivo: false, tipo: 'riposo', fasce: [] };
    
    // Check old data
    let tipo = t.tipo || (t.attivo ? 'lavoro' : 'riposo');
    if (tipo === 'permesso') tipo = 'lavoro_permesso';
    
    return {
      attivo: t.attivo || false,
      tipo: tipo,
      fasce: Array.isArray(t.fasce) ? t.fasce : (t.inizio && t.fine ? [{ id: Math.random().toString(36).substr(2, 9), inizio: t.inizio, fine: t.fine, tipo: 'lavoro' }] : []),
      orarioBase: t.orarioBase || { inizio: '09:00', fine: '18:00' },
      orarioPermesso: t.orarioPermesso || { inizio: '14:00', fine: '15:00' }
    };
  };

  const getTurniSicuri = (turni: any): TurniSettimana => {
    const res: TurniSettimana = {};
    giorni.forEach(g => {
      res[g] = migrateTurno(turni?.[g]);
    });
    return res;
  };

  const calcOreSettimanali = (turniObj?: any) => {
    const turni = getTurniSicuri(turniObj);
    let totMinuti = 0;
    giorni.forEach(g => {
      const t = turni[g];
      if (t && t.attivo) {
        if (t.tipo === 'lavoro') {
          t.fasce.forEach(f => {
            if (f.inizio && f.fine) {
              const [hIn, mIn] = f.inizio.split(':').map(Number);
              const [hOut, mOut] = f.fine.split(':').map(Number);
              totMinuti += (hOut * 60 + mOut) - (hIn * 60 + mIn);
            }
          });
        } else if (t.tipo === 'lavoro_permesso' && t.orarioBase && t.orarioPermesso) {
            const [hIn, mIn] = t.orarioBase.inizio.split(':').map(Number);
            const [hOut, mOut] = t.orarioBase.fine.split(':').map(Number);
            const wMins = (hOut * 60 + mOut) - (hIn * 60 + mIn);

            const [pInA, pInB] = t.orarioPermesso.inizio.split(':').map(Number);
            const [pOutA, pOutB] = t.orarioPermesso.fine.split(':').map(Number);
            const pMins = (pOutA * 60 + pOutB) - (pInA * 60 + pInB);

            totMinuti += Math.max(0, wMins - pMins);
        }
      }
    });
    return (totMinuti / 60).toFixed(1);
  };

  const handleOpenEdit = (dip: Dipendente) => {
    setEditingDipendente(dip);
    setEditFormTurni(getTurniSicuri(dip.turni));
  };

  const handleDayTypeChange = (giorno: string, type: string) => {
    setEditFormTurni(prev => {
      const current = prev[giorno];
      if (type === 'riposo') {
        return { ...prev, [giorno]: { ...current, attivo: false, tipo: 'riposo', fasce: [] } };
      }
      if (type === 'lavoro') {
        const fasce = current.fasce.length > 0 && current.tipo === 'lavoro' ? current.fasce : [{ id: Math.random().toString(36).substr(2, 9), inizio: '09:00', fine: '18:00', tipo: 'lavoro' as const }];
        return { ...prev, [giorno]: { ...current, attivo: true, tipo: 'lavoro', fasce } };
      }
      if (type === 'lavoro_permesso') {
         const orarioBase = current.orarioBase || { inizio: '09:00', fine: '18:00' };
         const orarioPermesso = current.orarioPermesso || { inizio: '14:00', fine: '16:00' };
         return { ...prev, [giorno]: { ...current, attivo: true, tipo: 'lavoro_permesso', orarioBase, orarioPermesso, fasce: [] } };
      }
      // ferie, malattia
      return { ...prev, [giorno]: { ...current, attivo: true, tipo: type as any, fasce: [] } };
    });
  };

  const addFascia = (giorno: string) => {
    setEditFormTurni(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        fasce: [...prev[giorno].fasce, { id: Math.random().toString(36).substr(2, 9), inizio: '14:00', fine: '18:00', tipo: 'lavoro' }]
      }
    }));
  };

  const removeFascia = (giorno: string, id: string) => {
    setEditFormTurni(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        fasce: prev[giorno].fasce.filter(f => f.id !== id)
      }
    }));
  };

  const updateFascia = (giorno: string, id: string, field: 'inizio' | 'fine', value: string) => {
    setEditFormTurni(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        fasce: prev[giorno].fasce.map(f => f.id === id ? { ...f, [field]: value } : f)
      }
    }));
  };

  const updateOrarioSpeciale = (giorno: string, scope: 'orarioBase' | 'orarioPermesso', field: 'inizio' | 'fine', value: string) => {
    setEditFormTurni(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        [scope]: {
          ...prev[giorno][scope],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    if (!editingDipendente) return;
    setSaving(true);
    try {
      await dipendentiApi.update(editingDipendente.id, { turni: editFormTurni });
      refreshData();
      setEditingDipendente(null);
    } catch (error) {
      console.error("Errore salvataggio turni", error);
    } finally {
      setSaving(false);
    }
  };

  const renderCellContent = (t: TurnoGiorno) => {
    if (!t.attivo || t.tipo === 'riposo') return <span className="text-[11px] text-zinc-400 font-medium block py-1.5 bg-white rounded">Riposo</span>;
    if (t.tipo === 'ferie') return <span className="text-[11px] text-amber-500 font-medium block py-1.5 bg-amber-500/10 rounded">Ferie</span>;
    if (t.tipo === 'malattia') return <span className="text-[11px] text-red-500 font-medium block py-1.5 bg-red-500/10 rounded">Malattia</span>;
    
    if (t.tipo === 'lavoro_permesso' && t.orarioBase && t.orarioPermesso) {
       return (
           <div className="flex flex-col gap-1.5 w-full">
               <div className="flex items-center justify-center gap-1 text-[11px] font-medium rounded px-1.5 py-1 text-zinc-700 bg-zinc-100/40">
                   <span>{t.orarioBase.inizio}</span> <span className="text-zinc-500">-</span> <span>{t.orarioBase.fine}</span>
               </div>
               <div className="flex items-center justify-center gap-1 text-[10px] font-medium rounded px-1.5 py-1 text-blue-300 bg-blue-900/40 border border-blue-900/50">
                   <span className="font-bold mr-1 hidden lg:inline">Permesso:</span>
                   <span>{t.orarioPermesso.inizio}</span> <span className="text-blue-500/50">-</span> <span>{t.orarioPermesso.fine}</span>
               </div>
           </div>
       );
    }

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {t.fasce.map((f, i) => (
          <div key={i} className="flex items-center justify-center gap-1 text-[11px] font-medium rounded px-1.5 py-1 text-zinc-700 bg-zinc-100/40">
            <span>{f.inizio || '-'}</span>
            <span className="text-zinc-500">-</span>
            <span>{f.fine || '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden text-sm">
      <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-100/20">
        <div>
          <h2 className="font-semibold text-zinc-900 flex items-center gap-2 text-lg">
            <Clock size={20} className="text-fuchsia-500" />
            Panoramica orari
          </h2>
          <div className="text-zinc-500 text-xs mt-1">
            Visualizza gli orari di lavoro base. Per modificare, clicca sull'icona di modifica.
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-100/40 text-zinc-500 uppercase text-xs tracking-wider">
              <th className="p-4 font-medium border-b border-zinc-200 w-1/4">Dipendente</th>
              {giorniLabel.map((g) => (
                <th key={g} className="p-3 font-medium border-b border-zinc-200 text-center">{g}</th>
              ))}
              <th className="p-4 font-medium border-b border-zinc-200 text-right w-16">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {dipendenti.map(dip => {
              const turniSicuri = getTurniSicuri(dip.turni);
              return (
                <tr key={dip.id} className="hover:bg-zinc-100/20 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-zinc-900">{dip.nome} {dip.cognome}</div>
                    <div className="text-xs text-zinc-500">{calcOreSettimanali(dip.turni)} ore/settimana</div>
                  </td>
                  
                  {giorni.map(giorno => {
                    const t = turniSicuri[giorno];
                    return (
                      <td key={giorno} className="p-3 text-center align-top border-l border-zinc-200/30">
                        {renderCellContent(t)}
                      </td>
                    );
                  })}
                  
                  <td className="p-4 text-right border-l border-zinc-200/30 align-middle">
                    <button
                      onClick={() => handleOpenEdit(dip)}
                      className="p-2 text-zinc-500 hover:text-fuchsia-400 hover:bg-zinc-100 rounded-lg transition-colors inline-flex items-center justify-center opacity-70 group-hover:opacity-100"
                      title="Modifica Orari"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {dipendenti.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500">
                  Nessun dipendente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITING TURNI */}
      {editingDipendente && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-zinc-200 rounded-xl shadow-2xl w-full max-w-[900px] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-100/40">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Modifica orari settimanali</h3>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Operatore: <span className="text-fuchsia-400 font-medium">{editingDipendente.nome} {editingDipendente.cognome}</span>
                </p>
              </div>
              <button 
                onClick={() => setEditingDipendente(null)}
                className="text-zinc-500 hover:text-zinc-900 p-1.5 bg-zinc-100/50 rounded-md hover:bg-zinc-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {giorni.map((giorno, idx) => {
                  const t = editFormTurni[giorno];
                  const st = t.attivo ? t.tipo : 'riposo';
                  
                  return (
                    <div key={giorno} className={`flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 rounded-xl border transition-colors ${t.attivo ? 'bg-zinc-100/20 border-zinc-300/50' : 'bg-zinc-50/20 border-zinc-200/30 line-through opacity-70'}`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-[45%] mb-4 lg:mb-0">
                        <span className={`font-semibold w-28 uppercase tracking-wider text-xs ${t.attivo ? 'text-zinc-800' : 'text-zinc-500'}`}>
                          {giorniLabelLong[idx]}
                        </span>
                        
                        <select 
                          value={st}
                          onChange={(e) => handleDayTypeChange(giorno, e.target.value)}
                          className="bg-white border border-zinc-300 text-zinc-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-fuchsia-500 w-full sm:w-auto shadow-inner"
                        >
                          <option value="riposo">Riposo</option>
                          <option value="lavoro">Lavoro</option>
                          <option value="lavoro_permesso">Lavoro (con permesso)</option>
                          <option value="ferie">Ferie / Assenza</option>
                          <option value="malattia">Malattia</option>
                        </select>
                      </div>
                      
                      <div className="w-full lg:w-[55%] flex justify-start lg:justify-end">
                        {st === 'riposo' && <span className="text-sm text-zinc-400 bg-zinc-50/50 px-3 py-1.5 rounded-lg border border-zinc-200/50">Nessun turno</span>}
                        {(st === 'ferie' || st === 'malattia') && <span className="text-sm font-medium text-amber-500/80 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">Intera giornata off</span>}
                        
                        {st === 'lavoro' && (
                          <div className="flex flex-col gap-2 w-full lg:w-auto">
                            {t.fasce.map((fascia) => (
                              <div key={fascia.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full justify-end">
                                <TimeSelect value={fascia.inizio} onChange={(v) => updateFascia(giorno, fascia.id, 'inizio', v)} />
                                <span className="text-zinc-400 font-medium">-</span>
                                <TimeSelect value={fascia.fine} onChange={(v) => updateFascia(giorno, fascia.id, 'fine', v)} />
                                <button 
                                  onClick={(e) => { e.preventDefault(); removeFascia(giorno, fascia.id); }}
                                  className="text-zinc-400 hover:text-red-400 p-2 rounded-lg hover:bg-zinc-100 transition-colors bg-white border border-zinc-200 flex-shrink-0"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => addFascia(giorno)}
                              className="self-end text-xs flex items-center gap-1 text-fuchsia-400 hover:text-fuchsia-300 font-medium py-1.5 px-3 hover:bg-fuchsia-500/10 rounded-lg transition-colors border border-transparent hover:border-fuchsia-500/20"
                            >
                              <Plus size={14} /> Aggiungi blocco orario
                            </button>
                          </div>
                        )}

                        {st === 'lavoro_permesso' && t.orarioBase && t.orarioPermesso && (
                           <div className="flex flex-col gap-3 w-full lg:w-auto p-4 bg-zinc-50/50 rounded-xl border border-zinc-200 lg:p-0 lg:bg-transparent lg:border-transparent">
                             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-end">
                                <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mr-2 min-w-[70px]">Lavoro:</span>
                                <TimeSelect value={t.orarioBase.inizio} onChange={(v) => updateOrarioSpeciale(giorno, 'orarioBase', 'inizio', v)} />
                                <span className="text-zinc-400 font-medium">-</span>
                                <TimeSelect value={t.orarioBase.fine} onChange={(v) => updateOrarioSpeciale(giorno, 'orarioBase', 'fine', v)} />
                             </div>
                             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-end">
                                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold mr-2 min-w-[70px]">Permesso:</span>
                                <TimeSelect value={t.orarioPermesso.inizio} onChange={(v) => updateOrarioSpeciale(giorno, 'orarioPermesso', 'inizio', v)} />
                                <span className="text-blue-900 font-medium">-</span>
                                <TimeSelect value={t.orarioPermesso.fine} onChange={(v) => updateOrarioSpeciale(giorno, 'orarioPermesso', 'fine', v)} />
                             </div>
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setEditingDipendente(null)}
                className="px-6 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-200"
                disabled={saving}
              >
                Annulla modifiche
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-medium bg-fuchsia-600 text-white rounded-xl hover:bg-fuchsia-500 transition-colors flex items-center gap-2 shadow-lg shadow-fuchsia-900/30"
              >
                {saving ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={18} /> Salva turni
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

