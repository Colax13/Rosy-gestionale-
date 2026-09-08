import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

export default function RosyLogo({ className = "", size = "md", variant = "default" }: { className?: string; size?: "sm" | "md" | "lg" | "xl"; variant?: "default" | "white" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, normX: 0, normY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDist = 500; 
      
      const limitedDist = Math.min(distance, maxDist);
      const ratio = limitedDist / maxDist;
      
      const maxMove = size === 'xl' ? 14 : size === 'lg' ? 8 : size === 'md' ? 4 : 2; 

      setMousePos({
        x: (deltaX / distance) * ratio * maxMove || 0,
        y: (deltaY / distance) * ratio * maxMove || 0,
        normX: (deltaX / distance) * Math.min(distance / 50, 1) || 0,
        normY: (deltaY / distance) * Math.min(distance / 50, 1) || 0,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  const sizes = {
    sm: { container: 'w-8 h-8', inner: 'w-7 h-7', eye: 'w-1 h-1 gap-1', mouth: 'w-2.5 h-1 mt-0.5' },
    md: { container: 'w-12 h-12', inner: 'w-10 h-10', eye: 'w-[5px] h-[5px] gap-1.5', mouth: 'w-3.5 h-[5px] mt-1' },
    lg: { container: 'w-20 h-20', inner: 'w-16 h-16', eye: 'w-2 h-2 gap-[10px]', mouth: 'w-6 h-2 mt-1.5' },
    xl: { container: 'w-36 h-36', inner: 'w-28 h-28', eye: 'w-[14px] h-[14px] gap-4', mouth: 'w-[32px] h-[10px] mt-2.5' }
  };
  
  const s = sizes[size || 'md'];

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center ${s.container} ${className}`}>
      
      {/* Holographic Glowing Rings */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-80 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,216,255,0.4) 30%, rgba(212,0,255,0.8) 50%, rgba(0,216,255,0.4) 70%, transparent 100%)',
          filter: 'blur(3px)'
        }}
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[5%] opacity-50 rounded-full"
        style={{
          background: 'conic-gradient(from 180deg, transparent 0%, rgba(212,0,255,0.3) 30%, rgba(0,216,255,0.6) 50%, rgba(212,0,255,0.3) 70%, transparent 100%)',
          filter: 'blur(6px)'
        }}
      />

      {/* Main Colorful Body */}
      <div className={`absolute ${s.inner} rounded-full overflow-hidden shadow-xl
                      bg-gradient-to-br from-fuchsia-500 via-[#8a3ffc] to-cyan-500
                      border border-white/20`}
           style={{ boxShadow: 'inset 0 -8px 20px rgba(0,0,0,0.3), 0 8px 20px rgba(212,0,255,0.4)' }}
      >
          {/* 3D Glass Highlight */}
          <div className="absolute top-0 left-[15%] right-[15%] h-[40%] bg-gradient-to-b from-white/60 to-transparent rounded-full blur-[2px] opacity-80"></div>
          {/* Inner bottom glow */}
          <div className="absolute bottom-[-10%] left-[-10%] right-[-10%] h-[50%] bg-gradient-to-t from-cyan-300/40 to-transparent rounded-full blur-[4px]"></div>
      </div>

      {/* The Interactive Face */}
      <motion.div 
        className="relative z-10 flex flex-col items-center justify-center pointer-events-none drop-shadow-md"
        animate={{ x: mousePos.x, y: mousePos.y }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 0.5 }}
      >
        {/* Eyes */}
        <div className={`flex ${s.eye.split(' ')[2]}`}>
          {/* Eye 1 */}
          <div className={`rounded-full bg-white relative overflow-hidden ${s.eye.split(' ')[0]} ${s.eye.split(' ')[1]}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <motion.div 
                animate={{ x: mousePos.normX * (size === 'xl' ? 4 : size === 'lg' ? 2 : 1.5), y: mousePos.normY * (size === 'xl' ? 4 : size === 'lg' ? 2 : 1.5) }}
                className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-zinc-900 rounded-full"
              />
          </div>
          {/* Eye 2 */}
          <div className={`rounded-full bg-white relative overflow-hidden ${s.eye.split(' ')[0]} ${s.eye.split(' ')[1]}`} style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <motion.div 
                animate={{ x: mousePos.normX * (size === 'xl' ? 4 : size === 'lg' ? 2 : 1.5), y: mousePos.normY * (size === 'xl' ? 4 : size === 'lg' ? 2 : 1.5) }}
                className="absolute top-[20%] left-[20%] w-[60%] h-[60%] bg-zinc-900 rounded-full"
              />
          </div>
        </div>
        
        {/* Mouth (Cute Curve) */}
        <div className={s.mouth}>
          <svg viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
            <path d="M2 3 Q 12 12 22 3" 
                  stroke="#ffffff" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}
