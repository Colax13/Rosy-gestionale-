import { useState, useEffect } from 'react';
import { Store, Clock, Image as ImageIcon, Save, CheckCircle, Settings as SettingsIcon, Loader2, Link as LinkIcon, Copy } from 'lucide-react';
import { salonApi } from '@/lib/api-client';
import { auth } from '../../../../../src/lib/firebase';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'generale' | 'orari' | 'foto'>('generale');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [dettagli, setDettagli] = useState({
    nomeSalone: '',
    indirizzo: '',
    telefono: '',
    email: '',
    descrizioneGenerale: '',
    logoUrl: ''
  });

  const [orari, setOrari] = useState({
    lunedi: 'Chiuso',
    martedi: '09:00 - 19:00',
    mercoledi: '09:00 - 19:00',
    giovedi: '09:00 - 19:00',
    venerdi: '09:00 - 19:00',
    sabato: '09:00 - 14:00',
    domenica: 'Chiuso'
  });

  const [originalData, setOriginalData] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await salonApi.getSettings();
      if (data) {
        if (data.salonDetails) setDettagli(data.salonDetails);
        if (data.salonHours) setOrari(data.salonHours);
        setOriginalData(data);
      }
    } catch (error) {
      console.error("Errore caricamento impostazioni:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const storedTheme = localStorage.getItem('theme') as 'dark' | 'light';
    if (storedTheme) setTheme(storedTheme);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await salonApi.updateSettings({
        salonDetails: dettagli,
        salonHours: orari
      });
      setIsEditing(false);
      setOriginalData({ salonDetails: dettagli, salonHours: orari });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (e) {
      console.error("Errore nel salvataggio:", e);
      alert("Si è verificato un errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (originalData) {
      if (originalData.salonDetails) setDettagli(originalData.salonDetails);
      if (originalData.salonHours) setOrari(originalData.salonHours);
    }
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex flex-col h-full w-full pb-24 min-h-full">
      <div className="w-full px-4 md:px-6 pt-4 md:pt-6">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 sticky top-4 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
            <div>
              <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3 mb-1"><SettingsIcon className="text-fuchsia-500" size={28} />Impostazioni</h1>
              <p className="text-zinc-500 text-sm">Personalizza i dettagli, gli orari e l'aspetto del tuo salone.</p>
            </div>
            {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
                 Modifica {activeTab === 'orari' ? 'Orari' : 'Generali'}
               </button>
            ) : isEditing ? (
               <div className="flex items-center gap-3">
                 <button onClick={handleCancel} disabled={isSaving} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                   Annulla
                 </button>
                 <button onClick={handleSave} disabled={isSaving} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                   {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                   {isSaving ? 'Salvataggio...' : 'Salva'}
                 </button>
               </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 flex flex-col gap-6 flex-1 pt-4">

      <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto pb-1 mb-2">
        <button 
          onClick={() => setActiveTab('generale')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${activeTab === 'generale' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <Store size={18} /> Generali
        </button>
        <button 
          onClick={() => setActiveTab('orari')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${activeTab === 'orari' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <Clock size={18} /> Orari
        </button>
        <button 
          onClick={() => setActiveTab('foto')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium whitespace-nowrap transition-colors ${activeTab === 'foto' ? 'border-fuchsia-500 text-fuchsia-400' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}
        >
          <ImageIcon size={18} /> Foto & Sede
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl relative min-h-[400px]">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <Loader2 className="animate-spin mb-4 text-fuchsia-500" size={32} />
            <p>Caricamento impostazioni...</p>
          </div>
        ) : (
          <>
            {activeTab === 'generale' && (
              <div className="space-y-6">
            <h3 className="text-xl font-bold text-zinc-900">Informazioni Salone</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 overflow-hidden w-full">
                <label className="block text-sm font-medium text-zinc-500 mb-2">Link Pubblico di Prenotazione</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 w-full overflow-hidden">
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-fuchsia-600/10 text-fuchsia-500 flex items-center justify-center shrink-0">
                      <LinkIcon size={20} />
                    </div>
                    <div className="flex flex-col overflow-hidden w-full">
                      <p className="text-sm font-medium text-zinc-900 truncate w-full">
                        {window.location.origin}/{auth.currentUser?.uid || 'ID_SALONE'}/prenota
                      </p>
                      <p className="text-xs text-zinc-500 pt-0.5 mt-1 truncate">Condividi sui social.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const link = `${window.location.origin}/${auth.currentUser?.uid}/prenota`;
                      navigator.clipboard.writeText(link);
                      alert('Link copiato!');
                    }}
                    className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-sm font-medium transition-colors border border-zinc-300 mt-2 sm:mt-0"
                  >
                    <Copy size={16} /> <span>Copia Link</span>
                  </button>
                </div>
                <div className="h-px bg-zinc-100 my-6"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Nome Salone</label>
                {isEditing ? (
                  <input type="text" value={dettagli.nomeSalone} onChange={e => setDettagli({...dettagli, nomeSalone: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.nomeSalone || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Indirizzo Sede Principale</label>
                {isEditing ? (
                  <input type="text" value={dettagli.indirizzo} onChange={e => setDettagli({...dettagli, indirizzo: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.indirizzo || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Telefono Principale</label>
                {isEditing ? (
                  <input type="text" value={dettagli.telefono} onChange={e => setDettagli({...dettagli, telefono: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.telefono || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Email Pubblica</label>
                {isEditing ? (
                  <input type="email" value={dettagli.email} onChange={e => setDettagli({...dettagli, email: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.email || '-'}</div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">Descrizione Salone (Visibile ai clienti)</label>
              {isEditing ? (
                <textarea rows={4} value={dettagli.descrizioneGenerale} onChange={e => setDettagli({...dettagli, descrizioneGenerale: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500 resize-none" />
              ) : (
                <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 min-h-[100px]">{dettagli.descrizioneGenerale || '-'}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">URL Logo Salone (Opzionale)</label>
              {isEditing ? (
                <input type="text" placeholder="https://..." value={dettagli.logoUrl || ''} onChange={e => setDettagli({...dettagli, logoUrl: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
              ) : (
                <div className="flex items-center gap-4">
                  {dettagli.logoUrl ? (
                    <img src={dettagli.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover border border-zinc-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-500">
                       <Store size={20} />
                    </div>
                  )}
                  <span className="text-zinc-500 text-sm">{dettagli.logoUrl ? "Logo configurato" : "Nessun logo"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orari' && (
          <div className="space-y-6">
             <h3 className="text-xl font-bold text-zinc-900 mb-1">Orari di Apertura</h3>
             <p className="text-sm text-zinc-500 mb-6">Specifica gli orari standard. Potrai aggiungere eccezioni e festività prossimamente.</p>
             
             <div className="space-y-3">
               {Object.entries(orari).map(([giorno, orario]) => (
                 <div key={giorno} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg max-w-lg">
                    <span className="capitalize font-medium text-zinc-700 w-24">{giorno}</span>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={orario} 
                        onChange={(e) => setOrari({...orari, [giorno]: e.target.value})}
                        className="bg-white border border-zinc-300 rounded-md px-3 py-1.5 text-zinc-900 text-sm focus:outline-none focus:border-fuchsia-500 w-48" 
                      />
                    ) : (
                      <span className={`text-sm ${orario === 'Chiuso' ? 'text-zinc-500' : 'text-zinc-900'}`}>{orario}</span>
                    )}
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'foto' && (
          <div className="space-y-6 text-center py-8">
             <Store size={48} className="mx-auto text-zinc-500 mb-4" />
             <h3 className="text-xl font-bold text-zinc-900">Gestione Foto Sede</h3>
             <p className="text-zinc-500 text-sm max-w-sm mx-auto">
               Questa funzionalità verrà attivata a breve. Potrai caricare le foto del tuo salone che i clienti vedranno durante la prenotazione.
             </p>
          </div>
        )}
          </>
        )}

      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Account Salone</h3>
        <p className="text-zinc-500 mb-6 text-sm">Gestisci l'accesso, il piano e le impostazioni dell'account proprietario.</p>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-zinc-800">Email Proprietario</p>
            <p className="text-sm text-zinc-500">{auth.currentUser?.email || 'admin@salone.it'}</p>
          </div>
          <button className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-sm font-medium rounded-lg transition-colors">
            Modifica Credenziali
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg mt-4">
          <div>
            <p className="text-sm font-medium text-zinc-800">Piano Attuale</p>
            <p className="text-sm text-zinc-500">Piano Base Gratuito</p>
          </div>
          <button className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium rounded-lg transition-colors">
            Scopri i Piani Pro
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-900/90 text-green-300 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl border border-green-800 animate-in fade-in duration-300 z-50">
           <CheckCircle size={20} />
           <span className="font-medium">Impostazioni salvate con successo!</span>
        </div>
      )}
    </div>
    </div>
  );
}
