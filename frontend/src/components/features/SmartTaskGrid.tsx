"use client";

import React, { useState, useRef } from "react";
import { Copy, Check, Hash, Play, AlertTriangle, AlertOctagon, Lock, ShieldCheck, Zap } from "lucide-react";
import styles from "./SmartTaskGrid.module.css";

interface SmartGridProps {
  tasks: any[];
  allowedFields: string[];
  onUpdateData: (taskId: number, key: string, value: any) => void;
  onToggleStatus?: (taskId: number, currentStatus: string) => void;
}

export default function SmartTaskGrid({ tasks, allowedFields, onUpdateData, onToggleStatus }: SmartGridProps) {
  const allKeys = tasks.length > 0 && tasks[0].dynamicData ? Object.keys(tasks[0].dynamicData) : [];
  const anomalyKey = allKeys.find(k => k.toLowerCase().includes("anomalie"));
  const dynamicCols = allKeys.filter(k => k !== anomalyKey);

  const [editing, setEditing] = useState<{id: number, col: string} | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [copiedId, setCopiedId] = useState<{id: number, type: 'EPS'|'ANOMALY'} | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    type: 'START' | 'STOP';
    taskId: number;
    currentStatus: string;
    targetCol?: string;
  } | null>(null);

  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const handleCopyEPS = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId({id, type: 'EPS'});
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAnomaly = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId({id, type: 'ANOMALY'});
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInputFocus = (task: any, col: string) => {
    if (!allowedFields.includes(col)) return;

    if (task.status === "DONE") return;
    if (task.status !== "EN_COURS") {
      if(document.activeElement instanceof HTMLElement) document.activeElement.blur();
      setConfirmModal({ type: 'START', taskId: task.id, currentStatus: task.status, targetCol: col });
      return;
    }
    setEditing({ id: task.id, col });
    setTempValue(task.dynamicData[col] || "");
  };

  const handleActionClick = (task: any) => {
    if (!onToggleStatus || task.status === "DONE") return;
    if (task.status === "EN_COURS") {
      setConfirmModal({ type: 'STOP', taskId: task.id, currentStatus: task.status });
    } else {
      setConfirmModal({ type: 'START', taskId: task.id, currentStatus: task.status });
    }
  };

  const confirmAction = () => {
    if (!confirmModal || !onToggleStatus) return;
    onToggleStatus(confirmModal.taskId, confirmModal.currentStatus);
    if (confirmModal.type === 'START' && confirmModal.targetCol) {
      setTimeout(() => {
        const key = `${confirmModal.taskId}-${confirmModal.targetCol}`;
        inputRefs.current[key]?.focus();
      }, 100);
    }
    setConfirmModal(null);
  };

  const handleBlur = () => {
    if (editing) {
      onUpdateData(editing.id, editing.col, tempValue);
      setEditing(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  if (tasks.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {onToggleStatus ? <th className={styles.stickyHeader} style={{width:"80px"}}>STATUS</th> : null}
              <th className={styles.stickyHeader} style={{width: "180px"}}><Hash size={14} className={styles.headerIcon}/> REF EPS</th>
              {dynamicCols.map(col => {
                  const isLocked = !allowedFields.includes(col);
                  return (
                    <th key={col} className={styles.stickyHeader} style={{minWidth: "160px"}}>
                        <div className={styles.headerContent} style={{opacity: isLocked ? 0.5 : 1}}>
                            {isLocked ? <Lock size={12} /> : <Zap size={12} />} 
                            {col.toUpperCase()}
                        </div>
                    </th>
                  );
              })}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => {
              const isActive = task.status === "EN_COURS";
              const isDone = task.status === "DONE";
              
              const anomalyVal = anomalyKey ? task.dynamicData[anomalyKey] : null;
              const hasAnomaly = !!anomalyVal;
              
              // Animation delay stagiaire style
              const rowStyle = { animationDelay: `${index * 0.05}s` } as React.CSSProperties;

              return (
                <React.Fragment key={task.id}>
                  <tr 
                    className={`${styles.row} ${isActive ? styles.rowActive : ''} ${isDone ? styles.rowDone : ''} ${hasAnomaly ? styles.rowWithAnomaly : ''}`}
                    style={rowStyle}
                  >
                    
                    {/* --- ACTION BUTTON --- */}
                    <td className={styles.actionCell}>
                        {isDone ? (
                            <div className={styles.doneBadge} title="Mission Terminée & Sécurisée">
                                <ShieldCheck size={20} className={styles.doneIcon} />
                            </div>
                        ) : (
                            onToggleStatus && (
                              <button 
                                  className={`${styles.actionBtn} ${isActive ? styles.btnActive : styles.btnIdle}`}
                                  onClick={() => handleActionClick(task)}
                              >
                                  {isActive ? (
                                    <div className={styles.pulseContainer}>
                                      <div className={styles.pulseRing}></div>
                                      <Check size={18} strokeWidth={3} />
                                    </div>
                                  ) : (
                                    <Play size={14} style={{marginLeft:2}}/>
                                  )}
                              </button>
                            )
                        )}
                    </td>

                    {/* --- EPS REFERENCE --- */}
                    <td className={styles.epsCell}>
                        <div className={styles.epsWrapper} onClick={() => handleCopyEPS(task.id, task.epsReference)}>
                            <span className={styles.epsText}>{task.epsReference}</span>
                            <div className={`${styles.copyFeedback} ${copiedId?.id === task.id && copiedId?.type === 'EPS' ? styles.copied : ''}`}>
                               {copiedId?.id === task.id && copiedId?.type === 'EPS' ? <Check size={14} color="#00f2ea"/> : <Copy size={14} className={styles.copyIcon}/>}
                            </div>
                        </div>
                    </td>

                    {/* --- DYNAMIC FIELDS --- */}
                    {dynamicCols.map(col => {
                      const isEditable = allowedFields.includes(col);
                      return (
                        <td key={col} className={styles.dataCell}>
                            <input 
                              ref={el => inputRefs.current[`${task.id}-${col}`] = el}
                              type="text"
                              className={styles.inputCell}
                              value={editing?.id === task.id && editing?.col === col ? tempValue : (task.dynamicData[col] || "")}
                              onChange={(e) => setTempValue(e.target.value)}
                              onFocus={() => handleInputFocus(task, col)}
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              placeholder={isEditable ? "..." : ""}
                              autoComplete="off"
                              disabled={isDone || !isEditable} 
                            />
                            {/* Focus line effect */}
                            {!isDone && isEditable && <div className={styles.focusLine}></div>}
                            {/* Glow effect when active */}
                            {isActive && isEditable && <div className={styles.activeGlow}></div>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* --- ANOMALY ROW (RED) --- */}
                  {hasAnomaly && (
                    <tr className={styles.anomalyRow} style={{animationDelay: `${(index * 0.05) + 0.02}s`}}>
                      <td colSpan={2 + dynamicCols.length}>
                        <div 
                          className={`${styles.anomalyBanner} ${copiedId?.id === task.id && copiedId?.type === 'ANOMALY' ? styles.anomalyCopied : ''}`}
                          onClick={() => handleCopyAnomaly(task.id, anomalyVal)}
                        >
                            <div className={styles.anomalyIconBox}>
                                <AlertOctagon size={20} className={styles.anomalyPulse} />
                            </div>
                            <div className={styles.anomalyContent}>
                                <span className={styles.anomalyLabel}>CRITICAL ANOMALY DETECTED</span>
                                <span className={styles.anomalyText}>{anomalyVal}</span>
                            </div>
                            <div className={styles.anomalyAction}>
                                {copiedId?.id === task.id && copiedId?.type === 'ANOMALY' ? 
                                    <span className={styles.copiedMsg}><Check size={16}/> SYSTEM COPIED</span> : 
                                    <div className={styles.copyHint}>
                                      <Copy size={14}/> <span>COPY LOG</span>
                                    </div>
                                }
                            </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalGlow}></div>
            <div className={styles.modalHeader}>
              <AlertTriangle size={28} color={confirmModal.type === 'START' ? "#00f2ea" : "#ff0055"} />
              <h3>{confirmModal.type === 'START' ? 'INITIATE PROTOCOL' : 'TERMINATE MISSION'}</h3>
            </div>
            <p className={styles.modalText}>
              {confirmModal.type === 'START' 
                ? "Engage active processing for this unit?" 
                : "Secure data and archive this mission?"
              }
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setConfirmModal(null)}>CANCEL</button>
              <button className={`${styles.btnConfirm} ${confirmModal.type === 'START' ? styles.btnConfirmStart : styles.btnConfirmStop}`} onClick={confirmAction}>
                {confirmModal.type === 'START' ? 'ENGAGE' : 'CONFIRM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}