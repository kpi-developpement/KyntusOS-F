"use client";

import React, { useMemo, useState } from "react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  flexRender, ColumnDef, FilterFn,
} from "@tanstack/react-table";
import { Filter, ListFilter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import styles from "./SmartTable.module.css";

const multiSelectFilter: FilterFn<any> = (row, columnId, filterValue: string[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const value = String(row.getValue(columnId));
  return filterValue.includes(value);
};

const getDynamicValue = (row: any, targetKey: string) => {
  if (!row.dynamicData) return "-";
  const actualKey = Object.keys(row.dynamicData).find(k => k.toLowerCase() === targetKey.toLowerCase());
  return actualKey ? row.dynamicData[actualKey] : "-";
};

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

export default function SmartTable({ data, loading, page, setPage, pageSize, setPageSize, totalPages, totalItems }: SmartTableProps) {
  const [columnFilters, setColumnFilters] = useState<any[]>([]);

  const dynamicColumns = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const allKeys = new Set<string>();
    data.forEach((row) => {
      if (row.dynamicData) {
        Object.keys(row.dynamicData).forEach((key) => {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== "idintervention" && lowerKey !== "eps" && 
              lowerKey !== "etat" && lowerKey !== "commentaire") {
            allKeys.add(key);
          }
        });
      }
    });

    return Array.from(allKeys).map((key) => ({
      accessorFn: (row: any) => (row.dynamicData && row.dynamicData[key] ? row.dynamicData[key] : "-"),
      id: key,
      header: key,
      filterFn: multiSelectFilter,
    }));
  }, [data]);

  const columns = useMemo<ColumnDef<any, any>[]>(() => [
    { accessorKey: "epsReference", header: "idIntervention", filterFn: multiSelectFilter },
    { 
      accessorKey: "version", header: "VER", filterFn: multiSelectFilter,
      cell: (info) => {
        const val = info.getValue() as string;
        return <span className={val === "V1" ? styles.badgeV1 : styles.badgeV2}>{val}</span>;
      }
    },
    { 
      accessorFn: (row) => getDynamicValue(row, "etat"), 
      id: "etat", header: "ETAT", filterFn: multiSelectFilter 
    },
    { 
      accessorFn: (row) => getDynamicValue(row, "commentaire"), 
      id: "commentaire", header: "COMMENTAIRE", filterFn: multiSelectFilter 
    },
    ...dynamicColumns,
    { 
      accessorKey: "importedAt", header: "IMPORT_DATE",
      cell: (info) => {
        const d = new Date(info.getValue() as string);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    },
  ], [dynamicColumns]);

  const table = useReactTable({
    data, columns, state: { columnFilters },
    onColumnFiltersChange: setColumnFilters, getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), manualPagination: true, pageCount: totalPages,
  });

  if (loading && data.length === 0) return <div style={{ color: "#0ff", fontFamily: "monospace" }}>[SYSTEM] Synchronizing Data...</div>;

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", border: "1px dashed #334155", color: "#64748b", fontFamily: "monospace", borderRadius: "8px" }}>
        <ListFilter size={40} style={{ opacity: 0.5, marginBottom: '10px' }}/>
        <p>[SYSTEM] AWAITING TERRAIN DATA...</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div style={{ overflowX: "auto" }}>
        <table className={styles.kntTable}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    <div className={styles.thContent}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanFilter() && <ColumnFilter column={header.column} table={table} />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", backgroundColor: "#0f172a", borderTop: "1px solid #1e293b", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.85rem", position: "sticky", left: 0 }}>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          <span>Total: <strong style={{color: "#0ff"}}>{totalItems}</strong> lignes</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }} style={{ background: "#1e293b", color: "#0ff", border: "1px solid #334155", borderRadius: "4px", padding: "4px" }}>
            {[50, 100, 500].map(size => <option key={size} value={size}>Afficher {size}</option>)}
          </select>
          {loading && <span style={{color: "#39ff14"}}>Loading...</span>}
        </div>
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <button onClick={() => setPage(0)} disabled={page === 0} style={btnStyle(page !== 0)}><ChevronsLeft size={16} /></button>
          <button onClick={() => setPage(page - 1)} disabled={page === 0} style={btnStyle(page !== 0)}><ChevronLeft size={16} /></button>
          <span style={{ margin: "0 10px" }}>Page <strong style={{color: "#0ff"}}>{page + 1}</strong> sur {totalPages}</span>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} style={btnStyle(page < totalPages - 1)}><ChevronRight size={16} /></button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} style={btnStyle(page < totalPages - 1)}><ChevronsRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

const btnStyle = (active: boolean) => ({
  background: active ? "rgba(0, 255, 255, 0.05)" : "transparent", color: active ? "#0ff" : "#334155",
  border: `1px solid ${active ? "#0ff" : "#334155"}`, borderRadius: "4px", padding: "4px", cursor: active ? "pointer" : "not-allowed",
  display: "flex", alignItems: "center", transition: "all 0.2s"
});

function ColumnFilter({ column, table }: { column: any; table: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueValues = useMemo(() => {
    const values = new Set<string>();
    table.getPreFilteredRowModel().flatRows.forEach((row: any) => {
      const val = row.getValue(column.id);
      if (val !== null && val !== undefined && val !== "" && val !== "-") values.add(String(val));
    });
    return Array.from(values).sort();
  }, [column.id, table]);
  const filterValue = (column.getFilterValue() as string[]) || [];

  return (
    <div className={styles.filterWrapper}>
      <button className={`${styles.filterIconBtn} ${filterValue.length > 0 ? styles.activeFilter : ''}`} onClick={() => setIsOpen(!isOpen)} title="Filtrer"><Filter size={16} /></button>
      {isOpen && (
        <div className={styles.filterDropdown}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}>FILTRER: {column.id.toUpperCase()}</div>
          <div className={styles.filterList}>
            {uniqueValues.map((val) => (
              <label key={val} className={styles.filterLabel}>
                <input type="checkbox" className={styles.kntCheckbox} checked={filterValue.includes(val)} onChange={(e) => {
                    const isChecked = e.target.checked;
                    const newFilterValue = isChecked ? [...filterValue, val] : filterValue.filter((v) => v !== val);
                    column.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
                  }}/>{val}
              </label>
            ))}
            {uniqueValues.length === 0 && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Vide</span>}
          </div>
          <button className={styles.clearBtn} onClick={() => { column.setFilterValue(undefined); setIsOpen(false); }}>EFFACER</button>
        </div>
      )}
      {isOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} onClick={() => setIsOpen(false)} />}
    </div>
  );
}