'use client';

import { useState, useEffect } from 'react';
import { X, Search, Calendar, Clock, Plus, ChevronLeft, Check, UserPlus, FileText, User, RotateCw } from 'lucide-react';
import { clientiApi, catalogoApi, dipendentiApi, appuntamentiApi } from '@/lib/api-client';
import { sovrappongono, tempiServizio, durataTotale, turnoDelGiorno, dentroTurno, descriviTurno } from '@/lib/servizi';

interface Client {
  id: string;
  nome: string;
  cognome: string;
  telefono?: string;
  email?: string;
  note?: string;
}

interface Service {
  id: string;
  nome: string;
  prezzo_base: number;
  durata_minuti: number;
  tempo_lavorazione_minuti?: number;
  tempo_posa_minuti?: number;
  tempo_finitura_minuti?: number;
  categoria: string;
  attivo: boolean;
}

interface Employee {
  id: string;
  nome: string;
  cognome: string;
  ruolo: string;
  attivo: boolean;
}

export interface AppuntamentoEdit {
  id: string;
  data_ora: string;
  note?: string;
  stato?: string;
  id_cliente?: string;
  id_dipendente?: string;
  clienti?: any;
  dipendenti?: any;
  righe_appuntamento?: any[];
}

interface AggiungiCalendarioSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialDate?: Date;
  initialTime?: string;
  appuntamentoEdit?: AppuntamentoEdit | null;
  appuntamentiEsistenti?: any[];
  initialDipendenteId?: string;
}

export default function AggiungiCalendarioSidebar({
  isOpen,
  onClose,
  onSaved,
  initialDate,
  initialTime,
  appuntamentoEdit,
  appuntamentiEsistenti = [],
  initialDipendenteId
}: AggiungiCalendarioSidebarProps) {
  const [activeTab, setActiveTab] = useState<'appuntamento' | 'blocca'>('appuntamento');
  const [overlapPendingPayload, setOverlapPendingPayload] = useState<any>(null);
  const [motivoConflitto, setMotivoConflitto] = useState<string>('');

  // --- GENERAL APP WINDOW STATE ---
  const [data, setData] = useState('');
  const [oraInizio, setOraInizio] = useState('10:00');
  const [ripeti, setRipeti] = useState(false);
  const [ogniSettimane, setOgniSettimane] = useState(4);
  const [terminaDopoVolte, setTerminaDopoVolte] = useState(4);

  // --- APPUNTAMENTO TAB STATE ---
  const [clienti, setClienti] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Client Form state (quick create)
  const [newClientNome, setNewClientNome] = useState('');
  const [newClientCognome, setNewClientCognome] = useState('');
  const [newClientTelefono, setNewClientTelefono] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientConsensoMarketing, setNewClientConsensoMarketing] = useState(false);
  const [newClientCanale, setNewClientCanale] = useState('Instagram');

  // Services
  const [catalogoSer, setCatalogoSer] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [isAddingServiceView, setIsAddingServiceView] = useState(false);
  const [searchServiceQuery, setSearchServiceQuery] = useState('');
  
  // Operator / Team Member
  const [dipendenti, setDipendenti] = useState<Employee[]>([]);
  const [selectedDipendenteId, setSelectedDipendenteId] = useState('');

  // Expandable Note
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  // --- BLOCCA TAB STATE ---
  const [blockType, setBlockType] = useState<'Pausa' | 'Pranzo' | 'Riunione' | 'Tempo libero' | 'Personalizza'>('Pausa');
  const [customBlockName, setCustomBlockName] = useState('');
  const [blockTimeFine, setBlockTimeFine] = useState('10:30');

  // Load backend items
  useEffect(() => {
    async function loadResources() {
      try {
        const [cData, sData, dData] = await Promise.all([
          clientiApi.getAll(),
          catalogoApi.getAll(),
          dipendentiApi.getAll()
        ]);
        setClienti(cData);
        setCatalogoSer(sData.filter((i: any) => i.attivo !== false));
        
        const activeEmp = dData.filter((i: any) => i.attivo !== false);
        setDipendenti(activeEmp);
        if (activeEmp.length > 0) {
          setSelectedDipendenteId(activeEmp[0].id);
        }
      } catch (err) {
        console.error('Errore nel caricamento dei dati per il calendario:', err);
      }
    }
    loadResources();
  }, []);

  // Sync date/time from props or appuntamentoEdit
  useEffect(() => {
    if (appuntamentoEdit) {
      const dateObj = new Date(appuntamentoEdit.data_ora);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      setData(`${year}-${month}-${day}`);
      setOraInizio(`${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`);
      
      if (appuntamentoEdit.note) {
        setNoteText(appuntamentoEdit.note);
        setNoteOpen(true);
      }
      
      if (appuntamentoEdit.id_dipendente || appuntamentoEdit.dipendenti?.id) {
         setSelectedDipendenteId(appuntamentoEdit.id_dipendente || appuntamentoEdit.dipendenti?.id || '');
      }

      if (appuntamentoEdit.clienti) {
         setSelectedClient({
           id: appuntamentoEdit.id_cliente || appuntamentoEdit.clienti.id || 'unknown',
           nome: appuntamentoEdit.clienti.nome || '',
           cognome: appuntamentoEdit.clienti.cognome || '',
           telefono: appuntamentoEdit.clienti.telefono || ''
         });
      }
      
      if (appuntamentoEdit.righe_appuntamento) {
         setSelectedServices(appuntamentoEdit.righe_appuntamento.map(riga => {
           if (riga.servizi_catalogo) {
             return {
                id: Math.random().toString(), // fake ID for edit mode
                nome: riga.servizi_catalogo.nome,
                durata_minuti: riga.servizi_catalogo.durata_minuti,
                tempo_lavorazione_minuti: riga.servizi_catalogo.tempo_lavorazione_minuti,
                tempo_posa_minuti: riga.servizi_catalogo.tempo_posa_minuti,
                tempo_finitura_minuti: riga.servizi_catalogo.tempo_finitura_minuti,
                prezzo_base: 0,
                categoria: 'Varie',
                attivo: true
             };
           }
           return null;
         }).filter(Boolean) as any);
      }
      
      if (appuntamentoEdit.stato === 'annullato' || (appuntamentoEdit.note && appuntamentoEdit.note.includes('[BLOCCO'))) {
         setActiveTab('blocca');
      } else {
         setActiveTab('appuntamento');
      }
    } else {
      // Colonna da cui si è cliccato: l'operatore arriva già selezionato.
      if (initialDipendenteId) setSelectedDipendenteId(initialDipendenteId);

      if (initialDate) {
        const year = initialDate.getFullYear();
        const month = String(initialDate.getMonth() + 1).padStart(2, '0');
        const day = String(initialDate.getDate()).padStart(2, '0');
        setData(`${year}-${month}-${day}`);
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setData(`${year}-${month}-${day}`);
      }
      if (initialTime) {
        setOraInizio(initialTime);
        // auto set block end time to start + 30 min default
        const [h, m] = initialTime.split(':').map(Number);
        let totalMin = h * 60 + m + 30;
        const endH = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const endM = String(totalMin % 60).padStart(2, '0');
        setBlockTimeFine(`${endH}:${endM}`);
      }
    }
  }, [initialDate, initialTime, appuntamentoEdit, initialDipendenteId]);

  const toggleServiceSelection = (service: Service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientNome || !newClientCognome) return;
    try {
      const created = await clientiApi.create({
        nome: newClientNome,
        cognome: newClientCognome,
        telefono: newClientTelefono || undefined,
        email: newClientEmail || undefined,
        consenso_marketing: newClientConsensoMarketing,
        canale_acquisizione: newClientCanale
      });
      setClienti([created, ...clienti]);
      setSelectedClient(created);
      setIsCreatingClient(false);
      setNewClientNome('');
      setNewClientCognome('');
      setNewClientTelefono('');
      setNewClientEmail('');
      setNewClientConsensoMarketing(false);
      setNewClientCanale('Instagram');
    } catch (err) {
      alert('Impossibile creare il cliente.');
    }
  };

  const [validationError, setValidationError] = useState('');

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('appuntamento');
      setSelectedClient(null);
      setSelectedServices([]);
      setNoteText('');
      setIsAddingServiceView(false);
      setSearchServiceQuery('');
      setSearchClientQuery('');
      setIsCreatingClient(false);
      setBlockType('Pausa');
      setCustomBlockName('');
      setOgniSettimane(1);
      setTerminaDopoVolte(4);
      setRipeti(false);
      setValidationError('');
      
      // Reset dates as well to force re-render from props next time
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setData(`${year}-${month}-${day}`);
      setOraInizio('09:00');
      setBlockTimeFine('09:30');
    }
  }, [isOpen]);

  const saveAppointment = async () => {
    setValidationError('');

    if (activeTab === 'appuntamento') {
      if (!selectedClient) {
        setValidationError('Seleziona o crea un cliente per completare la prenotazione.');
        return;
      }
      if (selectedServices.length === 0) {
        setValidationError('Seleziona almeno un servizio per procedere.');
        return;
      }

      // Prepare local date time correctly
      const [y, mm, d] = data.split('-');
      const [h, m] = oraInizio.split(':').map(Number);
      const apptDate = new Date(parseInt(y), parseInt(mm) - 1, parseInt(d), h, m, 0, 0);

      const chosenStaff = dipendenti.find(dip => dip.id === selectedDipendenteId);

      // I tempi di lavorazione e di posa viaggiano con l'appuntamento: sono
      // quelli che permettono all'agenda di lasciare il buco durante la posa.
      const righe = selectedServices.map(s => {
        const tempi = tempiServizio(s);
        return {
          servizi_catalogo: {
            nome: s.nome,
            durata_minuti: tempi.totale,
            tempo_lavorazione_minuti: tempi.lavorazione,
            tempo_posa_minuti: tempi.posa,
            tempo_finitura_minuti: tempi.finitura
          }
        };
      });

      let finalNote = noteText;
      if (ripeti) {
        const fineText = calcolaDataFineRipetizione(data, ogniSettimane, terminaDopoVolte);
        finalNote = `[RICORRENTE: Ogni ${ogniSettimane} sett., per ${terminaDopoVolte} volte fino a ${fineText}] ` + (noteText || '');
      }

      const payload = {
        data_ora: apptDate.toISOString(),
        id_cliente: selectedClient.id,
        id_dipendente: selectedDipendenteId,
        note: finalNote,
        stato: 'confermato',
        // Dati aggregati che il backend userà per il mock
        clienti: {
          nome: selectedClient.nome,
          cognome: selectedClient.cognome,
          telefono: selectedClient.telefono || ''
        },
        dipendenti: {
          id: selectedDipendenteId,
          nome: chosenStaff?.nome || 'Staff',
          cognome: chosenStaff?.cognome || ''
        },
        righe_appuntamento: righe
      };

      // Il confronto guarda solo i tempi di lavorazione: durante la posa di un
      // altro appuntamento l'operatore è libero e la fascia è prenotabile.
      const myStartMs = apptDate.getTime();

      const hasOverlap = appuntamentiEsistenti.some(es => {
        if ((es.id_dipendente || es.dipendenti?.id) !== selectedDipendenteId) return false;
        if (appuntamentoEdit && es.id === appuntamentoEdit.id) return false;
        return sovrappongono(myStartMs, righe, new Date(es.data_ora).getTime(), es.righe_appuntamento || []);
      });

      // Fuori turno: l'appuntamento comincia o finisce fuori dalle fasce di
      // lavoro dell'operatore in quel giorno.
      const turno = turnoDelGiorno(chosenStaff, apptDate);
      const minutiInizio = apptDate.getHours() * 60 + apptDate.getMinutes();
      const minutiFine = minutiInizio + durataTotale(righe);
      const fuoriTurno = !turno.lavora
        || !dentroTurno(turno, minutiInizio)
        || !dentroTurno(turno, Math.max(minutiInizio, minutiFine - 1));

      if (hasOverlap || fuoriTurno) {
        const nomeOperatore = chosenStaff?.nome || "L'operatore";
        setMotivoConflitto(
          hasOverlap
            ? `${nomeOperatore} ha già un appuntamento che si accavalla con questo.`
            : turno.lavora
              ? `${nomeOperatore} quel giorno è in turno ${descriviTurno(turno)}: l'appuntamento cade fuori.`
              : `${nomeOperatore} quel giorno non è in turno (${turno.etichetta}).`
        );
        setOverlapPendingPayload(payload);
        return;
      }

      await eseguiSalvataggio(payload);
    } else {
      // It's a BLOCK
      const [y, mm, d] = data.split('-');
      const [hStart, mStart] = oraInizio.split(':').map(Number);
      const apptDate = new Date(parseInt(y), parseInt(mm) - 1, parseInt(d), hStart, mStart, 0, 0);

      // Duration in minutes
      const [hEnd, mEnd] = blockTimeFine.split(':').map(Number);
      const startMin = hStart * 60 + mStart;
      const endMin = hEnd * 60 + mEnd;
      const blockDuration = Math.max(15, endMin - startMin);

      const blockLabel = blockType === 'Personalizza' ? (customBlockName || 'Blocco tempo') : blockType;
      const chosenStaff = dipendenti.find(d => d.id === selectedDipendenteId);

      let finalBlockNote = `[BLOCCO] ${blockLabel}`;
      if (ripeti) {
        const fineText = calcolaDataFineRipetizione(data, ogniSettimane, terminaDopoVolte);
        finalBlockNote = `[BLOCCO RICORRENTE: Ogni ${ogniSettimane} sett., per ${terminaDopoVolte} volte fino a ${fineText}] ${blockLabel}`;
      }

      const payload = {
        data_ora: apptDate.toISOString(),
        id_cliente: 'block-client',
        id_dipendente: selectedDipendenteId,
        note: finalBlockNote,
        stato: 'annullato', // Color red or greyed out block
        clienti: {
          nome: 'BLOCCO',
          cognome: blockLabel,
          telefono: '-'
        },
        dipendenti: {
          id: selectedDipendenteId,
          nome: chosenStaff?.nome || 'Staff',
          cognome: chosenStaff?.cognome || ''
        },
        righe_appuntamento: [
          {
            servizi_catalogo: {
              nome: blockLabel,
              durata_minuti: blockDuration
            }
          }
        ]
      };

      const myStartMs = apptDate.getTime();

      const hasOverlap = appuntamentiEsistenti.some(es => {
        if ((es.id_dipendente || es.dipendenti?.id) !== selectedDipendenteId) return false;
        if (appuntamentoEdit && es.id === appuntamentoEdit.id) return false;
        return sovrappongono(
          myStartMs, payload.righe_appuntamento,
          new Date(es.data_ora).getTime(), es.righe_appuntamento || []
        );
      });

      if (hasOverlap) {
        setMotivoConflitto('In quella fascia c\'è già qualcosa in agenda.');
        setOverlapPendingPayload(payload);
        return;
      }

      await eseguiSalvataggio(payload);
    }
  };

  const eseguiSalvataggio = async (payload: any) => {
    try {
      if (appuntamentoEdit) {
         await appuntamentiApi.update(appuntamentoEdit.id, payload);
      } else {
         await appuntamentiApi.create(payload);
      }
      setOverlapPendingPayload(null);
      onSaved();
      onClose();
    } catch (err) {
      alert('Errore durante il salvataggio.');
    }
  };

  const filteredClients = studentiFiltra(clienti, searchClientQuery);

  const groupedServices: Record<string, Service[]> = {};
  catalogoSer.forEach(s => {
    if (!groupedServices[s.categoria]) {
      groupedServices[s.categoria] = [];
    }
    groupedServices[s.categoria].push(s);
  });

  const activeStaffName = dipendenti.find(d => d.id === selectedDipendenteId)?.nome || 'ROSELLA';

  // Hours array from 08:00 to 20:30 in 15min steps
  const HOUR_SELECT_OPTIONS = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 20 && m > 30) continue;
      HOUR_SELECT_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200" onClick={onClose} />
      
      {overlapPendingPayload && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-center flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
              <Calendar size={24} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Stai andando fuori tempo</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              {motivoConflitto}
            </p>
            <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
              Vuoi inserire comunque l'appuntamento?
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => eseguiSalvataggio(overlapPendingPayload)} 
                className="w-full px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors shadow-sm"
              >
                Sì, inserisci comunque
              </button>
              <button 
                onClick={() => setOverlapPendingPayload(null)} 
                className="w-full px-4 py-2 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors shadow-sm"
              >
                No, cambio orario
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-y-0 right-0 w-full sm:w-[700px] bg-white border-l border-zinc-200 z-50 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* VIEW 1: SELECT CODES / CHANNELS OR APPOINTMENT DETAILS */}
        {!isAddingServiceView ? (
          <>
            {/* Header */}
            <div>
              <div className="p-6 pb-2 flex justify-between items-center border-b border-zinc-200">
                <h2 className="text-xl font-bold font-playfair text-zinc-900">{appuntamentoEdit ? 'Modifica appuntamento' : 'Aggiungi al calendario'}</h2>
                <button onClick={onClose} className="p-1 px-2 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-850 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* TABS */}
              <div className="px-6 flex border-b border-zinc-200 bg-zinc-50/20">
                <button
                  onClick={() => setActiveTab('appuntamento')}
                  className={`py-3 px-4 font-sans text-sm font-semibold border-b-2 transition-all transition-colors ${
                    activeTab === 'appuntamento'
                      ? 'border-fuchsia-500 text-fuchsia-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-250'
                  }`}
                >
                  Appuntamento
                </button>
                <button
                  onClick={() => setActiveTab('blocca')}
                  className={`py-3 px-4 font-sans text-sm font-semibold border-b-2 transition-all transition-colors ${
                    activeTab === 'blocca'
                      ? 'border-fuchsia-500 text-fuchsia-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-250'
                  }`}
                >
                  Blocca
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* --- APPUNTAMENTO TAB VIEW --- */}
              {activeTab === 'appuntamento' && (
                <>
                  {/* QUANDO SECTION */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Quando</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Data */}
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Data</label>
                        <div className="relative">
                          <input
                            type="date"
                            value={data}
                            onChange={(e) => setData(e.target.value)}
                            className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 outline-none focus:border-fuchsia-500 transition-colors font-mono"
                          />
                        </div>
                      </div>

                      {/* Ora di inizio */}
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Ora di inizio</label>
                        <select
                          value={oraInizio}
                          onChange={(e) => setOraInizio(e.target.value)}
                          className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 outline-none focus:border-fuchsia-500 transition-colors cursor-pointer font-mono"
                        >
                          {HOUR_SELECT_OPTIONS.map(time => (
                            <option key={time} value={time} className="bg-white text-zinc-900">{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Operator collaborator mapping */}
                    <div className="pt-1">
                      <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Operatore / Collaboratore</label>
                      <select
                        value={selectedDipendenteId}
                        onChange={(e) => setSelectedDipendenteId(e.target.value)}
                        className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 outline-none focus:border-fuchsia-500 transition-colors cursor-pointer"
                      >
                        {dipendenti.map(emp => (
                          <option key={emp.id} value={emp.id} className="bg-white text-zinc-900">
                            {emp.nome} {emp.cognome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Repeating Appt Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50/30 border border-zinc-200/40 select-none">
                      <span className="text-xs text-zinc-350 font-sans">Ripeti questo appuntamento</span>
                      <button
                        onClick={() => setRipeti(!ripeti)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${ripeti ? 'bg-fuchsia-600 justify-end' : 'bg-zinc-100 justify-start'}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {ripeti && (
                      <div className="p-4 rounded-xl bg-zinc-50/40 border border-zinc-200 space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Si ripete ogni */}
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">Si ripete ogni</label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden h-9">
                                <button
                                  type="button"
                                  onClick={() => setOgniSettimane(prev => Math.max(1, prev - 1))}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  -
                                </button>
                                <div className="border-l border-zinc-200 h-4" />
                                <span className="w-10 text-center font-mono text-zinc-800 text-sm font-semibold select-none">
                                  {ogniSettimane}
                                </span>
                                <div className="border-r border-zinc-200 h-4" />
                                <button
                                  type="button"
                                  onClick={() => setOgniSettimane(prev => prev + 1)}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-zinc-500">settimana/e</span>
                            </div>
                          </div>

                          {/* Termina dopo */}
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">Termina dopo</label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden h-9">
                                <button
                                  type="button"
                                  onClick={() => setTerminaDopoVolte(prev => Math.max(1, prev - 1))}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  -
                                </button>
                                <div className="border-l border-zinc-200 h-4" />
                                <span className="w-10 text-center font-mono text-zinc-800 text-sm font-semibold select-none">
                                  {terminaDopoVolte}
                                </span>
                                <div className="border-r border-zinc-200 h-4" />
                                <button
                                  type="button"
                                  onClick={() => setTerminaDopoVolte(prev => prev + 1)}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-zinc-500">volte</span>
                            </div>
                          </div>
                        </div>

                        {/* Calculated repetition date preview */}
                        <div className="flex items-center gap-2 bg-zinc-50/80 border border-zinc-850 px-3.5 py-3 rounded-xl text-xs text-zinc-700 font-sans select-none shadow-sm">
                          <RotateCw size={13} className="text-fuchsia-400 animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Si ripete fino a <span className="text-fuchsia-400 font-semibold">{calcolaDataFineRipetizione(data, ogniSettimane, terminaDopoVolte)}</span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CLIENT SECTION */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Cliente</h3>

                    {/* Client display or search */}
                    {selectedClient ? (
                      <>
                        <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/25 flex justify-between items-center animate-in zoom-in-95 duration-150">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-fuchsia-600/20 text-fuchsia-400 font-semibold flex items-center justify-center text-sm">
                              {selectedClient.nome.charAt(0)}{selectedClient.cognome.charAt(0)}
                            </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-800">
                              {selectedClient.nome} {selectedClient.cognome}
                            </p>
                            {selectedClient.telefono && (
                              <p className="text-[11px] text-zinc-500 font-mono italic">{selectedClient.telefono}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedClient(null)}
                          className="px-2 py-1 text-xs font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100/40 rounded transition-all shrink-0"
                        >
                          Rimuovi
                        </button>
                      </div>
                      {selectedClient.note && (
                        <div className="mt-2 p-3 bg-fuchsia-900/20 border border-fuchsia-500/30 rounded-xl flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <FileText size={16} className="text-fuchsia-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-0.5 font-mono">Nota Cliente</p>
                            <p className="text-sm text-zinc-700 leading-relaxed italic pr-2">{selectedClient.note}</p>
                          </div>
                        </div>
                      )}
                    </>
                    ) : isCreatingClient ? (
                      /* Create customer directly in menu! */
                      <form onSubmit={handleCreateClient} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-3 animate-in fade-in duration-150">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-fuchsia-400 font-bold font-sans uppercase">Nuovo Cliente</span>
                          <button
                            type="button"
                            onClick={() => setIsCreatingClient(false)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-700 uppercase"
                          >
                            Annulla
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nome *"
                            value={newClientNome}
                            onChange={(e) => setNewClientNome(e.target.value)}
                            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Cognome *"
                            value={newClientCognome}
                            onChange={(e) => setNewClientCognome(e.target.value)}
                            className="bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500"
                            required
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Filtro Telefono"
                          value={newClientTelefono}
                          onChange={(e) => setNewClientTelefono(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500 font-mono"
                        />
                        <input
                          type="email"
                          placeholder="Email (opzionale)"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                          className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500 font-mono mt-1"
                        />
                        <div className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            id="marketing-consent"
                            checked={newClientConsensoMarketing}
                            onChange={(e) => setNewClientConsensoMarketing(e.target.checked)}
                            className="bg-white border-zinc-200 rounded w-4 h-4 text-fuchsia-600 focus:ring-fuchsia-500 focus:ring-offset-zinc-900 cursor-pointer"
                          />
                          <label htmlFor="marketing-consent" className="text-[11px] text-zinc-500 cursor-pointer select-none">
                            Acconsento all'invio di comunicazioni marketing
                          </label>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Canale Acquisizione</label>
                          <select
                            value={newClientCanale}
                            onChange={(e) => setNewClientCanale(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500"
                          >
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Google">Google</option>
                            <option value="Passaparola">Passaparola</option>
                            <option value="Altro">Altro / Passante</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-xs py-1.5 rounded transition-colors"
                        >
                          Aggiungi e Seleziona Cliente
                        </button>
                      </form>
                    ) : (
                      /* Classic search input */
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-3.5 text-zinc-500" size={14} />
                          <input
                            type="text"
                            placeholder="Aggiungi o cerca cliente..."
                            value={searchClientQuery}
                            onChange={(e) => {
                              setSearchClientQuery(e.target.value);
                              setIsClientDropdownOpen(true);
                            }}
                            onFocus={() => setIsClientDropdownOpen(true)}
                            className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-sm text-zinc-900 outline-none focus:border-fuchsia-500 transition-colors"
                          />
                        </div>

                        {/* Search overlay dropdown */}
                        {isClientDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsClientDropdownOpen(false)} />
                            <div className="absolute z-20 left-0 right-0 mt-1.5 border border-zinc-200 bg-white rounded-xl max-h-56 overflow-y-auto shadow-2xl divide-y divide-zinc-200/80">
                            
                            {/* Create Client Option */}
                            <button
                              onClick={() => {
                                setIsCreatingClient(true);
                                setIsClientDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 flex items-center gap-2.5 text-fuchsia-400 hover:bg-white text-xs font-semibold font-sans transition-colors"
                            >
                              <UserPlus size={14} />
                              + Crea un nuovo cliente
                            </button>

                            {/* Anonymous Client Option */}
                            <button
                              onClick={() => {
                                setSelectedClient({
                                  id: 'walkin',
                                  nome: 'Cliente',
                                  cognome: 'Occasionale',
                                  telefono: '-'
                                });
                                setIsClientDropdownOpen(false);
                                setSearchClientQuery('');
                              }}
                              className="w-full text-left px-4 py-3 flex items-center gap-2.5 text-zinc-350 hover:bg-white text-xs font-medium font-sans transition-colors"
                            >
                              <User size={14} />
                              Cliente occasionale (senza appuntamento)
                            </button>

                            {/* Filtered customers */}
                            {filteredClients.length > 0 ? (
                              filteredClients.map(cli => (
                                <button
                                  key={cli.id}
                                  onClick={() => {
                                    setSelectedClient(cli);
                                    setIsClientDropdownOpen(false);
                                    setSearchClientQuery('');
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-white transition-colors flex justify-between items-center"
                                >
                                  <div>
                                    <p className="text-xs font-medium text-zinc-800">{cli.nome} {cli.cognome}</p>
                                    {cli.telefono && (
                                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{cli.telefono}</p>
                                    )}
                                  </div>
                                </button>
                              ))
                            ) : searchClientQuery.trim() !== '' ? (
                              <div className="px-4 py-3 text-xs text-zinc-500 italic select-none">
                                Nessun cliente trovato per "{searchClientQuery}"
                              </div>
                            ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SERVICES SECTION */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Servizi</h3>

                    {/* List selected services */}
                    {selectedServices.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedServices.map(ser => (
                          <div key={ser.id} className="p-3 bg-zinc-50/60 border border-zinc-200/80 rounded-xl flex justify-between items-center hover:border-zinc-300 transition-all">
                            <div>
                              <p className="text-xs font-semibold text-zinc-800">{ser.nome}</p>
                              <p className="text-[10.5px] text-fuchsia-400 font-semibold mt-0.5">
                                {ser.prezzo_base} € <span className="text-zinc-500 font-normal ml-1 border-l border-zinc-200 pl-1.5">{ser.durata_minuti} min</span>
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedServices(selectedServices.filter(s => s.id !== ser.id))}
                              className="p-1 text-zinc-500 hover:text-red-400 rounded-md transition-colors"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add service button */}
                    <button
                      onClick={() => setIsAddingServiceView(true)}
                      className="w-full flex items-center justify-center gap-2 bg-zinc-50/40 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/30 text-fuchsia-400 hover:text-fuchsia-300 font-semibold border border-dashed border-zinc-200 rounded-xl py-3.5 text-xs transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      Aggiungi servizio
                    </button>
                  </div>

                  {/* NOTES EXPNADABLE */}
                  <div className="pt-2">
                    {noteOpen ? (
                      <div className="space-y-2 animate-in fade-in duration-250">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Note appuntamento</label>
                        <textarea
                          placeholder="Aggiungi dettagli o note speciali per il trattamento..."
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="w-full h-20 bg-zinc-50/60 border border-zinc-200 rounded-lg p-2.5 text-xs text-zinc-800 outline-none focus:border-fuchsia-500 resize-none font-sans"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setNoteOpen(true)}
                        className="flex items-center gap-1.5 text-fuchsia-400 hover:text-fuchsia-300 text-xs font-semibold select-none cursor-pointer"
                      >
                        <Plus size={14} />
                        Aggiungi nota appuntamento
                      </button>
                    )}
                  </div>
                </>
              )}


              {/* --- BLOCCA TAB VIEW --- */}
              {activeTab === 'blocca' && (
                <>
                  {/* TYPE OF BLOCK (Screenshot 2) */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Tipo di blocco</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(['Pausa', 'Pranzo', 'Riunione', 'Tempo libero', 'Personalizza'] as const).map(pType => (
                        <button
                          key={pType}
                          onClick={() => setBlockType(pType)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition-all cursor-pointer ${
                            blockType === pType
                              ? 'bg-fuchsia-600 text-white shadow-sm font-bold scale-[1.02]'
                              : 'bg-white hover:bg-zinc-850 text-zinc-700 border border-zinc-200/30'
                          }`}
                        >
                          {pType}
                        </button>
                      ))}
                    </div>

                    {blockType === 'Personalizza' && (
                      <input
                        type="text"
                        placeholder="Nome blocco personalizzato..."
                        value={customBlockName}
                        onChange={(e) => setCustomBlockName(e.target.value)}
                        className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-xs text-zinc-800 placeholder-zinc-500 outline-none focus:border-fuchsia-500 mt-2 block"
                      />
                    )}
                  </div>

                  {/* QUANDO (BLOCK) */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Quando</h3>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Data */}
                      <div className="col-span-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Data</label>
                        <input
                          type="date"
                          value={data}
                          onChange={(e) => setData(e.target.value)}
                          className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-[11.5px] text-zinc-150 outline-none focus:border-fuchsia-500 transition-colors font-mono"
                        />
                      </div>

                      {/* Ora di inizio */}
                      <div className="col-span-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Inizio</label>
                        <select
                          value={oraInizio}
                          onChange={(e) => setOraInizio(e.target.value)}
                          className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-2 text-[11.5px] text-zinc-150 outline-none focus:border-fuchsia-500 transition-colors cursor-pointer font-mono"
                        >
                          {HOUR_SELECT_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>

                      {/* Ora di fine */}
                      <div className="col-span-1">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Ora fine</label>
                        <select
                          value={blockTimeFine}
                          onChange={(e) => setBlockTimeFine(e.target.value)}
                          className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-2 text-[11.5px] text-zinc-150 outline-none focus:border-fuchsia-500 transition-colors cursor-pointer font-mono"
                        >
                          {HOUR_SELECT_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Repeate Block switch */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50/30 border border-zinc-200/40 select-none">
                      <span className="text-xs text-zinc-350 font-sans">Ripeti questo blocco</span>
                      <button
                        onClick={() => setRipeti(!ripeti)}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${ripeti ? 'bg-fuchsia-600 justify-end' : 'bg-zinc-100 justify-start'}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                      </button>
                    </div>

                    {ripeti && (
                      <div className="p-4 rounded-xl bg-zinc-50/40 border border-zinc-200 space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Si ripete ogni */}
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">Si ripete ogni</label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden h-9">
                                <button
                                  type="button"
                                  onClick={() => setOgniSettimane(prev => Math.max(1, prev - 1))}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  -
                                </button>
                                <div className="border-l border-zinc-200 h-4" />
                                <span className="w-10 text-center font-mono text-zinc-800 text-sm font-semibold select-none">
                                  {ogniSettimane}
                                </span>
                                <div className="border-r border-zinc-200 h-4" />
                                <button
                                  type="button"
                                  onClick={() => setOgniSettimane(prev => prev + 1)}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-zinc-500">settimana/e</span>
                            </div>
                          </div>

                          {/* Termina dopo */}
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1.5">Termina dopo</label>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-white border border-zinc-200 rounded-lg overflow-hidden h-9">
                                <button
                                  type="button"
                                  onClick={() => setTerminaDopoVolte(prev => Math.max(1, prev - 1))}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  -
                                </button>
                                <div className="border-l border-zinc-200 h-4" />
                                <span className="w-10 text-center font-mono text-zinc-800 text-sm font-semibold select-none">
                                  {terminaDopoVolte}
                                </span>
                                <div className="border-r border-zinc-200 h-4" />
                                <button
                                  type="button"
                                  onClick={() => setTerminaDopoVolte(prev => prev + 1)}
                                  className="px-2.5 h-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors font-semibold text-lg select-none"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-zinc-500">volte</span>
                            </div>
                          </div>
                        </div>

                        {/* Calculated repetition date preview */}
                        <div className="flex items-center gap-2 bg-zinc-50/80 border border-zinc-850 px-3.5 py-3 rounded-xl text-xs text-zinc-700 font-sans select-none shadow-sm">
                          <RotateCw size={13} className="text-fuchsia-400 animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Si ripete fino a <span className="text-fuchsia-400 font-semibold">{calcolaDataFineRipetizione(data, ogniSettimane, terminaDopoVolte)}</span></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* COMPONENTE TEAM */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-zinc-500 tracking-wider font-mono">Componente del team</h3>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 mb-1 block">Collaboratore</label>
                      <select
                        value={selectedDipendenteId}
                        onChange={(e) => setSelectedDipendenteId(e.target.value)}
                        className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2 px-3 text-sm text-zinc-900 outline-none focus:border-fuchsia-500 cursor-pointer"
                      >
                        {dipendenti.map(emp => (
                          <option key={emp.id} value={emp.id} className="bg-white text-zinc-900">
                            {emp.nome} {emp.cognome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

            </div>

            {/* Bottom Sticky Action Footer */}
            <div className="p-6 border-t border-zinc-200 bg-white">
              {validationError && (
                <div className="mb-3 text-red-500 text-xs font-bold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-center animate-in fade-in zoom-in-95">
                  {validationError}
                </div>
              )}
              <button
                onClick={saveAppointment}
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold font-sans py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer hover:scale-[1.01] active:translate-y-px"
              >
                Salva
              </button>
            </div>
          </>
        ) : (
          /* --- VIEW 2: ADDING SERVICES SUBPANEL (Screenshot 3) --- */
          <div className="flex flex-col h-full bg-white">
            
            {/* Header subpanel */}
            <div className="p-6 pb-2 border-b border-zinc-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setIsAddingServiceView(false);
                  setSearchServiceQuery('');
                }}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 text-sm font-semibold transition-colors"
              >
                <ChevronLeft size={16} />
                Aggiungi servizio
              </button>
              <button
                onClick={onClose}
                className="p-1 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-850"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input, and filters */}
            <div className="p-6 pb-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-zinc-500" size={14} />
                <input
                  type="text"
                  placeholder="Cerca un servizio..."
                  value={searchServiceQuery}
                  onChange={(e) => setSearchServiceQuery(e.target.value)}
                  className="w-full bg-zinc-50/60 border border-zinc-200 rounded-lg py-2.5 pl-9 pr-4 text-xs text-zinc-900 outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Rossella tag filter (from wireframe) */}
              <div className="flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-fuchsia-600/10 border border-fuchsia-500/25 rounded-full text-[10.5px] text-fuchsia-400 font-semibold select-none leading-none">
                  Servizi svolti da: <span className="uppercase">{activeStaffName}</span>
                  <button
                    onClick={() => {}}
                    className="hover:text-red-400 transition-colors p-[1px]"
                  >
                    <X size={11} />
                  </button>
                </span>
              </div>
            </div>

            {/* Scrollable Catalog groups */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
              {Object.keys(groupedServices).map(category => {
                // Filter the services in this category by search queries
                const servicesFiltered = groupedServices[category].filter(s =>
                  s.nome.toLowerCase().includes(searchServiceQuery.toLowerCase())
                );

                if (servicesFiltered.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 font-mono pl-1">
                      {category}
                    </h4>

                    <div className="space-y-1.5">
                      {servicesFiltered.map(ser => {
                        const isChosen = selectedServices.some(s => s.id === ser.id);
                        return (
                          <button
                            key={ser.id}
                            onClick={() => toggleServiceSelection(ser)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all flex justify-between items-center ${
                              isChosen
                                ? 'bg-fuchsia-500/5 border-fuchsia-500/40'
                                : 'bg-zinc-50/40 border-zinc-200/60 hover:bg-zinc-50/80 hover:border-zinc-300'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-semibold text-zinc-800">{ser.nome}</p>
                              <p className="text-[10px] text-zinc-500 font-medium mt-0.5 font-mono">
                                {ser.prezzo_base} € • {ser.durata_minuti >= 60 ? `${Math.floor(ser.durata_minuti / 60)}h ${ser.durata_minuti % 60 ? ser.durata_minuti % 60 + 'm' : ''}` : `${ser.durata_minuti} min`}
                              </p>
                            </div>
                            
                            {/* Check Circle Selector (Screenshot 3 style) */}
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isChosen
                                ? 'bg-fuchsia-600 border-fuchsia-600 text-white'
                                : 'border-zinc-300 bg-transparent'
                            }`}>
                              {isChosen && <Check size={12} className="stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom sticky panel back buttons */}
            <div className="p-6 border-t border-zinc-200 bg-white flex gap-3">
              <button
                onClick={() => {
                  setIsAddingServiceView(false);
                  setSearchServiceQuery('');
                }}
                className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold font-sans py-3.5 rounded-xl transition-all shadow-md text-xs text-center cursor-pointer"
              >
                Conferma {selectedServices.length > 0 && `(${selectedServices.length})`}
              </button>
            </div>

          </div>
        )}

      </div>
    </>
  );
}

// Simple search filter helper
function studentiFiltra(clients: Client[], query: string) {
  if (!query || query.trim() === '') return []; // I nomi escono solo se vado a cercare il nome, non prima
  const q = query.trim().toLowerCase();
  return clients.filter(c =>
    c.nome.toLowerCase().includes(q) ||
    c.cognome.toLowerCase().includes(q) ||
    (c.telefono && c.telefono.includes(q))
  ).slice(0, 10);
}

// Calcola la data finale in cui l'appuntamento o il blocco si ripete
function calcolaDataFineRipetizione(dataStartStr: string, ogniW: number, volte: number): string {
  if (!dataStartStr) return '';
  const dateStrWithT12 = dataStartStr.includes('T') ? dataStartStr : `${dataStartStr}T12:00:00`;
  const date = new Date(dateStrWithT12);
  if (isNaN(date.getTime())) return '';
  
  // Se si ripete per N volte, l'ultima ripetizione è dopo (N - 1) * ogniW settimane
  const weeksToAdd = (volte - 1) * ogniW;
  if (weeksToAdd > 0) {
    date.setDate(date.getDate() + (weeksToAdd * 7));
  }
  
  try {
    const formatter = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(date);
  } catch (e) {
    return date.toLocaleDateString('it-IT');
  }
}
