// Punto d'ingresso dell'anteprima: monta le pagine vere dentro il Layout vero,
// con i dati finti. Serve a guardare le schermate prima di dire che sono a posto.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '../src/index.css';
import Layout from '../src/components/Layout';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/prenota" element={<PrenotazionePubblica />} />
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
