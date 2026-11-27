"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutGrid, Target, SquareActivity, DatabaseZap, UsersRound, Cpu, LogOut, ScanSearch, FileDown,
  TableProperties, Map, ShieldAlert, FileCheck, Radio, Radar, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useAuth } from "@/context/AuthContext";

type Item = { name: string; path: string; icon: LucideIcon; external?: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Pilotage",
    items: [
      { name: "Centre de commande", path: "/", icon: LayoutGrid },
      { name: "Carte stratégique", path: "/admin/strategic", icon: Map },
      { name: "Dispatch des tâches", path: "/admin/tasks", icon: Target },
      { name: "Tableau tactique", path: "/admin/kanban", icon: SquareActivity },
      { name: "Live monitor", path: "/admin/live-board", icon: Radio },
    ],
  },
  {
    title: "Contrôle",
    items: [
      { name: "Inspecteur", path: "/admin/check", icon: ScanSearch },
      { name: "EPS Tracer", path: "/admin/eps-tracer", icon: Radar },
      { name: "Omni-grid", path: "/admin/data", icon: TableProperties },
    ],
  },
  {
    title: "Données",
    items: [
      { name: "Extraction", path: "/admin/export", icon: FileDown },
      { name: "Injection", path: "/import", icon: DatabaseZap },
    ],
  },
  {
    title: "Organisation",
    items: [
      { name: "Équipe", path: "/admin/stats", icon: UsersRound },
      { name: "Configuration", path: "/admin/templates", icon: Cpu },
      { name: "Accès", path: "/admin/users", icon: ShieldAlert },
      { name: "Contrat qualité", path: "http://localhost:8741", icon: FileCheck, external: true },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const name = user?.username || "Admin";

  return (
    <aside className={styles.sidebar} aria-label="Navigation administrateur">
      <Link href="/" className={styles.brand} aria-label="Centre de commande">
        <span className={styles.mark}>K</span>
        <span className={styles.word}>Kyntus<b>OS</b></span>
      </Link>

      <nav className={styles.menu}>
        {GROUPS.map((g) => (
          <div key={g.title} className={styles.group}>
            <span className={styles.groupTitle}>{g.title}</span>
            {g.items.map((item) => {
              const Icon = item.icon;
              const active = !item.external && pathname === item.path;
              const content = (
                <>
                  {active && (
                    <motion.span layoutId="admin-nav-pill" className={styles.pill} transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <span className={styles.iconBox}><Icon size={19} strokeWidth={active ? 2.4 : 2} /></span>
                  <span className={styles.label}>{item.name}</span>
                  {item.external && <ArrowUpRight size={14} className={styles.ext} />}
                </>
              );
              return item.external ? (
                <a key={item.path} href={item.path} className={styles.link} title={item.name}>{content}</a>
              ) : (
                <Link key={item.path} href={item.path} className={`${styles.link} ${active ? styles.active : ""}`} aria-current={active ? "page" : undefined} title={item.name}>
                  {content}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <span className={styles.avatar}>{name.charAt(0).toUpperCase()}<i aria-hidden="true" /></span>
        <span className={styles.userInfo}>
          <b>{name}</b>
          <small>Administrateur</small>
        </span>
        <button type="button" onClick={logout} className={styles.logout} aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut size={16} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
}
