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
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white border border-zinc-200 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.18)] p-1.5 flex items-center gap-1.5">
      {children}
    </div>,
    mainElement
  );
}
