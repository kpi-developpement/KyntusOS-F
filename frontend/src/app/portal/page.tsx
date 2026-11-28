"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, Terminal, LayoutGrid, Target, Radio, ScanSearch, UsersRound, Map, type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import AuthGuard from "@/components/layout/AuthGuard";
import { navigate } from "@/lib/transition";
import { KineticText, Magnetic } from "@/components/motion";
import type { GlyphKind } from "@/components/three/ModuleGlyphs";
import styles from "./Portal.module.css";

const GlyphCanvas = dynamic(() => import("@/components/three/ModuleGlyphs").then((m) => m.GlyphCanvas), { ssr: false });
const GlyphView = dynamic(() => import("@/components/three/ModuleGlyphs").then((m) => m.GlyphView), { ssr: false });

const SHORTCUTS: { href: string; label: string; desc: string; icon: LucideIcon; kind: GlyphKind; color: string }[] = [
  { href: "/admin/tasks", label: "Dispatch", desc: "Répartir les tâches", icon: Target, kind: "dispatch", color: "#2563eb" },
  { href: "/admin/live-board", label: "Live monitor", desc: "Suivre les pilotes", icon: Radio, kind: "live", color: "#0ea5e9" },
  { href: "/admin/check", label: "Inspecteur", desc: "Retrouver un EPS", icon: ScanSearch, kind: "inspect", color: "#4f46e5" },
  { href: "/admin/strategic", label: "Carte stratégique", desc: "Vue d'ensemble", icon: Map, kind: "map", color: "#0284c7" },
  { href: "/admin/stats", label: "Équipe", desc: "Classement et charge", icon: UsersRound, kind: "team", color: "#1d4ed8" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
}

export default function PortalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("kyntus_user") || "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage
      if (u?.username) setName(u.username);
    } catch { /* stockage indisponible */ }
  }, []);

  const go = (href: string, e?: React.MouseEvent) => navigate(router, href, e ? { x: e.clientX, y: e.clientY } : undefined);

  return (
    <AuthGuard>
      <main className={styles.page}>
        <GlyphCanvas />
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
          <h1>
            <KineticText text={`${greeting()}${name ? `, ${name}` : ""}.`} />
            <br />
            <KineticText text="Tout est" /> <em>prêt</em>.
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
            Ouvrez le centre de commande ou allez directement à l&apos;outil dont vous avez besoin.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
            <Magnetic strength={0.25}>
              <button type="button" className={styles.cta} onClick={(e) => go("/", e)} autoFocus data-cursor="Entrer">
                <LayoutGrid size={18} /> Ouvrir le centre de commande <ArrowRight size={18} className={styles.ctaArrow} />
              </button>
            </Magnetic>
          </motion.div>
        </section>

        <section className={styles.grid} aria-label="Accès rapides">
          {SHORTCUTS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.button
                key={s.href}
                type="button"
                className={styles.tile}
                onClick={(e) => go(s.href, e)}
                onPointerEnter={() => setHovered(s.href)}
                onPointerLeave={() => setHovered(null)}
                data-cursor="Ouvrir"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.26 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.tileStage}><GlyphView kind={s.kind} color={s.color} active={hovered === s.href} className={styles.tileGlyph} /></span>
                <span className={styles.tileIcon}><Icon size={16} /></span>
                <span className={styles.tileText}><b>{s.label}</b><small>{s.desc}</small></span>
                <ArrowRight size={16} className={styles.tileArrow} />
              </motion.button>
            );
          })}
        </section>
      </main>
    </AuthGuard>
  );
}
