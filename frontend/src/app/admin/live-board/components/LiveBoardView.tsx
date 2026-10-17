"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Activity, ListChecks, Lock, Edit3, Copy, Check, CheckCircle2,
  Clock, CircleDot, ShieldCheck, Layers, Radio
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

// 🔥 IMPORTS DES COMPOSANTS DU PILOTE (Vérifie bien tes chemins)
import BoardActions from "../../../pilot/board/components/BoardActions";
import { LuxeOption } from "../../../pilot/board/ui/LuxeDropdown";
import styles from "../../../pilot/board/PilotBoard.module.css";

const API_URL = "/api";

// --- Helpers ---
async function universalCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return true; } catch (err) {}
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (err) { return false; }
}

function extractTaskEPS(task: any, editableCols: string[] = []): string {
  if (!task) return "";
  const directCandidates = [task.epsReference, task.eps, task.eps_reference, task.idIntervention, task.reference];
  for (const cand of directCandidates) {
    if (cand && typeof cand === "string" && !cand.startsWith("AUTO-")) return cand.trim();
  }
  const dyn = task.dynamicData || {};
  const keys = Object.keys(dyn);
  const epsRegex = /(EPS-[A-Z0-9_-]*\d+[A-Z0-9_-]*)/i;
  for (const k of keys) {
    const match = String(dyn[k] ?? "").trim().match(epsRegex);
    if (match) return match[1].toUpperCase();
  }
  return task.id ? `EPS-${task.id}` : "";
}

function isTaskLockedByAdmin(task: any): boolean {
  if (!task) return false;
  const st = String(task.status || "").toUpperCase().trim();
  return ["VALIDATED", "VALIDE_FINAL", "VALIDÉ_FINAL", "VALIDE", "ARCHIVED", "CLOSED"].includes(st) || task.adminValidated === true || task.locked === true;
}

interface LiveBoardViewProps {
  pilotId: string;
  pilotName: string;
  templateId: string;
  templateName: string;
}

export default function LiveBoardView({ pilotId, pilotName, templateId, templateName }: LiveBoardViewProps) {
  const [isLive, setIsLive] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [templateData, setTemplateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterColumn, setFilterColumn] = useState<string>("ALL");
  const [columnExactValue, setColumnExactValue] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Columns Layout
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // 1. Fetch Template Fields
  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then(res => res.json())
      .then(data => {
        const tpl = data.find((t: any) => t.id.toString() === templateId);
        if (tpl) setTemplateData(tpl);
      });
  }, [templateId]);

  // 2. Live Polling Engine
  const fetchTasks = useCallback((showLoader = false) => {
    if (showLoader) setLoading(true);
    fetch(`${API_URL}/tasks?assigneeId=${pilotId}&templateId=${templateId}`)
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Fetch Tasks Error:", e))
      .finally(() => { if (showLoader) setLoading(false); });
  }, [pilotId, templateId]);

  useEffect(() => {
    fetchTasks(true);
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => fetchTasks(false), 2500);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [fetchTasks, isLive]);

  // 3. Columns Logic
  const allowedFields = useMemo(() => {
    if (!templateData || !Array.isArray(templateData.fields)) return [];
    return templateData.fields.map((f: any) => (typeof f === "string" ? f : f?.name)).filter(Boolean);
  }, [templateData]);

  const editableLowerSet = useMemo(() => new Set(allowedFields.map((f: string) => f.toLowerCase())), [allowedFields]);
  const isEditableColumn = useCallback((colName: string) => editableLowerSet.has(colName.toLowerCase()), [editableLowerSet]);

  const defaultOrderedCols = useMemo(() => {
    const cols = new Set<string>();
    allowedFields.forEach((f: string) => cols.add(f));
    tasks.forEach((t) => {
      if (t.dynamicData) Object.keys(t.dynamicData).forEach((k) => cols.add(k));
    });
    return Array.from(cols);
  }, [tasks, allowedFields]);

  useEffect(() => {
    if (defaultOrderedCols.length > 0) setColumnOrder(defaultOrderedCols);
  }, [defaultOrderedCols]);

  const visibleOrderedCols = useMemo(() => columnOrder.filter((c) => !hiddenColumns.includes(c)), [columnOrder, hiddenColumns]);

  // 4. Filters Logic
  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];
    const countsMap = new Map<string, number>();
    let emptyCount = 0;
    tasks.forEach((task) => {
      let rawVal = filterColumn === "EPS_ONLY" ? extractTaskEPS(task, allowedFields) : String(task.dynamicData?.[filterColumn] ?? "").trim();
      if (!rawVal) emptyCount++;
      else countsMap.set(rawVal, (countsMap.get(rawVal) || 0) + 1);
    });
    const options: LuxeOption[] = [{ value: "ALL", label: `Toutes les valeurs (${tasks.length})`, badge: tasks.length, icon: <Layers size={14} /> }];
    if (emptyCount > 0) options.push({ value: "__EMPTY__", label: "[Vide / Non renseigné]", badge: emptyCount, icon: <CircleDot size={14} /> });
    Array.from(countsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([val, count]) => {
      options.push({ value: val, label: val, badge: count });
    });
    return options;
  }, [tasks, filterColumn, allowedFields]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "VALIDATED") {
          if (!isTaskLockedByAdmin(task)) return false;
        } else if (task.status !== statusFilter) return false;
      }
      const eps = extractTaskEPS(task, allowedFields);
      const dyn = task.dynamicData || {};
      if (filterColumn !== "ALL" && columnExactValue !== "ALL") {
        const targetCell = filterColumn === "EPS_ONLY" ? eps : String(dyn[filterColumn] ?? "").trim();
        if (columnExactValue === "__EMPTY__") { if (targetCell !== "") return false; }
        else if (targetCell !== columnExactValue) return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      if (filterColumn === "EPS_ONLY") return eps.toLowerCase().includes(q);
      if (filterColumn !== "ALL") return String(dyn[filterColumn] ?? "").toLowerCase().includes(q);
      if (eps.toLowerCase().includes(q)) return true;
      return Object.values(dyn).some((val) => String(val ?? "").toLowerCase().includes(q));
    });
  }, [tasks, searchQuery, filterColumn, columnExactValue, statusFilter, allowedFields]);

  const spectatorWarning = () => toast({ message: "MODE SPECTATEUR : Lecture seule.", type: "warning" });

  const handleCopySingleEPS = async (taskId: number, eps: string) => {
    const ok = await universalCopyToClipboard(eps);
    if (ok) {
      setCopiedId(taskId);
      toast({ message: `${eps} copié`, type: "success" });
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      {/* LIVE CONTROL BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(12px)", padding: "12px 24px", borderRadius: "16px", border: "1px solid #38bdf8", boxShadow: "0 8px 32px rgba(2, 132, 199, 0.3)", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "#0ea5e9", color: "white", padding: "6px 12px", borderRadius: "8px", fontWeight: 900, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Activity size={16} /> LIVE MONITORING
          </div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>
            <span style={{ color: "#38bdf8" }}>Pilote:</span> {pilotName} <span style={{ margin: "0 8px", color: "#64748b" }}>|</span>
            <span style={{ color: "#38bdf8" }}>Mission:</span> {templateName}
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: isLive ? "#10b981" : "#64748b", fontWeight: 800, fontSize: "0.8rem" }}>
            <Radio size={16} className={isLive ? styles.spinSlow : ""} />
            {isLive ? "SYNC EN TEMPS RÉEL (2.5s)" : "SYNC PAUSÉE"}
          </div>
          <button 
            onClick={() => setIsLive(!isLive)}
            style={{ background: isLive ? "#fee2e2" : "#dcfce7", color: isLive ? "#dc2626" : "#16a34a", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 800, cursor: "pointer", fontSize: "0.75rem" }}
          >
            {isLive ? "STOPPER LE LIVE" : "REPRENDRE LE LIVE"}
          </button>
        </div>
      </div>

      <div className={styles.boardContent}>
        {/* ACTIONS BAR (Disabled for Admin) */}
        <div className={`${styles.bentoCard} ${styles.actionsWrapper}`}>
          <BoardActions
            tasksCount={tasks.length}
            filteredCount={filteredTasks.length}
            selectedCount={selectedTasks.length}
            allowedFields={allowedFields}
            allColumns={columnOrder}
            columnDistinctOptions={columnDistinctOptions}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterColumn={filterColumn}
            setFilterColumn={setFilterColumn}
            columnExactValue={columnExactValue}
            setColumnExactValue={setColumnExactValue}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onCopyColumnValues={() => {}}
            onPurgeDoublons={spectatorWarning}
            onCoachSync={spectatorWarning}
            onBulkEdit={spectatorWarning}
            onClearSelection={() => setSelectedTasks([])}
            onResetFilters={() => {
              setFilterColumn("ALL");
              setColumnExactValue("ALL");
              setStatusFilter("ALL");
              setSearchQuery("");
            }}
          />
        </div>

        {/* GRID */}
        <div className={`${styles.bentoCard} ${styles.gridWrapper}`}>
          {loading && tasks.length === 0 ? (
            <div className={styles.emptyStateBox}>
              <div className={styles.emptyIconCircle}><Activity size={32} /></div>
              <h3>Connexion au flux du pilote...</h3>
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className={styles.tableScrollContainer}>
              <table className={styles.luxeTable}>
                <thead>
                  <tr>
                    <th className={`${styles.thLocked} ${styles.stickyColCheck}`}>
                      <Lock size={14} color="#94a3b8" />
                    </th>
                    <th className={`${styles.thLocked} ${styles.stickyColEps}`}>
                      <div className={styles.thContent}><span>RÉFÉRENCE EPS</span></div>
                    </th>
                    <th className={`${styles.thLocked} ${styles.stickyColStatus}`}>
                      <div className={styles.thContent}><span>STATUT PILOTE / ADMIN</span></div>
                    </th>
                    {visibleOrderedCols.map((col: string) => {
                      const isEditable = isEditableColumn(col);
                      return (
                        <th key={col} className={`${isEditable ? styles.thEditable : styles.thLocked}`}>
                          <div className={styles.thInteractiveBar}>
                            <div className={styles.thContent}>
                              {isEditable ? <Edit3 size={14} /> : <Lock size={12} style={{ opacity: 0.65 }} />}
                              <span>{col} {isEditable ? " (ANALYSE)" : ""}</span>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {filteredTasks.map((task) => {
                    const lockedByAdmin = isTaskLockedByAdmin(task);
                    const epsCode = extractTaskEPS(task, allowedFields);
                    const dyn = task.dynamicData || {};

                    return (
                      <tr key={task.id} className={`${styles.trRow} ${lockedByAdmin ? styles.trLockedAdmin : ""}`}>
                        <td className={`${styles.tdCell} ${styles.stickyColCheck}`}>
                          <Lock size={14} color="#cbd5e1" />
                        </td>
                        <td className={`${styles.tdCell} ${styles.stickyColEps}`}>
                          <div className={styles.epsPillGroup}>
                            <span className={styles.epsBadge}>{epsCode}</span>
                            <button type="button" className={styles.copyMiniBtn} onClick={() => handleCopySingleEPS(task.id, epsCode)}>
                              {copiedId === task.id ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        </td>
                        <td className={`${styles.tdCell} ${styles.stickyColStatus}`}>
                          <button
                            type="button"
                            disabled
                            className={`${styles.statusBtn} ${
                              lockedByAdmin ? styles.statusLockedAdmin : task.status === "DONE" ? styles.statusDone : task.status === "EN_COURS" ? styles.statusProgress : styles.statusTodo
                            }`}
                          >
                            {lockedByAdmin ? (
                              <><ShieldCheck size={13} /><span>VALIDÉ ADMIN</span><Lock size={12} /></>
                            ) : task.status === "DONE" ? (
                              <><CheckCircle2 size={13} /><span>TERMINÉ (2/2)</span></>
                            ) : task.status === "EN_COURS" ? (
                              <><Clock size={13} /><span>EN COURS (1/2)</span></>
                            ) : (
                              <><CircleDot size={13} /><span>À FAIRE (0/2)</span></>
                            )}
                          </button>
                        </td>

                        {visibleOrderedCols.map((col: string) => {
                          const isEditable = isEditableColumn(col);
                          const currentVal = String(dyn[col] ?? "");

                          if (isEditable) {
                            return (
                              <td key={col} className={styles.tdEditableCell}>
                                <div className={styles.pilotInputWrapper}>
                                  <input
                                    type="text"
                                    readOnly
                                    className={`${styles.pilotInput} ${styles.pilotInputDisabled}`}
                                    value={currentVal}
                                    title="Mode Spectateur : Lecture seule"
                                  />
                                  <Lock size={13} className={styles.lockedInputIcon} />
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={col} className={styles.tdCell} title={currentVal}>
                              <span className={styles.lockedValue}>{currentVal !== "" ? currentVal : "—"}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyStateBox}>
              <div className={styles.emptyIconCircle}><ListChecks size={32} /></div>
              <h3>Aucune ligne trouvée</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}