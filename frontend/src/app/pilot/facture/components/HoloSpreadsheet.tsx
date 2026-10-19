"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Layers, Sparkles, FileSpreadsheet } from 'lucide-react';

interface HoloSpreadsheetProps {
  sheetsData: Record<string, any[]>;
  onDownload: () => void;
}

export default function HoloSpreadsheet({ sheetsData, onDownload }: HoloSpreadsheetProps) {
  const sheetNames = Object.keys(sheetsData);
  const [activeSheet, setActiveSheet] = useState<string>(sheetNames[0] || "");

  const currentData = sheetsData[activeSheet] || [];
  const headers = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  return (
    <div className="lux-sheet-shell">
      <style>{`
        .lux-sheet-shell {
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(0, 82, 255, 0.16);
          border-radius: 28px;
          box-shadow: 0 25px 60px -15px rgba(0, 52, 150, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.9) inset;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 76vh;
        }
        .lux-sheet-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 32px;
          background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
          border-bottom: 1px solid rgba(0, 82, 255, 0.12);
          gap: 20px;
          flex-wrap: wrap;
        }
        .lux-tabs-bar {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          max-width: 52vw;
          padding: 6px;
          background: #F1F5F9;
          border-radius: 16px;
          border: 1px solid rgba(0, 82, 255, 0.08);
        }
        .lux-tabs-bar::-webkit-scrollbar { height: 4px; }
        .lux-tabs-bar::-webkit-scrollbar-thumb { background: #93C5FD; border-radius: 10px; }

        .lux-table-viewport {
          flex: 1;
          overflow: auto;
          position: relative;
          background: #FFFFFF;
        }
        .lux-table-viewport::-webkit-scrollbar { width: 8px; height: 8px; }
        .lux-table-viewport::-webkit-scrollbar-track { background: #F1F5F9; }
        .lux-table-viewport::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0052FF, #0EA5E9);
          border-radius: 99px;
        }

        .lux-th {
          background: rgba(239, 246, 255, 0.95);
          color: #0F172A;
          padding: 14px 22px;
          text-align: left;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border-bottom: 2px solid rgba(0, 82, 255, 0.2);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(12px);
        }
        .lux-td {
          padding: 13px 22px;
          color: #1E293B;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.84rem;
          border-bottom: 1px solid #F1F5F9;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .lux-tr:nth-child(even) .lux-td {
          background: #FAFBFD;
        }
        .lux-tr:hover .lux-td {
          background: #EFF6FF;
          color: #0052FF;
        }
      `}</style>

      {/* HEADER & TABS */}
      <div className="lux-sheet-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0, 82, 255, 0.25)'
            }}
          >
            <Layers color="#FFFFFF" size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                QUANTUM <span style={{ color: '#0052FF' }}>SHEETS</span>
              </h2>
              <span
                style={{
                  background: '#EFF6FF',
                  color: '#0052FF',
                  border: '1px solid rgba(0, 82, 255, 0.2)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '99px'
                }}
              >
                {currentData.length} LIGNES
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', color: '#64748B', fontSize: '0.78rem', fontWeight: 500 }}>
              Matrice de facturation vérifiée et prête à l&apos;exportation
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="lux-tabs-bar">
          {sheetNames.map((sheet) => {
            const isActive = activeSheet === sheet;
            return (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                style={{
                  position: 'relative',
                  padding: '9px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  zIndex: 1,
                  whiteSpace: 'nowrap'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeLuxuryTab"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
                      borderRadius: '11px',
                      boxShadow: '0 4px 14px rgba(0, 82, 255, 0.3)',
                      zIndex: -1
                    }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  />
                )}
                {sheet}
              </button>
            );
          })}
        </div>

        {/* EXPORT BUTTON */}
        <motion.button
          whileHover={{ scale: 1.03, boxShadow: '0 14px 28px rgba(0, 82, 255, 0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(135deg, #0052FF 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '14px',
            fontWeight: 700,
            fontSize: '0.86rem',
            letterSpacing: '0.03em',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0, 82, 255, 0.22)'
          }}
        >
          <Download size={18} /> EXPORTER .XLSX
        </motion.button>
      </div>

      {/* DATA TABLE */}
      <div className="lux-table-viewport">
        <AnimatePresence mode="wait">
          <motion.table
            key={activeSheet}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            style={{ width: '100%', borderCollapse: 'collapse' }}
          >
            <thead>
              <tr>
                <th className="lux-th" style={{ width: '60px', color: '#0052FF' }}>#</th>
                {headers.map((h, i) => (
                  <th key={i} className="lux-th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, rowIndex) => (
                <tr key={rowIndex} className="lux-tr">
                  <td className="lux-td" style={{ color: '#0052FF', fontWeight: 700 }}>
                    {rowIndex + 1}
                  </td>
                  {headers.map((h, colIndex) => (
                    <td key={colIndex} className="lux-td">
                      {row[h] !== null && row[h] !== undefined && String(row[h]) !== "" ? String(row[h]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td
                    colSpan={headers.length + 1}
                    style={{
                      textAlign: 'center',
                      padding: '4rem',
                      color: '#64748B',
                      fontWeight: 600
                    }}
                  >
                    <FileSpreadsheet size={32} color="#94A3B8" style={{ display: 'block', margin: '0 auto 10px auto' }} />
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