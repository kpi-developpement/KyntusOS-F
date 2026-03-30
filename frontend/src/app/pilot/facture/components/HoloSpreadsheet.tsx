"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Table as TableIcon, Layers } from 'lucide-react';

interface HoloSpreadsheetProps {
  sheetsData: Record<string, any[]>; // L-Khotta: { "A REMPLIS": [...], "TVC": [...] }
  onDownload: () => void;
}

export default function HoloSpreadsheet({ sheetsData, onDownload }: HoloSpreadsheetProps) {
  const sheetNames = Object.keys(sheetsData);
  const [activeSheet, setActiveSheet] = useState<string>(sheetNames[0] || "");

  const currentData = sheetsData[activeSheet] || [];
  const headers = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  return (
    <div className="holo-container">
      <style>{`
        .holo-container {
          background: rgba(4, 9, 20, 0.6); backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 24px;
          box-shadow: 0 0 40px rgba(0, 240, 255, 0.1), inset 0 0 20px rgba(0, 240, 255, 0.05);
          overflow: hidden; display: flex; flex-direction: column; height: 75vh;
        }
        .neo-tabs::-webkit-scrollbar { height: 4px; }
        .neo-tabs::-webkit-scrollbar-thumb { background: #00f0ff; border-radius: 10px; }
        
        .neo-table-container::-webkit-scrollbar { width: 6px; height: 6px; }
        .neo-table-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .neo-table-container::-webkit-scrollbar-thumb { background: #b026ff; border-radius: 10px; }
        
        .neo-th {
          background: rgba(0, 240, 255, 0.1); color: #00f0ff; padding: 12px 20px;
          text-align: left; font-family: monospace; font-size: 0.85rem; letter-spacing: 1px;
          border-bottom: 2px solid rgba(0, 240, 255, 0.4); white-space: nowrap;
          position: sticky; top: 0; z-index: 10; backdrop-filter: blur(10px);
        }
        .neo-td {
          padding: 10px 20px; color: #e2e8f0; font-family: monospace; font-size: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05); white-space: nowrap;
        }
        .neo-tr:hover .neo-td { background: rgba(176, 38, 255, 0.15); color: #fff; }
      `}</style>

      {/* 🟢 HEADER & TABS 🟢 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Layers color="#b026ff" size={28} />
          <h2 style={{ margin: 0, color: '#fff', fontFamily: 'monospace', letterSpacing: '2px' }}>
            QUANTUM <span style={{ color: '#00f0ff' }}>SHEETS</span>
          </h2>
        </div>

        {/* TABS (LES FEUILLES) */}
        <div className="neo-tabs" style={{ display: 'flex', gap: '10px', overflowX: 'auto', maxWidth: '50vw', paddingBottom: '5px' }}>
          {sheetNames.map((sheet) => (
            <button
              key={sheet}
              onClick={() => setActiveSheet(sheet)}
              style={{
                position: 'relative', padding: '8px 20px', borderRadius: '12px', border: 'none',
                background: 'transparent', color: activeSheet === sheet ? '#00f0ff' : '#64748b',
                fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s'
              }}
            >
              {activeSheet === sheet && (
                <motion.div
                  layoutId="activeTab"
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', borderRadius: '12px', zIndex: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {sheet}
            </button>
          ))}
        </div>

        {/* DOWNLOAD BUTTON */}
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)' }} whileTap={{ scale: 0.95 }}
          onClick={onDownload}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#00f0ff', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer' }}
        >
          <Download size={18} /> EXPORTER .XLSX
        </motion.button>
      </div>

      {/* 🟢 THE DATA GRID (TABLEAU) 🟢 */}
      <div className="neo-table-container" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.table
            key={activeSheet}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr>
                <th className="neo-th">#</th>
                {headers.map((h, i) => <th key={i} className="neo-th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, rowIndex) => (
                <tr key={rowIndex} className="neo-tr">
                  <td className="neo-td" style={{ color: '#b026ff', fontWeight: 'bold' }}>{rowIndex + 1}</td>
                  {headers.map((h, colIndex) => (
                    <td key={colIndex} className="neo-td">
                      {row[h] !== null && row[h] !== undefined ? String(row[h]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td colSpan={headers.length + 1} style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontFamily: 'monospace' }}>
                    AUCUNE DONNÉE DANS CETTE FEUILLE
                  </td>
                </tr>
              )}
            </tbody>
          </motion.table>
        </AnimatePresence>
      </div>
    </div>
  );
}