import React, { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Database, Clock } from 'lucide-react';
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
}

// 🔥 Composant Ligne Mémorisé (Evite de re-dessiner les lignes qui ne changent pas)
const TableRow = React.memo(({ row, dynamicColumns, getSpecialField, getExactValue, getStatusBadge }: any) => (
  <tr className={styles.tr}>
    <td className={`${styles.td} ${styles.epsRef}`}>{row.epsReference}</td>
    <td className={styles.td}>
      <span className={`${styles.badge} ${styles.badgeVersion}`}>{row.version}</span>
    </td>
    <td className={styles.td}>
      {getStatusBadge(getSpecialField(row, 'etat'))}
    </td>
    <td className={styles.td}>
      <div className={styles.commentaire} title={getSpecialField(row, 'commentaire')}>
        {getSpecialField(row, 'commentaire')}
      </div>
    </td>
    {dynamicColumns.map((col: string) => (
      <td key={col} className={styles.td}>{getExactValue(row, col)}</td>
    ))}
    <td className={styles.td} style={{ color: "#64748b", fontSize: "0.8rem" }}>
      <Clock size={12} style={{ display: "inline", marginRight: "6px", marginBottom: "-2px" }} />
      {new Date(row.importedAt).toLocaleString()}
    </td>
  </tr>
));

export default function SmartTable({ data, loading, page, setPage, pageSize, setPageSize, totalPages, totalItems }: SmartTableProps) {
  
  // 🧠 Extraction ultra-légère des colonnes
  const dynamicColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = new Set<string>();
    
    data.forEach(row => {
      if (row.dynamicData) {
        Object.keys(row.dynamicData).forEach(key => {
          const lower = key.toLowerCase();
          if (lower !== 'etat' && lower !== 'commentaire' && lower !== 'idintervention' && lower !== 'eps') {
            keys.add(key);
          }
        });
      }
    });
    return Array.from(keys);
  }, [data]);

  const getExactValue = useCallback((row: any, exactKey: string) => {
    if (!row.dynamicData) return "-";
    const val = row.dynamicData[exactKey];
    return (val !== null && val !== undefined && val !== "") ? val : "-";
  }, []);

  const getSpecialField = useCallback((row: any, fieldName: string) => {
    if (!row.dynamicData) return "-";
    for (const key in row.dynamicData) {
      if (key.toLowerCase() === fieldName) return row.dynamicData[key] || "-";
    }
    return "-";
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    const s = status.toLowerCase();
    if (s.includes('ok') || s.includes('succès') || s.includes('réalisé') || s.includes('termine')) {
      return <span className={`${styles.badge} ${styles.badgeOk}`}>{status.toUpperCase() || "OK"}</span>;
    }
    if (s.includes('ko') || s.includes('échec') || s.includes('anomalie') || s.includes('annule')) {
      return <span className={`${styles.badge} ${styles.badgeKo}`}>{status.toUpperCase() || "KO"}</span>;
    }
    if (s.includes('en cours') || s.includes('planifie') || s.includes('attente')) {
      return <span className={`${styles.badge} ${styles.badgeWarn}`}>{status.toUpperCase() || "EN COURS"}</span>;
    }
    return <span className={`${styles.badge} ${styles.badgeNeutral}`}>{status.toUpperCase() || "-"}</span>;
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={48} color="#38bdf8" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
        <div className={styles.loadingText}>Synchronisation des données...</div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <div className={styles.container}>
      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Database size={20} color="#38bdf8" />
          RÉGISTRE DES DONNÉES
        </div>
        <span className={styles.totalBadge}>{totalItems.toLocaleString()} Entrées</span>
      </div>

      {/* TABLE */}
      <div className={styles.scrollWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>RÉFÉRENCE EPS</th>
              <th className={styles.th}>VERSION</th>
              <th className={styles.th}>STATUT</th>
              <th className={styles.th}>COMMENTAIRE</th>
              {dynamicColumns.map(col => <th key={col} className={styles.th}>{col}</th>)}
              <th className={styles.th}>DATE D'IMPORT</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <TableRow 
                key={row.id || index} 
                row={row} 
                dynamicColumns={dynamicColumns} 
                getSpecialField={getSpecialField} 
                getExactValue={getExactValue} 
                getStatusBadge={getStatusBadge} 
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className={styles.pagination}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#64748b", fontSize: "0.875rem" }}>Lignes par page :</span>
          <select 
            value={pageSize} 
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className={styles.select}
          >
            {[50, 100, 200, 500].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className={styles.pageControls}>
          <button 
            className={styles.pageBtn} 
            disabled={page === 0} 
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className={styles.pageText}>
            Page <span className={styles.pageHighlight}>{page + 1}</span> sur {totalPages === 0 ? 1 : totalPages}
          </span>

          <button 
            className={styles.pageBtn} 
            disabled={page >= totalPages - 1} 
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}