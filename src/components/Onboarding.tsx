import { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { dipendentiApi } from '../../salone-app/frontend/lib/api-client';
import { LogOut, ArrowRight, ArrowLeft, Upload, Check, SkipForward } from 'lucide-react';

interface OnboardingProps {
  user: User;
  onComplete: () => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Wizard state
  const [step, setStep] = useState(1);
  
  // Form State
  const [salonData, setSalonData] = useState({
    nomeSalone: '',
    orarioApertura: '09:00',
    orarioChiusura: '19:00',
    giorniChiusura: 'Domenica',
  });
  
  // Team state
  const [teamMembers, setTeamMembers] = useState([{ nome: '', email: '' }]);
  
  // Catalog / Import Preferences
  const [importazioneClienti, setImportazioneClienti] = useState<'subito_file' | 'dopo'>('dopo');
  const [costruzioneCatalogo, setCostruzioneCatalogo] = useState<'subito' | 'dopo'>('dopo');

  useEffect(() => {
    async function checkUserPlan() {
      try {
        const docRef = doc(db, 'salons', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().plan) {
          onComplete(); // Already onboarded
        } else {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error("Error checking user plan:", error);
        setNeedsOnboarding(true);
      } finally {
        setLoading(false);
      }
    }
    
    checkUserPlan();
  }, [user, onComplete]);

  const selectPlanAndFinish = async (plan: 'free' | 'base' | 'pro' | 'elite') => {
    setSaving(true);
    try {
      const docRef = doc(db, 'salons', user.uid);
      const activeTeamMembers = teamMembers.filter(m => m.nome.trim() !== '');
      
      // Le regole del database vietano di riscrivere createdAt: se il salone
      // esiste già (onboarding rifatto) va lasciato quello originale, altrimenti
      // il salvataggio viene rifiutato in blocco.
      const esistente = await getDoc(docRef);

      const payload: any = {
        ownerEmail: user.email,
        ownerName: user.displayName || null,
        plan: plan,
        salonDetails: salonData,
        teamSetup: activeTeamMembers,
        importPreferences: {
          clienti: importazioneClienti,
          catalogo: costruzioneCatalogo
        },
        settings: {
          marketingEnabled: plan !== 'base' && plan !== 'free'
        }
      };

      if (!esistente.exists()) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(docRef, payload, { merge: true });
      
      // Also save Real DB entries
      for (const member of activeTeamMembers) {
        await dipendentiApi.create({
          nome: member.nome,
          cognome: '',
          ruolo: 'Operatore'
        }).catch(err => console.log('Dipendente creation non bloccante:', err));
      }

      onComplete();
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-600 font-medium">Verifica in corso...</div>
      </div>
    );
  }

  if (!needsOnboarding) return null;

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { nome: '', email: '' }]);
  };

  const updateTeamMember = (index: number, key: keyof typeof teamMembers[0], value: string) => {
    const newTeam = [...teamMembers];
    newTeam[index][key] = value;
    setTeamMembers(newTeam);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold font-sans text-gray-900 mb-2">Informazioni Base Salone</h2>
            <p className="text-gray-500 text-sm mb-8">Iniziamo configurando i dettagli principali. <span className="text-fuchsia-600 font-medium">Tranquillo, potrai modificare tutto freely in seguito!</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome del Salone</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Il tuo bellissimo salone"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none"
                  value={salonData.nomeSalone}
                  onChange={e => setSalonData({...salonData, nomeSalone: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orario Apertura</label>
                  <input 
                    type="time" 
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-fuchsia-500 outline-none"
                    value={salonData.orarioApertura}
                    onChange={e => setSalonData({...salonData, orarioApertura: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orario Chiusura</label>
                  <input 
                    type="time" 
                    className="w-full p-3 border border-gray-200 rounded-lg focus:border-fuchsia-500 outline-none"
                    value={salonData.orarioChiusura}
                    onChange={e => setSalonData({...salonData, orarioChiusura: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={nextStep} className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
                Avanti <ArrowRight size={18} />
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold font-sans text-gray-900 mb-2">Il Tuo Team</h2>
            <p className="text-gray-500 text-sm mb-6">Quante persone lavorano nella tua azienda? Inserisci i nomi degli operatori. Puoi inserire l'email per dargli accesso o farlo dopo.</p>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-4">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Nome Operatore</label>
                    <input 
                      type="text" 
                      placeholder="Es. Marco"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none text-sm"
                      value={member.nome}
                      onChange={e => updateTeamMember(idx, 'nome', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Email <span className="font-normal">(Opzionale)</span></label>
                    <input 
                      type="email" 
                      placeholder="marco@salone.it"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none text-sm"
                      value={member.email}
                      onChange={e => updateTeamMember(idx, 'email', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addTeamMember} className="mt-4 text-fuchsia-600 text-sm font-medium hover:text-fuchsia-500">
              + Aggiungi un altro operatore
            </button>

            <div className="mt-8 flex justify-between">
              <button onClick={prevStep} className="text-gray-500 px-4 py-3 hover:bg-gray-100 rounded-lg">Indietro</button>
              <button onClick={nextStep} className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
                Avanti <ArrowRight size={18} />
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
             <h2 className="text-2xl font-bold font-sans text-gray-900 mb-2">Importazione & Dati</h2>
             <p className="text-gray-500 text-sm mb-8">Vuoi caricare i tuoi dati ora o fare tutto in futuro con calma?</p>
             
             <div className="space-y-6">
                <div>
                  <h3 className="text-gray-900 font-medium mb-3">Database Clienti</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setImportazioneClienti('subito_file')}
                      className={`border p-4 rounded-xl cursor-pointer flex gap-3 transition-colors ${importazioneClienti === 'subito_file' ? 'border-fuchsia-500 bg-fuchsia-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Upload className={importazioneClienti === 'subito_file' ? 'text-fuchsia-600' : 'text-gray-400'} size={24} />
                      <div>
                        <div className={`font-medium ${importazioneClienti === 'subito_file' ? 'text-fuchsia-900' : 'text-gray-700'}`}>Ho un PDF / Excel</div>
                        <div className="text-xs text-gray-500 mt-1">Carica un file per importare i clienti.</div>
                      </div>
                    </div>
                    <div 
                      onClick={() => setImportazioneClienti('dopo')}
                      className={`border p-4 rounded-xl cursor-pointer flex gap-3 transition-colors ${importazioneClienti === 'dopo' ? 'border-fuchsia-500 bg-fuchsia-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <SkipForward className={importazioneClienti === 'dopo' ? 'text-fuchsia-600' : 'text-gray-400'} size={24} />
                      <div>
                        <div className={`font-medium ${importazioneClienti === 'dopo' ? 'text-fuchsia-900' : 'text-gray-700'}`}>Salto questo step (Faccio dopo)</div>
                        <div className="text-xs text-gray-500 mt-1">Nessun file pronto. Inizierò da zero.</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 font-medium mb-3">Catalogo Prodotti</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                      onClick={() => setCostruzioneCatalogo('subito')}
                      className={`border p-4 rounded-xl cursor-pointer flex gap-3 transition-colors ${costruzioneCatalogo === 'subito' ? 'border-fuchsia-500 bg-fuchsia-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Check className={costruzioneCatalogo === 'subito' ? 'text-fuchsia-600' : 'text-gray-400'} size={24} />
                      <div>
                        <div className={`font-medium ${costruzioneCatalogo === 'subito' ? 'text-fuchsia-900' : 'text-gray-700'}`}>Costruisci ora</div>
                        <div className="text-xs text-gray-500 mt-1">Inizia ad inserire i prodotti o i prezzi dei servizi.</div>
                      </div>
                    </div>
                    <div 
                      onClick={() => setCostruzioneCatalogo('dopo')}
                      className={`border p-4 rounded-xl cursor-pointer flex gap-3 transition-colors ${costruzioneCatalogo === 'dopo' ? 'border-fuchsia-500 bg-fuchsia-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <SkipForward className={costruzioneCatalogo === 'dopo' ? 'text-fuchsia-600' : 'text-gray-400'} size={24} />
                      <div>
                        <div className={`font-medium ${costruzioneCatalogo === 'dopo' ? 'text-fuchsia-900' : 'text-gray-700'}`}>Più avanti</div>
                        <div className="text-xs text-gray-500 mt-1">Configurerai i servizi in un secondo momento.</div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>

             <div className="mt-8 flex justify-between">
              <button onClick={prevStep} className="text-gray-500 px-4 py-3 hover:bg-gray-100 rounded-lg">Indietro</button>
              <button onClick={nextStep} className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors">
                Vai ai Piani <ArrowRight size={18} />
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold font-sans text-gray-900 tracking-tight mb-4">Scegli il piano per il tuo Salone</h1>
              <p className="text-gray-500 font-sans max-w-xl mx-auto">
                L'ultimo step. Seleziona il piano più adatto per scalare il tuo business.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {/* Piano BASE */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col hover:border-gray-200 transition-colors">
                <h3 className="text-xl font-bold text-gray-900 mb-2">BASE</h3>
                <p className="text-gray-500 text-sm mb-6 flex-grow">Gestionale completo e promemoria base contro i no-show.</p>
                <div className="text-3xl font-bold mb-6">€29<span className="text-lg text-gray-500 font-normal">/mese</span></div>
                <ul className="space-y-3 mb-8 text-sm text-gray-600">
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Clienti illimitati</li>
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Agenda & Storico note</li>
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Promemoria (base)</li>
                </ul>
                <button 
                  onClick={() => selectPlanAndFinish('base')}
                  disabled={saving}
                  className="w-full bg-black text-white hover:bg-gray-800 transition-colors py-3 rounded-lg font-medium"
                >
                  Inizia con Base
                </button>
              </div>

              {/* Piano PRO */}
              <div className="bg-black rounded-2xl shadow-xl p-8 flex flex-col relative transform md:-translate-y-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">Più Scelto</div>
                <h3 className="text-xl font-bold text-white mb-2">PRO</h3>
                <p className="text-gray-300 text-sm mb-6 flex-grow">Marketing generativo e automazioni.</p>
                <div className="text-3xl font-bold mb-6 text-white">€49<span className="text-lg text-gray-400 font-normal">/mese</span></div>
                <ul className="space-y-3 mb-8 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-white">✓</span> Tutto quello del Base</li>
                  <li className="flex items-start gap-2"><span className="text-white">✓</span> Marketing generativo AI</li>
                  <li className="flex items-start gap-2"><span className="text-white">✓</span> Recupero clienti inattivi</li>
                </ul>
                <button 
                  onClick={() => selectPlanAndFinish('pro')}
                  disabled={saving}
                  className="w-full bg-white text-black hover:bg-gray-100 transition-colors py-3 rounded-lg font-medium"
                >
                  Scegli Pro
                </button>
              </div>

              {/* Piano ELITE */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col hover:border-gray-200 transition-colors">
                <h3 className="text-xl font-bold text-gray-900 mb-2">ELITE</h3>
                <p className="text-gray-500 text-sm mb-6 flex-grow">L'AI come copilota proattivo del tuo salone.</p>
                <div className="text-3xl font-bold mb-6">€89<span className="text-lg text-gray-500 font-normal">/mese</span></div>
                <ul className="space-y-3 mb-8 text-sm text-gray-600">
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Tutto quello del Pro</li>
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Copilota proattivo</li>
                  <li className="flex items-start gap-2"><span className="text-black">✓</span> Priorità</li>
                </ul>
                <button 
                  onClick={() => selectPlanAndFinish('elite')}
                  disabled={saving}
                  className="w-full bg-black text-white hover:bg-gray-800 transition-colors py-3 rounded-lg font-medium"
                >
                  Passa a Elite
                </button>
              </div>
            </div>

            <div className="text-center flex items-center justify-between">
              <button onClick={prevStep} className="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-1"><ArrowLeft size={16} /> Indietro</button>
              <button 
                onClick={() => selectPlanAndFinish('free')}
                disabled={saving}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 underline transition-colors"
              >
                Oppure continua con la versione di prova gratuita
              </button>
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: '#fcfcfc' }}>
      <button 
        onClick={handleLogout}
        className="absolute top-6 right-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
      >
        <LogOut size={16} />
        <span className="text-sm font-medium">Esci</span>
      </button>

      {/* Progress tracking */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
             <div className={`w-2.5 h-2.5 rounded-full ${step >= s ? 'bg-fuchsia-600' : 'bg-gray-200'}`} />
             {s < 4 && <div className={`w-8 h-[2px] ${step > s ? 'bg-fuchsia-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-4xl w-full mx-auto" style={{
        maxWidth: step === 4 ? '1000px' : '500px'
      }}>
        {renderStepContent()}
      </div>
    </div>
  );
}
