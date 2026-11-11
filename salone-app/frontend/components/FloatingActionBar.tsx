import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function FloatingActionBar({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const mainElement = document.getElementById('main-content');
  
  if (!mainElement) return null;

  return createPortal(
    // Sul telefono le scritte andavano a capo su due o tre righe e la barra
    // copriva mezza pagina: restano su una riga, con i pulsanti più stretti.
    <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100%-1rem)] bg-white border border-zinc-200 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.18)] p-1.5 flex items-center gap-1.5 [&_button]:whitespace-nowrap [&_button]:shrink-0 max-sm:[&_button]:px-3 max-sm:[&_button]:gap-1.5 max-sm:[&_button]:text-[13px]">
      {children}
    </div>,
    mainElement
  );
}
