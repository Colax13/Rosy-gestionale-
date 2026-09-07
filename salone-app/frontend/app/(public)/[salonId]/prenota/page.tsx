"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar as CalendarIcon, User, Clock, CheckCircle2, Scissors, ArrowLeft, ArrowRight, MapPin, ChevronRight, Sparkles, X, ChevronDown, Check } from 'lucide-react';
import { auth, db } from '../../../../../../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { catalogoApi, dipendentiApi, appuntamentiApi } from '@/lib/api-client';

interface Servizio {
  id: string;
  nome: string;
  prezzo_base: number;
  durata_minuti: number;
  categoria: string;
  note_pubbliche?: string;
  attivo?: boolean;
}

export default function PrenotazionePubblica() {
  const params = useParams();
  const salonId = params?.salonId as string;

  const [salonName, setSalonName] = useState('Salone Predefinito');
  // In a real flow, this would come from the salon's configuration.
  const [salonImage, setSalonImage] = useState('https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop');
  const [salonLogo, setSalonLogo] = useState('');
  const [step, setStep] = useState<'welcome' | 'services' | 'operator' | 'datetime' | 'details' | 'success'>('welcome');
  
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  const [customerName, setCustomerName] = useState('');
  const [customerSurname, setCustomerSurname] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [catalog, setCatalog] = useState<Servizio[]>([]);
  const [operatorsData, setOperatorsData] = useState<any[]>([]);
  const [appointmentsData, setAppointmentsData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (salonId) {
      // Clean fallback if nomeSalone is not found
      setSalonName('Il Tuo Salone');
    }
  }, [salonId]);

  useEffect(() => {
    if (salonId) {
      catalogoApi.getPublic(salonId)
        .then((data) => setCatalog(data.filter((s: Servizio) => s.attivo)))
        .catch(err => console.error("Errore catalogo:", err));
      dipendentiApi.getPublic(salonId)
        .then((data) => setOperatorsData(data.filter((d: any) => d.attivo !== false)))
        .catch(err => console.error("Errore dipendenti:", err));
      appuntamentiApi.getAgendaPublic(salonId)
        .then((data) => setAppointmentsData(data))
        .catch(err => console.error("Errore agenda:", err));
    }
  }, [salonId]);

  useEffect(() => {
    if (salonId) {
      const loadRealSalon = async () => {
        try {
          const docRef = doc(db, 'salons', salonId);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data().salonDetails) {
            const details = snap.data().salonDetails;
            if (details.nomeSalone) {
              setSalonName(details.nomeSalone);
            }
            if (details.logoUrl) {
              setSalonLogo(details.logoUrl);
            }
          }
        } catch(e) {
          console.error("Error fetching salon details: ", e);
        }
      };
      loadRealSalon();
    }
  }, [salonId]);

  const catalogByCategory = catalog.reduce((acc, current) => {
    const cat = current.categoria || 'Altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(current);
    return acc;
  }, {} as Record<string, Servizio[]>);

  const categories = Object.keys(catalogByCategory);

  const [dates, setDates] = useState<{ full: Date; display: string, short: string }[]>([]);

  const operators = [{ id: 'any', nome: 'Qualsiasi operatore' }, ...operatorsData.map(o => ({ id: o.id, nome: o.nome }))];
  // Calculate available times based on date and operator
  const getGiornoString = (d: Date) => {
    const map = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
    return map[d.getDay()];
  };

  const availableTimes = React.useMemo(() => {
     if (!selectedDate || operatorsData.length === 0) return [];
     
     const dateObj = dates.find(d => d.display === selectedDate);
     if (!dateObj) return [];
     
     const service = catalog.find(item => item.id === selectedServiceId);
     const duration = service ? service.durata_minuti : 30;
     
     const opId = selectedOperator === 'Qualsiasi operatore' ? 'any' : (operators.find(o => o.nome === selectedOperator)?.id || 'any');

     const giornoStr = getGiornoString(dateObj.full);
     const availableSlots = new Set<string>();

     let opsToCheck = operatorsData;
     if (opId !== 'any') {
        opsToCheck = operatorsData.filter(o => o.id === opId);
     }

     for (let op of opsToCheck) {
        const turni = op.turni || {};
        let turnoOggi = turni[giornoStr];
        
        // Se non ci sono turni configurati affatto per questo operatore, assumiamo un orario di default 09:00 - 18:00
        if (!op.turni || Object.keys(op.turni).length === 0) {
           // Domenica e Lunedì chiusi di default
           if (giornoStr !== 'domenica' && giornoStr !== 'lunedi') {
              turnoOggi = {
                 attivo: true,
                 tipo: 'lavoro',
                 fasce: [{ inizio: '09:00', fine: '18:00' }]
              };
           }
        }

        if (!turnoOggi || !turnoOggi.attivo || turnoOggi.tipo !== 'lavoro') continue;
        
        for (let fascia of (turnoOggi.fasce || [])) {
           if (!fascia.inizio || !fascia.fine) continue;
           
           let [hIn, mIn] = fascia.inizio.split(':').map(Number);
           let [hOut, mOut] = fascia.fine.split(':').map(Number);
           
           let currentTimeInMins = hIn * 60 + mIn;
           const endTimeInMins = hOut * 60 + mOut;

           while (currentTimeInMins + duration <= endTimeInMins) {
              const candidateStart = new Date(dateObj.full);
              candidateStart.setHours(Math.floor(currentTimeInMins / 60), currentTimeInMins % 60, 0, 0);
              
              const myStartMs = candidateStart.getTime();
              const myEndMs = myStartMs + (duration * 60000);
              
              const hasOverlap = appointmentsData.some(es => {
                 if (es.id_dipendente !== op.id) return false;
                 const esStartMs = new Date(es.data_ora).getTime();
                 const esDurata = es.righe_appuntamento?.reduce((acc:any, riga:any) => acc + (parseInt(riga.servizi_catalogo?.durata_minuti) || 0), 0) || 30;
                 const esEndMs = esStartMs + (esDurata * 60000);
                 return (myStartMs < esEndMs && myEndMs > esStartMs);
              });

              if (!hasOverlap && myStartMs > Date.now()) {
                 const hh = String(Math.floor(currentTimeInMins / 60)).padStart(2, '0');
                 const mm = String(currentTimeInMins % 60).padStart(2, '0');
                 availableSlots.add(`${hh}:${mm}`);
              }

              currentTimeInMins += 30;
           }
        }
     }
     
     return Array.from(availableSlots).sort();
  }, [selectedDate, selectedServiceId, selectedOperator, operators, operatorsData, appointmentsData, dates, catalog]);

  
  useEffect(() => {
    if (operatorsData.length === 0) return;
    const arr = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
       const d = new Date(today);
       d.setDate(d.getDate() + i);
       
       arr.push({
         full: d,
         display: i === 0 ? 'Oggi' : i === 1 ? 'Domani' : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }),
         short: i === 0 ? 'Oggi' : i === 1 ? 'Domani' : d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
       });
    }
    setDates(arr);
  }, [operatorsData]);

  const handleBook = async () => {
    setIsSubmitting(true);
    try {
      const service = catalog.find(item => item.id === selectedServiceId);
      const dateObj = dates.find(d => d.display === selectedDate);
      if (!service || !dateObj) return;

      const [hours, minutes] = selectedTime.split(':');
      const startDateTime = new Date(dateObj.full);
      startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      let opId = operators.find(o => o.nome === selectedOperator)?.id;
      if (opId === 'any') {
         // assign a free operator
         const myStartMs = startDateTime.getTime();
         const myEndMs = myStartMs + (service.durata_minuti * 60000);
         const opIds = operatorsData.map(o => o.id);
         const firstFreeOp = opIds.find(candidateOpId => {
               return !appointmentsData.some(es => {
                  if (es.id_dipendente !== candidateOpId) return false;
                  const esStartMs = new Date(es.data_ora).getTime();
                  const esDurata = es.righe_appuntamento?.reduce((acc:any, riga:any) => acc + (parseInt(riga.servizi_catalogo?.durata_minuti) || 0), 0) || 30;
                  const esEndMs = esStartMs + (esDurata * 60000);
                  return (myStartMs < esEndMs && myEndMs > esStartMs);
               });
         });
         opId = firstFreeOp || operatorsData[0]?.id; // Fallback
      }

      await appuntamentiApi.createPublic(salonId, {
         data_ora: startDateTime.toISOString(),
         note: customerNotes,
         stato: 'in_attesa',
         clienti: {
            nome: customerName,
            cognome: customerSurname,
            telefono: customerPhone,
            email: customerEmail
         },
         id_dipendente: opId,
         dipendenti: {
            nome: operators.find(o => o.id === opId)?.nome || selectedOperator,
            cognome: ''
         },
         righe_appuntamento: [{
            servizi_catalogo: {
               nome: service.nome,
               durata_minuti: service.durata_minuti,
               prezzo_base: service.prezzo_base
            }
         }]
      });
      setStep('success');
    } catch (e) {
      console.error(e);
      alert('Errore durante la prenotazione.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPrice = () => {
    if (!selectedServiceId) return '';
    const s = catalog.find(item => item.id === selectedServiceId);
    return s ? `${s.prezzo_base.toFixed(2)}€` : '';
  };

  const getDuration = () => {
    if (!selectedServiceId) return '';
    const s = catalog.find(item => item.id === selectedServiceId);
    return s ? `${s.durata_minuti} min` : '';
  };

  // Header progress logic
  const stepsList = ['services', 'operator', 'datetime', 'details'];
  const currentStepIndex = stepsList.indexOf(step as any);

  return (
    <div className="h-[100dvh] bg-[#f8f8fb] font-sans text-slate-900 flex flex-col relative w-full overflow-hidden">
      
      {/* Dynamic Background Image - Glassmorphism style */}
      {['welcome', 'success'].includes(step) && (
        <div className="absolute inset-0 z-0 pointer-events-none h-[40dvh] md:h-[50dvh] w-full origin-top">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#f8f8fb] z-10"></div>
          <img src={salonImage} alt="Salon Background" className="w-full h-full object-cover object-top opacity-90" />
        </div>
      )}

      {/* Persistent Elegant Header (Hidden on welcome/success) */}
      {!['welcome', 'success'].includes(step) && (
        <header className="relative z-20 w-full pt-6 pb-2 px-4 md:px-8 max-w-3xl mx-auto flex flex-col pt-[max(env(safe-area-inset-top),1.5rem)]">
          <div className="flex items-center justify-between text-slate-800 mb-4">
            <button 
              onClick={() => {
                if (step === 'services') setStep('welcome');
                else if (step === 'operator') setStep('services');
                else if (step === 'datetime') setStep('operator');
                else if (step === 'details') setStep('datetime');
              }}
              className="p-2 -ml-2 rounded-full bg-slate-200/50 hover:bg-slate-200 transition-all border border-slate-300/50"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-center">
              <h1 className="text-sm font-semibold tracking-wide uppercase opacity-90">{salonName}</h1>
            </div>
            <div className="w-9 h-9"></div> {/* Spacer to center the title */}
          </div>
          
          {/* Minimalist Progress Indicator */}
          <div className="w-full flex gap-1.5 px-4 animate-in fade-in duration-500">
            {stepsList.map((s, idx) => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full flex-1 transition-all duration-500 ease-out ${idx <= currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} 
              />
            ))}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-3xl mx-auto flex flex-col relative z-20 h-full">
        
        {step === 'welcome' && (
          <div className="flex-1 flex flex-col justify-end p-6 pb-[max(env(safe-area-inset-bottom),2rem)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white/80 backdrop-blur-xl border border-white/40 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden ring-1 ring-black/5">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles size={120} />
              </div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl -rotate-2 overflow-hidden">
                {salonLogo ? (
                  <img src={salonLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Scissors size={28} />
                )}
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-slate-900 leading-tight">
                Prenota da<br/>{salonName}
              </h2>
              <p className="text-slate-600 mb-8 text-base leading-relaxed max-w-sm">
                Scegli il tuo trattamento, l'operatore che preferisci e goditi l'esperienza.
              </p>
              
              <button 
                onClick={() => setStep('services')}
                className="w-full bg-slate-900 hover:bg-black text-white px-8 py-5 rounded-[1.25rem] font-semibold transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] flex items-center justify-between group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="relative z-10 text-lg">Inizia prenotazione</span>
                <div className="relative z-10 bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 'services' && (
          <div className="flex-1 min-h-0 flex flex-col pt-4 px-2 pb-6 animate-in slide-in-from-right-8 duration-500 fade-in h-full overflow-hidden">
            <div className="bg-white mx-2 mt-2 rounded-[2rem] shadow-xl p-6 md:p-8 flex-1 min-h-0 border border-slate-100 flex flex-col mb-16 overflow-hidden">
              <h2 className="text-2xl font-bold tracking-tight mb-1">Quale servizio desideri?</h2>
              <p className="text-slate-500 text-sm mb-6">Scegli la categoria e seleziona il trattamento.</p>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar space-y-8 pb-32">
                {categories.length > 0 ? categories.map((cat) => (
                  <div key={cat} className="space-y-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5 px-1">{cat}</h3>
                    <div className="space-y-2.5">
                      {catalogByCategory[cat].map(s => {
                        const isSelected = selectedServiceId === s.id;
                        return (
                          <div 
                            key={s.id}
                            onClick={() => { setSelectedServiceId(s.id); setSelectedService(s.nome); }}
                            className={`p-4 rounded-[1.25rem] cursor-pointer transition-all border-2 ${isSelected ? 'bg-indigo-50/50 border-indigo-600 shadow-sm ring-4 ring-indigo-50/50' : 'bg-white border-slate-100 hover:border-slate-300'} flex items-start justify-between gap-4`}
                          >
                            <div className="flex-1">
                              <h4 className={`font-semibold text-[15px] ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{s.nome}</h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                                  <Clock size={12} /> {s.durata_minuti} min
                                </span>
                                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                                  {s.prezzo_base > 0 ? `€ ${s.prezzo_base.toFixed(2)}` : 'Variabile'}
                                </span>
                              </div>
                              {s.note_pubbliche && (
                                <p className="text-[11px] text-slate-400 mt-2.5 italic leading-snug">{s.note_pubbliche}</p>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 scale-110' : 'border-slate-300'}`}>
                              {isSelected && <Check size={14} className="text-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <div className="py-12 px-6 bg-slate-50 rounded-3xl text-center text-slate-500 border border-slate-100 border-dashed m-4">
                    <Scissors size={32} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium text-sm">Nessun servizio disponibile nel listino online.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Bottom Bar Action */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 flex justify-center z-30 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="w-full max-w-3xl flex gap-3 px-2">
                <button 
                  onClick={() => setStep('operator')}
                  disabled={!selectedServiceId}
                  className="w-full bg-slate-900 hover:bg-black disabled:opacity-40 disabled:hover:bg-slate-900 text-white px-6 py-4.5 rounded-[1.25rem] font-bold transition-all shadow-xl shadow-slate-900/10 flex justify-center items-center gap-2 text-[15px]"
                >
                  {selectedServiceId ? `Continua` : 'Seleziona servizio'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'operator' && (
          <div className="flex-1 min-h-0 flex flex-col pt-4 px-2 pb-6 animate-in slide-in-from-right-8 duration-500 fade-in h-full overflow-hidden">
            <div className="bg-white mx-2 mt-2 rounded-[2rem] shadow-xl p-6 md:p-8 flex-1 min-h-0 border border-slate-100 flex flex-col mb-16 overflow-hidden">
              
              {/* Selected Recap Chip */}
              <div className="inline-flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl mb-6 self-start text-xs font-semibold text-slate-600 border border-slate-200/80 shadow-sm">
                <span className="truncate max-w-[150px] sm:max-w-xs">{selectedService}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-slate-500 font-medium">{getDuration()}</span>
                <button onClick={() => setStep('services')} className="ml-2 text-slate-400 hover:text-slate-800 bg-white shadow-sm p-1 rounded-full transition-all"><X size={12}/></button>
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-2">Chi preferisci?</h2>
              <p className="text-slate-500 text-sm mb-6">Scegli il tuo collaboratore di fiducia o lascia fare a noi.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pb-32 pr-2 -mr-2 custom-scrollbar">
                {operators.map((opObj, i) => {
                  const op = opObj.nome;
                  const isSelected = selectedOperator === op;
                  const isAny = op === 'Qualsiasi operatore';
                  return (
                    <button 
                      key={opObj.id} 
                      onClick={() => setSelectedOperator(op)}
                      className={`p-4 rounded-[1.25rem] cursor-pointer transition-all border-2 flex items-center gap-4 text-left ${isSelected ? 'bg-indigo-50/50 border-indigo-600 shadow-sm ring-4 ring-indigo-50/50' : 'bg-white border-slate-100 hover:border-slate-300'} ${i === 0 ? 'sm:col-span-2 bg-slate-50/50' : ''}`}
                    >
                      <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 shadow-inner ${isAny ? 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600' : 'bg-gradient-to-br from-indigo-100 to-fuchsia-100 text-indigo-900 border border-indigo-200/50'}`}>
                        {isAny ? <Sparkles size={20} /> : <span className="text-xl font-bold font-serif">{op.charAt(0)}</span>}
                      </div>
                      <div className="flex-1">
                        <div className={`text-[15px] font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{op}</div>
                        {!isAny && <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Operatore</div>}
                        {isAny && <div className="text-[12px] text-slate-500 leading-tight mt-0.5">La prima disponibilità utile per te.</div>}
                      </div>
                      
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 scale-110' : 'border-slate-300'}`}>
                         {isSelected && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 flex justify-center z-30 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="w-full max-w-3xl flex gap-3 px-2">
                <button 
                  onClick={() => setStep('datetime')}
                  disabled={!selectedOperator}
                  className="w-full bg-slate-900 hover:bg-black disabled:opacity-40 text-white px-6 py-4.5 rounded-[1.25rem] font-bold transition-all shadow-xl text-[15px]"
                >
                  Scegli orario
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'datetime' && (
          <div className="flex-1 min-h-0 flex flex-col pt-4 px-2 pb-0 animate-in slide-in-from-right-8 duration-500 fade-in h-full overflow-hidden">
            <div className="bg-white mx-2 mt-2 rounded-[2rem] shadow-xl p-6 md:p-8 flex-1 min-h-0 border border-slate-100 flex flex-col pb-32 overflow-hidden">
              
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="inline-flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/80 shadow-sm">
                  <span className="truncate max-w-[120px]">{selectedService}</span>
                  <button onClick={() => setStep('services')} className="ml-1 text-slate-400 hover:text-slate-800 bg-white shadow-sm p-1 rounded-full"><X size={12}/></button>
                </div>
                <div className="inline-flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200/80 shadow-sm">
                  <span className="truncate max-w-[120px]">{selectedOperator}</span>
                  <button onClick={() => setStep('operator')} className="ml-1 text-slate-400 hover:text-slate-800 bg-white shadow-sm p-1 rounded-full"><X size={12}/></button>
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight mb-2">Quando ti fa comodo?</h2>
              
              {/* DATE SCROLLER */}
              <div className="mt-6 mb-8 -mx-6 md:-mx-8">
                 <div className="flex gap-3 overflow-x-auto px-6 md:px-8 pb-4 pt-2 custom-scrollbar snap-x">
                   {dates.map(d => {
                     const isSelected = selectedDate === d.display;
                     return (
                       <button 
                         key={d.full.toISOString()} 
                         onClick={() => { setSelectedDate(d.display); setSelectedTime(''); }}
                         className={`snap-start relative shrink-0 flex flex-col items-center justify-center p-3 w-[76px] h-[92px] rounded-[1.25rem] transition-all border-2 ${isSelected ? 'bg-slate-900 border-slate-900 shadow-md text-white scale-105' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-800'}`}
                       >
                         {['Oggi', 'Domani'].includes(d.display) ? (
                            <span className="font-bold text-[15px]">{d.display}</span>
                         ) : (
                            <>
                              <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{d.short.split(' ')[0]}</span>
                              <span className={`text-2xl font-black -mt-1 tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>{d.full.getDate()}</span>
                            </>
                         )}
                         {/* Fake availability dot */}
                         {d.full.getDate() % 2 === 0 && !isSelected && (
                            <div className="absolute bottom-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                         )}
                       </button>
                     )
                   })}
                 </div>
              </div>

              {/* TIME GRID */}
              <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar pb-16">
                 {selectedDate ? (
                     <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                       {availableTimes.length > 0 ? availableTimes.map((t, idx) => {
                         const isSelected = selectedTime === t;
                         return (
                           <button 
                             key={t} 
                             onClick={() => setSelectedTime(t)}
                             className={`py-3.5 border-2 rounded-xl text-center text-[15px] font-bold transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-4 ring-indigo-50/50 scale-[1.02]' : 'bg-white border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                           >
                             {t}
                           </button>
                         )
                       }) : (
                         <div className="col-span-3 sm:col-span-4 text-center py-8 text-slate-400">
                           Nessun orario disponibile per questa data.
                         </div>
                       )}
                     </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
                      <CalendarIcon size={32} className="mb-4 opacity-30" />
                      <p className="text-sm font-medium">Scorri e seleziona un giorno in alto<br/>per vedere gli orari disponibili.</p>
                    </div>
                 )}
              </div>
            </div>
            
            {/* Fixed Bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 flex justify-center z-30 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="w-full max-w-3xl flex gap-3 px-2">
                <button 
                   onClick={() => setStep('details')}
                   disabled={!selectedDate || !selectedTime}
                   className="w-full bg-slate-900 hover:bg-black disabled:opacity-40 text-white px-6 py-4.5 rounded-[1.25rem] font-bold transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 text-[15px]"
                >
                   {selectedTime ? `Conferma ore ${selectedTime}` : 'Seleziona orario'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="flex-1 min-h-0 flex flex-col pt-4 px-2 pb-0 animate-in slide-in-from-right-8 duration-500 fade-in h-full overflow-hidden">
            <div className="bg-white mx-2 mt-2 rounded-[2rem] shadow-xl p-6 md:p-8 flex-1 min-h-0 border border-slate-100 flex flex-col pb-32 overflow-hidden">
              
              <button 
                onClick={() => setStep('datetime')} 
                className="inline-flex items-center gap-2 self-start text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 mb-6 py-1.5 px-3 rounded-lg bg-slate-50/50 border border-slate-100 transition-colors"
               >
                <ArrowLeft size={14} /> Modifica
              </button>
              
              <div className="overflow-y-auto pr-2 -mr-2 custom-scrollbar pb-16">
                <h2 className="text-2xl font-bold tracking-tight mb-2">I tuoi dettagli</h2>
                <p className="text-slate-500 text-sm mb-6">Completa con i tuoi dati per finalizzare la prenotazione.</p>
                
                {/* Elegant Recap Card */}
                <div className="bg-[#f8f8fb] rounded-[1.25rem] p-5 mb-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                   <div className="flex justify-between items-start mb-3">
                     <div className="pl-1">
                       <h4 className="font-bold text-slate-900 leading-tight">{selectedService}</h4>
                       <p className="text-[13px] font-medium text-slate-500 mt-1 inline-flex items-center gap-1.5 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100"><User size={12}/> {selectedOperator}</p>
                     </div>
                     <div className="text-right">
                       <div className="font-bold text-slate-900 text-lg">{getPrice()}</div>
                       <div className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wide">{getDuration()}</div>
                     </div>
                   </div>
                   <div className="h-px bg-slate-200/80 my-4 pl-1"></div>
                   <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 w-fit px-3 py-1.5 rounded-lg border border-emerald-100 drop-shadow-sm ml-1">
                     <CalendarIcon size={16} className="text-emerald-600" /> {selectedDate.split(' ')[0]}, ore {selectedTime}
                   </div>
                </div>

                {/* Form without heavy borders, soft backgrounds */}
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nome *</label>
                       <input 
                         type="text" 
                         value={customerName}
                         onChange={e => setCustomerName(e.target.value)}
                         className="w-full bg-[#f8f8fb] border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-[1.25rem] px-5 py-3.5 outline-none transition-all font-semibold text-[15px] placeholder-slate-400"
                         placeholder="Es. Giulia"
                       />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cognome *</label>
                       <input 
                         type="text" 
                         value={customerSurname}
                         onChange={e => setCustomerSurname(e.target.value)}
                         className="w-full bg-[#f8f8fb] border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-[1.25rem] px-5 py-3.5 outline-none transition-all font-semibold text-[15px] placeholder-slate-400"
                         placeholder="Es. Rossi"
                       />
                     </div>
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cellulare *</label>
                     <input 
                       type="tel" 
                       value={customerPhone}
                       onChange={e => setCustomerPhone(e.target.value)}
                       className="w-full bg-[#f8f8fb] border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-[1.25rem] px-5 py-3.5 outline-none transition-all font-semibold text-[15px] placeholder-slate-400"
                       placeholder="+39 333 1234567"
                     />
                   </div>
                   
                   <div className="space-y-1.5">
                     <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                       Email <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-400">Opzionale</span>
                     </label>
                     <input 
                       type="email" 
                       value={customerEmail}
                       onChange={e => setCustomerEmail(e.target.value)}
                       className="w-full bg-[#f8f8fb] border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-[1.25rem] px-5 py-3.5 outline-none transition-all font-semibold text-[15px] placeholder-slate-400"
                       placeholder="tua@email.com"
                     />
                   </div>

                   <div className="space-y-1.5 pb-6">
                     <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                       Note particolari <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-400">Opzionale</span>
                     </label>
                     <textarea 
                       value={customerNotes}
                       onChange={e => setCustomerNotes(e.target.value)}
                       className="w-full bg-[#f8f8fb] border border-slate-100 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50 rounded-[1.25rem] px-5 py-3.5 outline-none transition-all font-semibold text-[15px] min-h-[90px] resize-none placeholder-slate-400"
                       placeholder="Es. Ho i capelli molto lunghi e folti..."
                     />
                   </div>
                </div>
              </div>

              {/* Fixed Bottom */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 flex justify-center z-30 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="w-full max-w-3xl flex gap-3 px-2">
                  <button 
                     onClick={handleBook}
                     disabled={!customerName.trim() || !customerSurname.trim() || !customerPhone.trim() || isSubmitting}
                     className="w-full bg-slate-900 hover:bg-black disabled:opacity-40 text-white px-6 py-4.5 rounded-[1.25rem] font-bold transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 text-[15px]"
                  >
                     {isSubmitting ? (
                        <>Attendi...</>
                     ) : (
                        <><CheckCircle2 size={20} /> Conferma appuntamento</>
                     )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
           <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-6 bg-[#f8f8fb] animate-in zoom-in-95 duration-700 fade-in">
             {/* Decorative Confetti Background */}
             <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
               <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
               <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
               <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>
             </div>

             <div className="relative z-10 w-full max-w-sm">
               <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-indigo-600 text-white rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl ring-8 ring-indigo-500/20 shadow-indigo-500/30">
                 <Clock size={48} className="drop-shadow-md" />
               </div>
               <h2 className="text-4xl font-extrabold tracking-tight mb-3 text-center text-slate-900 leading-tight">Richiesta inviata</h2>
               
               <div className="bg-white border text-center border-slate-100 rounded-[2rem] p-8 w-full mt-8 shadow-xl shadow-black/5 relative overflow-hidden">
                 
                 <p className="text-lg text-slate-600 mb-6 font-medium leading-relaxed">
                   Abbiamo ricevuto la tua richiesta per <strong className="text-slate-900">{selectedService}</strong> da <strong className="text-slate-900">{salonName}</strong>.
                 </p>
                 
                 <div className="bg-[#f8f8fb] rounded-[1.25rem] p-5 border border-slate-100 max-w-sm mx-auto text-left space-y-3">
                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200/50">
                       <CalendarIcon size={18} className="text-emerald-600" />
                     </div>
                     <div>
                       <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Quando (richiesto)</div>
                       <div className="font-bold text-slate-900 text-sm">{selectedDate.split(' ')[0]} alle {selectedTime}</div>
                     </div>
                   </div>

                   <div className="w-full h-px bg-slate-200/80 my-1"></div>

                   <div className="flex items-start gap-4">
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-200/50">
                       <User size={18} className="text-indigo-600" />
                     </div>
                     <div>
                       <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Con chi</div>
                       <div className="font-bold text-slate-900 text-sm">{selectedOperator} {selectedOperator === 'Qualsiasi operatore' && <span className="text-[10px] ml-1 font-medium bg-slate-200 text-slate-600 px-1 py-0.5 rounded">Assegnato da noi</span>}</div>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                 <p className="text-[13px] font-semibold text-amber-900 mb-1">L'appuntamento non è ancora confermato</p>
                 <p className="text-[13px] text-amber-800 leading-relaxed">
                   Il salone controlla la disponibilità e ti risponde al numero{' '}
                   <strong className="whitespace-nowrap">{customerPhone}</strong>.
                 </p>
               </div>
             </div>

             <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(env(safe-area-inset-bottom),2rem)] flex justify-center pointer-events-none">
                <button 
                  onClick={() => {
                    setStep('welcome');
                    setSelectedService('');
                    setSelectedServiceId('');
                    setSelectedOperator('');
                    setSelectedDate('');
                    setSelectedTime('');
                    setCustomerName('');
                    setCustomerSurname('');
                    setCustomerPhone('');
                    setCustomerEmail('');
                    setCustomerNotes('');
                  }}
                  className="w-full max-w-sm mx-auto flex justify-center bg-white border border-slate-200/80 shadow-lg text-slate-800 hover:bg-slate-50 px-6 py-4.5 rounded-[1.25rem] font-bold transition-all text-[15px] pointer-events-auto"
                >
                  Torna alla home
                </button>
             </div>
           </div>
        )}
      </main>
    </div>
  );
}
