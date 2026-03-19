import React, { useState, useMemo } from 'react';
import { Database, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ParametrageTable({ data, columns }: { data: any[], columns: string[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const rowsPerPage = 50;

  // 🔥 1. FILTRE INTELLIGENT (Ultra-rapide grâce à useMemo) 🔥
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase();
    
    return data.filter(row => 
      columns.some(col => 
        String(row[col] || "").toLowerCase().includes(lowerSearch)
      )
    );
  }, [data, columns, searchTerm]);

  // 🔥 2. PAGINATION (Pour ne pas exploser le navigateur) 🔥
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Retour à la page 1 si on cherche
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="hardware-accelerated target-bracket" style={{ marginTop: '2rem', backgroundColor: 'rgba(6, 11, 25, 0.9)', border: '1px solid #00f0ff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0, 240, 255, 0.1)', position: 'relative' }}>
      
      {/* HEADER + SEARCH BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0, 240, 255, 0.3)', paddingBottom: '15px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={24} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 5px #00f0ff)' }} />
          <h2 style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.2rem', margin: 0, letterSpacing: '2px', textShadow: '0 0 10px #00f0ff' }}>
            NEON OUTPUT MATRIX <span style={{ color: '#39ff14', fontSize: '0.8rem', marginLeft: '10px' }}>[{filteredData.length} RECORDS]</span>
          </h2>
        </div>

        {/* BARRE DE RECHERCHE ULTRA RAPIDE */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(10, 15, 30, 0.8)', border: '1px solid rgba(0, 240, 255, 0.5)', borderRadius: '6px', padding: '0.5rem 1rem', width: '300px', boxShadow: 'inset 0 0 10px rgba(0, 240, 255, 0.1)' }}>
          <Search size={16} color="#00f0ff" />
          <input 
            type="text" 
            placeholder="Search any value..." 
            value={searchTerm}
            onChange={handleSearch}
            style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', marginLeft: '10px', width: '100%', fontFamily: 'monospace', fontSize: '0.9rem' }}
          />
        </div>

      </div>

      {/* TABLEAU (Affiche uniquement 50 lignes max) */}
      <div className="cyber-scroll" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#020617', zIndex: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ padding: '12px 15px', textAlign: 'left', color: '#00f0ff', borderBottom: '2px solid #00f0ff', whiteSpace: 'nowrap', fontWeight: 'bold', letterSpacing: '1px' }}>
                  {col.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length > 0 ? currentData.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)', transition: 'background-color 0.2s ease', backgroundColor: rowIndex % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 240, 255, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = rowIndex % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent'}>
                {columns.map((col, colIndex) => {
                  const val = row[col];
                  let cellColor = '#cbd5e1';
                  if (val === 'TRUE' || val === true) cellColor = '#39ff14';
                  if (val === 'FALSE' || val === false) cellColor = '#ef4444';

                  return (
                    <td key={colIndex} style={{ padding: '10px 15px', color: cellColor, whiteSpace: 'nowrap' }}>
                      {val !== undefined && val !== null ? String(val) : '-'}
                    </td>
                  );
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: '#ef4444', fontFamily: 'monospace' }}>
                  NO MATCHING RECORDS FOUND IN MATRIX.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CONTROLES DE PAGINATION */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0, 240, 255, 0.2)' }}>
          <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            SHOWING PAGE <strong style={{ color: '#00f0ff' }}>{currentPage}</strong> OF <strong style={{ color: '#00f0ff' }}>{totalPages}</strong>
          </span>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', backgroundColor: currentPage === 1 ? 'rgba(15, 23, 42, 0.6)' : 'rgba(0, 240, 255, 0.15)', border: `1px solid ${currentPage === 1 ? '#334155' : '#00f0ff'}`, color: currentPage === 1 ? '#64748b' : '#00f0ff', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'monospace', transition: 'all 0.2s' }}
            >
              <ChevronLeft size={16} /> PREV
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 15px', backgroundColor: currentPage === totalPages ? 'rgba(15, 23, 42, 0.6)' : 'rgba(0, 240, 255, 0.15)', border: `1px solid ${currentPage === totalPages ? '#334155' : '#00f0ff'}`, color: currentPage === totalPages ? '#64748b' : '#00f0ff', borderRadius: '4px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'monospace', transition: 'all 0.2s' }}
            >
              NEXT <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}