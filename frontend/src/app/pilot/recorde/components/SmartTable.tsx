import React, { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Database, Clock, Activity, CheckCircle2, XCircle, AlertCircle, Crosshair } from 'lucide-react';
import styles from './SmartTable.module.css';

interface SmartTableProps {
  data: any[];
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;
  totalItems: number;
  onEpsClick?: (eps: string) => void; 
}

const getVersionBadgeStyle = (version: string) => {
  const v = (version || "V1").toUpperCase().trim();
  if (v === "V1") return styles.badgeV1;
  if (v === "V2") return styles.badgeV2;
  if (v === "V3") return styles.badgeV3;
  if (v === "V4") return styles.badgeV4;
  if (v === "V5") return styles.badgeV5;
  return styles.badgeVDef; 
};

const TableRow = React.memo(({ row, dynamicColumns, getSpecialField, getExactValue, getStatusBadge, onEpsClick }: any) => {
  
  const epsValue = row.epsReference || row.eps_reference || getSpecialField(row, 'eps') || getSpecialField(row, 'idintervention') || "UNKNOWN";
  const verValue = row.version || row.ver || getSpecialField(row, 'version') || getSpecialField(row, 'ver') || "V1";
  const statusValue = getSpecialField(row, 'etat') || getSpecialField(row, 'statut') || "-";
  const commentValue = getSpecialField(row, 'commentaire') || getSpecialField(row, 'comment') || "-";

  return (
    <tr className={styles.tr}>
      <td className={styles.td}>
        <div 
          className={styles.epsInteractive} 
          onClick={() => { if (onEpsClick) onEpsClick(epsValue); }}
        >
          <Crosshair size={14} className={styles.epsIcon} />
          <span className={styles.epsText}>{epsValue}</span>
        </div>
      </td>
      
      <td className={styles.td}>
        <span className={`${styles.badge} ${getVersionBadgeStyle(verValue)}`}>
          {verValue}
        </span>
      </td>

      <td className={styles.td}>
        {getStatusBadge(statusValue)}
      </td>

      <td className={styles.td}>
        <div className={styles.commentaire} title={commentValue}>
          {commentValue}
        </div>
      </td>

      {dynamicColumns.map((col: string) => (
        <td key={col} className={styles.td}>{getExactValue(row, col)}</td>
      ))}

      <td className={`${styles.td} ${styles.dateCell}`}>
        <Clock size={12} className={styles.clockIcon} />
        {row.importedAt ? new Date(row.importedAt).toLocaleString() : "-"}
      </td>
    </tr>
  );
});

export default function SmartTable({ data, loading, page, setPage, pageSize, setPageSize, totalPages, totalItems, onEpsClick }: SmartTableProps) {
  
  const dynamicColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    
    data.forEach(row => {
      if (row.dynamicData) {
        Object.keys(row.dynamicData).forEach(key => {
          const lower = key.toLowerCase();
          if (lower !== 'etat' && lower !== 'statut' && lower !== 'commentaire' && lower !== 'comment' && lower !== 'idintervention' && lower !== 'eps' && lower !== 'version' && lower !== 'ver') {
            keys.add(key);
          }
        });
      }
    });
    return Array.from(keys);
  }, [data]);

  const getExactValue = useCallback((row: any, exactKey: string) => {
    if (!row.dynamicData) return <span className={styles.emptyDash}>-</span>;
    const val = row.dynamicData[exactKey];
    return (val !== null && val !== undefined && val !== "") ? val : <span className={styles.emptyDash}>-</span>;
  }, []);

  const getSpecialField = useCallback((row: any, fieldName: string) => {
    if (!row.dynamicData) return "";
    for (const key in row.dynamicData) {
      if (key.toLowerCase() === fieldName) return row.dynamicData[key] || "";
    }
    return "";
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const s = status.toLowerCase();
    if (s.includes('ok') || s.includes('succès') || s.includes('réalisé') || s.includes('termine')) {
      return <span className={`${styles.badge} ${styles.badgeOk}`}><CheckCircle2 size={12} /> {status.toUpperCase() || "OK"}</span>;
    }
    if (s.includes('ko') || s.includes('échec') || s.includes('anomalie') || s.includes('annule')) {
      return <span className={`${styles.badge} ${styles.badgeKo}`}><XCircle size={12} /> {status.toUpperCase() || "KO"}</span>;
    }
    if (s.includes('en cours') || s.includes('planifie') || s.includes('attente') || s.includes('validation')) {
      return <span className={`${styles.badge} ${styles.badgeWarn}`}><AlertCircle size={12} /> {status.toUpperCase() || "PENDING"}</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>{status.toUpperCase() || "-"}</span>;
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.headerIconBox}><Database size={18} color="#00f0ff" /></div>
          MATRIX DATAGRID
        </div>
        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
            <div className={styles.statusDotWrapper}>
                <div className={styles.dot}></div>
                <span>LIVE LINK</span>
            </div>
            <div className={styles.totalBadge}>
               <span className={styles.badgeHighlight}>{totalItems.toLocaleString()}</span> ENTRIES
            </div>
        </div>
      </div>

      <div className={styles.scrollWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>TARGET EPS</th>
              <th className={styles.th}>VER</th>
              <th className={styles.th}>CORE STATUS</th>
              <th className={styles.th}>PILOT LOG (COMMENT)</th>
              {dynamicColumns.map(col => <th key={col} className={styles.th}>{col}</th>)}
              <th className={styles.th}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={100} style={{ padding: 0 }}>
                  <div className={styles.loadingContainer}>
                    <div className={styles.loaderWrapper}>
                        <div className={styles.hexCenter}></div>
                        <Loader2 size={50} className={styles.spinner} />
                    </div>
                    <div className={styles.loadingText}>SYNCHRONIZING DATAMATRIX...</div>
                  </div>
                </td>
              </tr>
            ) : (!data || data.length === 0) ? (
              <tr>
                <td colSpan={100} style={{ padding: 0 }}>
                  {/* 🔥 L'EMPTY STATE DYAL LES PROS 🔥 */}
                  <div className={styles.emptyContainer}>
                    <Database size={60} className={styles.emptyIcon} />
                    <div className={styles.emptyTitle}>VOID SECTOR</div>
                    <div className={styles.emptySub}>NO PAYLOADS DETECTED FOR THIS TIMELINE CYCLE.</div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <TableRow 
                  key={row.id} 
                  row={row} 
                  dynamicColumns={dynamicColumns} 
                  getSpecialField={getSpecialField} 
                  getExactValue={getExactValue} 
                  getStatusBadge={getStatusBadge} 
                  onEpsClick={onEpsClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {(!loading && data && data.length > 0) && (
        <div className={styles.pagination}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className={styles.pageLabel}>ROWS/PAGE:</span>
            <div className={styles.selectWrapper}>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className={styles.select}>
                {[50, 100, 200, 500].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.pageControls}>
            <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft size={18} /></button>
            <div className={styles.pageTextWrapper}>
              <span className={styles.pageText}>BLOCK</span>
              <span className={styles.pageHighlight}>{page + 1}</span>
              <span className={styles.pageText}>OF {totalPages === 0 ? 1 : totalPages}</span>
            </div>
            <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
}