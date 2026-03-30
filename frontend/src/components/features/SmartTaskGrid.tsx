"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare, Square, Zap, Lock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './SmartTaskGrid.module.css';

// 🎛️ CUSTOM CYBER DROPDOWN (M-bni mn Jdeeer!)
const CyberDropdown = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.customDropdown} ref={dropdownRef}>
      <div className={styles.dropdownHeader} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ color: value ? '#00f2ea' : '#94a3b8' }}>{value || placeholder}</span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.3s' }} />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.ul 
            initial={{ opacity: 0, y: -10, scaleY: 0.8 }} 
            animate={{ opacity: 1, y: 0, scaleY: 1 }} 
            exit={{ opacity: 0, y: -10, scaleY: 0.8 }}
            transition={{ duration: 0.2, originY: 0 }}
            className={styles.dropdownList}
          >
            <li className={styles.dropdownItem} onClick={() => { onChange(""); setIsOpen(false); }}>[ TOUS ]</li>
            {options.map((opt: string) => (
              <li key={opt} className={styles.dropdownItem} onClick={() => { onChange(opt); setIsOpen(false); }}>
                {opt}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SmartTaskGridProps {
  tasks: any[];
  allColumns: string[];       
  editableColumns: string[];  
  onUpdateData: (id: number, key: string, val: any) => void;
  onToggleStatus: (id: number, status: string) => void;
  selectedTasks: number[];
  setSelectedTasks: (val: number[] | ((prev: number[]) => number[])) => void;
}

export default function SmartTaskGrid({ tasks, allColumns, editableColumns, onUpdateData, onToggleStatus, selectedTasks, setSelectedTasks }: SmartTaskGridProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  
  // 📄 PAGINATION STATES
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getUniqueValues = (col: string) => {
    const vals = new Set<string>();
    tasks.forEach(t => {
      if (col === 'STATUS') vals.add(t.status);
      else if (t.dynamicData && t.dynamicData[col]) {
        const val = String(t.dynamicData[col]).trim();
        if (val) vals.add(val);
      }
    });
    return Array.from(vals).sort();
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (globalSearch.trim()) {
        const searchLower = globalSearch.toLowerCase();
        let matchGlobal = false;
        if (t.epsReference?.toLowerCase().includes(searchLower)) matchGlobal = true;
        if (t.status?.toLowerCase().includes(searchLower)) matchGlobal = true;
        if (t.dynamicData) {
          for (const key of allColumns) {
            if (String(t.dynamicData[key] || "").toLowerCase().includes(searchLower)) matchGlobal = true;
          }
        }
        if (!matchGlobal) return false;
      }
      for (const [col, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal) continue;
        if (col === 'STATUS' && t.status !== filterVal) return false;
        if (col !== 'STATUS' && String(t.dynamicData?.[col] || "").trim() !== filterVal) return false;
      }
      return true;
    });
  }, [tasks, globalSearch, columnFilters, allColumns]);

  // 📄 PAGINATION LOGIC
  const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
  
  // Reset page to 1 if we filter and current page is now empty
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [filteredTasks.length, totalPages, currentPage]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const handleFilterChange = (col: string, val: string) => {
    setColumnFilters(prev => ({ ...prev, [col]: val }));
    setCurrentPage(1); // Back to first page when filtering
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === paginatedTasks.length) setSelectedTasks([]); 
    else setSelectedTasks(paginatedTasks.map(t => t.id));
  };

  const toggleSelection = (id: number) => {
    setSelectedTasks(prev => prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]);
  };

  if (!tasks || tasks.length === 0) return null;

  return (
    <div className={styles.gridContainer}>
      
      {/* 🔍 FILTER BAR */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} color="#00f2ea" />
          <input type="text" placeholder="Scan Matrix Data..." value={globalSearch} onChange={(e) => {setGlobalSearch(e.target.value); setCurrentPage(1);}} className={styles.searchInput} />
        </div>
        <div className={styles.filterStats}>
          <Zap size={16} color="#39ff14" /> 
          <motion.span key={filteredTasks.length} initial={{ scale: 1.5 }} animate={{ scale: 1 }}>
            {filteredTasks.length} ENTITIES FOUND
          </motion.span>
        </div>
      </div>

      {/* 📊 THE CYBER TABLE */}
      <div className={styles.tableWrapper}>
        <table className={styles.cyberTable}>
          <thead>
            <tr>
              <th className={styles.stickyCheck}>
                <div onClick={handleSelectAll} style={{ cursor: 'pointer', marginTop: '10px' }}>
                  {selectedTasks.length > 0 && selectedTasks.length === paginatedTasks.length 
                    ? <CheckSquare size={18} color="#00f2ea" /> : <Square size={18} color="#64748b" />}
                </div>
              </th>
              
              <th className={styles.stickyEps}>
                <div className={styles.thContent}>EPS_REF</div>
              </th>
              
              <th>
                <div className={styles.thContent}>
                  SYS_STATUS
                  <CyberDropdown 
                    options={getUniqueValues('STATUS')} 
                    value={columnFilters['STATUS'] || ""} 
                    onChange={(val: string) => handleFilterChange('STATUS', val)} 
                    placeholder="ALL" 
                  />
                </div>
              </th>
              
              {allColumns.map(f => (
                <th key={f}>
                  <div className={styles.thContent}>
                    <span>{f.toUpperCase()} {!editableColumns.includes(f) && <Lock size={10} color="#64748b" style={{ marginLeft: '5px' }} />}</span>
                    <CyberDropdown 
                      options={getUniqueValues(f)} 
                      value={columnFilters[f] || ""} 
                      onChange={(val: string) => handleFilterChange(f, val)} 
                      placeholder="ALL" 
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <motion.tbody layout>
            <AnimatePresence mode="popLayout">
              {paginatedTasks.map((t) => {
                const isSelected = selectedTasks.includes(t.id);
                return (
                  <motion.tr 
                    key={t.id} layout
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`${styles.tr} ${isSelected ? styles.trSelected : ''}`}
                  >
                    <td className={styles.stickyCheck} onClick={() => toggleSelection(t.id)}>
                      {isSelected ? <CheckSquare size={18} color="#00f2ea" /> : <Square size={18} color="#475569" className={styles.uncheckIcon} />}
                    </td>

                    <td className={styles.stickyEps}><span className={styles.epsText}>{t.epsReference}</span></td>

                    <td className={styles.tdStatus}>
                      <button onClick={() => onToggleStatus(t.id, t.status)} className={`${styles.statusBtn} ${t.status === 'EN_COURS' ? styles.statusActive : styles.statusIdle}`}>
                        {t.status === 'EN_COURS' ? 'IN_PROG' : t.status}
                      </button>
                    </td>

                    {allColumns.map(f => {
                      const isEditable = editableColumns.includes(f);
                      const cellValue = t.dynamicData?.[f] || "";
                      return (
                        <td key={f} className={isEditable ? styles.tdInput : styles.tdReadOnly}>
                          {isEditable ? (
                            <div className={styles.inputCyberWrapper}>
                              <input type="text" value={cellValue} onChange={(e) => onUpdateData(t.id, f, e.target.value)} className={styles.dynamicInput} placeholder="..." />
                            </div>
                          ) : (
                            <span className={styles.readOnlyText}>{cellValue || "-"}</span>
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </motion.tbody>
        </table>
      </div>

      {/* 📄 PAGINATION CONTROLS */}
      <div className={styles.paginationBar}>
        <div className={styles.pageSizeSelector}>
          LIGNES PAR PAGE : 
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        <div className={styles.pageControls}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pageBtn}>
            <ChevronLeft size={16} /> PREV
          </button>
          <span className={styles.pageInfo}>PAGE <span style={{color: '#00f2ea'}}>{currentPage}</span> / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pageBtn}>
            NEXT <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}