// Constantes et utilitaires partages par la section API Bytel.

export const ETAT_ACTIONNABLE = "EN_ATTENTE_VALIDATION_PARTENAIRE";

export const ETAT_COLORS: Record<string, string> = {
  EN_ATTENTE_VALIDATION_PARTENAIRE: "#f59e0b",
  EN_ATTENTE_VALIDATION_BYTEL: "#38bdf8",
  EN_ATTENTE_ANALYSE_PHOTOS: "#a855f7",
  EN_ATTENTE_VALIDATION_ANALYSE_PHOTOS: "#c084fc",
  VALIDEE: "#10b981",
  INCONNU: "#64748b",
};
export const couleurEtat = (e?: string | null) => (e && ETAT_COLORS[e]) || "#94a3b8";

export const TYPES_RACCORDEMENT = ["EXISTANTE", "BRASSAGE_PM", "INTERIEUR", "CHAMBRE", "AERIEN", "FACADE"];
export const TYPES_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["RACCORDEMENT", "BRASSAGE_PM", "PLP", "NOK"],
  QualificationSAV: ["SAV_STD", "SAV_MC", "SAV_SC", "SAV_REPRISE", "NOK"],
  QualificationReseau: ["AUDITS", "DESATURATION", "REMISE_EN_ETAT", "REPRISE_JARRETIERAGE", "EXPERTISES", "SOUDURE_ET_POSES_DE_CORPS_DE_TRAVERSES"],
};
export const ELEMENTS_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE"],
  QualificationSAV: ["INSTALLATION", "SUPPORT", "DEPLACEMENT", "JARRETIERES"],
  QualificationReseau: ["INSTALLATION", "MATERIEL", "JARRETIERES", "DEPLACEMENT"],
};
export const ELEMENTS_TOUS = ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE", "JARRETIERES"];

/** Les "secteurs" de Terrain Records deviennent les types de qualification Bytel. */
export const SECTEURS = [
  { value: "", label: "SECTEUR : TOUS" },
  { value: "QualificationRaccordement", label: "SECTEUR : RACC" },
  { value: "QualificationSAV", label: "SECTEUR : SAV" },
  { value: "QualificationReseau", label: "SECTEUR : RESEAU" },
];
export const libelleSecteur = (q?: string | null) =>
  !q ? "TOUS" : q === "QualificationRaccordement" ? "RACC" : q === "QualificationSAV" ? "SAV" : q === "QualificationReseau" ? "RESEAU" : q.replace("Qualification", "");

/** Equivalent du filtre "version" de Terrain Records : nombre de versions de l'EPS. */
export const VERSIONS_OPTIONS = [
  { value: "", label: "Toutes versions" },
  { value: "1", label: "V1 seule" },
  { value: "2", label: "2 versions" },
  { value: "3", label: "3 versions" },
  { value: "2+", label: "2 versions et +" },
  { value: "3+", label: "3 versions et +" },
  { value: "5+", label: "5 versions et +" },
];

export const elementsDe = (v: any): Record<string, number> => {
  if (v?.elements && typeof v.elements === "object") return v.elements;
  const src = v?.qualifJson?.elementsFacturationCalcule ?? v?.brut?.elementsFacturationCalcule;
  if (!Array.isArray(src)) return {};
  const out: Record<string, number> = {};
  for (const e of src) if (e?.designationElementFacturation) out[e.designationElementFacturation] = Number(e.montant ?? 0);
  return out;
};
export const totalElements = (el: Record<string, number>) =>
  Object.values(el || {}).reduce((a, b) => a + (Number(b) || 0), 0);

export const fmtMontant = (m?: number | null) =>
  m === null || m === undefined ? "-" : `${Number(m).toFixed(2).replace(".", ",")} €`;

export const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("fr-FR"); } catch { return d; }
};

/** Decoupe un texte colle (Excel, mail, liste) en identifiants distincts. */
export const parserListe = (t: string) =>
  Array.from(new Set((t || "").split(/[\s,;|]+/).map(x => x.trim().replace(/["']/g, "").toUpperCase()).filter(Boolean)));

export const telechargerBlob = (blob: Blob, nom: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

export const telechargerUrl = (url: string, nom: string) => {
  const a = document.createElement("a");
  a.href = url; a.download = nom;
  document.body.appendChild(a); a.click(); a.remove();
};

export const auteurCourant = () => {
  if (typeof window === "undefined") return "INCONNU";
  try {
    const u = localStorage.getItem("kyntus_user") || localStorage.getItem("user");
    if (u) { const p = JSON.parse(u); return p?.username || p?.login || p?.nom || p?.email || "INCONNU"; }
    return localStorage.getItem("username") || "INCONNU";
  } catch { return "INCONNU"; }
};
