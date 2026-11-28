import {
  LayoutList, KanbanSquare, History, Database, Cpu, BarChart2, Receipt, Cloud, Layers, Scale, type LucideIcon,
} from "lucide-react";

/**
 * Source unique des modules pilote.
 * `key` = clé de permission stockée dans User.permissions (JSONB) et réglée par l'admin
 * dans « Contrôle des accès ». `key: null` = toujours accessible (ex. l'archive personnelle).
 */
export type PilotModule = {
  key: string | null;
  path: string;
  label: string;
  title: string;
  hint: string;
  tag: string;
  icon: LucideIcon;
  color: string;
};

export const PILOT_MODULES: PilotModule[] = [
  { key: "analyse", path: "/pilot/board", label: "Analyse", title: "Analyse", hint: "Analyse et édition des données brutes.", tag: "Data entry", icon: LayoutList, color: "#2563eb" },
  { key: "tableau", path: "/pilot/kanban", label: "Tâches", title: "Tableau de tâches", hint: "Pilotage et suivi des tâches en temps réel.", tag: "Tactical", icon: KanbanSquare, color: "#0ea5e9" },
  { key: "facture", path: "/pilot/facture", label: "Facturation", title: "Facture", hint: "Moteur de calcul et génération des factures.", tag: "Billing", icon: Receipt, color: "#4f46e5" },
  { key: "contestation", path: "/pilot/contestation", label: "Contestation", title: "Contestation", hint: "Croisement Global · Facture · CA et détection des anomalies.", tag: "Dispute", icon: Scale, color: "#1d4ed8" },
  { key: "api", path: "/pilot/api", label: "API Bytel", title: "API Bytel", hint: "Interventions synchronisées en direct depuis Bytel.", tag: "Live", icon: Cloud, color: "#0284c7" },
  { key: "terrain", path: "/pilot/recorde", label: "Terrain", title: "Base de données", hint: "Gestion centrale des données et versions.", tag: "Terrain", icon: Database, color: "#2563eb" },
  { key: "tissue", path: "/pilot/tissue-records", label: "Tissue", title: "Tissue Records", hint: "Gestion dédiée des dossiers Tissue et versions.", tag: "Tissue", icon: Layers, color: "#0891b2" },
  { key: "ventilation", path: "/pilot/ventilation", label: "Ventilation", title: "Ventilation", hint: "Suivi et répartition des flux financiers.", tag: "Finance", icon: BarChart2, color: "#3b82f6" },
  { key: "parametrage", path: "/pilot/parametrage", label: "Paramétrage", title: "Paramétrage", hint: "Configuration des règles de facturation.", tag: "Rules", icon: Cpu, color: "#6366f1" },
  { key: null, path: "/pilot/history", label: "Archive", title: "Archive", hint: "Historique, logs et KPIs des missions.", tag: "Logs", icon: History, color: "#64748b" },
];

/** Modules réglables dans l'écran admin (ceux qui ont une clé). */
export const PERMISSION_MODULES = PILOT_MODULES.filter((m): m is PilotModule & { key: string } => m.key !== null);

export function moduleForPath(pathname: string | null | undefined): PilotModule | undefined {
  if (!pathname) return undefined;
  return PILOT_MODULES.find((m) => pathname === m.path || pathname.startsWith(m.path + "/"));
}
