const fs = require('fs');
const file = './salone-app/frontend/app/(dashboard)/agenda/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetToRemove = `            {/* Selettore Operatore per Vista Settimanale o Mensile */}
            {viewMode !== 'giorno' && (
               <div className="relative shrink-0">
                 <div 
                   onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                   className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 shadow-sm text-sm text-zinc-200 cursor-pointer min-w-[200px] justify-between hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors"
                 >
                   <div className="flex items-center gap-2">
                     <Filter size={14} className="text-zinc-500" />
                     <span className="font-medium truncate">
                       {selectedDipendenteId === 'tutti' ? 'Tutti gli Operatori' : 
                        selectedDipendenteId === 'unassigned' ? 'Staff Generico' : 
                        (dipendenti.find(d => d.id === selectedDipendenteId)?.nome + ' ' + dipendenti.find(d => d.id === selectedDipendenteId)?.cognome) || 'Seleziona...'}
                     </span>
                   </div>
                   <ChevronDown size={14} className="text-zinc-500" />
                 </div>

                 {isStaffMenuOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsStaffMenuOpen(false)}></div>
                     <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                       <div className="py-1">
                         <button
                           onClick={() => { setSelectedDipendenteId('tutti'); setIsStaffMenuOpen(false); }}
                           className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === 'tutti' ? 'bg-fuchsia-500/10 text-fuchsia-400 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}\`}
                         >
                           Tutti gli Operatori
                         </button>
                         {dipendenti.length > 0 && <div className="h-px bg-zinc-800/50 my-1 mx-2"></div>}
                         {dipendenti.map(d => (
                           <button
                             key={d.id}
                             onClick={() => { setSelectedDipendenteId(d.id); setIsStaffMenuOpen(false); }}
                             className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === d.id ? 'bg-fuchsia-500/10 text-fuchsia-400 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}\`}
                           >
                             {d.nome} {d.cognome}
                           </button>
                         ))}
                         <div className="h-px bg-zinc-800/50 my-1 mx-2"></div>
                         <button
                           onClick={() => { setSelectedDipendenteId('unassigned'); setIsStaffMenuOpen(false); }}
                           className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === 'unassigned' ? 'bg-fuchsia-500/10 text-fuchsia-400 font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}\`}
                         >
                           Staff Generico
                         </button>
                       </div>
                     </div>
                   </>
                 )}
               </div>
            )}`;

content = content.replace(targetToRemove, '');

const insertAfter = `        </div>
      </div>`;

const newFilterBar = `
        {/* Barra filtri operatori (visibile solo in settimana o mese) */}
        {viewMode !== 'giorno' && (
          <div className="flex items-center gap-3 px-2 mt-[-10px] mb-4 animate-in fade-in slide-in-from-top-2 duration-300 z-30">
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Filtra:</span>
            <div className="relative shrink-0">
               <div 
                 onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                 className="flex items-center gap-2 bg-white/50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-lg py-1.5 px-3 shadow-sm text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer min-w-[200px] justify-between hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 transition-colors backdrop-blur-sm"
               >
                 <div className="flex items-center gap-2">
                   <User size={14} className="text-fuchsia-500" />
                   <span className="font-medium truncate">
                     {selectedDipendenteId === 'tutti' ? 'Tutti gli Operatori' : 
                      selectedDipendenteId === 'unassigned' ? 'Staff Generico' : 
                      (dipendenti.find(d => d.id === selectedDipendenteId)?.nome + ' ' + dipendenti.find(d => d.id === selectedDipendenteId)?.cognome) || 'Seleziona...'}
                   </span>
                 </div>
                 <ChevronDown size={14} className="text-zinc-500" />
               </div>

               {isStaffMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsStaffMenuOpen(false)}></div>
                   <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                     <div className="py-1">
                       <button
                         onClick={() => { setSelectedDipendenteId('tutti'); setIsStaffMenuOpen(false); }}
                         className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === 'tutti' ? 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}\`}
                       >
                         Tutti gli Operatori
                       </button>
                       {dipendenti.length > 0 && <div className="h-px bg-zinc-200 dark:bg-zinc-800/50 my-1 mx-2"></div>}
                       {dipendenti.map(d => (
                         <button
                           key={d.id}
                           onClick={() => { setSelectedDipendenteId(d.id); setIsStaffMenuOpen(false); }}
                           className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === d.id ? 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}\`}
                         >
                           {d.nome} {d.cognome}
                         </button>
                       ))}
                       <div className="h-px bg-zinc-200 dark:bg-zinc-800/50 my-1 mx-2"></div>
                       <button
                         onClick={() => { setSelectedDipendenteId('unassigned'); setIsStaffMenuOpen(false); }}
                         className={\`w-full text-left px-4 py-2 text-sm transition-colors \${selectedDipendenteId === 'unassigned' ? 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-semibold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}\`}
                       >
                         Staff Generico
                       </button>
                     </div>
                   </div>
                 </>
               )}
            </div>
          </div>
        )}`;

// Find the position of insertAfter AFTER targetToRemove has been stripped.
const parts = content.split(insertAfter);
if(parts.length > 1) {
    // We append the new bar after the first occurrence of `        </div>\n      </div>`
    content = parts[0] + insertAfter + newFilterBar + parts.slice(1).join(insertAfter);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Success");
} else {
    console.log("Could not find insertAfter");
}
