"use client";

import React, { useState } from "react";
import { Terminal, Copy, Trash2, UserCheck, Edit3 } from "lucide-react";
import ActionButton from "../ui/ActionButton";
import styles from "../PilotBoard.module.css";

interface BoardActionsProps {
  tasksCount: number;
  selectedCount: number;
  allowedFields: string[];
  onCopyEPS: () => void;
  onPurgeDoublons: () => void;
  onCoachSync: () => void;
  onBulkEdit: (col: string, val: string) => void;
}

export default function BoardActions({ tasksCount, selectedCount, allowedFields, onCopyEPS, onPurgeDoublons, onCoachSync, onBulkEdit }: BoardActionsProps) {
  const [bulkCol, setBulkCol] = useState(allowedFields[0] || "");
  const [bulkVal, setBulkVal] = useState("");

  return (
    <div className={styles.dataHeader}>
      <div className={styles.matrixTitle}>
        <Terminal size={20} color="#00f2ea"/> MATRIX VIEW
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        
        {/* 🔥 L-BULK EDIT UI (Kay-ban ghir ila khtarina des lignes) 🔥 */}
        {selectedCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(176, 38, 255, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(176, 38, 255, 0.4)' }}>
            <span style={{ color: '#b026ff', fontSize: '0.8rem', fontWeight: 'bold', fontFamily: 'monospace' }}>MASS ACTION ({selectedCount})</span>
            
            <select 
              value={bulkCol} onChange={(e) => setBulkCol(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #b026ff', borderRadius: '4px', padding: '4px', fontSize: '0.8rem', outline: 'none' }}
            >
              {allowedFields.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            
            <input 
              type="text" placeholder="Valeur..." value={bulkVal} onChange={(e) => setBulkVal(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid #b026ff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', outline: 'none', width: '120px' }}
            />
            
            <button 
              onClick={() => onBulkEdit(bulkCol, bulkVal)}
              style={{ background: '#b026ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              APPLY
            </button>
          </div>
        )}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }}></div>

        {/* 🚀 L-BOUTONS ACTIVÉS DABA 🚀 */}
        <ActionButton 
          icon={UserCheck} 
          label={selectedCount > 0 ? `COACH SYNC (${selectedCount})` : "COACH SYNC (ALL)"} 
          variant="cyan" 
          onClick={onCoachSync} 
        />
        <ActionButton icon={Trash2} label="PURGE DOUBLONS" variant="cyan" onClick={onPurgeDoublons} />
        
        <ActionButton 
          icon={Copy} 
          label={`COPIER ${selectedCount > 0 ? `(${selectedCount})` : `(${tasksCount})`} EPS`} 
          variant="cyan" 
          onClick={onCopyEPS} 
        />
        
        <div className={styles.countBadge}>{tasksCount} ENTRIES</div>
      </div>
    </div>
  );
}