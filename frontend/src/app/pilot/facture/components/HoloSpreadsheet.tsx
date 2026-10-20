"use client";

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Layers, FileSpreadsheet, Search } from 'lucide-react';

interface HoloSpreadsheetProps {
  sheetsData: Record<string, any[]>;
  onDownload: () => void;
}

const ROW_HEIGHT = 42; // Hauteur fixe dyal kol ligne bash l-Virtualization tkon tayyara
const OVERSCAN = 12;   // Ch7al mn ligne n-chargiw l-foq w l-te7t bash ma-ybanch l-byad f' scroll sri3

export default function HoloSpreadsheet({ sheetsData, onDownload }: HoloSpreadsheetProps) {
  const sheetNames = useMemo(() => Object.keys(sheetsData), [sheetsData]);
  const [activeSheet, setActiveSheet] = useState<string>(sheetNames[0] || "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scrollTop, setScrollTop] = useState<number>(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const rawData = sheetsData[activeSheet] || [];

  // Filtrage instantané ila bghiti t-qelleb وسط 25k lignes
  const currentData = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rawData, searchQuery]);

  const headers = useMemo(() => {
    return rawData.length > 0 ? Object.keys(rawData[0]) : [];
  }, [rawData]);

  // Changement de feuille ultra-rapide
  const handleTabChange = useCallback((sheet: string) => {
    setActiveSheet(sheet);
    setScrollTop(0);
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calcul dyal Virtual Window (Ghir les lignes li baynin f' l'écran)
  const viewportHeight = 650;
  const totalRows = currentData.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN
  );

  const visibleRows = useMemo(() => {
    return currentData.slice(startIndex, endIndex);
  }, [currentData, startIndex, endIndex]);

  const topPaddingHeight = startIndex * ROW_HEIGHT;
  const bottomPaddingHeight = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  return (
    <div className="lux-sheet-shell">
      <style>{`
        .lux-sheet-shell {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 82, 255, 0.16);
          border-radius: 28px;
          box-shadow: 0 25px 60px -15px rgba(0, 52, 150, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.9) inset;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 78vh;
          contain: strict;
        }
        .lux-sheet-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 28px;
          background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
          border-bottom: 1px solid rgba(0, 82, 255, 0.12);
          gap: 16px;
          flex-wrap: wrap;
        }
        .lux-tabs-bar {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          max-width: 45vw;
          padding: 5px;
          background: #F1F5F9;
          border-radius: 14px;
          border: 1px solid rgba(0, 82, 255, 0.08);
        }
        .lux-tabs-bar::-webkit-scrollbar { height: 4px; }
        .lux-tabs-bar::-webkit-scrollbar-thumb { background: #93C5FD; border-radius: 10px; }

        .lux-table-viewport {
          flex: 1;
          overflow: auto;
          position: relative;
          background: #FFFFFF;
          will-change: transform;
        }
        .lux-table-viewport::-webkit-scrollbar { width: 10px; height: 10px; }
        .lux-table-viewport::-webkit-scrollbar-track { background: #F1F5F9; }
        .lux-table-viewport::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0052FF, #0EA5E9);
          border-radius: 99px;
        }

        .lux-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }
        .lux-th {
          background: #EFF6FF;
          color: #0F172A;
          padding: 12px 18px;
          text-align: left;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 2px solid rgba(0, 82, 255, 0.2);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .lux-td {
          height: ${ROW_HEIGHT}px;
          padding: 0 18px;
          color: #1E293B;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.82rem;
          border-bottom: 1px solid #F1F5F9;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .lux-tr-even {
          background: #FAFBFD;
        }
        .lux-tr:hover {
          background: #EFF6FF !important;
          color: #0052FF;
        }
        .lux-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 12px;
          padding: 8px 14px;
          min-width: 220px;
        }
        .lux-search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.82rem;
          font-weight: 600;
          color: #0F172A;
          width: 100%;
        }
      `}</style>

      {/* HEADER & TABS */}
      <div className="lux-sheet-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(0, 82, 255, 0.25)'
            }}
          >
            <Layers color="#FFFFFF" size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, color: '#0F172A', fontSize: '1.15rem', fontWeight: 800 }}>
                QUANTUM <span style={{ color: '#0052FF' }}>SHEETS</span>
              </h2>
              <span
                style={{
                  background: '#EFF6FF',
                  color: '#0052FF',
                  border: '1px solid rgba(0, 82, 255, 0.2)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '99px'
                }}
              >
                {totalRows.toLocaleString()} LIGNES (200 FPS VIRTUALIZED)
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', color: '#64748B', fontSize: '0.75rem', fontWeight: 500 }}>
              Rendu haute fréquence activé • Aucune latence DOM
            </p>
          </div>
        </div>

        {/* SEARCH FILTER */}
        <div className="lux-search-box">
          <Search size={16} color="#0052FF" />
          <input
            type="text"
            placeholder="Filtrer dans les 25k lignes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setScrollTop(0);
            }}
          />
        </div>

        {/* TABS */}
        <div className="lux-tabs-bar">
          {sheetNames.map((sheet) => {
            const isActive = activeSheet === sheet;
            return (
              <button
                key={sheet}
                onClick={() => handleTabChange(sheet)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 4px 12px rgba(0, 82, 255, 0.25)' : 'none'
                }}
              >
                {sheet} ({sheetsData[sheet]?.length || 0})
              </button>
            );
          })}
        </div>

        {/* EXPORT BUTTON */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #0052FF 0%, #1D4ED8 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: '11px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(0, 82, 255, 0.22)'
          }}
        >
          <Download size={17} /> EXPORTER .XLSX
        </motion.button>
      </div>

      {/* VIRTUALIZED DATA TABLE */}
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="lux-table-viewport"
      >
        <table className="lux-table">
          <thead>
            <tr>
              <th className="lux-th" style={{ width: '65px', color: '#0052FF' }}>#</th>
              {headers.map((h, i) => (
                <th key={i} className="lux-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topPaddingHeight > 0 && (
              <tr style={{ height: `${topPaddingHeight}px` }}>
                <td colSpan={headers.length + 1} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}

            {visibleRows.map((row, idx) => {
              const actualRowIndex = startIndex + idx;
              const isEven = actualRowIndex % 2 === 1;
              return (
                <tr
                  key={actualRowIndex}
                  className={`lux-tr ${isEven ? 'lux-tr-even' : ''}`}
                >
                  <td className="lux-td" style={{ color: '#0052FF', fontWeight: 700 }}>
                    {actualRowIndex + 1}
                  </td>
                  {headers.map((h, colIndex) => {
                    const val = row[h];
                    return (
                      <td key={colIndex} className="lux-td">
                        {val !== null && val !== undefined && val !== "" ? String(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {bottomPaddingHeight > 0 && (
              <tr style={{ height: `${bottomPaddingHeight}px` }}>
                <td colSpan={headers.length + 1} style={{ padding: 0, border: 'none' }} />
              </tr>
            )}

            {totalRows === 0 && (
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
        </table>
      </div>
    </div>
  );
}