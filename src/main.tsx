import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { saloneDelDominio } from '@/lib/domini';
import { caricaPezzo } from '@/lib/caricaPezzo';
import './index.css';

// Si scarica solo la parte che serve: la cliente che prenota non riceve il
// gestionale, e chi lavora non riceve la prenotazione.
const percorso = window.location.pathname.replace(/\/+$/, '');
const pubblica = !!saloneDelDominio(window.location.hostname)
  || /^\/[A-Za-z0-9_-]{1,128}\/(prenota|privacy)$/.test(percorso);

// Due import separati: scritti in un'unica espressione, Vite precaricherebbe
// tutti e due i pezzi.
const Pagine = pubblica
  ? lazy(caricaPezzo(() => import('./Pubblico')))
  : lazy(caricaPezzo(() => import('./App.tsx')));

/** Mentre arriva il pezzo giusto: un cerchio che gira, niente di più. */
function Attesa() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-50">
      <div className="w-8 h-8 rounded-full border-2 border-fuchsia-200 border-t-fuchsia-600 animate-spin" aria-label="Caricamento" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<Attesa />}>
      <Pagine />
    </Suspense>
  </StrictMode>,
);
