"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, Terminal, LayoutGrid, Target, Radio, ScanSearch, UsersRound, Map, type LucideIcon,
} from "lucide-react";
import AuthGuard from "@/components/layout/AuthGuard";
import styles from "./Portal.module.css";

const SHORTCUTS: { href: string; label: string; desc: string; icon: LucideIcon }[] = [
  { href: "/admin/tasks", label: "Dispatch", desc: "Répartir les tâches", icon: Target },
  { href: "/admin/live-board", label: "Live monitor", desc: "Suivre les pilotes", icon: Radio },
  { href: "/admin/check", label: "Inspecteur", desc: "Retrouver un EPS", icon: ScanSearch },
  { href: "/admin/strategic", label: "Carte stratégique", desc: "Vue d'ensemble", icon: Map },
  { href: "/admin/stats", label: "Équipe", desc: "Classement et charge", icon: UsersRound },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export default function PortalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("kyntus_user") || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage
      if (u?.username) setName(u.username);
    } catch { /* stockage indisponible */ }
  }, []);

  const go = (href: string) => {
    setLeaving(true);
    setTimeout(() => router.push(href), 380);
  };

  return (
    <AuthGuard>
      <motion.main
        className={styles.page}
        animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 0.985 : 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className={styles.top}>
          <span className={styles.brand}>
            <span className={styles.mark}><Terminal size={17} strokeWidth={2.6} /></span>
            Kyntus<b>OS</b>
          </span>
          <span className={styles.status}><i /> Connexion sécurisée</span>
        </header>

        <section className={styles.hero}>
          <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            Espace administrateur
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}>
            {greeting()}{name ? `, ${name}` : ""}.<br />
            Tout est <em>prêt</em>.
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
            Ouvrez le centre de commande ou allez directement à l&apos;outil dont vous avez besoin.
          </motion.p>
          <motion.button
            type="button"
            className={styles.cta}
            onClick={() => go("/")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            autoFocus
          >
            <LayoutGrid size={18} /> Ouvrir le centre de commande <ArrowRight size={18} className={styles.ctaArrow} />
          </motion.button>
        </section>

        <section className={styles.grid} aria-label="Accès rapides">
          {SHORTCUTS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.href}
                type="button"
                className={styles.tile}
                onClick={() => go(s.href)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.26 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.tileIcon}><Icon size={20} /></span>
                <span className={styles.tileText}><b>{s.label}</b><small>{s.desc}</small></span>
                <ArrowRight size={16} className={styles.tileArrow} />
              </motion.button>
            );
          })}
        </section>
      </motion.main>
    </AuthGuard>
  );
}
