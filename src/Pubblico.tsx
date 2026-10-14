// Le pagine che vede la cliente: la prenotazione e l'informativa privacy.
//
// Stanno in un pezzo a sé, separato dal gestionale: chi apre il link di
// prenotazione scarica solo questo, non agenda, report e tutto il resto.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrenotazionePubblica from '@/app/(public)/[salonId]/prenota/page';
import InformativaPrivacy from '@/app/(public)/[salonId]/privacy/page';
import { saloneDelDominio } from '@/lib/domini';

export default function Pubblico() {
  // Un indirizzo tutto del salone (es. prenota.rdsalon.com): si apre subito
  // la sua prenotazione, e su "/privacy" la sua informativa. Il gestionale
  // da lì non si raggiunge.
  const saloneDominio = saloneDelDominio(window.location.hostname);
  if (saloneDominio) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PrenotazionePubblica salonIdFisso={saloneDominio} />} />
          <Route path="/privacy" element={<InformativaPrivacy salonIdFisso={saloneDominio} />} />
          <Route path="/:salonId/prenota" element={<PrenotazionePubblica />} />
          <Route path="/:salonId/privacy" element={<InformativaPrivacy />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/:salonId/prenota" element={<PrenotazionePubblica />} />
        <Route path="/:salonId/privacy" element={<InformativaPrivacy />} />
      </Routes>
    </BrowserRouter>
  );
}
