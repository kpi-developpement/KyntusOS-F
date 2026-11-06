// ============================================================================
// KYNTUS PILOT BOARD — SHARED UTILITIES
// (moved out of page.tsx so components can import them without circular deps)
// ============================================================================

// ----------------------------------------------------------------------------
// UNIVERSAL CLIPBOARD ENGINE (Works on BOTH HTTP IP & HTTPS)
// ----------------------------------------------------------------------------
export async function universalCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, switching to fallback...", err);
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}

// ----------------------------------------------------------------------------
// SMART EPS EXTRACTOR: Independent of Column Order or Visibility
// ----------------------------------------------------------------------------
export function extractTaskEPS(task: any, editableCols: string[] = []): string {
  if (!task) return "";

  const directCandidates = [
    task.epsReference,
    task.eps,
    task.eps_reference,
    task.idIntervention,
    task.reference,
  ];
  for (const cand of directCandidates) {
    if (cand && typeof cand === "string" && !cand.startsWith("AUTO-") && !cand.startsWith("UNKNOWN-")) {
      return cand.trim();
    }
  }

  const dyn = task.dynamicData || {};
  const keys = Object.keys(dyn);

  // Identifiant = valeur qui commence par EPS- ou LOR-
  const epsRegex = /((?:EPS|LOR)-[A-Z0-9_-]*\d+[A-Z0-9_-]*)/i;
  for (const k of keys) {
    const val = String(dyn[k] ?? "").trim();
    const match = val.match(epsRegex);
    if (match) return match[1].toUpperCase();
  }

  const priorityNames = [
    "eps",
    "idintervention",
    "id_intervention",
    "id intervention",
    "intervention",
    "num_eps",
    "reference",
    "ref",
    "dossier",
    "id",
  ];
  for (const k of keys) {
    const lowerK = k.trim().toLowerCase();
    if (priorityNames.some((pn) => lowerK === pn || lowerK.includes(pn))) {
      const val = String(dyn[k] ?? "").trim();
      if (val) return val;
    }
  }

  const editSet = new Set(editableCols.map((c) => c.toLowerCase()));
  for (const k of keys) {
    if (!editSet.has(k.toLowerCase())) {
      const val = String(dyn[k] ?? "").trim();
      if (val) return val;
    }
  }

  return task.id ? `EPS-${task.id}` : "";
}

// ----------------------------------------------------------------------------
// FINAL ADMIN LOCK DETECTOR
// Only locks when Admin validates in Kanban (NOT when Pilot clicks to DONE)
// ----------------------------------------------------------------------------
export function isTaskLockedByAdmin(task: any): boolean {
  if (!task) return false;
  const st = String(task.status || "").toUpperCase().trim();

  return (
    st === "VALIDATED" ||
    st === "VALIDE_FINAL" ||
    st === "VALIDÉ_FINAL" ||
    st === "VALIDE" ||
    st === "ARCHIVED" ||
    st === "CLOSED" ||
    task.adminValidated === true ||
    task.locked === true
  );
}

// ----------------------------------------------------------------------------
// PENDING = still to treat by the pilot (À faire / En cours, not locked)
// ----------------------------------------------------------------------------
export function isTaskPending(task: any): boolean {
  if (!task || isTaskLockedByAdmin(task)) return false;
  const st = String(task.status || "A_FAIRE").toUpperCase();
  return st === "A_FAIRE" || st === "EN_COURS";
}

// ----------------------------------------------------------------------------
// STATUS LABELS (used by the in-column filter of the STATUT column)
// ----------------------------------------------------------------------------
export const STATUS_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  DONE: "Terminé (Pilote)",
  VALIDATED: "Validé Admin",
};

export const EMPTY_TOKEN = "__EMPTY__";

// ----------------------------------------------------------------------------
// DECISION LIBRARY (Contestable / Validé choices)
// ----------------------------------------------------------------------------
export interface DecisionChoice {
  id: string;
  label: string;
}

export const DEFAULT_DECISIONS: string[] = [
  "Contestable - Réf PTO = Réf ROP : (MF-3762-6DKT)",
  "Contestable - Réf PBO = Réf ROP : (MF-3762-6DKT)",
  "Contestable - Aérien  - Cable de raccordement Aérien traversant par un poteau + groupe CATT LOG",
  "Contestable - Façade - Les câbles de raccordement passent par la façade + groupe CATT LOG",
  "contestable - Chambre - PBO Chambre",
  "contestable - 0 câbles clients avant et 1 après travaux",
  "Validé - Impossible d'identifer l'ajout du cable sur PBO",
  "validé- mat telenco non conforme",
  "contestable-MAT TELENCO conforme",
];

export type DecisionKind = "VALIDE" | "CONTESTABLE" | "AUTRE";

export function getDecisionKind(label: string): DecisionKind {
  const l = label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (l.startsWith("valid")) return "VALIDE";
  if (l.startsWith("contest")) return "CONTESTABLE";
  return "AUTRE";
}

export function makeId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------------------------------------------------------
// SAFE LOCAL STORAGE
// ----------------------------------------------------------------------------
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

// ----------------------------------------------------------------------------
// TEXT NORMALIZER (for comparisons)
// ----------------------------------------------------------------------------
export function normalizeForCompare(
  value: string,
  opts: { ignoreCase: boolean; ignoreSpaces: boolean; ignoreAccents: boolean }
): string {
  let v = value ?? "";
  if (opts.ignoreSpaces) v = v.replace(/\s+/g, " ").trim();
  if (opts.ignoreAccents) v = v.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (opts.ignoreCase) v = v.toLowerCase();
  return v;
}