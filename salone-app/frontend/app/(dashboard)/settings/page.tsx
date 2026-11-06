import { useState, useEffect } from 'react';
import { Store, Clock, Image as ImageIcon, Save, CheckCircle, Settings as SettingsIcon, Loader2, Link as LinkIcon, Copy, ShieldCheck, ExternalLink, AlertTriangle, Download, Smartphone } from 'lucide-react';
import { datiMancanti } from '@/lib/privacy';
import { linkPrenotazione } from '@/lib/domini';
import { salonApi, impostazioniPrivateApi, backupApi, rosyApi } from '@/lib/api-client';
import { contoDelMese, euro, ConsumoMese, DOMANDE_GRATUITE, PREZZO_DOMANDA_EURO, ADDEBITO_ATTIVO } from '@/lib/consumi-ia';
import { auth } from '../../../../../src/lib/firebase';
import { idSalone } from '@/lib/sessione';

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
    logoUrl: '',
    // Il numero su cui le clienti scrivono su WhatsApp (pagina di benvenuto).
    whatsapp: '',
    // Per l'informativa privacy della prenotazione online.
    ragioneSociale: '',
    partitaIva: '',
    emailPrivacy: ''
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
  // Il cellulare a cui arriva l'SMS per ogni nuova richiesta online. Sta in
  // un documento privato, non nella scheda pubblica del salone.
  const [telefonoAvvisi, setTelefonoAvvisi] = useState('');
  const [telefonoAvvisiOriginale, setTelefonoAvvisiOriginale] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      impostazioniPrivateApi.get()
        .then(p => { setTelefonoAvvisi(p.telefono_avvisi || ''); setTelefonoAvvisiOriginale(p.telefono_avvisi || ''); })
        .catch(() => {});
      const data = await salonApi.getSettings();
      if (data) {
        if (data.salonDetails) setDettagli(prev => ({ ...prev, ...data.salonDetails }));
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
      if (telefonoAvvisi !== telefonoAvvisiOriginale) {
        await impostazioniPrivateApi.salva({ telefono_avvisi: telefonoAvvisi });
        setTelefonoAvvisiOriginale(telefonoAvvisi);
      }
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
    setTelefonoAvvisi(telefonoAvvisiOriginale);
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4 sticky top-4 z-40 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 shadow-sm ">
            <div>
              <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3"><SettingsIcon className="text-fuchsia-500" size={28} />Impostazioni</h1>
              <p className="text-zinc-500 mt-1 text-sm">Personalizza i dettagli, gli orari e l'aspetto del tuo salone.</p>
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
          <ImageIcon size={18} /> Foto e sede
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
            <h3 className="text-xl font-bold text-zinc-900">Informazioni salone</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 overflow-hidden w-full">
                <label className="block text-sm font-medium text-zinc-500 mb-2">Link pubblico di prenotazione</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 w-full overflow-hidden">
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-fuchsia-600/10 text-fuchsia-500 flex items-center justify-center shrink-0">
                      <LinkIcon size={20} />
                    </div>
                    <div className="flex flex-col overflow-hidden w-full">
                      <p className="text-sm font-medium text-zinc-900 truncate w-full">
                        {linkPrenotazione((idSalone() || auth.currentUser?.uid) || 'ID_SALONE', window.location.origin)}
                      </p>
                      <p className="text-xs text-zinc-500 pt-0.5 mt-1 truncate">Condividi sui social.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const link = linkPrenotazione((idSalone() || auth.currentUser?.uid) || '', window.location.origin);
                      navigator.clipboard.writeText(link);
                      alert('Link copiato!');
                    }}
                    className="shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-sm font-medium transition-colors border border-zinc-300 mt-2 sm:mt-0"
                  >
                    <Copy size={16} /> <span>Copia link</span>
                  </button>
                </div>
                <div className="h-px bg-zinc-100 my-6"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Nome salone</label>
                {isEditing ? (
                  <input type="text" value={dettagli.nomeSalone} onChange={e => setDettagli({...dettagli, nomeSalone: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.nomeSalone || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Indirizzo</label>
                {isEditing ? (
                  <input type="text" value={dettagli.indirizzo} onChange={e => setDettagli({...dettagli, indirizzo: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.indirizzo || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Telefono</label>
                {isEditing ? (
                  <input type="text" value={dettagli.telefono} onChange={e => setDettagli({...dettagli, telefono: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.telefono || '-'}</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Cellulare per gli avvisi</label>
                {isEditing ? (
                  <input type="tel" inputMode="tel" placeholder="Es. 333 123 4567" value={telefonoAvvisi} onChange={e => setTelefonoAvvisi(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{telefonoAvvisi || '-'}</div>
                )}
                <p className="text-xs text-zinc-500 mt-1.5">Riceve un SMS per ogni nuova richiesta di appuntamento online. Non è visibile alle clienti.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">WhatsApp del salone</label>
                {isEditing ? (
                  <input type="tel" inputMode="tel" placeholder="Es. 347 123 4567" value={(dettagli as any).whatsapp || ''} onChange={e => setDettagli({...dettagli, whatsapp: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{(dettagli as any).whatsapp || '-'}</div>
                )}
                <p className="text-xs text-zinc-500 mt-1.5">Compare come "Scrivici su WhatsApp" nella pagina di prenotazione. Se è vuoto si usa il telefono, solo se è un cellulare.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">Email pubblica</label>
                {isEditing ? (
                  <input type="email" value={dettagli.email} onChange={e => setDettagli({...dettagli, email: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                ) : (
                  <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700">{dettagli.email || '-'}</div>
                )}
              </div>
            </div>
            {/* Dati legali: servono all'informativa privacy che la cliente
                legge prima di prenotare online. */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2"><ShieldCheck size={18} className="text-fuchsia-600" /> Dati legali e privacy</h3>
                <a
                  href={`/${idSalone() || auth.currentUser?.uid}/privacy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-fuchsia-700 hover:text-fuchsia-600"
                >
                  Vedi l'informativa <ExternalLink size={14} />
                </a>
              </div>
              {datiMancanti(dettagli).length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>Per completare l'informativa privacy mancano: {datiMancanti(dettagli).join(', ')}.</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Ragione sociale</label>
                  {isEditing ? (
                    <input type="text" placeholder="Es. RD Salon di Mario Rossi" value={(dettagli as any).ragioneSociale || ''} onChange={e => setDettagli({...dettagli, ragioneSociale: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                  ) : (
                    <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 break-words">{(dettagli as any).ragioneSociale || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Partita IVA</label>
                  {isEditing ? (
                    <input type="text" placeholder="Es. 01234567890" value={(dettagli as any).partitaIva || ''} onChange={e => setDettagli({...dettagli, partitaIva: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                  ) : (
                    <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 break-words">{(dettagli as any).partitaIva || '-'}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-2">Email per le richieste privacy</label>
                  {isEditing ? (
                    <input type="email" placeholder="Se vuota si usa l’email pubblica" value={(dettagli as any).emailPrivacy || ''} onChange={e => setDettagli({...dettagli, emailPrivacy: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500" />
                  ) : (
                    <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 break-words">{(dettagli as any).emailPrivacy || '-'}</div>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-500 mt-2">L'informativa usa anche nome, indirizzo e telefono scritti qui sopra. È una bozza: falla controllare a chi segue la privacy del salone.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">Descrizione del salone (visibile alle clienti)</label>
              {isEditing ? (
                <textarea rows={4} value={dettagli.descrizioneGenerale} onChange={e => setDettagli({...dettagli, descrizioneGenerale: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-2.5 text-zinc-900 focus:outline-none focus:border-fuchsia-500 resize-none" />
              ) : (
                <div className="bg-white px-4 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 min-h-[100px]">{dettagli.descrizioneGenerale || '-'}</div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-2">Indirizzo del logo (facoltativo)</label>
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
                  <span className="text-zinc-500 mt-1 text-sm">{dettagli.logoUrl ? "Logo configurato" : "Nessun logo"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orari' && (
          <div className="space-y-6">
             <h3 className="text-xl font-bold text-zinc-900 mb-1">Orari di apertura</h3>
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
             <h3 className="text-xl font-bold text-zinc-900">Foto del salone</h3>
             <p className="text-zinc-500 text-sm max-w-sm mx-auto">
               Questa funzionalità verrà attivata a breve. Potrai caricare le foto del tuo salone che i clienti vedranno durante la prenotazione.
             </p>
          </div>
        )}
          </>
        )}

      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
        <h3 className="text-xl font-bold text-zinc-900 mb-2">Account salone</h3>
        <p className="text-zinc-500 mb-6 text-sm">Gestisci l'accesso, il piano e le impostazioni dell'account proprietario.</p>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-zinc-800">Email proprietario</p>
            <p className="text-sm text-zinc-500">{auth.currentUser?.email || 'admin@salone.it'}</p>
          </div>
          <button
            disabled
            title="L'accesso avviene con l'account Google: le credenziali si gestiscono da lì."
            className="px-4 py-2 bg-zinc-100 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            Gestita da Google
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg mt-4">
          <div>
            <p className="text-sm font-medium text-zinc-800">Piano attuale</p>
            <p className="text-sm text-zinc-500">Piano base gratuito</p>
          </div>
          <button
            disabled
            title="Funzione non ancora disponibile"
            className="px-4 py-2 bg-zinc-100 text-zinc-400 text-sm font-medium rounded-lg cursor-not-allowed"
          >
            Piani in arrivo
          </button>
        </div>
      </div>

      <InstallaApp />

      <ConsumiIA />

      <BackupDati />

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

/** Scarica una copia di tutti i dati del salone. */
function BackupDati() {
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);

  const scarica = async () => {
    setInCorso(true);
    setEsito(null);
    try {
      const { file, nome, conteggi } = await backupApi.esporta();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setEsito(`Backup scaricato: ${conteggi.clienti} clienti, ${conteggi.appuntamenti} appuntamenti, ${conteggi.buoni} buoni.`);
    } catch (err: any) {
      setEsito(`Backup non riuscito: ${err?.message || 'errore sconosciuto'}.`);
    } finally {
      setInCorso(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Backup dei dati</h3>
      <p className="text-zinc-500 mb-4 text-sm">
        Scarica in un file una copia di clienti, appuntamenti, buoni, listino, operatrici e registro SMS.
        Conservalo sul computer o su Google Drive. Basta farlo una volta al mese: legge tutti i dati, quindi non serve ogni giorno.
      </p>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 bg-white border border-zinc-200 rounded-lg">
        <p className="text-sm text-zinc-600">{esito || 'Il file si apre con qualunque editor di testo.'}</p>
        <button
          onClick={scarica}
          disabled={inCorso}
          className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center gap-2 shrink-0"
        >
          {inCorso ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {inCorso ? 'Preparo il file…' : 'Scarica backup'}
        </button>
      </div>
    </div>
  );
}

const nomeMese = (m: string) => {
  const [a, mm] = m.split('-').map(Number);
  const t = new Date(a, (mm || 1) - 1, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/**
 * Quanto si è usata Rosy (l'IA) e quanto costa: domande gratuite del mese,
 * domande in più e importo che verrà addebitato a fine mese. Sola lettura.
 */
function ConsumiIA() {
  const [mesi, setMesi] = useState<ConsumoMese[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    rosyApi.consumi().then(setMesi).catch((e: any) => setErrore(e?.message || 'Consumi non disponibili.'));
  }, []);

  const corrente = mesi?.[0];
  const conto = contoDelMese(corrente);
  const percentuale = Math.min(100, Math.round((conto.domande / Math.max(1, conto.gratuite)) * 100));
  const coloreBarra = conto.stato === 'oltre' ? 'bg-amber-500' : conto.stato === 'quasi' ? 'bg-amber-400' : 'bg-fuchsia-500';

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Consumi di Rosy (IA)</h3>
      <p className="text-zinc-500 mb-4 text-sm">
        {ADDEBITO_ATTIVO
          ? <>Ogni mese {DOMANDE_GRATUITE} domande a Rosy sono incluse. Oltre, ogni domanda costa {euro(PREZZO_DOMANDA_EURO)} e l'importo viene addebitato a fine mese. Rosy non si blocca mai.</>
          : <>Quante domande sono state fatte a Rosy, mese per mese.</>}
      </p>

      {errore && <p className="text-sm text-red-600">{errore}</p>}
      {!errore && !mesi && <p className="text-sm text-zinc-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carico i consumi…</p>}

      {corrente && !ADDEBITO_ATTIVO && (
        <div className="p-4 border border-zinc-200 rounded-lg flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-zinc-800">{nomeMese(corrente.mese)}</p>
          <p className="text-sm text-zinc-600"><strong className="text-zinc-900">{corrente.domande}</strong> {corrente.domande === 1 ? 'domanda' : 'domande'} a Rosy</p>
          {mesi!.slice(1).some(m => m.domande > 0) && (
            <p className="w-full text-xs text-zinc-500">
              Mesi precedenti: {mesi!.slice(1).filter(m => m.domande > 0).map(m => `${nomeMese(m.mese)} ${m.domande}`).join(' · ')}
            </p>
          )}
        </div>
      )}

      {corrente && ADDEBITO_ATTIVO && (
        <>
          <div className="p-4 border border-zinc-200 rounded-lg">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-zinc-800">{nomeMese(corrente.mese)}</p>
              <p className="text-sm text-zinc-600">
                <strong className="text-zinc-900">{conto.domande}</strong> domande su {conto.gratuite} incluse
              </p>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className={`h-full ${coloreBarra}`} style={{ width: `${percentuale}%` }} />
            </div>
            <p className="text-sm mt-3 text-zinc-600">
              {conto.stato === 'oltre'
                ? <>Quota superata di <strong>{conto.extra}</strong> domande: a fine mese verranno addebitati <strong className="text-zinc-900">{euro(conto.da_addebitare)}</strong>.</>
                : conto.stato === 'quasi'
                  ? <>Restano <strong>{conto.restanti}</strong> domande incluse questo mese.</>
                  : <>Restano {conto.restanti} domande incluse questo mese. Niente da pagare.</>}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mesi!.slice(1).filter(m => m.domande > 0).map(m => {
              const c = contoDelMese(m);
              return (
                <div key={m.mese} className="p-3 border border-zinc-200 rounded-lg">
                  <p className="text-sm font-medium text-zinc-800">{nomeMese(m.mese)}</p>
                  <p className="text-xs text-zinc-500 mt-1">{c.domande} domande · {c.extra > 0 ? `addebito ${euro(c.da_addebitare)}` : 'nella quota'}</p>
                </div>
              );
            })}
          </div>

        </>
      )}
    </div>
  );
}

/**
 * Il gestionale come app sul telefono, sul tablet o sul computer: niente
 * store, si installa dal browser e si apre dall'icona, a schermo intero.
 * Su Android e sul computer (Chrome, Edge) c'è il pulsante; su iPhone e iPad
 * si fa da Safari, e qui si spiega come.
 */
function InstallaApp() {
  const [richiesta, setRichiesta] = useState<any>(null);
  const [installata, setInstallata] = useState(() => {
    try { return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true; }
    catch { return false; }
  });
  const iPhone = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const pronta = (e: Event) => { e.preventDefault(); setRichiesta(e); };
    const fatta = () => { setInstallata(true); setRichiesta(null); };
    window.addEventListener('beforeinstallprompt', pronta);
    window.addEventListener('appinstalled', fatta);
    return () => {
      window.removeEventListener('beforeinstallprompt', pronta);
      window.removeEventListener('appinstalled', fatta);
    };
  }, []);

  const installa = async () => {
    if (!richiesta) return;
    richiesta.prompt();
    try { const scelta = await richiesta.userChoice; if (scelta?.outcome === 'accepted') setInstallata(true); } catch { /* niente */ }
    setRichiesta(null);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xl w-full">
      <h3 className="text-xl font-bold text-zinc-900 mb-2 flex items-center gap-2"><Smartphone size={20} className="text-fuchsia-600" /> App sul telefono</h3>
      <p className="text-zinc-500 mb-4 text-sm">
        Il gestionale si installa come un'app su telefono, tablet e computer: si apre dall'icona, a schermo intero, senza passare dagli store.
        Va installato su ogni dispositivo, ed entra con lo stesso account.
      </p>
      <div className="p-4 border border-zinc-200 rounded-lg text-sm text-zinc-700">
        {installata ? (
          <p className="flex items-center gap-2"><CheckCircle size={16} className="text-emerald-600" /> Stai già usando l'app installata.</p>
        ) : richiesta ? (
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
            <p>Questo dispositivo può installarla con un tocco.</p>
            <button onClick={installa} className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shrink-0">
              <Download size={16} /> Installa l'app
            </button>
          </div>
        ) : iPhone ? (
          <p>Su iPhone e iPad: apri il gestionale con <strong>Safari</strong>, tocca <strong>Condividi</strong> (il quadrato con la freccia) e poi <strong>Aggiungi alla schermata Home</strong>.</p>
        ) : (
          <p>Su Android: apri il gestionale con <strong>Chrome</strong>, tocca il menu <strong>⋮</strong> e poi <strong>Installa app</strong> (o "Aggiungi a schermata Home"). Sul computer: icona di installazione a destra nella barra degli indirizzi di Chrome o Edge.</p>
        )}
      </div>
    </div>
  );
}
