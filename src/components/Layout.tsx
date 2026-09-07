import { ReactNode, useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, UserCog, CalendarDays, Settings, CreditCard, Palette, Globe, HelpCircle, LogOut, Menu, X, Store, MessageSquare, Moon, Sun, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import RicercaGlobale from '../../salone-app/frontend/components/RicercaGlobale';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

import RosySidebar from './RosySidebar';
import RosyChat from './RosyChat';
import RosyLogo from './RosyLogo';

export default function Layout({ children }: { children: ReactNode }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const desktopUserMenuRef = useRef<HTMLDivElement>(null);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const hubUserMenuRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'light');
  const location = useLocation();
  const navigate = useNavigate();
  const isMainDashboard = location.pathname === '/';

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const routes = [
    { path: '/rosie', label: 'Rosie Hub', icon: Sparkles },
    { path: '/agenda', label: 'Agenda', icon: CalendarDays },
    { path: '/clienti', label: 'Clienti', icon: Users },
    { path: '/catalogo', label: 'Servizi', icon: Store },
    { path: '/dipendenti', label: 'Dipendenti', icon: UserCog },
    { path: '/report', label: 'Report', icon: FileText },
    { path: '/prodotti', label: 'Prodotti & Offerte', icon: Store },
    { path: '/automazioni', label: 'Automazioni', icon: MessageSquare },
    { path: '/buoni-spa', label: 'Buoni Spa', icon: Store }
  ];

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideDesktop = !desktopUserMenuRef.current || !desktopUserMenuRef.current.contains(event.target as Node);
      const isOutsideMobile = !mobileUserMenuRef.current || !mobileUserMenuRef.current.contains(event.target as Node);
      const isOutsideHub = !hubUserMenuRef.current || !hubUserMenuRef.current.contains(event.target as Node);
      
      if (isOutsideDesktop && isOutsideMobile && isOutsideHub) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const SidebarContent = ({ menuRef }: { menuRef: React.RefObject<HTMLDivElement> }) => (
    <>
      <div className="flex-1 overflow-y-auto w-full">
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
          <NavLink to="/" className="flex items-center gap-3 group">
            <h1 className="text-2xl font-playfair font-bold text-zinc-900 group-hover:text-fuchsia-600 transition-colors tracking-tight">Rosy</h1>
          </NavLink>
          {/* Close button for mobile */}
          <button 
            className="md:hidden text-zinc-500 hover:text-zinc-900"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'gradient-brand text-white shadow-[0_0_15px_rgba(212,0,255,0.3)] font-semibold border border-[#FF3EF7]/20'
                    : 'text-zinc-500 hover:bg-white hover:text-zinc-900 w-full border border-transparent'
                }`
              }
            >
              <route.icon size={20} />
              <span>{route.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Menu Area */}
      <div className="p-4 border-t border-zinc-200 relative w-full" ref={menuRef}>
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-56 bg-zinc-100 border border-zinc-300 rounded-lg shadow-xl py-2 z-50">
            <div className="px-4 py-2 border-b border-zinc-300 mb-1">
              <p className="text-sm font-medium text-zinc-900">{auth.currentUser?.email || 'admin@salone.it'}</p>
              <p className="text-xs text-zinc-500">Piano Free</p>
            </div>
            <button onClick={() => { setIsUserMenuOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center gap-2">
              <Settings size={16} /> Impostazioni</button>
            <button onClick={() => { setIsUserMenuOpen(false); setIsSubscriptionModalOpen(true); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center gap-2">
              <CreditCard size={16} /> Aggiorna il piano
            </button>
            <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                {theme === 'dark' ? 'Modalità Scura' : 'Modalità Chiara'}
              </span>
              <div className={`w-8 h-4 rounded-full transition-colors ${theme === 'dark' ? 'bg-fuchsia-600' : 'bg-zinc-200'} relative`}>
                <div className={`absolute top-0.5 bottom-0.5 w-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-[18px]' : 'left-0.5'}`}></div>
              </div>
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center gap-2">
              <Globe size={16} /> Lingua
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-white hover:text-zinc-900 flex items-center gap-2">
              <HelpCircle size={16} /> Aiuto
            </button>
            <div className="h-px bg-zinc-200 my-1"></div>
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white hover:text-red-500 flex items-center gap-2"
            >
              <LogOut size={16} /> Esci
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-500 hover:bg-white hover:text-zinc-900 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-fuchsia-600 text-white flex items-center justify-center font-bold flex-shrink-0">
            {auth.currentUser?.displayName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex flex-col items-start truncate overflow-hidden">
            <span className="text-sm font-medium text-zinc-900 truncate max-w-[120px]">
              {auth.currentUser?.displayName || 'Admin'}
            </span>
          </div>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-transparent font-sans relative overflow-hidden">
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      {!isMainDashboard && (
        <motion.aside 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className={`hidden ${isDesktopSidebarOpen ? 'md:flex' : ''} w-64 bg-white border-r border-zinc-200 flex-col justify-between flex-shrink-0`}
        >
          {SidebarContent({ menuRef: desktopUserMenuRef })}
        </motion.aside>
      )}

      {/* Mobile Sidebar */}
      {!isMainDashboard && (
        <aside className={`fixed inset-y-0 left-0 bg-white w-72 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col justify-between border-r border-zinc-200 shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {SidebarContent({ menuRef: mobileUserMenuRef })}
        </aside>
      )}

      {/* Main Content */}
      <main id="main-content" className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <motion.header 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-white border-b border-zinc-200 px-4 md:px-6 py-4 flex items-center gap-4 sticky top-0 z-10 w-full"
        >
            {!isMainDashboard && (
              <>
                <button 
                  className="md:hidden text-zinc-500 hover:text-zinc-900 focus:outline-none"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <Menu size={24} />
                </button>
                <button 
                  className="hidden md:block text-zinc-500 hover:text-zinc-900 focus:outline-none"
                  onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                >
                  <Menu size={24} />
                </button>
              </>
            )}
            <div className="flex-1 max-w-xl">
               <RicercaGlobale />
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (auth.currentUser) {
                   const link = `${window.location.origin}/${auth.currentUser.uid}/prenota`;
                   navigator.clipboard.writeText(link);
                   const btn = document.getElementById('share-btn-text');
                   if (btn) {
                     const original = btn.innerText;
                     btn.innerText = 'Copiato!';
                     setTimeout(() => btn.innerText = original, 2000);
                   }
                }
              }}
              className="hidden md:flex ml-auto items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-zinc-300 shadow-sm"
            >
              <Globe size={18} className="text-[#D400FF]" />
              <span id="share-btn-text">Condividi Prenotazione</span>
            </motion.button>
          </motion.header>
        <div className="flex-1 overflow-y-scroll overflow-x-hidden p-4 md:p-0 w-full bg-white scrollbar-none flex flex-col">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 w-full flex flex-col"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Subscription Modal */}
      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-zinc-200 bg-zinc-50/50">
               <h2 className="text-xl font-bold text-zinc-900 font-playfair">Il tuo Piano</h2>
            </div>
            <div className="p-6 flex flex-col gap-4">
               <div className="bg-white border border-fuchsia-500/30 rounded-xl p-5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-[10px] font-bold px-2 py-1 select-none pointer-events-none rounded-bl-lg">ATTUALE</div>
                 <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2 tracking-tight">Piano Free</h3>
                 <p className="text-sm text-zinc-500 mt-2 mb-4 leading-relaxed">Perfetto per iniziare a gestire i tuoi appuntamenti con funzionalità base.</p>
                 <div className="text-2xl font-bold text-zinc-900">€0<span className="text-sm font-normal text-zinc-500">/mese</span></div>
               </div>
               
               <div className="mt-4 pt-4 border-t border-zinc-200">
                 <h4 className="font-semibold text-zinc-800 mb-2">Funzionalità PRO (Prossimamente)</h4>
                 <ul className="text-sm text-zinc-500 space-y-2">
                   <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" /> WhatsApp Reminders</li>
                   <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" /> App per i dipendenti</li>
                   <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" /> Analisi avanzate</li>
                 </ul>
               </div>
            </div>
            <div className="p-4 bg-zinc-50/50 border-t border-zinc-200 flex justify-end">
              <button 
                onClick={() => setIsSubscriptionModalOpen(false)}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-medium rounded-lg transition-colors border border-zinc-300"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Rosy Button */}
      {auth.currentUser && !isMainDashboard && location.pathname !== '/rosie' && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#00D8FF] to-[#D400FF] shadow-[0_0_20px_rgba(212,0,255,0.4)] hover:shadow-[0_0_30px_rgba(212,0,255,0.6)] flex items-center justify-center transition-all hover:-translate-y-1 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <RosyLogo size="lg" variant="white" className="z-10 group-hover:scale-110 transition-transform pt-1" />
          </button>
        </div>
      )}

      {/* Right Drawer (Rosy Chat) - Redesigned as floating popover */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-24 right-5 sm:right-6 w-[calc(100vw-2.5rem)] sm:w-[400px] h-[600px] max-h-[calc(100vh-8rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl z-[100] shadow-2xl flex flex-col overflow-hidden"
          >
            <button 
              onClick={() => setIsChatOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 z-[70] p-2 bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 backdrop-blur-md rounded-full transition-all border border-zinc-200 dark:border-zinc-700 shadow-sm"
            >
              <X size={18} />
            </button>
            <RosyChat />
            <div className="absolute -bottom-3 right-8 w-6 h-6 bg-white dark:bg-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-800 transform rotate-45 z-[60]"></div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
