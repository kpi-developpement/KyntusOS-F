import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Target } from 'lucide-react';

export default function DataTableViewer({ data }: { data: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 50;

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(row => columns.some(col => String(row[col] || "").toLowerCase().includes(lowerSearch)));
  }, [data, columns, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  if (!data || data.length === 0) return <div style={{color: '#00f0ff', fontFamily:'monospace', padding: '2rem'}}>NO DATA STREAM DETECTED.</div>;

  return (
    <div style={{ position: 'relative' }}>
      
      {/* 🚀 SCI-FI SEARCH BAR 🚀 */}
      <div style={{ display: 'flex', marginBottom: '20px', backgroundColor: 'rgba(2, 6, 23, 0.8)', border: '1px solid #00f0ff', borderRadius: '4px', padding: '0.5rem 1rem', width: '350px', boxShadow: '0 0 15px rgba(0, 240, 255, 0.2)' }}>
        <Target size={18} color="#00f0ff" style={{ animation: 'pulse 2s infinite' }} />
        <input 
          type="text" 
          placeholder="ENTER QUERY PARAMS..." 
          value={searchTerm} 
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
          style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '10px', width: '100%', fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '1px' }} 
        />
      </div>

      {/* 🚀 THE HOLO-TABLE 🚀 */}
      <div className="custom-scrollbar" style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', position: 'relative' }}>
        
        {/* Scanline li kat-hbet wst l-Tableau */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: 'rgba(0, 240, 255, 0.5)', boxShadow: '0 0 10px #00f0ff', pointerEvents: 'none', animation: 'scan 4s linear infinite' }}></div>
        <style>{`@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }`}</style>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(2, 6, 23, 0.95)', zIndex: 10, backdropFilter: 'blur(5px)', boxShadow: '0 2px 10px rgba(0, 240, 255, 0.2)' }}>
            <tr>
              <th style={{ padding: '12px', color: '#00f0ff', borderBottom: '1px solid #00f0ff' }}>ID</th>
              {columns.map((col, idx) => (
                <th key={idx} style={{ padding: '12px 15px', textAlign: 'left', color: '#00f0ff', borderBottom: '1px solid #00f0ff', whiteSpace: 'nowrap', textShadow: '0 0 5px rgba(0, 240, 255, 0.5)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.1)', backgroundColor: rowIndex % 2 === 0 ? 'rgba(0, 240, 255, 0.02)' : 'transparent', transition: 'all 0.15s ease' }} 
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.15)'; e.currentTarget.style.boxShadow = 'inset 4px 0 0 #00f0ff'; }} 
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? 'rgba(0, 240, 255, 0.02)' : 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <td style={{ padding: '10px', color: '#64748b', textAlign: 'center', fontWeight: 'bold' }}>
                  {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                </td>
                {columns.map((col, colIndex) => {
                  const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '-';
                  // N-loounou l-Ar9am b' l-Akhder w l-Ktaba b' l-Byed bash y-ban b7al System d-bsa7
                  const isNumber = !isNaN(Number(val)) && val !== '-';
                  return (
                    <td key={colIndex} style={{ padding: '10px 15px', color: isNumber ? '#39ff14' : '#e2e8f0', whiteSpace: 'nowrap' }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚀 SCI-FI PAGINATION 🚀 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
          <span style={{ color: '#00f0ff', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            SECTOR <strong style={{ color: '#fff', textShadow: '0 0 5px #fff' }}>{currentPage}</strong> OF {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', color: '#00f0ff', padding: '5px 15px', borderRadius: '2px', cursor: 'pointer', fontFamily: 'monospace' }}><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid #00f0ff', color: '#00f0ff', padding: '5px 15px', borderRadius: '2px', cursor: 'pointer', fontFamily: 'monospace' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}