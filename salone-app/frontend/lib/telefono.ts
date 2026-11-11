// "Sono su un telefono?" — per le poche cose che il solo CSS non sa fare
// (per esempio mostrare in agenda una sola operatrice alla volta).
// La soglia è la stessa delle classi `md:` di Tailwind: sotto i 768 pixel.

import { useEffect, useState } from 'react';

const DOMANDA = '(max-width: 767px)';

const leggi = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DOMANDA).matches;

export function useTelefono(): boolean {
  const [telefono, setTelefono] = useState(leggi);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DOMANDA);
    const cambia = () => setTelefono(mq.matches);
    cambia();
    mq.addEventListener('change', cambia);
    return () => mq.removeEventListener('change', cambia);
  }, []);
  return telefono;
}
