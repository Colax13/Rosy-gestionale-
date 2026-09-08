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
import SchermataAccesso from './components/SchermataAccesso';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { apriSessione, chiudiSessione, Sessione, puoAprirePercorso, primaPaginaPermessa } from '@/lib/sessione';
import { Navigate } from 'react-router-dom';

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
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Indirizzo o password non corretti. Se non li ricordi, chiedi alla titolare di rifarteli.';
    case 'auth/too-many-requests':
      return 'Troppi tentativi di fila. Aspetta qualche minuto e riprova.';
    case 'auth/invalid-email':
      return "L'indirizzo non è scritto in modo valido.";
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

  // Chi è entrato e che cosa gli è permesso: si risolve dopo l'accesso, prima
  // di aprire il programma, perché da lì dipende quali dati si vanno a leggere.
  const [sessione, setSessione] = useState<Sessione | null>(null);

  // Le operatrici entrano con indirizzo e password, non con Google.
  const [modoOperatrice, setModoOperatrice] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Se l'accesso e avvenuto con il reindirizzamento (telefono, oppure
    // finestrella bloccata) il risultato arriva al ritorno sulla pagina.
    getRedirectResult(auth).catch(err => setErroreAccesso(spiegaErroreAccesso(err)));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        chiudiSessione();
        setSessione(null);
        setLoading(false);
        return;
      }
      try {
        setSessione(await apriSessione(
          currentUser.uid,
          currentUser.displayName || currentUser.email || 'Operatrice'
        ));
      } catch (err: any) {
        setErroreAccesso(err?.message || 'Non sono riuscito ad aprire la sessione.');
        await signOut(auth);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginOperatrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroreAccesso(null);
    setAccessoInCorso(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error: any) {
      setErroreAccesso(spiegaErroreAccesso(error));
    } finally {
      setAccessoInCorso(false);
    }
  };

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
  const isPublicRoute = window.location.pathname.endsWith('/prenota') || window.location.search.includes('anteprima');

  if (isPublicRoute) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/:salonId/prenota" element={<PrenotazionePubblica />} />
          <Route path="/hub" element={<Layout><DashboardHub /></Layout>} />
          <Route path="/rosie" element={<Layout><RosieHub /></Layout>} />
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
      <SchermataAccesso
        modoOperatrice={modoOperatrice}
        setModoOperatrice={setModoOperatrice}
        accessoInCorso={accessoInCorso}
        erroreAccesso={erroreAccesso}
        setErroreAccesso={setErroreAccesso}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onGoogle={handleLogin}
        onOperatrice={handleLoginOperatrice}
      />
    );
  }

  // L'avvio guidato riguarda chi apre il salone, non chi ci lavora.
  if (!onboardingComplete && sessione?.titolare !== false) {
    return <Onboarding user={user} onComplete={() => setOnboardingComplete(true)} />;
  }

  // Una pagina che non le è concessa non si apre nemmeno scrivendola a mano
  // nell'indirizzo: si torna alla prima che può vedere. Il muro vero sono le
  // regole del database, questo serve a non far vedere pagine vuote.
  const Protetta = ({ percorso, children }: { percorso: string; children: React.ReactNode }) =>
    puoAprirePercorso(percorso) ? <>{children}</> : <Navigate to={primaPaginaPermessa()} replace />;

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Protetta percorso="/"><DashboardHub /></Protetta>} />
          <Route path="/rosie" element={<Protetta percorso="/rosie"><RosieHub /></Protetta>} />
          <Route path="/agenda" element={<Protetta percorso="/agenda"><PaginaAgenda /></Protetta>} />
          <Route path="/catalogo" element={<Protetta percorso="/catalogo"><GestioneCatalogo /></Protetta>} />
          <Route path="/report" element={<Protetta percorso="/report"><PaginaReport /></Protetta>} />
          <Route path="/dipendenti" element={<Protetta percorso="/dipendenti"><GestioneDipendenti /></Protetta>} />
          <Route path="/clienti" element={<Protetta percorso="/clienti"><GestioneClienti /></Protetta>} />
          <Route path="/clienti/:id" element={<Protetta percorso="/clienti"><SchedaCliente /></Protetta>} />
          <Route path="/settings" element={<Protetta percorso="/settings"><SettingsPage /></Protetta>} />
          <Route path="/prodotti" element={<Protetta percorso="/prodotti"><ProdottiPage /></Protetta>} />
          <Route path="/automazioni" element={<Protetta percorso="/automazioni"><AutomazioniPage /></Protetta>} />
          <Route path="/buoni-spa" element={<Protetta percorso="/buoni-spa"><BuoniSpa /></Protetta>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
