'use client';

// Top of the file imports ...
// We just need to add the state for selected user.
import { useState, useEffect, useRef } from 'react';
import { appuntamentiApi, dipendentiApi, salonApi } from '@/lib/api-client';
import { Calendar as CalendarIcon, Clock, User, Users, Scissors, Plus, ChevronLeft, ChevronRight, LayoutGrid, List, Filter, Trash2, ChevronDown, MoreVertical, Edit2, Shield, X, FileText, Download, CheckCircle2, Ticket } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AggiungiCalendarioSidebar from './AggiungiCalendarioSidebar';
import BottoneRicontatta from '@/components/BottoneRicontatta';
import ChiusuraAppuntamento from '@/components/ChiusuraAppuntamento';
import { puoAprirePercorso } from '@/lib/sessione';
import {
  durataTotale,
  intervalliDaSegmenti,
  segmentiAppuntamento,
  spezzoniPerOperatore,
  siAccavallano,
  turnoDelGiorno,
  dentroTurno,
  descriviTurno,
  TurnoDelGiorno,
  NON_ASSEGNATO,
  operatoreDellaFase,
  Fase
} from '@/lib/servizi';

import { Link } from 'react-router-dom';

interface Appuntamento {
  id: string;
  data_ora: string;
  stato: string;
  note?: string;
  clienti?: { nome: string; cognome: string; telefono?: string };
  dipendenti?: { id: string; nome: string; cognome: string };
  idDipendente?: string;
  // Ogni riga può dire di chi è: il colore lo fa una, la piega un'altra.
  // Se non lo dice, è di chi ha in carico l'appuntamento.
  righe_appuntamento?: {
    servizi_catalogo?: any;
    nome?: string;
    id_dipendente?: string | null;
    [altro: string]: any;
  }[];
}

function MonthDayCell({ 
  dateStr, 
  d, 
  isOggi, 
  apps, 
  dipendenti, 
  setSelectedOperatorePreview, 
  formattaOrario, 
  getStatoBadge,
  onApriGiorno
}: {
  dateStr: string;
  d: string;
  isOggi: boolean;
  apps: any[];
  dipendenti: any[];
  setSelectedOperatorePreview: (op: any) => void;
  formattaOrario: (iso: string) => string;
  getStatoBadge: (stato: string) => string;
  onApriGiorno: () => void;
}) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedOp, setSelectedOp] = useState<any>(null);

  const appsPerOperatore = apps.reduce((acc, app) => {
    const opId = app.id_dipendente || app.dipendenti?.id || 'unassigned';
    const opName = app.dipendenti ? `${app.dipendenti.nome} ${app.dipendenti.cognome}` : 'Non assegnato';
    if (!acc[opId]) acc[opId] = { id: opId, nome: opName, appuntamenti: [] };
    acc[opId].appuntamenti.push(app);
    return acc;
  }, {} as Record<string, { id: string, nome: string, appuntamenti: any[] }>);

  return (
    <div 
      className="p-3 relative hover:bg-zinc-100/60 transition-colors cursor-pointer group flex flex-col justify-between"
      onMouseLeave={() => setView('list')}
      onClick={onApriGiorno}
      title="Apri questa giornata"
    >
      <div className="flex justify-between items-start">
        <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full ${isOggi ? 'bg-fuchsia-600 text-white' : 'text-zinc-500 group-hover:text-fuchsia-400 font-semibold'}`}>
          {parseInt(d, 10)}
        </span>
      </div>
      
      {apps.length > 0 ? (
        <div className="mt-2 text-center pb-2">
          <div className="text-xl font-playfair text-fuchsia-400 font-bold">{apps.length}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mt-0.5">Schedulati</div>
        </div>
      ) : (
        <div className="text-[10px] text-zinc-400 uppercase tracking-wider text-center mt-auto pb-2 font-medium">Libero</div>
      )}

      {apps.length > 0 && (
        <div className="absolute top-0 left-full pl-1 hidden group-hover:block z-[60]">
          <div className="bg-white border border-zinc-200 p-3 rounded-xl shadow-2xl w-64 animate-in fade-in zoom-in-95 duration-100 relative pointer-events-auto cursor-default">
            
            {view === 'list' ? (
              <>
                <span className="font-bold text-fuchsia-500 uppercase tracking-widest text-[10px] block mb-3 font-mono border-b border-zinc-200/50 pb-2">Organizzazione {parseInt(d, 10)}</span>
                <div className="space-y-1.5 max-h-[88px] overflow-y-auto pr-1">
                  {Object.values(appsPerOperatore).map((op: any, opIdx: number) => (
                    <div 
                      key={opIdx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOp(op);
                        setView('detail');
                      }}
                      className="group/op relative text-[12px] font-medium text-zinc-700 bg-white border border-zinc-300/50 py-2.5 px-3 rounded-lg shadow-sm hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-900 cursor-pointer transition-all flex justify-between items-center"
                    >
                      <span>{op.nome}</span>
                      <span className="text-zinc-500 bg-white px-2 py-0.5 rounded-full text-[10px] tabular-nums font-medium border border-zinc-200 group-hover/op:border-zinc-300">{op.appuntamenti.length} app</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-200/50">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setView('list'); }} 
                    className="text-zinc-500 hover:text-zinc-900 p-1 hover:bg-zinc-100 rounded transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <span className="font-bold text-fuchsia-400 uppercase tracking-widest text-[10px] block font-mono truncate">{selectedOp?.nome}</span>
                    <span className="text-[9px] text-zinc-500 font-medium tabular-nums">{selectedOp?.appuntamenti.length} appuntamenti</span>
                  </div>
                </div>
                
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 mb-2">
                  {selectedOp?.appuntamenti.map((app: any) => (
                    <div key={app.id} className="text-xs p-2.5 bg-white rounded-lg border border-zinc-200/50 flex flex-col gap-1.5">
                      <div className="flex justify-between text-zinc-900 font-medium items-center">
                        <span className="tabular-nums flex items-center gap-1.5 text-zinc-700">
                           <Clock size={10} className="text-zinc-500" />
                           {formattaOrario(app.data_ora)}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-sm border ${getStatoBadge(app.stato)}`}>{app.stato}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 font-medium mt-0.5">
                        <User size={10} className="text-zinc-400" />
                        <span className="truncate">{app.clienti?.nome} {app.clienti?.cognome}</span>
                      </div>
                      {app.righe_appuntamento && app.righe_appuntamento.length > 0 && (
                        <div className="flex items-start gap-1.5 text-[10px] text-zinc-500">
                          <Scissors size={10} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                          <span className="truncate leading-tight">{app.righe_appuntamento?.map((r:any) => r.servizi_catalogo?.nome).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const fullDip = dipendenti.find((d:any) => d.id === selectedOp?.id);
                    setSelectedOperatorePreview(fullDip || { id: 'unassigned', nome: 'Staff', cognome: 'Generico', ruolo: 'dipendente', attivo: true });
                  }}
                  className="w-full mt-1 flex items-center justify-center gap-2 py-2 text-[11px] font-semibold text-zinc-900 bg-fuchsia-400 hover:bg-fuchsia-500 rounded-lg transition-colors shadow-sm"
                >
                  <User size={14} />
                  Vedi profilo operatore
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaginaAgenda() {
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [dipendenti, setDipendenti] = useState<any[]>([]);
  // Il nome che va in cima al preconto stampato.
  const [nomeSalone, setNomeSalone] = useState<string>('');
  const [selectedDipendenteId, setSelectedDipendenteId] = useState<string>('tutti');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'giorno' | 'settimana' | 'mese'>('giorno');

  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Sync picker date when opening and when selectedDate changes
  useEffect(() => {
    salonApi.getSettings()
      .then(dati => setNomeSalone(dati?.nome || dati?.settings?.nome || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isDatePickerOpen) {
      setPickerDate(new Date(selectedDate));
    }
  }, [isDatePickerOpen, selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarDate, setSidebarDate] = useState<Date | undefined>(undefined);
  const [sidebarTime, setSidebarTime] = useState<string | undefined>(undefined);
  const [sidebarDipendenteId, setSidebarDipendenteId] = useState<string | undefined>(undefined);
  const [sidebarEditApp, setSidebarEditApp] = useState<any>(null);

  const [completaAppModal, setCompletaAppModal] = useState<{show: boolean, app: any, data: {importo: string, note: string, colori: string}}>({show: false, app: null, data: {importo: '', note: '', colori: ''}});

  const [isDeleting, setIsDeleting] = useState(false);

  // Custom operator select state
  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [selectedOperatorePreview, setSelectedOperatorePreview] = useState<any | null>(null);
  const [alertOrari, setAlertOrari] = useState<{show: boolean, timeStr?: string, date?: Date}>({show: false});

  // Trascinamento appuntamenti
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = useRef<number>(0);
  // Quale servizio si sta trascinando: si può spostare il singolo servizio,
  // non solo l'appuntamento intero.
  const trascinatoRef = useRef<{ appId: string; indiceRiga: number; fase: Fase; minutiPezzo: number } | null>(null);
  const [avvisoSpostamento, setAvvisoSpostamento] = useState<string | null>(null);
  const [confermaSpostamento, setConfermaSpostamento] = useState<{ messaggio: string; procedi: () => void } | null>(null);
  // La domanda che compare quando un trascinamento può voler dire due cose.
  const [domandaSpostamento, setDomandaSpostamento] = useState<{
    titolo: string;
    domanda: string;
    scelte: { etichetta: string; nota?: string; azione: () => void }[];
  } | null>(null);
  // Quale appuntamento è sotto il mouse: i suoi pezzi si accendono tutti,
  // anche quelli finiti nella colonna di un'altra operatrice.
  const [appEvidenziato, setAppEvidenziato] = useState<string | null>(null);

  // Richieste arrivate dal sito e ancora da confermare
  const [richieste, setRichieste] = useState<any[]>([]);
  const [pannelloRichieste, setPannelloRichieste] = useState(false);
  const [richiestaInCorso, setRichiestaInCorso] = useState<string | null>(null);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const apriAggiungiSidebar = (date?: Date, timeStr?: string, dipendenteId?: string) => {
    setSidebarDate(date || selectedDate || new Date());
    setSidebarTime(timeStr || '10:00');
    setSidebarDipendenteId(dipendenteId && dipendenteId !== 'unassigned' ? dipendenteId : undefined);
    setSidebarEditApp(null);
    setIsSidebarOpen(true);
  };

  useEffect(() => {
    caricaAgenda();
  }, [selectedDate, viewMode]);

  useEffect(() => { caricaRichieste(); }, []);

  const caricaRichieste = async () => {
    try {
      setRichieste(await appuntamentiApi.getRichieste());
    } catch (err) {
      console.error('Errore nel caricamento delle richieste:', err);
    }
  };

  /** Conferma o rifiuta una richiesta arrivata dal sito. */
  const rispondiARichiesta = async (richiesta: any, azione: 'conferma' | 'rifiuta') => {
    setRichiestaInCorso(richiesta.id);
    try {
      await appuntamentiApi.update(richiesta.id, {
        stato: azione === 'conferma' ? 'confermato' : 'annullato',
        data_ora: richiesta.data_ora
      });
      await caricaRichieste();
      caricaAgenda();
    } catch (err) {
      setAvvisoSpostamento('Non sono riuscito ad aggiornare la richiesta. Riprova.');
    } finally {
      setRichiestaInCorso(null);
    }
  };

  const getStartOfWeek = (d: Date) => {
    const data = new Date(d);
    const day = data.getDay() || 7;
    if (day !== 1) data.setHours(-24 * (day - 1));
    return data;
  };

  const getEndOfWeek = (d: Date) => {
    const data = new Date(getStartOfWeek(d));
    data.setDate(data.getDate() + 6);
    return data;
  };

  const caricaAgenda = async () => {
    setLoading(true);
    setError(null);
    try {
      let startStr = '';
      let endStr = '';

      if (viewMode === 'giorno') {
        const d = getLocalDateString(selectedDate);
        startStr = d;
        endStr = d;
      } else if (viewMode === 'settimana') {
        startStr = getLocalDateString(getStartOfWeek(selectedDate));
        endStr = getLocalDateString(getEndOfWeek(selectedDate));
      } else if (viewMode === 'mese') {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        startStr = getLocalDateString(new Date(year, month, 1));
        endStr = getLocalDateString(new Date(year, month + 1, 0));
      }

      const [appData, dipData] = await Promise.all([
        appuntamentiApi.getAgenda(undefined, startStr, endStr),
        dipendentiApi.getAll()
      ]);
      
      appData.sort((a: Appuntamento, b: Appuntamento) => 
        new Date(a.data_ora).getTime() - new Date(b.data_ora).getTime()
      );
      
      setAppuntamenti(appData);
      setDipendenti(dipData);
    } catch (err: any) {
      setError(err.message || "Errore durante il caricamento dell'agenda");
    } finally {
      setLoading(false);
    }
  };

  const cambiaPeriodo = (delta: number) => {
    setSlideDirection(delta > 0 ? 'left' : 'right');
    const nuovaData = new Date(selectedDate);
    if (viewMode === 'giorno') {
      nuovaData.setDate(nuovaData.getDate() + delta);
    } else if (viewMode === 'settimana') {
      nuovaData.setDate(nuovaData.getDate() + (delta * 7));
    } else if (viewMode === 'mese') {
      const month = nuovaData.getMonth();
      nuovaData.setMonth(month + delta);
      // Fix for month skipping when day is > 28
      if (nuovaData.getMonth() !== ((month + delta) % 12 + 12) % 12) {
        nuovaData.setDate(0); 
      }
    }
    setSelectedDate(nuovaData);
  };

  const oggi = () => {
    setSlideDirection('left');
    setSelectedDate(new Date());
  };

  const formattaOrario = (dataIso: string) => {
    return new Date(dataIso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formattaDataShort = (dataIso: string) => {
    return new Date(dataIso).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const calcolaDurataTotale = (righe: any[]) => durataTotale(righe);

  const getStatoBadge = (stato: string) => {
    switch (stato) {
      case 'completato': return 'bg-green-100 text-green-800 border-green-200';
      case 'annullato': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_attesa': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  const getColoreDipendente = (id: string, index: number) => {
    const colori = ['bg-blue-500', 'bg-fuchsia-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500'];
    return colori[index % colori.length];
  };

  // Chi ha in carico l'appuntamento, comunque sia scritto nei dati.
  const operatoreDi = (app: any): string =>
    app?.id_dipendente || app?.dipendenti?.id || app?.idDipendente || NON_ASSEGNATO;

  const renderLabelPeriodo = () => {
    if (viewMode === 'giorno') {
      return selectedDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (viewMode === 'settimana') {
      const start = getStartOfWeek(selectedDate);
      const end = getEndOfWeek(selectedDate);
      return `${start.getDate()} ${start.toLocaleDateString('it-IT', { month: 'long' })} - ${end.getDate()} ${end.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    }
  };

  const renderLabelPeriodoBreve = () => {
    if (viewMode === 'giorno') {
      return selectedDate.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long' });
    } else if (viewMode === 'settimana') {
      const start = getStartOfWeek(selectedDate);
      const end = getEndOfWeek(selectedDate);
      return `${start.getDate()} ${start.toLocaleDateString('it-IT', { month: 'long' })} - ${end.getDate()} ${end.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
    } else {
      return selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    }
  };

  // Raggruppamento per data per le viste multi-giorno
  const appuntamentiRaggruppati = appuntamenti.reduce((acc, app) => {
    const dataStr = app.data_ora.split('T')[0];
    if (!acc[dataStr]) acc[dataStr] = [];
    acc[dataStr].push(app);
    return acc;
  }, {} as Record<string, Appuntamento[]>);

  const isAppuntementoDiOperatore = (app: Appuntamento, dipId: string) => {
    if (dipId === 'tutti') return true;
    const appId = (app as any).id_dipendente || app.dipendenti?.id || app.idDipendente;
    if (dipId === 'unassigned') return !appId || appId === 'unassigned';
    return appId === dipId;
  };

  const renderMonthView = () => {
    const days = [];
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const startDay = new Date(year, month, 1);
    const endDay = new Date(year, month + 1, 0);

    const startDayOfWeek = startDay.getDay() === 0 ? 6 : startDay.getDay() - 1; 
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= endDay.getDate(); i++) {
      const dStr = getLocalDateString(new Date(year, month, i));
      days.push(dStr);
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden mt-6">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-100/30">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} className="py-3 text-center text-sm font-semibold text-zinc-900">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[130px] divide-x divide-y border-t-0 border-zinc-200 divide-zinc-200">
          {days.map((dateStr, i) => {
            if (!dateStr) return <div key={`empty-${i}`} className="bg-zinc-100/10"></div>;
            
            const [y, m, d] = dateStr.split('-');
            const isOggi = dateStr === getLocalDateString(new Date());
            const apps = (appuntamentiRaggruppati[dateStr] || []).filter(a => isAppuntementoDiOperatore(a, selectedDipendenteId));
            
            return (
              <MonthDayCell 
                 key={i}
                 dateStr={dateStr}
                 d={d}
                 isOggi={isOggi}
                 apps={apps}
                 dipendenti={dipendenti}
                 setSelectedOperatorePreview={setSelectedOperatorePreview}
                 formattaOrario={formattaOrario}
                 getStatoBadge={getStatoBadge}
                 onApriGiorno={() => {
                   const [aa, mm, gg] = dateStr.split('-').map(Number);
                   setViewMode('giorno');
                   setSelectedDate(new Date(aa, mm - 1, gg));
                 }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const WEEK_HOUR_SLOTS = [
    '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  const matchAppToHourSlot = (app: Appuntamento, hourStr: string, isLastSlot: boolean) => {
    // When dealing with dates coming back, convert to local hours properly aligned
    const date = new Date(app.data_ora);
    const appMinutes = date.getHours() * 60 + date.getMinutes();
    
    const [h] = hourStr.split(':').map(Number);
    const slotStart = h * 60;
    
    if (isLastSlot) {
      return appMinutes >= slotStart;
    }
    
    return appMinutes >= slotStart && appMinutes < (slotStart + 60);
  };

  const handleElimina = async (id: string) => {
    setIsDeleting(true);
    try {
      await appuntamentiApi.delete(id);
      caricaAgenda();
    } catch (err) {
      alert("Errore nell'eliminazione dell'appuntamento.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (app: any) => {
    setSidebarEditApp(app);
    setIsSidebarOpen(true);
  };

  const handleCompleteClick = (app: any) => {
    setCompletaAppModal({ show: true, app, data: { importo: '', note: '', colori: '' } });
  };

  // Trascinamento: sposta l'appuntamento di orario e/o di operatore.
  const spostaAppuntamento = async (id: string, dipendente: any, minutiDelGiorno: number, forzato = false) => {
    const app = appuntamenti.find(a => a.id === id);
    if (!app) return;

    const nuovaData = new Date(selectedDate);
    nuovaData.setHours(Math.floor(minutiDelGiorno / 60), minutiDelGiorno % 60, 0, 0);

    const stessoOrario = new Date(app.data_ora).getTime() === nuovaData.getTime();
    const stessoOperatore = ((app as any).id_dipendente || app.dipendenti?.id || 'unassigned') === dipendente.id;
    if (stessoOrario && stessoOperatore) return;

    const righe = app.righe_appuntamento || [];
    // Si guarda solo quello che occupa DAVVERO questa operatrice: i servizi
    // affidati ad altre, e le pose, non la impegnano.
    const conflitto = appuntamenti.some(altro => {
      if (altro.id === app.id) return false;
      if (altro.stato === 'annullato') return false;
      return siAccavallano(
        { inizioMs: nuovaData.getTime(), righe, operatore: dipendente.id },
        { inizioMs: new Date(altro.data_ora).getTime(), righe: altro.righe_appuntamento || [], operatore: operatoreDi(altro) },
        dipendente.id
      );
    });

    const turno = turnoDelGiorno(dipendente, nuovaData);
    const minutiFine = minutiDelGiorno + durataTotale(righe);
    const fuoriTurno = dipendente.id !== 'unassigned' && (
      !turno.lavora
      || !dentroTurno(turno, minutiDelGiorno)
      || !dentroTurno(turno, Math.max(minutiDelGiorno, minutiFine - 1))
    );

    if ((conflitto || fuoriTurno) && !forzato) {
      setConfermaSpostamento({
        messaggio: conflitto
          ? `${dipendente.nome} ha già un appuntamento che si accavalla con questo.`
          : turno.lavora
            ? `${dipendente.nome} quel giorno è in turno ${descriviTurno(turno)}: l'appuntamento cade fuori.`
            : `${dipendente.nome} quel giorno non è in turno (${turno.etichetta}).`,
        procedi: () => {
          setConfermaSpostamento(null);
          spostaAppuntamento(id, dipendente, minutiDelGiorno, true);
        }
      });
      return;
    }

    // Aggiornamento ottimistico: la card si muove subito, poi si salva.
    const precedenti = appuntamenti;
    setAppuntamenti(prev => prev.map(a => a.id === app.id
      ? { ...a, data_ora: nuovaData.toISOString(), id_dipendente: dipendente.id === 'unassigned' ? null : dipendente.id, dipendenti: dipendente.id === 'unassigned' ? null : { id: dipendente.id, nome: dipendente.nome, cognome: dipendente.cognome } } as any
      : a
    ));

    try {
      await appuntamentiApi.update(app.id, {
        data_ora: nuovaData.toISOString(),
        stato: app.stato,
        id_dipendente: dipendente.id === 'unassigned' ? null : dipendente.id,
        dipendenti: dipendente.id === 'unassigned'
          ? null
          : { id: dipendente.id, nome: dipendente.nome, cognome: dipendente.cognome || '' }
      });
      caricaAgenda();
    } catch (err) {
      setAppuntamenti(precedenti);
      setAvvisoSpostamento("Non sono riuscito a spostare l'appuntamento. Riprova.");
    }
  };

  /**
   * Affida UNA FASE a un'altra operatrice, senza toccare l'orario.
   *
   * È il caso di tutti i giorni: il colore lo stende Rosanna, la finitura la
   * fa Giulia. Si sposta la singola fase, non tutto il servizio, perché
   * lavorazione e finitura dello stesso servizio possono stare in mani
   * diverse. L'appuntamento resta uno solo.
   */
  const spostaFase = async (appId: string, indiceRiga: number, fase: Fase, dipendente: any) => {
    const app = appuntamenti.find(a => a.id === appId);
    if (!app) return;

    const righe = [...(app.righe_appuntamento || [])];
    const riga = righe[indiceRiga];
    if (!riga) return;

    if (operatoreDellaFase(riga, fase, operatoreDi(app)) === dipendente.id) return;
    const nuovoId = dipendente.id === NON_ASSEGNATO ? null : dipendente.id;

    if (fase === 'finitura') {
      righe[indiceRiga] = { ...riga, id_dipendente_finitura: nuovoId };
    } else {
      // Spostando la lavorazione, la finitura resta a chi la faceva: se
      // seguiva la lavorazione, la si fissa adesso, altrimenti si sposterebbe
      // anche lei senza che nessuno l'abbia chiesto.
      const finituraPrima = operatoreDellaFase(riga, 'finitura', operatoreDi(app));
      righe[indiceRiga] = {
        ...riga,
        id_dipendente: nuovoId,
        id_dipendente_finitura: riga.id_dipendente_finitura
          || (finituraPrima === NON_ASSEGNATO ? null : finituraPrima)
      };
    }

    const precedenti = appuntamenti;
    setAppuntamenti(prev => prev.map(a => a.id === appId ? { ...a, righe_appuntamento: righe } as any : a));

    try {
      await appuntamentiApi.update(appId, { righe_appuntamento: righe });
      caricaAgenda();
    } catch (err) {
      setAppuntamenti(precedenti);
      setAvvisoSpostamento('Non sono riuscito a spostare il servizio. Riprova.');
    }
  };

  // Calendario del mese sempre in vista: un clic sul giorno apre quel giorno,
  // senza dover scorrere avanti uno per uno mentre si è al telefono.
  const renderCalendarioMese = () => {
    const anno = selectedDate.getFullYear();
    const mese = selectedDate.getMonth();
    const primo = new Date(anno, mese, 1);
    const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
    const offset = (primo.getDay() || 7) - 1;
    const oggiStr = getLocalDateString(new Date());

    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => { const d = new Date(selectedDate); d.setDate(1); d.setMonth(d.getMonth() - 1); setSelectedDate(d); }}
            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
            aria-label="Mese precedente"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] font-semibold text-zinc-800 capitalize">
            {selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => { const d = new Date(selectedDate); d.setDate(1); d.setMonth(d.getMonth() + 1); setSelectedDate(d); }}
            className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
            aria-label="Mese successivo"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['L','M','M','G','V','S','D'].map((g, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-zinc-500 uppercase">{g}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: offset }).map((_, i) => <div key={`v-${i}`} />)}
          {Array.from({ length: giorniNelMese }).map((_, i) => {
            const giorno = i + 1;
            const data = new Date(anno, mese, giorno);
            const dataStr = getLocalDateString(data);
            const selezionato = dataStr === getLocalDateString(selectedDate);
            const isOggi = dataStr === oggiStr;
            const quanti = (appuntamentiRaggruppati[dataStr] || []).length;

            return (
              <button
                key={giorno}
                onClick={() => { setViewMode('giorno'); setSelectedDate(data); }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-[12px] font-medium transition-colors ${
                  selezionato ? 'bg-[#D400FF] text-white shadow-sm' :
                  isOggi ? 'border border-fuchsia-400 text-fuchsia-600 hover:bg-fuchsia-50' :
                  'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {giorno}
                {quanti > 0 && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${selezionato ? 'bg-white' : 'bg-fuchsia-500'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const staff = [...dipendenti, { id: 'unassigned', nome: 'Non', cognome: 'assegnato' }];

    const turniStaff: Record<string, TurnoDelGiorno> = {};
    staff.forEach(d => { turniStaff[d.id] = turnoDelGiorno(d, selectedDate); });

    // La finestra oraria segue i turni del giorno e gli appuntamenti già
    // fissati, invece del vecchio 05:00-23:00 fisso che sprecava mezzo schermo.
    let minMinuti = 9 * 60;
    let maxMinuti = 19 * 60;

    Object.values(turniStaff).forEach(t => t.fasce.forEach(f => {
      minMinuti = Math.min(minMinuti, f.inizio);
      maxMinuti = Math.max(maxMinuti, f.fine);
    }));

    appuntamenti.forEach(app => {
      const d = new Date(app.data_ora);
      const inizio = d.getHours() * 60 + d.getMinutes();
      minMinuti = Math.min(minMinuti, inizio);
      maxMinuti = Math.max(maxMinuti, inizio + durataTotale(app.righe_appuntamento || []));
    });

    const START_HOUR = Math.max(0, Math.floor(minMinuti / 60) - 1);
    const END_HOUR = Math.min(24, Math.ceil(maxMinuti / 60) + 1);
    const TOTAL_HOURS = Math.max(2, END_HOUR - START_HOUR);
    const PIXELS_PER_MINUTE = 2; // più spazio verticale per leggere le fasi
    const GRID_HEIGHT = TOTAL_HOURS * 60 * PIXELS_PER_MINUTE;

    const orarioDaMinuti = (minuti: number) =>
      `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`;

    // Sotto i 10 minuti di scarto si considera "lasciato dov'era": chi trascina
    // di lato non sta cercando di cambiare l'ora, sta cambiando persona.
    const TOLLERANZA_MINUTI = 10;

    const handleDrop = (e: React.DragEvent, dip: any) => {
      e.preventDefault();
      const trascinato = trascinatoRef.current;
      const id = e.dataTransfer.getData('text/appuntamento') || trascinato?.appId || draggingId;
      setDraggingId(null);
      trascinatoRef.current = null;
      if (!id) return;

      const app = appuntamenti.find(a => a.id === id);
      if (!app) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top - dragOffsetRef.current;
      const minutiDalTop = Math.round((y / PIXELS_PER_MINUTE) / 5) * 5;
      const minuti = Math.max(0, Math.min(minutiDalTop, TOTAL_HOURS * 60 - 5)) + START_HOUR * 60;

      const inizioApp = new Date(app.data_ora);
      const minutiApp = inizioApp.getHours() * 60 + inizioApp.getMinutes();
      // Il pezzo che si sta trascinando può iniziare più tardi dell'appuntamento
      // (la piega dopo il colore): il confronto va fatto sul pezzo, non sul
      // primo servizio, altrimenti l'orario mostrato è quello sbagliato.
      const minutiPezzo = trascinato?.minutiPezzo ?? minutiApp;
      const scarto = minuti - minutiPezzo;
      const oraCambiata = Math.abs(scarto) > TOLLERANZA_MINUTI;

      const righe = app.righe_appuntamento || [];
      const indiceRiga = trascinato?.indiceRiga ?? 0;
      const fase: Fase = trascinato?.fase ?? 'lavorazione';
      const riga = righe[indiceRiga];
      const suo = riga ? operatoreDellaFase(riga, fase, operatoreDi(app)) : operatoreDi(app);
      const colonnaCambiata = suo !== dip.id;

      // Si può staccare un pezzo quando l'appuntamento ne ha più d'uno: più
      // servizi, oppure un servizio con la finitura staccabile dalla posa.
      const piuPezzi = righe.length > 1
        || segmentiAppuntamento(righe, operatoreDi(app)).some(x => x.fase === 'finitura');

      if (!colonnaCambiata && !oraCambiata) return;

      const nome = [app.clienti?.nome, app.clienti?.cognome].filter(Boolean).join(' ') || 'la cliente';
      const nomeBase = riga?.servizi_catalogo?.nome || riga?.nome || 'questo servizio';
      const nomeServizio = fase === 'finitura' ? `finitura di ${nomeBase}` : nomeBase;
      const aChi = `${dip.nome} ${dip.cognome || ''}`.trim();
      const oraPezzo = orarioDaMinuti(minutiPezzo);
      const oraNuovaPezzo = orarioDaMinuti(minuti);
      // Spostando tutto l'appuntamento, gli altri servizi slittano dello stesso
      // scarto: l'ordine fra loro resta quello.
      const minutiAppSpostato = Math.max(0, minutiApp + scarto);
      const oraAppSpostato = orarioDaMinuti(minutiAppSpostato);

      const chiudi = (azione: () => void) => () => { setDomandaSpostamento(null); azione(); };

      // Stessa colonna, ora diversa: è un semplice spostamento d'orario, e si
      // porta dietro tutto l'appuntamento perché i servizi vanno in fila.
      if (!colonnaCambiata) {
        spostaAppuntamento(id, dip, minutiAppSpostato);
        return;
      }

      // Un solo servizio nell'appuntamento: l'unica domanda possibile è l'ora.
      if (!piuPezzi) {
        if (!oraCambiata) { spostaAppuntamento(id, dip, minutiApp); return; }
        setDomandaSpostamento({
          titolo: `${nome} passa a ${aChi}`,
          domanda: 'Lo lasci allo stesso orario o lo cambi?',
          scelte: [
            { etichetta: `Stesso orario · ${oraPezzo}`, azione: chiudi(() => spostaAppuntamento(id, dip, minutiApp)) },
            { etichetta: `Sposta alle ${oraNuovaPezzo}`, azione: chiudi(() => spostaAppuntamento(id, dip, minutiAppSpostato)) }
          ]
        });
        return;
      }

      // Più pezzi: si è preso solo quello, ma forse voleva spostare tutto.
      setDomandaSpostamento({
        titolo: `${nome} passa a ${aChi}`,
        domanda: "Sposti solo questo servizio o tutto l'appuntamento?",
        scelte: [
          {
            etichetta: `Solo «${nomeServizio}» · resta alle ${oraPezzo}`,
            nota: 'Il resto dell\'appuntamento non si muove.',
            azione: chiudi(() => spostaFase(id, indiceRiga, fase, dip))
          },
          oraCambiata
            ? {
                etichetta: `Tutto l'appuntamento · inizia alle ${oraAppSpostato}`,
                nota: 'Passa tutto, e tutto slitta con lui.',
                azione: chiudi(() => spostaAppuntamento(id, dip, minutiAppSpostato))
              }
            : {
                etichetta: `Tutto l'appuntamento · resta alle ${orarioDaMinuti(minutiApp)}`,
                nota: 'Passa tutto, stessa ora.',
                azione: chiudi(() => spostaAppuntamento(id, dip, minutiApp))
              }
        ]
      });
    };

    return (
      <div
        className="bg-white rounded-xl shadow-sm border border-zinc-200 flex flex-col overflow-hidden"
        style={{ height: 'calc(100vh - 168px)' }}
      >
        <div className="overflow-y-auto overflow-x-hidden flex-1 relative scroll-smooth">
          <div className="w-full">

            {/* Intestazione colonne operatori */}
            <div className="flex border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <div className="w-14 shrink-0 border-r border-zinc-200 flex items-center justify-center text-[10px] uppercase tracking-wider font-semibold text-zinc-500 font-mono">
                Ora
              </div>
              {staff.map((dip, idx) => {
                const turno = turniStaff[dip.id];
                const fuoriTurno = dip.id !== 'unassigned' && !turno.lavora;
                return (
                  <div
                    key={dip.id}
                    className={`flex-1 min-w-0 px-1 py-2 flex flex-col items-center justify-center border-l border-zinc-200 ${fuoriTurno ? 'bg-zinc-100' : ''}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold mb-1 ${dip.id === 'unassigned' ? 'bg-zinc-400' : getColoreDipendente(dip.id, idx)} ${fuoriTurno ? 'opacity-40' : ''}`}>
                      {dip.nome.charAt(0)}{(dip.cognome || '').charAt(0)}
                    </div>
                    <span className={`text-[12px] font-semibold truncate max-w-full leading-tight ${fuoriTurno ? 'text-zinc-500' : 'text-zinc-800'}`}>
                      {dip.nome} {dip.cognome}
                    </span>
                    <span className={`text-[9px] font-mono truncate max-w-full ${fuoriTurno ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {dip.id === 'unassigned' ? 'sempre disponibile' : descriviTurno(turno)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Corpo agenda */}
            <div className="flex relative" style={{ height: `${GRID_HEIGHT}px` }}>

              {/* Colonna orari */}
              <div className="w-14 shrink-0 border-r border-zinc-200 bg-white flex flex-col relative z-20">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full flex justify-center border-b border-zinc-100 pointer-events-none"
                    style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
                  >
                    <span className="text-[11px] font-semibold text-zinc-500 font-mono mt-1">
                      {String(START_HOUR + i).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Righe della griglia */}
              <div className="absolute inset-0 left-14 pointer-events-none flex flex-col z-0">
                {Array.from({ length: TOTAL_HOURS * 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-full ${i % 4 === 0 ? 'border-t border-zinc-200' : 'border-t border-dashed border-zinc-100'}`}
                    style={{ height: `${15 * PIXELS_PER_MINUTE}px` }}
                  ></div>
                ))}
              </div>

              {/* Colonne operatori: larghezza uguale, nessuno scorrimento laterale */}
              <div className="flex flex-1 z-10 min-w-0">
                {staff.map((dip) => {
                  const turno = turniStaff[dip.id];

                  // Un appuntamento può essere diviso fra più operatori: il
                  // colore a una, la piega a un'altra. Qui si prendono solo i
                  // pezzi che toccano a questa colonna.
                  const posizionati = appuntamenti
                    .flatMap(app => {
                      const inizioApp = new Date(app.data_ora).getTime();
                      return spezzoniPerOperatore(app.righe_appuntamento || [], operatoreDi(app))
                        .map((spezzone, i) => ({ app, spezzone, indicePezzo: i, inizioApp }));
                    })
                    .filter(({ spezzone }) => spezzone.idDipendente === dip.id)
                    .map(({ app, spezzone, indicePezzo, inizioApp }) => {
                      const inizioMs = inizioApp + spezzone.inizio * 60000;
                      return {
                        app,
                        spezzone,
                        chiave: `${app.id}#${indicePezzo}`,
                        inizioMs,
                        durata: spezzone.fine - spezzone.inizio,
                        // Le colonne affiancate si calcolano sui soli tempi di
                        // lavorazione: durante la posa l'operatore è libero,
                        // quindi chi si infila lì prende tutta la larghezza.
                        occupati: intervalliDaSegmenti(inizioMs, spezzone.segmenti),
                        colIndex: 0,
                        colTotal: 1
                      };
                    })
                    .sort((a, b) => a.inizioMs - b.inizioMs);

                  const collide = (a: typeof posizionati[0], b: typeof posizionati[0]) =>
                    a.occupati.some(x => b.occupati.some(y => x.inizio < y.fine && y.inizio < x.fine));

                  const gruppi: (typeof posizionati)[] = [];
                  posizionati.forEach(item => {
                    const gruppo = gruppi.find(g => g.some(altro => collide(altro, item)));
                    if (gruppo) gruppo.push(item);
                    else gruppi.push([item]);
                  });

                  gruppi.forEach(gruppo => {
                    const colonne: (typeof posizionati)[] = [];
                    gruppo.forEach(item => {
                      let sistemato = false;
                      for (let i = 0; i < colonne.length; i++) {
                        if (!colonne[i].some(altro => collide(altro, item))) {
                          colonne[i].push(item);
                          item.colIndex = i;
                          sistemato = true;
                          break;
                        }
                      }
                      if (!sistemato) {
                        item.colIndex = colonne.length;
                        colonne.push([item]);
                      }
                    });
                    gruppo.forEach(item => { item.colTotal = colonne.length; });
                  });

                  return (
                    <div
                      key={dip.id}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                      onDrop={(e) => handleDrop(e, dip)}
                      className={`flex-1 min-w-0 border-l border-zinc-200 relative group/col ${draggingId ? 'bg-fuchsia-50/60' : ''}`}
                    >
                      {/* Celle cliccabili */}
                      <div className="absolute inset-0 flex flex-col">
                        {Array.from({ length: TOTAL_HOURS * 4 }).map((_, i) => {
                          const minuti = START_HOUR * 60 + i * 15;
                          const timeStr = orarioDaMinuti(minuti);
                          const inTurno = dip.id === 'unassigned' || dentroTurno(turno, minuti);

                          // Fuori turno la cella è oscurata ma resta cliccabile:
                          // capita che l'operatore venga lo stesso.
                          return (
                            <div
                              key={i}
                              onClick={() => apriAggiungiSidebar(selectedDate, timeStr, dip.id)}
                              className={`w-full transition-colors cursor-pointer group/cell ${
                                inTurno
                                  ? 'hover:bg-fuchsia-50'
                                  : 'bg-zinc-100/80 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(0,0,0,0.03)_5px,rgba(0,0,0,0.03)_10px)] hover:bg-zinc-200/70'
                              }`}
                              style={{ height: `${15 * PIXELS_PER_MINUTE}px` }}
                              title={inTurno ? `Fissa alle ${timeStr}` : `Fuori turno — puoi comunque fissare alle ${timeStr}`}
                            >
                              <button className="opacity-0 group-hover/cell:opacity-100 flex items-center justify-center w-full h-full text-[10px] text-zinc-500 hover:text-fuchsia-600 transition-opacity font-medium">
                                <Plus size={13} className="mr-0.5" />
                                <span className="truncate">{timeStr}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Appuntamenti (uno o più pezzi per appuntamento) */}
                      {posizionati.map(({ app, spezzone, chiave, inizioMs, durata, colIndex, colTotal }, idx) => {
                        const date = new Date(inizioMs);
                        let appMinutes = (date.getHours() * 60 + date.getMinutes()) - (START_HOUR * 60);
                        if (appMinutes < 0) appMinutes = 0;

                        return (
                          <MicroAppCard
                            key={chiave}
                            app={app}
                            spezzone={spezzone}
                            inizioMs={inizioMs}
                            formattaOrario={formattaOrario}
                            durata={durata}
                            onDelete={handleElimina}
                            onEdit={handleEdit}
                            onComplete={handleCompleteClick}
                            isAbsolute={true}
                            pixelPerMinute={PIXELS_PER_MINUTE}
                            startOffset={appMinutes * PIXELS_PER_MINUTE}
                            idx={idx}
                            colIndex={colIndex}
                            colTotal={colTotal}
                            evidenziato={appEvidenziato === app.id}
                            onEvidenzia={setAppEvidenziato}
                            onDragStartServizio={(indiceRiga: number, fase: Fase, offsetY: number, minutiNelPezzo: number) => {
                              dragOffsetRef.current = offsetY;
                              const inizioBlocco = new Date(inizioMs + minutiNelPezzo * 60000);
                              trascinatoRef.current = {
                                appId: app.id,
                                indiceRiga,
                                fase,
                                minutiPezzo: inizioBlocco.getHours() * 60 + inizioBlocco.getMinutes()
                              };
                              setDraggingId(app.id);
                            }}
                            onDragEndApp={() => { setDraggingId(null); trascinatoRef.current = null; }}
                            isDragging={draggingId === app.id}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const days = [];
    const start = getStartOfWeek(selectedDate);
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push(d);
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 mt-6 animate-in fade-in zoom-in-[0.98] duration-300">
        {days.map((d, i) => {
          const dateStr = getLocalDateString(d);
          const allApps = appuntamentiRaggruppati[dateStr] || [];
          const apps = allApps.filter(a => isAppuntementoDiOperatore(a, selectedDipendenteId));
          const isOggi = dateStr === getLocalDateString(new Date());

          return (
            <div key={i} className="flex flex-col h-auto bg-white rounded-xl shadow-sm border border-zinc-200">
              <div className={`p-4 border-b border-zinc-200 text-center ${isOggi ? 'bg-fuchsia-500/20' : 'bg-zinc-100/30'}`}>
                <div className="text-[10px] uppercase text-zinc-500 font-semibold tracking-wider">{d.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                <div className={`text-2xl mt-1 font-playfair ${isOggi ? 'text-fuchsia-500 font-bold' : 'text-zinc-900'}`}>{d.getDate()}</div>
              </div>
              <div className="p-2 flex-1 space-y-2 bg-white divide-y divide-zinc-200/40">
                {WEEK_HOUR_SLOTS.map((hourStr, sIdx) => {
                  const isLastSlot = sIdx === WEEK_HOUR_SLOTS.length - 1;
                  const slotApps = apps.filter(app => matchAppToHourSlot(app, hourStr, isLastSlot));
                  
                  const h = parseInt(hourStr.split(':')[0], 10);
                  const isWorkingHour = h >= 9 && h <= 18;
                  const showClosed = !isWorkingHour && selectedDipendenteId !== 'tutti' && selectedDipendenteId !== 'unassigned';

                  if (showClosed) {
                    return (
                      <div 
                        key={hourStr} 
                        onClick={() => setAlertOrari({show: true, timeStr: hourStr, date: d})}
                        className="pt-2 pb-2 first:pt-0 last:pb-0 relative min-h-[40px] cursor-not-allowed bg-zinc-100/40 border-b border-zinc-200/50"
                      >
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mb-1 select-none relative z-10">
                          <span>{hourStr}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={hourStr} className="pt-2 pb-2 first:pt-0 last:pb-0 group/slot relative min-h-[40px]">
                      {/* Hour heading on week columns */}
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mb-1 select-none relative">
                        <span>{hourStr}</span>
                        {slotApps.length === 0 && (
                          <button 
                            onClick={() => apriAggiungiSidebar(d, hourStr)}
                            className="absolute right-0 opacity-0 group-hover/slot:opacity-100 text-[8px] font-bold uppercase text-fuchsia-400 font-sans cursor-pointer transition-opacity flex items-center gap-0.5 bg-zinc-100/80 px-1 py-0.5 rounded"
                          >
                            <Plus size={10} /> fissa
                          </button>
                        )}
                      </div>

                      {slotApps.length > 0 ? (
                        <div className="space-y-1">
                          {slotApps.map((app, idx) => (
                            <MicroAppCard key={app.id} app={app} getStatoBadge={getStatoBadge} formattaOrario={formattaOrario} durata={calcolaDurataTotale(app.righe_appuntamento || [])} onDelete={handleElimina} onEdit={handleEdit} onComplete={handleCompleteClick} idx={idx} />
                          ))}
                        </div>
                      ) : (
                        <div className="relative group/empty-popover opacity-20 hover:opacity-100 transition-opacity h-full">
                          <div 
                            onClick={() => apriAggiungiSidebar(d, hourStr)}
                            className="text-[10px] text-zinc-400 italic hover:text-fuchsia-400 transition-colors cursor-pointer select-none absolute inset-0 flex items-center p-1"
                          >
                            Libero
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4 w-full h-full flex flex-col">
      
      {/* Orizzontal layout for Agenda header and KPI / Banner */}
      <div className="flex flex-col mb-4 gap-2">
        {/* Intestazione e Controlli Data */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sticky top-4 z-40 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 shadow-sm ">
          <div>
            <h1 className="text-2xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
              <CalendarIcon className="text-[#D400FF]" size={24} />
              {renderLabelPeriodo()}
            </h1>
            <p className="text-zinc-500 font-sans mt-1 text-sm flex items-center gap-2">
              <span>{appuntamenti.length} appuntamenti {viewMode === 'giorno' ? 'oggi' : ''}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 mx-1"></span>
              <span className="text-fuchsia-400">
                {appuntamenti.reduce((acc, app) => acc + (app.righe_appuntamento?.length || 0), 0)} servizi previsti
              </span>
            </p>
          </div>
          
          <div className="flex items-center flex-wrap gap-2 xl:gap-4 w-full xl:w-auto pb-2 xl:pb-0">
            
            {/* Selettore Modalità */}
            <div className="flex shrink-0 text-sm border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
              {(['giorno', 'settimana', 'mese'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 xl:px-4 py-2 capitalize font-medium transition-colors whitespace-nowrap ${viewMode === mode ? 'bg-fuchsia-500/30 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}
                >
                  {mode === 'settimana' ? 'sett.' : mode}
                </button>
              ))}
            </div>

          <div className="flex shrink-0 items-center bg-white border border-zinc-200 rounded-lg p-1 shadow-sm relative">
            <button 
              onClick={() => cambiaPeriodo(-1)}
              className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="relative shrink-0" ref={datePickerRef}>
              <button 
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="cursor-pointer px-2 xl:px-3 font-semibold text-zinc-900 w-[140px] xl:w-[200px] text-center capitalize text-sm flex items-center justify-between hover:text-fuchsia-400 transition-colors gap-1 xl:gap-2 whitespace-nowrap"
              >
                <span className="flex-1 truncate">{renderLabelPeriodoBreve()}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 shrink-0 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDatePickerOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-zinc-200 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[260px]">
                  
                  {viewMode === 'mese' ? (
                    // --- VISTA SELEZIONE MESE ---
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => { const d = new Date(pickerDate); d.setFullYear(d.getFullYear() - 1); setPickerDate(d); }} className="p-1 text-zinc-500 hover:text-zinc-900"><ChevronLeft size={16} /></button>
                        <span className="text-sm font-semibold text-zinc-900">{pickerDate.getFullYear()}</span>
                        <button onClick={() => { const d = new Date(pickerDate); d.setFullYear(d.getFullYear() + 1); setPickerDate(d); }} className="p-1 text-zinc-500 hover:text-zinc-900"><ChevronRight size={16} /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const monthDate = new Date(pickerDate.getFullYear(), i, 1);
                          const isSelected = selectedDate.getMonth() === i && selectedDate.getFullYear() === pickerDate.getFullYear();
                          const isCurrentMonth = new Date().getMonth() === i && new Date().getFullYear() === pickerDate.getFullYear();
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const newD = new Date(selectedDate);
                                newD.setFullYear(pickerDate.getFullYear(), i, 1);
                                setSelectedDate(newD);
                                setIsDatePickerOpen(false);
                              }}
                              className={`py-2 text-xs font-medium rounded-lg transition-colors capitalize ${
                                isSelected ? 'bg-fuchsia-600 text-white shadow-md' :
                                isCurrentMonth ? 'border border-fuchsia-500/50 text-fuchsia-400 hover:bg-zinc-100' :
                                'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                              }`}
                            >
                              {monthDate.toLocaleDateString('it-IT', { month: 'short' })}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    // --- VISTA SELEZIONE GIORNO/SETTIMANA ---
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => { const d = new Date(pickerDate); d.setDate(1); d.setMonth(d.getMonth() - 1); setPickerDate(d); }} className="p-1 text-zinc-500 hover:text-zinc-900"><ChevronLeft size={16} /></button>
                        <span className="text-sm font-semibold text-zinc-900 capitalize">
                          {pickerDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => { const d = new Date(pickerDate); d.setDate(1); d.setMonth(d.getMonth() + 1); setPickerDate(d); }} className="p-1 text-zinc-500 hover:text-zinc-900"><ChevronRight size={16} /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['L','M','M','G','V','S','D'].map((day, ix) => (
                          <div key={`${day}-${ix}`} className="text-center text-xs font-medium text-zinc-500">{day}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {/* Le celle vuote iniziali dipendono dal PRIMO del mese, non dal giorno scelto: prima la griglia slittava a ogni cambio di giorno. */}
                        {Array.from({ length: (new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1).getDay() || 7) - 1 }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                          const day = i + 1;
                          const cellDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day);
                          
                          let isSelected = false;
                          let inWeekBounds = false;

                          if (viewMode === 'giorno') {
                            isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === pickerDate.getMonth() && selectedDate.getFullYear() === pickerDate.getFullYear();
                          } else if (viewMode === 'settimana') {
                            const start = getStartOfWeek(selectedDate);
                            const end = getEndOfWeek(selectedDate);
                            // Set end to 23:59:59 to include full day
                            end.setHours(23, 59, 59, 999);
                            if (cellDate >= start && cellDate <= end) {
                              inWeekBounds = true;
                              isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === pickerDate.getMonth() && selectedDate.getFullYear() === pickerDate.getFullYear();
                            }
                          }
                          
                          const isToday = new Date().getDate() === day && new Date().getMonth() === pickerDate.getMonth() && new Date().getFullYear() === pickerDate.getFullYear();
                          
                          return (
                            <button
                              key={day}
                              disabled={viewMode === 'settimana' && cellDate.getDay() !== 1}
                              onClick={() => {
                                const newD = new Date(pickerDate);
                                newD.setDate(day);
                                setSelectedDate(newD);
                                setIsDatePickerOpen(false);
                              }}
                              className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors ${
                                viewMode === 'settimana' && cellDate.getDay() !== 1 ? 'opacity-30 cursor-not-allowed' :
                                viewMode === 'settimana' && inWeekBounds && !isSelected ? 'bg-fuchsia-500/20 text-fuchsia-300' :
                                isSelected ? 'bg-fuchsia-600 text-white font-bold shadow-md' : 
                                isToday ? 'border border-fuchsia-500/50 text-fuchsia-400 hover:bg-zinc-100' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <button 
              onClick={() => cambiaPeriodo(1)}
              className="p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          
          <button 
            onClick={oggi}
            className="px-4 py-2 shrink-0 whitespace-nowrap text-sm font-medium text-zinc-500 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Oggi
          </button>
          
          <button 
            onClick={() => apriAggiungiSidebar()}
            className="btn-primary shrink-0 whitespace-nowrap flex items-center gap-2 bg-[#D400FF] hover:bg-[#FF3EF7] text-white px-2 xl:px-4 py-2 rounded-lg transition-colors shadow-[0_0_15px_rgba(212,0,255,0.4)] cursor-pointer ml-auto text-sm font-medium"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuovo appuntamento</span>
            <span className="sm:hidden">Nuovo</span>
          </button>
        </div>
      </div>

      {/* Barra filtri operatori (visibile solo in settimana o mese) */}
      {viewMode !== 'giorno' && (
        <div className="flex items-center gap-3 px-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 z-30">
          <span className="text-sm font-medium text-zinc-500">Filtra:</span>
          <div className="relative shrink-0">
             <div
               onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
               className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg py-1.5 px-3 shadow-sm text-sm text-zinc-700 cursor-pointer min-w-[200px] justify-between hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
             >
               <div className="flex items-center gap-2">
                 <User size={14} className="text-fuchsia-500" />
                 <span className="font-medium truncate">
                   {selectedDipendenteId === 'tutti' ? 'Tutti gli operatori' :
                    selectedDipendenteId === 'unassigned' ? 'Non assegnato' :
                    (dipendenti.find(d => d.id === selectedDipendenteId)?.nome + ' ' + dipendenti.find(d => d.id === selectedDipendenteId)?.cognome) || 'Seleziona...'}
                 </span>
               </div>
               <ChevronDown size={14} className="text-zinc-500" />
             </div>

             {isStaffMenuOpen && (
               <>
                 <div className="fixed inset-0 z-40" onClick={() => setIsStaffMenuOpen(false)}></div>
                 <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                   <div className="py-1">
                     <button
                       onClick={() => { setSelectedDipendenteId('tutti'); setIsStaffMenuOpen(false); }}
                       className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedDipendenteId === 'tutti' ? 'bg-fuchsia-50 text-fuchsia-600 font-semibold' : 'text-zinc-700 hover:bg-zinc-100'}`}
                     >
                       Tutti gli operatori
                     </button>
                     {dipendenti.length > 0 && <div className="h-px bg-zinc-200 my-1 mx-2"></div>}
                     {dipendenti.map(d => (
                       <button
                         key={d.id}
                         onClick={() => { setSelectedDipendenteId(d.id); setIsStaffMenuOpen(false); }}
                         className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedDipendenteId === d.id ? 'bg-fuchsia-50 text-fuchsia-600 font-semibold' : 'text-zinc-700 hover:bg-zinc-100'}`}
                       >
                         {d.nome} {d.cognome}
                       </button>
                     ))}
                     <div className="h-px bg-zinc-200 my-1 mx-2"></div>
                     <button
                       onClick={() => { setSelectedDipendenteId('unassigned'); setIsStaffMenuOpen(false); }}
                       className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedDipendenteId === 'unassigned' ? 'bg-fuchsia-50 text-fuchsia-600 font-semibold' : 'text-zinc-700 hover:bg-zinc-100'}`}
                     >
                       Non assegnato
                     </button>
                   </div>
                 </div>
               </>
             )}
          </div>
        </div>
      )}

      {/* Area Contenuto: colonna sinistra fissa + agenda a tutta larghezza */}
      <div className="flex gap-4 flex-1 min-h-0">
        {viewMode === 'giorno' && (
          <aside className="hidden xl:flex w-[250px] shrink-0 flex-col gap-3">
            {richieste.length > 0 && (
              <button
                onClick={() => setPannelloRichieste(true)}
                className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-left hover:bg-amber-100 transition-colors flex items-center gap-3"
              >
                <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm tabular-nums shrink-0">
                  {richieste.length}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-amber-900 leading-tight">
                    {richieste.length === 1 ? 'Richiesta da confermare' : 'Richieste da confermare'}
                  </span>
                  <span className="block text-[11px] text-amber-700">Arrivate dal sito</span>
                </span>
              </button>
            )}

            {renderCalendarioMese()}

            <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">Giornata</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-playfair font-bold text-zinc-900 tabular-nums">{appuntamenti.length}</span>
                <span className="text-[12px] text-zinc-500">appuntamenti</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-playfair font-bold text-fuchsia-600 tabular-nums">
                  {appuntamenti.reduce((acc, app) => acc + (app.righe_appuntamento?.length || 0), 0)}
                </span>
                <span className="text-[12px] text-zinc-500">servizi</span>
              </div>
            </div>

            {/* Scorciatoie: anche qui si mostrano solo le pagine concesse. */}
            {(() => {
              const scorciatoie = [
                { percorso: '/clienti', etichetta: 'Clienti', icona: Users },
                { percorso: '/prodotti', etichetta: 'Prodotti', icona: Scissors },
                { percorso: '/buoni-spa', etichetta: 'Buoni', icona: Ticket }
              ].filter(x => puoAprirePercorso(x.percorso));
              const dashboard = puoAprirePercorso('/');
              if (scorciatoie.length === 0 && !dashboard) return null;
              return (
            <div className="bg-white border border-zinc-200 rounded-xl p-2 shadow-sm flex flex-col">
              {scorciatoie.map(({ percorso, etichetta, icona: Icona }) => (
                <Link key={percorso} to={percorso} className="px-2 py-2 rounded-lg text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors flex items-center gap-2">
                  <Icona size={15} className="text-zinc-500" /> {etichetta}
                </Link>
              ))}
              {dashboard && (
                <>
                  {scorciatoie.length > 0 && <div className="h-px bg-zinc-100 my-1"></div>}
                  <Link to="/" className="px-2 py-2 rounded-lg text-[13px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors flex items-center gap-2">
                    <LayoutGrid size={15} className="text-zinc-500" /> Apri la dashboard
                  </Link>
                </>
              )}
            </div>
              );
            })()}
          </aside>
        )}

        <div className="flex-1 min-w-0">
      {error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg mb-6 flex flex-col items-start gap-2">
          <p>{error}</p>
          <button onClick={caricaAgenda} className="mt-2 text-sm font-semibold underline hover:text-red-300">Riprova connessione</button>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <p className="text-zinc-500 font-sans animate-pulse flex items-center gap-2">
            <Clock className="animate-spin" size={20} /> Recupero prenotazioni...
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${viewMode}-${selectedDate.toISOString().split('T')[0]}`}
             initial={{ opacity: 0, x: slideDirection === 'left' ? 20 : -20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: slideDirection === 'left' ? -20 : 20 }}
             transition={{ duration: 0.25, ease: "easeInOut" }}
             className="w-full"
          >
            {viewMode === 'giorno' ? (
              renderDayView()
            ) : viewMode === 'settimana' ? (
              renderWeekView()
            ) : (
              renderMonthView()
            )}
          </motion.div>
        </AnimatePresence>
      )}

        </div>
      </div>

      {/* Richieste di appuntamento arrivate dal sito */}
      {pannelloRichieste && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPannelloRichieste(false)}>
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 font-playfair">Richieste da confermare</h3>
                <p className="text-sm text-zinc-500 mt-0.5">Arrivate dal sito, in attesa di una risposta.</p>
              </div>
              <button onClick={() => setPannelloRichieste(false)} className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 flex flex-col gap-3">
              {richieste.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-6">Nessuna richiesta in attesa.</p>
              )}

              {richieste.map(r => {
                const quando = new Date(r.data_ora);
                const servizi = (r.righe_appuntamento || []).map((x: any) => x.servizi_catalogo?.nome).filter(Boolean).join(', ');
                const telefono = r.clienti?.telefono || '';
                const occupato = richiestaInCorso === r.id;

                return (
                  <div key={r.id} className="border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900">
                          {r.clienti?.nome} {r.clienti?.cognome}
                        </div>
                        <div className="text-sm text-zinc-500 truncate">{servizi || 'Servizio non indicato'}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-zinc-900 capitalize">
                          {quando.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-sm text-fuchsia-600 font-semibold tabular-nums">{formattaOrario(r.data_ora)}</div>
                      </div>
                    </div>

                    {(telefono || r.dipendenti?.nome) && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        {r.dipendenti?.nome && <span>Con {r.dipendenti.nome}</span>}
                        {telefono && <span className="font-mono">{telefono}</span>}
                      </div>
                    )}

                    {r.note && (
                      <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-lg p-2 whitespace-pre-wrap">{r.note}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        disabled={occupato}
                        onClick={() => rispondiARichiesta(r, 'conferma')}
                        className="flex-1 min-w-[110px] px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={15} /> Conferma
                      </button>
                      <button
                        disabled={occupato}
                        onClick={() => { setPannelloRichieste(false); handleEdit(r); }}
                        className="flex-1 min-w-[110px] px-3 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={15} /> Modifica
                      </button>
                      <BottoneRicontatta
                        telefono={telefono}
                        className="flex-1 min-w-[110px]"
                        messaggio={`Buongiorno ${r.clienti?.nome || ''}, la ricontatto per la sua richiesta di appuntamento.`.replace(/\s+/g, ' ')}
                      />
                      <button
                        disabled={occupato}
                        onClick={() => rispondiARichiesta(r, 'rifiuta')}
                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Rifiuta la richiesta"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conferma spostamento fuori tempo */}
      {confermaSpostamento && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-center flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2 border border-amber-200">
              <CalendarIcon size={24} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Stai andando fuori tempo</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">{confermaSpostamento.messaggio}</p>
            <p className="text-zinc-500 text-sm mb-4 leading-relaxed">Vuoi spostare comunque l'appuntamento?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={confermaSpostamento.procedi}
                className="w-full px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-sm"
              >
                Sì, sposta comunque
              </button>
              <button
                onClick={() => setConfermaSpostamento(null)}
                className="w-full px-4 py-2 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shadow-sm"
              >
                No, lascia dov'era
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Un trascinamento che può voler dire due cose: si chiede quale. */}
      {domandaSpostamento && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mx-auto mb-3 border border-fuchsia-200">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 font-playfair">{domandaSpostamento.titolo}</h3>
              <p className="text-zinc-600 text-sm mt-2 font-medium">{domandaSpostamento.domanda}</p>
            </div>

            <div className="flex flex-col gap-2">
              {domandaSpostamento.scelte.map((scelta, i) => (
                <button
                  key={i}
                  onClick={scelta.azione}
                  className={`w-full px-4 py-3 rounded-xl transition-colors shadow-sm text-left ${
                    i === 0
                      ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300'
                  }`}
                >
                  <span className="block font-bold text-sm">{scelta.etichetta}</span>
                  {scelta.nota && (
                    <span className={`block text-xs mt-0.5 ${i === 0 ? 'text-white/80' : 'text-zinc-500'}`}>
                      {scelta.nota}
                    </span>
                  )}
                </button>
              ))}

              <button
                onClick={() => setDomandaSpostamento(null)}
                className="w-full px-4 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avviso spostamento non riuscito */}
      {avvisoSpostamento && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-white border border-amber-300 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 max-w-md animate-in fade-in slide-in-from-bottom-2">
          <Shield size={18} className="text-amber-500 shrink-0" />
          <p className="text-[13px] text-zinc-500 flex-1">{avvisoSpostamento}</p>
          <button onClick={() => setAvvisoSpostamento(null)} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Slide-over side panel for agenda item additions */}
      <AggiungiCalendarioSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSaved={caricaAgenda}
        initialDate={sidebarDate}
        initialTime={sidebarTime}
        appuntamentoEdit={sidebarEditApp}
        appuntamentiEsistenti={appuntamenti}
        initialDipendenteId={sidebarDipendenteId}
      />

      {/* Sidebar Documenti e Autorizzazioni Operatore */}
      {selectedOperatorePreview && (
        <>
          <div 
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedOperatorePreview(null)}
          ></div>
          <div className="fixed inset-y-0 right-0 z-[100] w-full max-w-md bg-white border-l border-zinc-200 shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-zinc-900 text-xl font-playfair shadow-sm border border-fuchsia-500/30">
                  {selectedOperatorePreview.nome?.charAt(0)}{selectedOperatorePreview.cognome?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-playfair text-zinc-900 font-semibold leading-tight">
                    {selectedOperatorePreview.nome} {selectedOperatorePreview.cognome}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{selectedOperatorePreview.email || 'Email non assegnata'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOperatorePreview(null)}
                className="text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* Sezione Autorizzazioni */}
              <div>
                <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Shield size={16} />
                  Autorizzazioni e accesso
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Ruolo</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${selectedOperatorePreview.ruolo === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-zinc-100 text-zinc-700 border border-zinc-300'}`}>
                        {selectedOperatorePreview.ruolo || 'Dipendente'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white border border-zinc-200 rounded-lg p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Stato</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize flex items-center gap-1 ${selectedOperatorePreview.attivo ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedOperatorePreview.attivo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {selectedOperatorePreview.attivo ? 'Attivo' : 'Sospeso'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sezione Documenti */}
              <div>
                <h3 className="text-sm font-bold text-fuchsia-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <FileText size={16} />
                  Documenti personali
                </h3>
                
                {selectedOperatorePreview.id !== 'unassigned' ? (
                  <div className="space-y-3">
                    {[
                      { nome: 'Documento d\'Identità.pdf', data: '12/03/2026', tipo: 'Identità' },
                      { nome: 'Contratto_Assunzione.pdf', data: '01/01/2026', tipo: 'Contratto' },
                      { nome: 'Attestato_Sicurezza.pdf', data: '15/05/2026', tipo: 'Formazione' }
                    ].map((doc, i) => (
                      <div key={i} className="group relative flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center text-zinc-500 group-hover:text-fuchsia-400 transition-colors">
                            <FileText size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-800">{doc.nome}</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{doc.tipo} • Caricato il {doc.data}</p>
                          </div>
                        </div>
                        <button className="text-zinc-500 hover:text-fuchsia-400 p-2 bg-white rounded-md transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                    <p className="text-sm text-zinc-500">Nessun documento caricato.</p>
                  </div>
                )}
              </div>

            </div>
            
            <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex justify-end mt-auto">
              <button 
                onClick={() => setSelectedOperatorePreview(null)}
                className="px-6 py-2 bg-zinc-100 text-zinc-900 font-semibold rounded-lg hover:bg-white transition-colors text-sm shadow-sm"
              >
                Chiudi scheda
              </button>
            </div>
          </div>
        </>
      )}

      {/* Alert Orari Lavoro Notifica */}
      {alertOrari.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-center flex flex-col gap-3 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-zinc-900">Ora non disponibile</h3>
            <p className="text-zinc-500 text-sm mb-2 leading-relaxed">
              L'operatore non lavora in questa fascia oraria.<br />
              Seleziona un orario diverso o modifica gli orari.
            </p>
            <button 
              onClick={() => setAlertOrari({show: false})}
              className="w-full px-4 py-2 font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors shadow-sm"
             >
              Ok, compreso
             </button>
             <button 
              onClick={() => {
                apriAggiungiSidebar(alertOrari.date, alertOrari.timeStr);
                setAlertOrari({show: false});
              }}
              className="w-full px-4 py-2 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shadow-sm"
             >
              Inserisci lo stesso
             </button>
             <Link 
              to="/dipendenti"
              className="w-full px-4 py-2 font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors shadow-sm"
             >
              Modifica orario
             </Link>
          </div>
        </div>
      )}

      {/* Complete Appuntamento Modal */}
      {/* Fine appuntamento: preconto, poi quello che resta scritto. */}
      {completaAppModal.show && completaAppModal.app && (
        <ChiusuraAppuntamento
          app={completaAppModal.app}
          nomeSalone={nomeSalone}
          onChiudi={() => setCompletaAppModal({ show: false, app: null, data: { importo: '', note: '', colori: '' } })}
          onCompletato={() => {
            setCompletaAppModal({ show: false, app: null, data: { importo: '', note: '', colori: '' } });
            caricaAgenda();
          }}
        />
      )}

    </div>
  </div>
  );
}

// Ogni appuntamento ha il suo colore, sempre lo stesso. Serve quando i servizi
// finiscono a operatrici diverse: i pezzi stanno in colonne lontane, ma il
// colore dice a colpo d'occhio che è la stessa cliente.
const COLORI_APPUNTAMENTO = [
  { fondo: 'bg-indigo-50',  bordo: 'border-[#6B5CFF]', filo: 'border-[#6B5CFF]' },
  { fondo: 'bg-fuchsia-50', bordo: 'border-[#D400FF]', filo: 'border-[#D400FF]' },
  { fondo: 'bg-cyan-50',    bordo: 'border-[#00A9C7]', filo: 'border-[#00A9C7]' },
  { fondo: 'bg-rose-50',    bordo: 'border-rose-400',  filo: 'border-rose-400' },
  { fondo: 'bg-violet-50',  bordo: 'border-violet-400', filo: 'border-violet-400' },
  { fondo: 'bg-teal-50',    bordo: 'border-teal-400',  filo: 'border-teal-400' },
];

function coloreAppuntamento(id: string) {
  let somma = 0;
  for (let i = 0; i < (id || '').length; i++) somma = (somma * 31 + id.charCodeAt(i)) % 100000;
  return COLORI_APPUNTAMENTO[somma % COLORI_APPUNTAMENTO.length];
}

function MicroAppCard({ app, spezzone, inizioMs, formattaOrario, durata, onDelete, onEdit, onComplete, isAbsolute, pixelPerMinute, startOffset, idx = 0, colIndex = 0, colTotal = 1, evidenziato = false, onEvidenzia, onDragStartServizio, onDragEndApp, isDragging = false }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isBlock = app.stato === 'annullato';
  const isCompleted = app.stato === 'completato';
  const isInAttesa = app.stato === 'in_attesa';

  const heightPixels = durata * (pixelPerMinute || 2);
  const isCompact = heightPixels < 50;
  const isUltraCompact = heightPixels < 25;

  const tinta = coloreAppuntamento(app.id);

  let bgClass = '';
  if (isBlock) {
    bgClass = 'bg-zinc-100 border-l-4 border-zinc-300 text-zinc-500';
  } else if (isInAttesa) {
    // Richiesta dal sito non ancora confermata
    bgClass = 'bg-amber-50 border-l-4 border-amber-400 text-zinc-700';
  } else if (isCompleted) {
    bgClass = 'bg-emerald-50 border-l-4 border-emerald-500 text-zinc-400';
  } else {
    bgClass = `${tinta.fondo} border-l-4 ${tinta.bordo}`;
  }

  // In rilievo sia col mouse sopra, sia quando è sopra un altro pezzo dello
  // stesso appuntamento: è così che si vede che sono la stessa cliente.
  const inRilievo = isHovered || menuOpen || evidenziato;

  // La card è stretta solo quando divide la colonna con un'altra: in quel caso
  // al passaggio del mouse si allarga per farsi leggere.
  const stretta = colTotal > 1;

  // L'altezza NON cambia mai: prima, passandoci sopra, la card diventava alta
  // quanto il testo e si accorciava, dando l'impressione che ballasse. Adesso
  // resta ancorata al suo orario, e per andare in evidenza le bastano l'ombra,
  // il contorno e il salire davanti alle altre.
  const dynamicStyle = isAbsolute ? {
    position: 'absolute' as const,
    top: `${startOffset || 0}px`,
    left: inRilievo && stretta ? '2px' : `calc(${(colIndex / colTotal) * 100}% + 2px)`,
    width: inRilievo && stretta ? 'calc(100% - 4px)' : `calc(${(1 / colTotal) * 100}% - 4px)`,
    height: `${heightPixels}px`,
    zIndex: inRilievo ? 9999 : 10 + idx,
    opacity: isDragging ? 0.4 : 1
  } : {};

  // I segmenti di QUESTO pezzo: se il colore lo fa una e la piega un'altra,
  // ogni colonna mostra solo la propria parte.
  // Senza spezzone (vista settimana ed elenco) si mostra l'appuntamento intero.
  const segments = spezzone?.segmenti || segmentiAppuntamento(app.righe_appuntamento || []);
  const spanTotale = durata || segments.reduce((acc: any, s: any) => acc + s.durata, 0) || 30;
  const oraPezzo = inizioMs ? new Date(inizioMs).toISOString() : app.data_ora;

  // Nome e cognome per intero: sulla card si taglia con i puntini, ma resta
  // leggibile fermando il mouse sopra (è il testo del `title`).
  const nomeCompleto = [app.clienti?.nome, app.clienti?.cognome].filter(Boolean).join(' ') || 'Cliente';

  const accendi = (acceso: boolean) => {
    setIsHovered(acceso);
    if (onEvidenzia) onEvidenzia(acceso ? app.id : null);
  };

  const cardContainerClasses = `w-full group/mini flex flex-col transition-[left,width,box-shadow] duration-150 ${isAbsolute ? 'pointer-events-none' : 'relative mb-1'} ${inRilievo ? 'drop-shadow-xl' : ''}`;

  return (
    <div
      style={dynamicStyle}
      className={cardContainerClasses}
      onMouseEnter={() => accendi(true)}
      onMouseLeave={() => accendi(false)}
    >
       {/* Menù azioni */}
       <button
         onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setShowConfirmDelete(false); }}
         className={`absolute top-1 right-1 opacity-0 group-hover/mini:opacity-100 p-1 text-zinc-500 hover:text-zinc-900 bg-white/90 hover:bg-zinc-100 rounded border border-zinc-200 transition-all z-[9999] pointer-events-auto ${isUltraCompact && !inRilievo ? 'hidden' : ''}`}
       >
         <MoreVertical size={12} />
       </button>

       {menuOpen && (
         <div className="absolute top-6 right-1 bg-white border border-zinc-200 rounded shadow-2xl z-[99999] flex flex-col w-36 overflow-hidden animate-in fade-in zoom-in duration-100 pointer-events-auto"
              onMouseLeave={() => setMenuOpen(false)}>
            {/* Anche su un appuntamento già chiuso: serve a rivedere il conto
                quando ci si accorge di aver sbagliato un importo. */}
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if(onComplete) onComplete(app); }}
              className="px-2 py-2 text-[10px] text-emerald-600 hover:bg-zinc-50 flex items-center gap-2 transition-colors text-left font-medium"
            >
              <CheckCircle2 size={10} /> {isCompleted ? 'Rivedi il conto' : 'Completato'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if(onEdit) onEdit(app); }}
              className="px-2 py-2 text-[10px] text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors text-left font-medium border-t border-zinc-100"
            >
              <Edit2 size={10} /> Modifica
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); setMenuOpen(false); }}
              className="px-2 py-2 text-[10px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors text-left font-medium border-t border-zinc-100"
            >
              <Trash2 size={10} /> Elimina
            </button>
         </div>
       )}

       {/* Conferma eliminazione: dialogo al centro, così non sparisce
           muovendo il mouse come succedeva nel menù piccolo. */}
       {showConfirmDelete && (
         <div
           className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 pointer-events-auto"
           onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}
         >
           <div
             className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
             onClick={(e) => e.stopPropagation()}
           >
             <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-1 border border-red-200">
               <Trash2 size={22} />
             </div>
             <h3 className="text-lg font-bold text-zinc-900 font-playfair">Elimini l'appuntamento?</h3>
             <p className="text-zinc-600 text-sm leading-relaxed">
               {nomeCompleto} — {formattaOrario(app.data_ora)}
             </p>
             <p className="text-zinc-500 text-sm mb-3">L'operazione non si può annullare.</p>
             <div className="flex flex-col gap-2">
               <button
                 onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); onDelete(app.id); }}
                 className="w-full px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors shadow-sm"
               >
                 Sì, elimina
               </button>
               <button
                 onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}
                 className="w-full px-4 py-2 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shadow-sm"
               >
                 No, annulla
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Le tre fasi: lavorazione piena, posa lasciata libera, finitura piena */}
       <div className="flex flex-col w-full h-full">
         {segments.map((seg: any, i: number) => {
           const altezza = `${(seg.durata / spanTotale) * 100}%`;
           const isPrimo = seg.inizio === 0;

           if (seg.tipo === 'posa') {
             // Posa: l'operatore è libero, quindi questo spazio deve SEMBRARE
             // libero. Niente fondo, niente righine, niente bordi: si vede la
             // griglia sotto come in qualsiasi buco dell'agenda, e i clic ci
             // passano attraverso, così ci si fissa dentro un'altra cliente.
             // A tenere insieme le due metà dell'appuntamento basta un filo
             // tratteggiato sul bordo, dello stesso colore della card.
             return (
               <div
                 key={i}
                 style={{ height: altezza }}
                 className="w-full relative pointer-events-none overflow-hidden"
                 title={`Posa ${seg.durata} min — qui l'operatore è libero, ci si può fissare un'altra cliente`}
               >
                 <div className={`absolute left-0 top-0 bottom-0 border-l-2 border-dashed transition-colors ${inRilievo ? tinta.filo : 'border-zinc-300'}`}></div>
                 {!isCompact && (
                   <span className="absolute left-2.5 top-0.5 text-[9px] text-zinc-400 leading-none whitespace-nowrap">
                     posa · libero {seg.durata}′
                   </span>
                 )}
               </div>
             );
           }

           return (
             <div
               key={i}
               draggable={isAbsolute && !isCompleted}
               onDragStart={(e) => {
                 e.dataTransfer.setData('text/appuntamento', app.id);
                 e.dataTransfer.effectAllowed = 'move';
                 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                 // Si trascina IL SERVIZIO, non per forza tutto l'appuntamento:
                 // il riferimento è l'inizio di questo blocco, non quello
                 // dell'appuntamento, altrimenti gli orari mostrati sbagliano.
                 if (onDragStartServizio) onDragStartServizio(seg.indiceRiga ?? 0, seg.fase || 'lavorazione', e.clientY - rect.top, seg.inizio);
               }}
               onDragEnd={() => { if (onDragEndApp) onDragEndApp(); }}
               onClick={(e) => { e.stopPropagation(); if (onEdit) onEdit(app); }}
               title={`${nomeCompleto} — ${formattaOrario(oraPezzo)} · ${seg.nome} · ${seg.durata} min`}
               style={{ height: altezza }}
               className={`w-full flex flex-col px-1.5 py-1 overflow-hidden ring-inset ${inRilievo ? `ring-2 ${tinta.bordo.replace('border-', 'ring-')}` : 'ring-1 ring-zinc-200'} ${bgClass} shadow-sm pointer-events-auto cursor-grab active:cursor-grabbing ${isPrimo ? 'rounded-tr-md' : 'rounded-br-md'} ${isCompact ? 'justify-start' : 'justify-between'}`}
             >
               {/* Il nome sta su OGNI blocco, non solo sul primo: con colore, posa
                   e piega, chi guarda la piega deve capire di chi è senza
                   risalire in alto. Per intero, tagliato con i puntini se non
                   ci sta, e leggibile fermandoci sopra il mouse. */}
               <div className="flex flex-col text-left min-w-0">
                 <span className={`font-bold text-[10px] sm:text-xs truncate ${isBlock ? 'text-zinc-500' : 'text-zinc-900'}`}>
                   {isPrimo && !isUltraCompact ? `${formattaOrario(oraPezzo)} ` : ''}
                   {nomeCompleto}
                 </span>
                 <span className={`text-[9px] sm:text-[10px] truncate leading-tight ${isBlock || isCompleted ? 'text-zinc-500' : 'text-zinc-600'}`}>
                   {isPrimo && isInAttesa ? 'Da confermare · ' : ''}{seg.nome} · {seg.durata}′
                 </span>
               </div>

               {isPrimo && !isCompact && app.note && (
                 <div className="mt-1 text-[9px] text-zinc-500 break-words whitespace-pre-wrap leading-tight line-clamp-1 group-hover/mini:line-clamp-none">
                   {app.note}
                 </div>
               )}
             </div>
           );
         })}
       </div>
    </div>
  );
}
