// Il pulsante che riapre il menu laterale quando lo si è chiuso (schermo
// pieno). Il Layout sa se il menu è chiuso e come riaprirlo; le pagine lo
// leggono da qui, così l'agenda può mettere il pulsante nella sua barra.

import { createContext, useContext } from 'react';
import { Menu } from 'lucide-react';

interface MenuSchermo { schermoPieno: boolean; apriMenu: () => void }

export const MenuSchermoContext = createContext<MenuSchermo>({ schermoPieno: false, apriMenu: () => {} });

export const useMenuSchermo = () => useContext(MenuSchermoContext);

/** Il quadratino con le tre linee. Compare solo a schermo pieno, su computer. */
export default function BottoneMenu({ className = '' }: { className?: string }) {
  const { schermoPieno, apriMenu } = useMenuSchermo();
  if (!schermoPieno) return null;
  return (
    <button
      onClick={apriMenu}
      title="Mostra il menu e la barra in alto"
      aria-label="Mostra il menu"
      className={`hidden md:flex items-center justify-center shrink-0 rounded-xl bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors ${className}`}
    >
      <Menu size={20} />
    </button>
  );
}
