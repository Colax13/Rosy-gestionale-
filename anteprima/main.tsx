// Punto d'ingresso dell'anteprima: monta le pagine vere dentro il Layout vero,
// con i dati finti. Serve a guardare le schermate prima di dire che sono a posto.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '../src/index.css';
import Layout from '../src/components/Layout';
import SchermataAccesso from '../src/components/SchermataAccesso';
import { impostaSessione, PAGINE_CONCEDIBILI } from '@/lib/sessione';

import DashboardHub from '@/app/(dashboard)/hub/page';
import RosieHub from '@/app/(dashboard)/rosie/page';
import PaginaAgenda from '@/app/(dashboard)/agenda/page';
import GestioneCatalogo from '@/app/(dashboard)/catalogo/page';
import PaginaReport from '@/app/(dashboard)/report/page';
import GestioneDipendenti from '@/app/(dashboard)/dipendenti/page';
import GestioneClienti from '@/app/(dashboard)/clienti/page';
import SchedaCliente from '@/app/(dashboard)/clienti/[id]/page';
import SettingsPage from '@/app/(dashboard)/settings/page';
import ProdottiPage from '@/app/(dashboard)/prodotti/page';
import AutomazioniPage from '@/app/(dashboard)/automazioni/page';
import BuoniSpa from '@/app/(dashboard)/buoni-spa/page';
import PrenotazionePubblica from '@/app/(public)/[salonId]/prenota/page';

// ?tema=scuro apre direttamente in modalità scura. Si passa dalla memoria del
// browser, la stessa che usa il programma, così si prova la strada vera.
const tema = new URLSearchParams(location.search).get('tema');
if (tema === 'scuro') localStorage.setItem('theme', 'dark');
if (tema === 'chiaro') localStorage.setItem('theme', 'light');
document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark');

// ?ruolo=operatrice apre l'anteprima con i permessi ridotti, per vedere che
// cosa vede davvero chi non è la titolare. Senza, si è la titolare.
const ruolo = new URLSearchParams(location.search).get('ruolo');
const permessiFinti = (new URLSearchParams(location.search).get('permessi') || 'agenda,clienti')
  .split(',').filter(Boolean) as any;
impostaSessione(ruolo === 'operatrice'
  ? { uid: 'u2', salonId: 'salone', titolare: false, nome: 'Giulia', permessi: permessiFinti }
  : { uid: 'salone', salonId: 'salone', titolare: true, nome: 'Rosanna', permessi: null });

/** Solo per guardarla: la schermata di accesso senza Firebase dietro. */
function AnteprimaAccesso() {
  const [modoOperatrice, setModoOperatrice] = useState(
    new URLSearchParams(location.search).get('modo') === 'operatrice'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <SchermataAccesso
      modoOperatrice={modoOperatrice}
      setModoOperatrice={setModoOperatrice}
      accessoInCorso={false}
      erroreAccesso={errore}
      setErroreAccesso={setErrore}
      email={email} setEmail={setEmail}
      password={password} setPassword={setPassword}
      onGoogle={() => setErrore('Qui è solo un\'anteprima: l\'accesso vero passa da Firebase.')}
      onOperatrice={(e) => { e.preventDefault(); setErrore('Indirizzo o password non corretti. Se non li ricordi, chiedi alla titolare di rifarteli.'); }}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/prenota" element={<PrenotazionePubblica />} />
        <Route path="/accesso" element={<AnteprimaAccesso />} />
        <Route path="*" element={
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
        } />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
