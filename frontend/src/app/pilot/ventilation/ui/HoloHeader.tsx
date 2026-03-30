"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Calendar, ChevronDown, Trash2, Fingerprint, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';

const HeaderAstrolabe = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.1;
      groupRef.current.rotation.z = Math.sin(t * 0.2) * 0.05;
      
      // 🔥 SMOOTH HOVER EFFECT 🔥
      const targetX = state.pointer.y * 0.15;
      const targetY = state.pointer.x * 0.15;
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetX, 0.03);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetY, 0.03);
    }
  });
  return (
    <group ref={groupRef} position={[0, 0, -3]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8, 0.02, 16, 100]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.25} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, 0]}>
        <torusGeometry args={[9, 0.04, 16, 100]} />
        <meshBasicMaterial color="#b026ff" wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
};

export default function HoloHeader({ year, month, setYear, setMonth, onPurge, hasData }: any) {
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

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scaleY: 0.8, originY: 0 },
    visible: { opacity: 1, y: 0, scaleY: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -10, scaleY: 0.8, transition: { duration: 0.15 } }
  };

  return (
    // 🔥 BORDER RADIUS: 50px (CAPSULE SHAPE) 🔥
    <div style={{ position: 'relative', width: '100%', marginBottom: '2rem', zIndex: 9999 }}>
      
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, borderRadius: '50px', overflow: 'hidden', boxShadow: '0 15px 50px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(0, 240, 255, 0.2)', border: '1px solid rgba(0, 240, 255, 0.3)', backgroundColor: 'rgba(2, 6, 23, 0.5)' }}>
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 2]}>
          <ambientLight intensity={1} />
          <HeaderAstrolabe />
        </Canvas>
      </div>

      {/* 🔥 DWAWER: borderRadius: 50px 🔥 */}
      <div ref={containerRef} style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 35px', borderRadius: '50px', backdropFilter: 'blur(10px)' }}>
        
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <motion.div whileHover={{ scale: 1.1, rotate: 180 }} transition={{ duration: 0.5 }} style={{ padding: '15px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', borderRadius: '50%', boxShadow: '0 0 20px rgba(0,240,255,0.4)' }}>
             <Fingerprint size={32} color="#00f0ff" />
          </motion.div>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'monospace', fontSize: '2rem', letterSpacing: '4px', fontWeight: '900', textTransform: 'uppercase' }}>
              <span style={{ color: '#fff', textShadow: '0 0 10px rgba(0, 240, 255, 0.8)' }}>TEMPORAL</span> <span style={{ color: 'transparent', WebkitTextStroke: '1px #00f0ff' }}>SYNC</span>
            </h1>
            <p style={{ color: '#00f0ff', opacity: 0.9, margin: '2px 0 0 0', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '2px' }}>
              <Cpu size={12} style={{display:'inline', verticalAlign:'middle', marginRight:'5px'}} /> TIMELINE ANALYSIS
            </p>
          </div>
        </div>

        {/* DROPDOWNS & PURGE (DWAWER 7ta homa) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(2, 6, 23, 0.9)', padding: '10px 25px', borderRadius: '50px', border: '1px solid rgba(0, 240, 255, 0.5)', boxShadow: '0 0 20px rgba(0,0,0,0.5)', overflow: 'visible' }}>
          
          <style>{`
            .cyber-dropdown { position: absolute; top: calc(100% + 15px); left: 0; background: rgba(2, 6, 23, 0.98); border: 1px solid #00f0ff; border-radius: 20px; padding: 10px 0; margin: 0; list-style: none; width: 120px; max-height: 250px; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,1), 0 0 25px rgba(0, 240, 255, 0.5); }
            .cyber-item { padding: 10px 20px; font-family: monospace; font-weight: bold; cursor: pointer; color: #64748b; transition: all 0.15s; text-align: center; }
            .cyber-item:hover { background: rgba(0, 240, 255, 0.2); color: #00f0ff; text-shadow: 0 0 8px #00f0ff; }
          `}</style>

          <Calendar size={20} color="#00f0ff" />
          
          <div style={{ position: 'relative' }}>
            <motion.div whileHover={{ scale: 1.05 }} onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontFamily: 'monospace', fontSize: '1.1rem', cursor: 'pointer', userSelect: 'none' }}>
              {year} <motion.div animate={{ rotate: openDropdown === 'year' ? 180 : 0 }}><ChevronDown size={14} color="#00f0ff" /></motion.div>
            </motion.div>
            <AnimatePresence>
              {openDropdown === 'year' && (
                <motion.ul variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="custom-scrollbar cyber-dropdown" style={{ zIndex: 99999999 }}>
                  {years.map((y: number) => <li key={y} onClick={() => { setYear(y); setOpenDropdown(null); }} className="cyber-item" style={{ color: year === y ? '#00f0ff' : '#64748b' }}>{y}</li>)}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <span style={{ color: '#0284c7', fontSize: '1.2rem' }}>/</span>
          
          <div style={{ position: 'relative' }}>
            <motion.div whileHover={{ scale: 1.05 }} onClick={() => setOpenDropdown(openDropdown === 'month' ? null : 'month')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00f0ff', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem', cursor: 'pointer', userSelect: 'none' }}>
              M{month < 10 ? `0${month}` : month} <motion.div animate={{ rotate: openDropdown === 'month' ? 180 : 0 }}><ChevronDown size={14} color="#00f0ff" /></motion.div>
            </motion.div>
            <AnimatePresence>
              {openDropdown === 'month' && (
                <motion.ul variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="custom-scrollbar cyber-dropdown" style={{ zIndex: 99999999 }}>
                  {months.map((m: number) => <li key={m} onClick={() => { setMonth(m); setOpenDropdown(null); }} className="cyber-item" style={{ color: month === m ? '#00f0ff' : '#64748b' }}>M{m < 10 ? `0${m}` : m}</li>)}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {hasData && (
              <motion.div initial={{ width: 0, opacity: 0, marginLeft: 0, paddingLeft: 0, borderLeftColor: 'transparent' }} animate={{ width: 'auto', opacity: 1, marginLeft: '5px', paddingLeft: '15px', borderLeftColor: 'rgba(0, 240, 255, 0.4)' }} exit={{ width: 0, opacity: 0, marginLeft: 0, paddingLeft: 0, borderLeftColor: 'transparent' }} style={{ borderLeft: '1px solid', overflow: 'hidden' }}>
                <motion.button whileHover={{ scale: 1.05, backgroundColor: '#ef4444', color: '#fff', boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)' }} whileTap={{ scale: 0.95 }} onClick={onPurge} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ff7b7b', padding: '6px 15px', borderRadius: '50px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  <Trash2 size={14} /> PURGE
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}