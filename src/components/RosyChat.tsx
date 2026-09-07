import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import RosyLogo from './RosyLogo';
import { auth } from '../lib/firebase';

export default function RosyChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: `Ciao ${auth.currentUser?.displayName?.split(' ')[0] || ''}! Sono Rosy, la tua assistente virtuale. Come posso aiutarti oggi con il tuo salone?`, sender: "rosy" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), text: input, sender: "user" };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    
    // Simulate Rosy response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Ho ricevuto il tuo messaggio. Al momento sono in fase di addestramento e sarò presto in grado di assisterti in modo automatico per gestire appuntamenti ed inviare promemoria!",
        sender: "rosy"
      }]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-zinc-900 dark:text-zinc-100 relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto w-full scrollbar-none p-6 pb-4 flex flex-col gap-5">
         
         <div className="flex flex-col mb-4 bg-zinc-100/80 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
           <h3 className="text-zinc-900 dark:text-zinc-100 font-semibold mb-1">Assistente Vocale</h3>
           <p className="text-zinc-500 dark:text-zinc-400 text-sm">Di cosa ha bisogno il tuo salone oggi?</p>
         </div>
         
         {messages.map(msg => (
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             key={msg.id} 
             className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full items-end gap-2 my-1`}
           >
             {msg.sender === 'rosy' && (
               <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center -mb-1 shadow-[0_2px_10px_rgba(212,0,255,0.2)]">
                 <RosyLogo size="sm" />
               </div>
             )}
             <div className={`p-3.5 px-4 rounded-2xl max-w-[85%] ${
               msg.sender === 'user' 
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-br-none font-medium shadow-md' 
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm border border-zinc-200 dark:border-zinc-700/50 shadow-sm'
             }`}>
               <p className="text-sm leading-relaxed">{msg.text}</p>
             </div>
           </motion.div>
         ))}
      </div>
      
      {/* Input */}
      <div className="p-4 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 mt-auto sticky bottom-0 rounded-b-3xl">
         <div className="relative flex items-center">
           <input 
             type="text" 
             value={input}
             onChange={e => setInput(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleSend()}
             placeholder="Chiedi a Rosy (Es: 'Sposta l'appuntamento...')" 
             className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 rounded-xl pl-4 pr-12 py-3.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none transition-colors shadow-inner"
           />
           <button 
             onClick={handleSend}
             className="absolute right-2 w-9 h-9 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shadow-md hover:opacity-90 transition-opacity"
           >
             <ChevronRight size={18} strokeWidth={2.5} />
           </button>
         </div>
      </div>
    </div>
  );
}
