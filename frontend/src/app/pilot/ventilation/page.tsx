"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import HoloHeader from './ui/HoloHeader'; 
import VentilationDropzone from './ui/VentilationDropzone';
import VentilationDataBoard from './components/VentilationDataBoard';

// 🚀 DYNAMIC IMPORT DYAL L-BACKGROUND L-JDID (Chronos Red/Blue Vibe) 🚀
const ChronosBackground = dynamic(() => import('./ux/ChronosBackground'), { ssr: false });

const API_BASE = "http://localhost:8080"; 

export default function VentilationPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataStore, setDataStore] = useState<Record<string, Record<string, any[]>>>({});
  
  const [isWarping, setIsWarping] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const isFetching = useRef(false); 

  const currentKey = `${selectedYear}-${selectedMonth}`;
  const currentData = dataStore[currentKey] || null;

  // 1. FETCH DATA
  useEffect(() => {
    if (!dataStore[currentKey] && !isFetching.current) {
      isFetching.current = true;
      fetch(`${API_BASE}/api/ventilation/data?year=${selectedYear}&month=${selectedMonth}`)
        .then(res => res.json())
        .then(json => {
          if (json.data && json.data !== "NO_DATA") {
            setDataStore(prev => ({ ...prev, [currentKey]: json.data }));
          }
        })
        .catch(err => console.error("Fetch error:", err))
        .finally(() => { isFetching.current = false; });
    }
  }, [selectedYear, selectedMonth, currentKey, dataStore]);

  // 2. WARP ANIMATION LOGIC
  useEffect(() => {
    if (currentData) {
      setIsWarping(true);
      setShowTable(false); 
      const timer = setTimeout(() => {
        setIsWarping(false); 
        setShowTable(true);  
      }, 1800); 
      return () => clearTimeout(timer);
    } else {
      setShowTable(false);
      setIsWarping(false);
    }
  }, [currentData]);

  // 3. UPLOAD HANDLER
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file); 
    formData.append("year", selectedYear.toString()); 
    formData.append("month", selectedMonth.toString());
    try {
      const response = await fetch(`${API_BASE}/api/ventilation/import`, { method: "POST", body: formData });
      const json = await response.json();
      if (response.ok) setDataStore(prev => ({ ...prev, [currentKey]: json.data }));
    } catch (err) {
      console.error(err);
    } finally { 
      setIsProcessing(false); 
    }
  };

  // 4. PURGE HANDLER
  const handlePurge = async () => {
    try {
      await fetch(`${API_BASE}/api/ventilation/purge?year=${selectedYear}&month=${selectedMonth}`, { method: 'DELETE' });
      setDataStore(prev => { 
        const nextStore = { ...prev }; 
        delete nextStore[currentKey]; 
        return nextStore; 
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main style={{ padding: "3rem 2rem", minHeight: "100vh", position: "relative" }}>
      
      {/* 🌌 L-BACKGROUND L-JDID (Kay-ched isWarping ila bghiti t-zreb f' d-dawan) 🌌 */}
      <ChronosBackground isWarping={isWarping} />

      <style>{`
        /* 🔥 L-TABLEAU L-3AMER (M-qadd w Bayen) 🔥 */
        .time-machine-panel {
          background: rgba(2, 6, 23, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 40px;
          box-shadow: 0 15px 50px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(239, 68, 68, 0.1); overflow: hidden;
        }

        /* 🔥 L-DROPZONE KHAWYA (Transparenta bash t-chouf l-Fada2) 🔥 */
        .empty-state-panel {
          background: rgba(2, 6, 23, 0.1) !important; 
          backdrop-filter: blur(2px) !important; 
          border: 1px dashed rgba(239, 68, 68, 0.2); 
          border-radius: 40px;
          transition: all 0.4s ease;
        }
        
        .empty-state-panel:hover {
          background: rgba(2, 6, 23, 0.7) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px dashed rgba(239, 68, 68, 0.8);
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.8); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ef4444; border-radius: 10px; }
      `}</style>

      <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, type: "spring" }}>
          <HoloHeader year={selectedYear} setYear={setSelectedYear} month={selectedMonth} setMonth={setSelectedMonth} onPurge={handlePurge} hasData={!!currentData} />
        </motion.div>

        <div style={{ position: 'relative', zIndex: 10 }}>
          <AnimatePresence mode="wait">
            
            {/* ILA MA-KAYN WALO -> DROPZONE M-KHEFFIYA (Empty State) */}
            {!currentData && !isWarping && (
              <motion.div 
                key="dropzone" 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} transition={{ duration: 0.4 }} 
                className="empty-state-panel" 
                style={{ padding: '4rem', textAlign: 'center' }}
              >
                 <VentilationDropzone onFileUpload={handleFileUpload} isProcessing={isProcessing} year={selectedYear} month={selectedMonth} />
              </motion.div>
            )}

            {/* ILA LQA DATA -> BEYYEN L-TABLEAU */}
            {showTable && currentData && (
              <motion.div 
                key="databoard" 
                initial={{ opacity: 0, scale: 0.05, filter: "blur(20px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }} transition={{ duration: 0.9, type: "spring", bounce: 0.4 }} 
                className="time-machine-panel" style={{ padding: '2rem', transformOrigin: 'center center' }}
              >
                <VentilationDataBoard dataMap={currentData} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </main>
  );
}