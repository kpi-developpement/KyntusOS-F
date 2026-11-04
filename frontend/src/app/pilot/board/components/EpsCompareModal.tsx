"use client";

import React, { useMemo, useState } from "react";
import {
  Scale,
  ArrowLeftRight,
  ListChecks,
  Database,
  Copy,
  Eraser,
  Sheet,
  CheckCircle2,
  XCircle,
  Wand2,
} from "lucide-react";
import LuxeModal from "../ui/LuxeModal";
import { normalizeForCompare, universalCopyToClipboard } from "../lib/boardUtils";
import { toast } from "@/components/ui/Toaster";
import o from "../ui/BoardOverlays.module.css";

// ============================================================================
// EPS COMPARATOR — like an Excel formula =A1=B1 → TRUE / FALSE
//  · LINE  : line i of list A  vs  line i of list B
//  · LOOKUP: is line i of list A present anywhere in list B
//  · BOARD : EPS (list A) → value of a board column  vs  expected value (list B)
// ============================================================================

type CompareMode = "LINE" | "LOOKUP" | "BOARD";
type ResultFilter = "ALL" | "TRUE" | "FALSE";

interface EpsCompareModalProps {
  open: boolean;
  onClose: () => void;
  tasks: any[];
  columns: string[];
  getEps: (task: any) => string;
  getCellValue: (task: any, col: string) => string;
}

interface ResultRow {
  index: number;
  a: string;
  b: string;
  boardValue?: string;
  ok: boolean;
  note?: string;
}

const splitLines = (txt: string) => {
  const lines = txt.replace(/\r\n?/g, "\n").split("\n");
  // drop trailing empty lines only (keeps alignment of inner empty lines)
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  return lines;
};

export default function EpsCompareModal({
  open,
  onClose,
  tasks,
  columns,
  getEps,
  getCellValue,
}: EpsCompareModalProps) {
  const [mode, setMode] = useState<CompareMode>("LINE");
  const [listA, setListA] = useState("");
  const [listB, setListB] = useState("");
  const [boardCol, setBoardCol] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignoreSpaces, setIgnoreSpaces] = useState(true);
  const [ignoreAccents, setIgnoreAccents] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("ALL");

  const norm = (v: string) => normalizeForCompare(v, { ignoreCase, ignoreSpaces, ignoreAccents });

  const linesA = useMemo(() => splitLines(listA), [listA]);
  const linesB = useMemo(() => splitLines(listB), [listB]);

  const epsIndex = useMemo(() => {
    const m = new Map<string, any>();
    tasks.forEach((t) => {
      const e = getEps(t);
      if (e) m.set(normalizeForCompare(e, { ignoreCase: true, ignoreSpaces: true, ignoreAccents: false }), t);
    });
    return m;
  }, [tasks, getEps]);

  const results: ResultRow[] = useMemo(() => {
    if (mode === "LINE") {
      const n = Math.max(linesA.length, linesB.length);
      const rows: ResultRow[] = [];
      for (let i = 0; i < n; i++) {
        const a = linesA[i] ?? "";
        const b = linesB[i] ?? "";
        const missing = i >= linesA.length || i >= linesB.length;
        rows.push({
          index: i + 1,
          a,
          b,
          ok: !missing && norm(a) === norm(b),
          note: missing ? "Ligne manquante" : undefined,
        });
      }
      return rows;
    }

    if (mode === "LOOKUP") {
      const setB = new Set(linesB.map(norm).filter((x) => x !== ""));
      return linesA.map((a, i) => ({
        index: i + 1,
        a,
        b: setB.has(norm(a)) ? a : "",
        ok: norm(a) !== "" && setB.has(norm(a)),
        note: setB.has(norm(a)) ? undefined : "Absent de la liste B",
      }));
    }

    // BOARD
    return linesA.map((a, i) => {
      const expected = linesB[i] ?? "";
      const task = epsIndex.get(
        normalizeForCompare(a, { ignoreCase: true, ignoreSpaces: true, ignoreAccents: false })
      );
      if (!task) {
        return { index: i + 1, a, b: expected, boardValue: "", ok: false, note: "EPS introuvable dans le board" };
      }
      if (!boardCol) {
        return { index: i + 1, a, b: expected, boardValue: "", ok: false, note: "Choisissez une colonne" };
      }
      const val = getCellValue(task, boardCol);
      return { index: i + 1, a, b: expected, boardValue: val, ok: norm(val) === norm(expected) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, linesA, linesB, boardCol, epsIndex, ignoreCase, ignoreSpaces, ignoreAccents]);

  const trueCount = results.filter((r) => r.ok).length;
  const falseCount = results.length - trueCount;
  const shown =
    resultFilter === "ALL" ? results : results.filter((r) => (resultFilter === "TRUE" ? r.ok : !r.ok));

  const copyBooleans = async () => {
    if (!results.length) return;
    const ok = await universalCopyToClipboard(results.map((r) => (r.ok ? "TRUE" : "FALSE")).join("\n"));
    toast({ message: ok ? `${results.length} résultat(s) TRUE/FALSE copié(s)` : "Copie impossible", type: ok ? "success" : "error" });
  };

  const copyTable = async () => {
    if (!results.length) return;
    const header =
      mode === "BOARD"
        ? ["#", "EPS", `Valeur board (${boardCol})`, "Valeur attendue", "Résultat"]
        : mode === "LOOKUP"
        ? ["#", "Liste A", "Trouvé dans B", "Résultat"]
        : ["#", "Liste A", "Liste B", "Résultat"];
    const body = results.map((r) =>
      mode === "BOARD"
        ? [r.index, r.a, r.boardValue ?? "", r.b, r.ok ? "TRUE" : "FALSE"]
        : [r.index, r.a, r.b, r.ok ? "TRUE" : "FALSE"]
    );
    const tsv = [header, ...body].map((row) => row.join("\t")).join("\n");
    const ok = await universalCopyToClipboard(tsv);
    toast({ message: ok ? "Tableau copié — collez-le dans Excel" : "Copie impossible", type: ok ? "success" : "error" });
  };

  const copyFalseOnly = async () => {
    const list = results.filter((r) => !r.ok).map((r) => r.a).filter(Boolean);
    if (!list.length) return toast({ message: "Aucune ligne FALSE", type: "success" });
    const ok = await universalCopyToClipboard(list.join("\n"));
    toast({ message: ok ? `${list.length} valeur(s) FALSE copiée(s)` : "Copie impossible", type: ok ? "success" : "error" });
  };

  const fillFromBoard = () => {
    const eps = tasks.map(getEps).filter(Boolean);
    setListA(eps.join("\n"));
    toast({ message: `${eps.length} EPS du board chargés dans la liste A`, type: "success" });
  };

  const labelA = mode === "BOARD" ? "EPS" : "Liste A";
  const labelB = mode === "BOARD" ? "Valeurs attendues" : mode === "LOOKUP" ? "Liste B (référence)" : "Liste B";

  return (
    <LuxeModal
      open={open}
      onClose={onClose}
      width={1180}
      icon={<Scale size={20} />}
      title="Comparateur EPS"
      subtitle="Collez vos EPS d'un côté et les valeurs de l'autre : chaque ligne donne TRUE si égal, FALSE sinon."
      footer={
        <>
          <div className={o.footerInfo}>
            <span className={o.statTrue}>
              <CheckCircle2 size={14} /> TRUE : <b>{trueCount}</b>
            </span>
            <span className={o.statFalse}>
              <XCircle size={14} /> FALSE : <b>{falseCount}</b>
            </span>
          </div>
          <div className={o.footerActions}>
            <button type="button" className={o.btnGhost} onClick={copyFalseOnly} disabled={!falseCount}>
              <Copy size={14} /> <span>Copier les FALSE</span>
            </button>
            <button type="button" className={o.btnGhost} onClick={copyTable} disabled={!results.length}>
              <Sheet size={14} /> <span>Copier tableau (Excel)</span>
            </button>
            <button type="button" className={o.btnPrimary} onClick={copyBooleans} disabled={!results.length}>
              <Copy size={14} /> <span>Copier TRUE / FALSE</span>
            </button>
          </div>
        </>
      }
    >
      {/* MODE + OPTIONS */}
      <div className={o.compareTopBar}>
        <div className={o.segmented}>
          <button
            type="button"
            className={`${o.segment} ${mode === "LINE" ? o.segmentActive : ""}`}
            onClick={() => setMode("LINE")}
          >
            <ArrowLeftRight size={13} /> Ligne à ligne (A = B)
          </button>
          <button
            type="button"
            className={`${o.segment} ${mode === "LOOKUP" ? o.segmentActive : ""}`}
            onClick={() => setMode("LOOKUP")}
          >
            <ListChecks size={13} /> A présent dans B
          </button>
          <button
            type="button"
            className={`${o.segment} ${mode === "BOARD" ? o.segmentActive : ""}`}
            onClick={() => setMode("BOARD")}
          >
            <Database size={13} /> EPS vs colonne du board
          </button>
        </div>

        <div className={o.toggleRow}>
          <label className={o.toggle}>
            <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
            <span>Ignorer MAJ/min</span>
          </label>
          <label className={o.toggle}>
            <input type="checkbox" checked={ignoreSpaces} onChange={(e) => setIgnoreSpaces(e.target.checked)} />
            <span>Ignorer espaces</span>
          </label>
          <label className={o.toggle}>
            <input type="checkbox" checked={ignoreAccents} onChange={(e) => setIgnoreAccents(e.target.checked)} />
            <span>Ignorer accents</span>
          </label>
        </div>
      </div>

      {mode === "BOARD" && (
        <div className={o.applyBlock} style={{ marginBottom: 14 }}>
          <span className={o.sectionLabel}>Colonne du board à comparer</span>
          <div className={o.chipWrap}>
            {columns.map((c) => (
              <button
                key={c}
                type="button"
                className={`${o.colChip} ${boardCol === c ? o.colChipActive : ""}`}
                onClick={() => setBoardCol(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* INPUTS + RESULTS */}
      <div className={o.compareGrid}>
        <div className={o.comparePane}>
          <div className={o.paneHead}>
            <span className={o.paneTitle}>
              <span className={o.paneLetter}>A</span> {labelA}
            </span>
            <div className={o.paneTools}>
              <span className={o.lineCount}>{linesA.length} ligne(s)</span>
              {mode === "BOARD" && (
                <button type="button" className={o.btnGhostSm} onClick={fillFromBoard} title="Charger les EPS du board filtré">
                  <Wand2 size={12} /> Board
                </button>
              )}
              {listA && (
                <button type="button" className={o.iconGhostBtn} onClick={() => setListA("")} title="Vider">
                  <Eraser size={13} />
                </button>
              )}
            </div>
          </div>
          <textarea
            className={o.pasteArea}
            spellCheck={false}
            placeholder={"Collez une valeur par ligne\nEPS-000123\nEPS-000124\n..."}
            value={listA}
            onChange={(e) => setListA(e.target.value)}
          />
        </div>

        <div className={o.comparePane}>
          <div className={o.paneHead}>
            <span className={o.paneTitle}>
              <span className={o.paneLetter}>B</span> {labelB}
            </span>
            <div className={o.paneTools}>
              <span className={o.lineCount}>{linesB.length} ligne(s)</span>
              {listB && (
                <button type="button" className={o.iconGhostBtn} onClick={() => setListB("")} title="Vider">
                  <Eraser size={13} />
                </button>
              )}
            </div>
          </div>
          <textarea
            className={o.pasteArea}
            spellCheck={false}
            placeholder={mode === "BOARD" ? "Valeur attendue pour chaque EPS (même ordre)" : "Collez une valeur par ligne"}
            value={listB}
            onChange={(e) => setListB(e.target.value)}
          />
        </div>

        <div className={`${o.comparePane} ${o.resultPane}`}>
          <div className={o.paneHead}>
            <span className={o.paneTitle}>
              <span className={`${o.paneLetter} ${o.paneLetterResult}`}>=</span> Résultat
            </span>
            <div className={o.segmentedSm}>
              {(["ALL", "TRUE", "FALSE"] as ResultFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${o.segmentSm} ${resultFilter === f ? o.segmentSmActive : ""}`}
                  onClick={() => setResultFilter(f)}
                >
                  {f === "ALL" ? "Tous" : f}
                </button>
              ))}
            </div>
          </div>

          <div className={o.resultList}>
            {results.length === 0 ? (
              <div className={o.valueEmpty}>Collez des valeurs dans A et B pour voir le résultat.</div>
            ) : (
              <table className={o.resultTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{mode === "BOARD" ? "EPS" : "A"}</th>
                    {mode === "BOARD" && <th>Board</th>}
                    <th>{mode === "BOARD" ? "Attendu" : "B"}</th>
                    <th>Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.index} className={r.ok ? o.rowTrue : o.rowFalse} title={r.note || ""}>
                      <td className={o.cellIdx}>{r.index}</td>
                      <td className={o.cellVal}>{r.a || <em>vide</em>}</td>
                      {mode === "BOARD" && (
                        <td className={o.cellVal}>{r.note ? <em>{r.note}</em> : r.boardValue || <em>vide</em>}</td>
                      )}
                      <td className={o.cellVal}>
                        {mode === "LOOKUP" ? (r.ok ? "✓ trouvé" : <em>{r.note}</em>) : r.b || <em>vide</em>}
                      </td>
                      <td>
                        <span className={r.ok ? o.boolTrue : o.boolFalse}>{r.ok ? "TRUE" : "FALSE"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </LuxeModal>
  );
}