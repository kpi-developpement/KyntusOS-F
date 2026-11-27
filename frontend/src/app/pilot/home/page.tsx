"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, LayoutDashboard, Database, Cpu, Settings, History, Layers,
  Scale, Cloud, BarChart2, Search, LogOut, Sparkles, CornerDownLeft,
} from "lucide-react";

import HolographicCard, { type HomeModule } from "./components/HolographicCard";
import styles from "./Home.module.css";

const MODULES: HomeModule[] = [
  { id: "board", title: "Analyse", path: "/pilot/board", icon: Terminal, color: "#2563eb", desc: "Analyse et édition des données brutes.", status: "ONLINE", tag: "Data entry" },
  { id: "kanban", title: "Tableau de tâches", path: "/pilot/kanban", icon: LayoutDashboard, color: "#0ea5e9", desc: "Pilotage et suivi des tâches en temps réel.", status: "ONLINE", tag: "Tactical" },
  { id: "facture", title: "Facture", path: "/pilot/facture", icon: Cpu, color: "#4f46e5", desc: "Moteur de calcul et génération des factures.", status: "ONLINE", tag: "Billing" },
  { id: "contestation", title: "Contestation", path: "/pilot/contestation", icon: Scale, color: "#1d4ed8", desc: "Croisement Global · Facture · CA et détection des anomalies.", status: "NEW", tag: "Dispute" },
  { id: "api", title: "API Bytel", path: "/pilot/api", icon: Cloud, color: "#0284c7", desc: "Interventions synchronisées en direct depuis Bytel.", status: "ONLINE", tag: "Live" },
  { id: "recorde", title: "Base de données", path: "/pilot/recorde", icon: Database, color: "#2563eb", desc: "Gestion centrale des données et versions.", status: "SECURE", tag: "Terrain" },
  { id: "tissue-records", title: "Tissue Records", path: "/pilot/tissue-records", icon: Layers, color: "#0891b2", desc: "Gestion dédiée des dossiers Tissue et versions.", status: "SECURE", tag: "Tissue" },
  { id: "ventilation", title: "Ventilation", path: "/pilot/ventilation", icon: BarChart2, color: "#3b82f6", desc: "Suivi et répartition des flux financiers.", status: "ONLINE", tag: "Finance" },
  { id: "parametrage", title: "Paramétrage", path: "/pilot/parametrage", icon: Settings, color: "#6366f1", desc: "Configuration des règles du système.", status: "ONLINE", tag: "Rules" },
  { id: "history", title: "Archive", path: "/pilot/history", icon: History, color: "#64748b", desc: "Historique, logs et KPIs des missions.", status: "ARCHIVED", tag: "Logs" },
];

const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function PilotHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [launch, setLaunch] = useState<{ x: number; y: number; color: string; title: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local au montage
    if (stored) setUser(JSON.parse(stored));
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // "/" ou Ctrl+K pour chercher un module
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.tagName === "INPUT";
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return MODULES;
    return MODULES.filter((m) => normalize(`${m.title} ${m.desc} ${m.tag}`).includes(q));
  }, [query]);

  const open = (mod: HomeModule, x?: number, y?: number) => {
    if (launch) return;
    const cx = x ?? window.innerWidth / 2;
    const cy = y ?? window.innerHeight / 2;
    setLaunch({ x: cx, y: cy, color: mod.color, title: mod.title });
    router.prefetch(mod.path);
    setTimeout(() => router.push(mod.path), 650);
  };

  const logout = () => {
    localStorage.removeItem("kyntus_user");
    router.push("/login");
  };

  const name = user?.username || "pilote";

  return (
    <main className={styles.page}>
      {/* TOP BAR */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Terminal size={18} strokeWidth={2.6} /></span>
          <span className={styles.brandText}>KYNTUS<span>OS</span></span>
        </div>
        <div className={styles.topRight}>
          {now && (
            <span className={styles.clock} suppressHydrationWarning>
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              <b>{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</b>
            </span>
          )}
          <span className={styles.userPill}>
            <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
            <span className={styles.userName}>{name}</span>
          </span>
          <button type="button" className={styles.logout} onClick={logout} aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <motion.span
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles size={13} /> Espace pilote
        </motion.span>
        <motion.h1
          className={styles.title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          {now ? greeting(now) : "Bonjour"}, <span className={styles.titleName}>{name}</span>.
          <br />
          On lance quoi <em>aujourd&apos;hui</em> ?
        </motion.h1>

        <motion.label
          className={styles.search}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <Search size={18} />
          <span className={styles.srOnly}>Rechercher un module</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) open(filtered[0]);
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Rechercher un module…"
          />
          {query && filtered[0] ? (
            <span className={styles.enterHint}><CornerDownLeft size={13} /> {filtered[0].title}</span>
          ) : (
            <kbd className={styles.kbd}>/</kbd>
          )}
        </motion.label>
      </section>

      {/* MODULES */}
      <section className={styles.grid} aria-label="Modules">
        <AnimatePresence mode="popLayout">
          {filtered.map((mod, i) => (
            <HolographicCard key={mod.id} mod={mod} index={i} onOpen={(x, y) => open(mod, x, y)} />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            Aucun module ne correspond à « {query} ».{" "}
            <button type="button" onClick={() => setQuery("")}>Effacer la recherche</button>
          </div>
        )}
      </section>

      {/* TRANSITION DE LANCEMENT */}
      <AnimatePresence>
        {launch && (
          <motion.div className={styles.launch} initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={styles.launchWave}
              style={{ left: launch.x, top: launch.y, background: `radial-gradient(circle, #ffffff 0%, #eff6ff 45%, ${launch.color}33 100%)` }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.65, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.span
              className={styles.launchLabel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              {launch.title}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
