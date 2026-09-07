import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import GestioneCatalogo from '@/app/(dashboard)/catalogo/page';
import PaginaReport from '@/app/(dashboard)/report/page';
import GestioneDipendenti from '@/app/(dashboard)/dipendenti/page';
import GestioneClienti from '@/app/(dashboard)/clienti/page';
import SchedaCliente from '@/app/(dashboard)/clienti/[id]/page';
import PaginaAgenda from '@/app/(dashboard)/agenda/page';
import SettingsPage from '@/app/(dashboard)/settings/page';
import ProdottiPage from '@/app/(dashboard)/prodotti/page';
import AutomazioniPage from '@/app/(dashboard)/automazioni/page';
import BuoniSpa from '@/app/(dashboard)/buoni-spa/page';
import DashboardHub from '@/app/(dashboard)/hub/page';
import RosieHub from '@/app/(dashboard)/rosie/page';
import PrenotazionePubblica from '@/app/(public)/[salonId]/prenota/page';
import Onboarding from './components/Onboarding';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, User } from 'firebase/auth';
import { auth } from './lib/firebase';

/** Traduce i codici di Firebase in qualcosa che si capisce e si può risolvere. */
function spiegaErroreAccesso(error: any): string {
  const codice = error?.code || '';
  switch (codice) {
    case 'auth/unauthorized-domain':
      return `Questo indirizzo (${window.location.hostname}) non è fra quelli autorizzati in Firebase. Va aggiunto in Firebase → Authentication → Settings → Authorized domains.`;
    case 'auth/operation-not-allowed':
      return "L'accesso con Google non è attivo su questo progetto Firebase. Va acceso in Firebase → Authentication → Sign-in method → Google.";
    case 'auth/popup-blocked':
      return 'Il browser ha bloccato la finestra di Google. Consenti le finestre a comparsa per questo sito e riprova.';
    case 'auth/network-request-failed':
      return 'Non riesco a raggiungere Google. Controlla la connessione e riprova.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'La chiave di Firebase non è valida: la configurazione del progetto non è corretta.';
    default:
      return `Accesso non riuscito${codice ? ` (${codice})` : ''}. ${error?.message || ''}`.trim();
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [erroreAccesso, setErroreAccesso] = useState<string | null>(null);
  const [accessoInCorso, setAccessoInCorso] = useState(false);

  useEffect(() => {
    // Se l'accesso e avvenuto con il reindirizzamento (telefono, oppure
    // finestrella bloccata) il risultato arriva al ritorno sulla pagina.
    getRedirectResult(auth).catch(err => setErroreAccesso(spiegaErroreAccesso(err)));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setErroreAccesso(null);
    setAccessoInCorso(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      const codice = error?.code || '';
      // Se la finestrella e bloccata dal browser si riprova reindirizzando:
      // e anche il modo che funziona meglio sul telefono.
      if (codice === 'auth/popup-blocked' || codice === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (err2: any) {
          setErroreAccesso(spiegaErroreAccesso(err2));
        }
      } else if (codice !== 'auth/cancelled-popup-request' && codice !== 'auth/popup-closed-by-user') {
        setErroreAccesso(spiegaErroreAccesso(error));
      }
    } finally {
      setAccessoInCorso(false);
    }
  };

  // Check if it's a public booking route: "/anything/prenota"
  const isPublicRoute = window.location.pathname.endsWith('/prenota');

  if (isPublicRoute) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/:salonId/prenota" element={<PrenotazionePubblica />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white flex-col gap-4">
        <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium tracking-tight">Caricamento app...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center border border-zinc-200">
          <div className="w-16 h-16 bg-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-900/20">
            <span className="text-3xl font-playfair font-bold text-white">R</span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-zinc-900 mb-2 tracking-tight">Accedi a Rosy</h1>
          <p className="text-zinc-500 mb-8 font-sans text-sm">Gestisci il tuo salone, clienti e appuntamenti, sincronizzato sul cloud.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-50 transition-colors py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 bg-white rounded-full" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            {accessoInCorso ? 'Attendi...' : 'Accedi con Google'}
          </button>

          {erroreAccesso && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
              <p className="text-sm text-red-700 leading-relaxed">{erroreAccesso}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!onboardingComplete) {
    return <Onboarding user={user} onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardHub />} />
          <Route path="/rosie" element={<RosieHub />} />
          <Route path="/agenda" element={<PaginaAgenda />} />
          <Route path="/catalogo" element={<GestioneCatalogo />} />
          <Route path="/report" element={<PaginaReport />} />
          <Route path="/dipendenti" element={<GestioneDipendenti />} />
          <Route path="/clienti" element={<GestioneClienti />} />
          <Route path="/clienti/:id" element={<SchedaCliente />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/prodotti" element={<ProdottiPage />} />
          <Route path="/automazioni" element={<AutomazioniPage />} />
          <Route path="/buoni-spa" element={<BuoniSpa />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
