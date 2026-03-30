import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export default function TimeSelector({ year, month, setYear, setMonth }: any) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpenDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(2, 6, 23, 0.75)', padding: '12px 25px', borderRadius: '12px', border: '1px solid rgba(0, 240, 255, 0.5)', boxShadow: '0 0 25px rgba(0, 240, 255, 0.2), inset 0 0 10px rgba(0, 240, 255, 0.1)', backdropFilter: 'blur(15px)', position: 'relative' }}>
      
      <style>{`
        /* 🔥 GLOWING DARK DROPDOWN 🔥 */
        .neon-dropdown {
          position: absolute; top: calc(100% + 15px); left: -10px;
          background: rgba(2, 6, 23, 0.95); backdrop-filter: blur(20px);
          border: 1px solid #00f0ff; border-radius: 8px;
          padding: 8px 0; margin: 0; list-style: none; width: 120px; max-height: 220px; overflow-y: auto;
          z-index: 999999;
          box-shadow: 0 10px 40px rgba(0,0,0,0.9), 0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 15px rgba(0, 240, 255, 0.1);
          transform-origin: top center; will-change: transform, opacity;
          animation: dropNeon 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes dropNeon {
          0% { opacity: 0; transform: translateY(-10px) scaleY(0.9); }
          100% { opacity: 1; transform: translateY(0) scaleY(1); }
        }

        .neon-item {
          padding: 10px 20px; font-family: monospace; font-weight: bold; font-size: 1.1rem;
          cursor: pointer; transition: all 0.15s ease-out; color: #64748b;
        }
        .neon-item:hover {
          background: rgba(0, 240, 255, 0.15); color: #00f0ff; padding-left: 25px;
          text-shadow: 0 0 8px #00f0ff;
        }
      `}</style>

      <Calendar size={22} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 8px #00f0ff)' }} />
      
      {/* YEAR */}
      <div style={{ position: 'relative' }}>
        <div onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontFamily: 'monospace', fontSize: '1.2rem', cursor: 'pointer', userSelect: 'none', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
          {year} <ChevronDown size={16} color="#00f0ff" style={{ transform: openDropdown === 'year' ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', filter: 'drop-shadow(0 0 5px #00f0ff)' }} />
        </div>
        {openDropdown === 'year' && (
          <ul className="custom-scrollbar neon-dropdown">
            {years.map(y => (
              <li key={y} onClick={() => { setYear(y); setOpenDropdown(null); }} className="neon-item" style={{ color: year === y ? '#00f0ff' : '#64748b', textShadow: year === y ? '0 0 8px #00f0ff' : 'none', background: year === y ? 'rgba(0, 240, 255, 0.1)' : 'transparent' }}>{y}</li>
            ))}
          </ul>
        )}
      </div>

      <span style={{ color: '#0284c7', fontSize: '1.5rem', fontWeight: '300', textShadow: '0 0 10px #0284c7' }}>/</span>
      
      {/* MONTH */}
      <div style={{ position: 'relative' }}>
        <div onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f0ff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem', cursor: 'pointer', userSelect: 'none', textShadow: '0 0 10px rgba(0,240,255,0.6)' }}>
          M{month < 10 ? `0${month}` : month} <ChevronDown size={16} color="#00f0ff" style={{ transform: openDropdown === 'month' ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', filter: 'drop-shadow(0 0 5px #00f0ff)' }} />
        </div>
        {openDropdown === 'month' && (
          <ul className="custom-scrollbar neon-dropdown">
            {months.map(m => (
              <li key={m} onClick={() => { setMonth(m); setOpenDropdown(null); }} className="neon-item" style={{ color: month === m ? '#00f0ff' : '#64748b', textShadow: month === m ? '0 0 8px #00f0ff' : 'none', background: month === m ? 'rgba(0, 240, 255, 0.1)' : 'transparent' }}>M{m < 10 ? `0${m}` : m}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}