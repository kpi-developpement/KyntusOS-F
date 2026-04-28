"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, CircleDashed, Clock, Check } from "lucide-react";
import styles from "./SmartTaskGrid.module.css";

// ============================================================================
// 🔥 THE PREDICTIVE INPUT COMPONENT (Kay7fed chno katkteb) 🔥
// ============================================================================
const PredictiveInput = ({ defaultValue, columnKey, taskId, onUpdate }: any) => {
  const [val, setVal] = useState(defaultValue || "");
  const [history, setHistory] = useState<Record<string, Record<string, number>>>({});

  // Kay-jib d-Dictionnaire mn LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem("kyntus_dict");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  // Kay-qelleb 3la l-klima li t-ktbat 3+ مرات
  const suggestion = useMemo(() => {
    if (!val) return "";
    const colDict = history[columnKey] || {};
    const frequentWords = Object.keys(colDict).filter(k => colDict[k] >= 3);
    const match = frequentWords.find(w => w.toLowerCase().startsWith(val.toLowerCase()) && w !== val);
    return match ? val + match.slice(val.length) : "";
  }, [val, history, columnKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault(); // 7bess Tab bash maymchich l' input akhor
      setVal(suggestion); // Ktb l-klima bo7dha!
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleBlur = () => {
    if (val !== defaultValue) {
      onUpdate(taskId, columnKey, val); // Sifet l-API
      
      // Sauvegarder f' d-Dictionnaire
      if (val.trim() !== "") {
        const stored = JSON.parse(localStorage.getItem("kyntus_dict") || "{}");
        const colDict = stored[columnKey] || {};
        colDict[val] = (colDict[val] || 0) + 1; // Zid +1
        stored[columnKey] = colDict;
        localStorage.setItem("kyntus_dict", JSON.stringify(stored));
        setHistory(stored);
      }
    }
  };

  return (
    <div className={styles.predictiveWrapper}>
      {suggestion && <span className={styles.ghostText}>{suggestion}</span>}
      <input 
        type="text" 
        className={styles.realInput}
        value={val} 
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

// ============================================================================
// MAIN GRID COMPONENT
// ============================================================================
interface SmartTaskGridProps {
  tasks: any[];
  allColumns: string[];
  editableColumns: string[];
  onUpdateData: (taskId: number, key: string, value: string) => void;
  onToggleStatus: (taskId: number, currentStatus: string) => void;
  selectedTasks: number[];
  setSelectedTasks: React.Dispatch<React.SetStateAction<number[]>>;
}

export default function SmartTaskGrid({ tasks, allColumns, editableColumns, onUpdateData, onToggleStatus, selectedTasks, setSelectedTasks }: SmartTaskGridProps) {
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    let sortableTasks = [...tasks];
    if (sortConfig !== null) {
      sortableTasks.sort((a, b) => {
        const aValue = a[sortConfig.key] !== undefined ? a[sortConfig.key] : (a.dynamicData?.[sortConfig.key] || "");
        const bValue = b[sortConfig.key] !== undefined ? b[sortConfig.key] : (b.dynamicData?.[sortConfig.key] || "");
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTasks;
  }, [tasks, sortConfig]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedTasks(tasks.map(t => t.id));
    else setSelectedTasks([]);
  };

  const handleSelectOne = (taskId: number) => {
    setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "DONE": return <span className={`${styles.statusBadge} ${styles.status_DONE}`}><CheckCircle2 size={14}/> DONE</span>;
      case "EN_COURS": return <span className={`${styles.statusBadge} ${styles.status_EN_COURS}`}><Clock size={14}/> EN COURS</span>;
      default: return <span className={`${styles.statusBadge} ${styles.status_A_FAIRE}`}><CircleDashed size={14}/> A FAIRE</span>;
    }
  };

  const getSortIcon = (columnName: string) => {
    if (!sortConfig || sortConfig.key !== columnName) return <ArrowUpDown size={14} style={{opacity: 0.3, marginLeft: 8}} />;
    return sortConfig.direction === 'asc' 
        ? <ArrowUp size={14} style={{color: '#00FF88', marginLeft: 8}} />
        : <ArrowDown size={14} style={{color: '#00FF88', marginLeft: 8}} />;
  };

  return (
    <div className={styles.gridContainer}>
      <table className={styles.cyberTable}>
        <thead>
          <tr>
            <th style={{ width: '50px', textAlign: 'center' }}>
              <label className={styles.checkboxWrapper}>
                <input type="checkbox" className={styles.hiddenCheckbox}
                  checked={selectedTasks.length === tasks.length && tasks.length > 0} 
                  onChange={handleSelectAll} 
                />
                <div className={styles.customBox}><Check size={16} strokeWidth={3} /></div>
              </label>
            </th>
            <th onClick={() => requestSort('epsReference')}>EPS_REF {getSortIcon('epsReference')}</th>
            <th onClick={() => requestSort('status')}>SYS_STATUS {getSortIcon('status')}</th>
            {allColumns.map(col => (
              <th key={col} onClick={() => requestSort(col)}>
                {col.toUpperCase()} {getSortIcon(col)}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {sortedTasks.map(task => {
            const isSelected = selectedTasks.includes(task.id);
            return (
              <tr key={task.id} className={`${styles.cyberRow} ${isSelected ? styles.selectedRow : ''}`}>
                <td style={{ textAlign: 'center' }}>
                  <label className={styles.checkboxWrapper}>
                    <input type="checkbox" className={styles.hiddenCheckbox}
                      checked={isSelected} onChange={() => handleSelectOne(task.id)} 
                    />
                    <div className={styles.customBox}><Check size={16} strokeWidth={3} /></div>
                  </label>
                </td>
                
                <td style={{ fontWeight: 'bold', color: isSelected ? '#b026ff' : '#ffffff' }}>
                  {task.epsReference || "// UNDEFINED"}
                </td>
                <td onClick={() => onToggleStatus(task.id, task.status)}>{renderStatus(task.status)}</td>

                {allColumns.map(col => {
                  const val = task.dynamicData?.[col] || "";
                  const isEditable = editableColumns.includes(col);

                  return (
                    <td key={col}>
                      {isEditable ? (
                        // 🔥 HNA KAN-KHEDMOU COMPOSANT JDID 🔥
                        <PredictiveInput 
                          defaultValue={val} 
                          columnKey={col} 
                          taskId={task.id} 
                          onUpdate={onUpdateData} 
                        />
                      ) : (
                        <span style={{ opacity: 0.8 }}>{val || "-"}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}