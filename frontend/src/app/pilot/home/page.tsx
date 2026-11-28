"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { Terminal, Search, LogOut, Sparkles, CornerDownLeft, Lock } from "lucide-react";

import HolographicCard from "./components/HolographicCard";
import { PILOT_MODULES } from "@/lib/modules";
import { useAccess } from "@/lib/access";
import { navigate } from "@/lib/transition";
import { KineticText, Magnetic, SmoothScroll } from "@/components/motion";
import styles from "./Home.module.css";


const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function PilotHomePage() {
  const router = useRouter();
  const { can, ready, username } = useAccess();
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // Parallaxe : le hero recule et s'efface pendant que les cartes montent
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroScale = useSpring(useTransform(scrollYProgress, [0, 1], [1, 0.88]), { stiffness: 140, damping: 26 });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- horloge locale
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

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

  const modules = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? PILOT_MODULES.filter((m) => normalize(`${m.title} ${m.hint} ${m.tag}`).includes(q)) : PILOT_MODULES;
    // Les modules ouverts d'abord, l'ordre d'origine ensuite
    return [...list].sort((a, b) => Number(!can(a.key)) - Number(!can(b.key)));
  }, [query, can]);

  const openCount = PILOT_MODULES.filter((m) => can(m.key)).length;
  const firstOpen = modules.find((m) => can(m.key));

  const open = (path: string, x?: number, y?: number, iconEl?: HTMLElement | null) => {
    navigate(router, path, { x, y, morph: iconEl });
  };

  const logout = () => {
    localStorage.removeItem("kyntus_user");
    navigate(router, "/login");
  };

  const name = username || "pilote";

  return (
    <main className={styles.page}>
      <SmoothScroll />

      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><Terminal size={18} strokeWidth={2.6} /></span>
          <span className={styles.brandText}>Kyntus<span>OS</span></span>
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
          <Magnetic strength={0.4}>
            <button type="button" className={styles.logout} onClick={logout} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut size={17} />
            </button>
          </Magnetic>
        </div>
      </header>

      <motion.section ref={heroRef} className={styles.hero} style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}>
        <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Sparkles size={13} /> Espace pilote
        </motion.span>

        <h1 className={styles.title}>
          <span className={styles.line}>
            <KineticText text={`${now ? greeting(now) : "Bonjour"},`} />{" "}
            <span className={styles.titleName}><KineticText text={`${name}.`} /></span>
          </span>
          <span className={styles.line}>
            <KineticText text="On lance quoi" /> <em>aujourd&apos;hui</em> ?
          </span>
        </h1>

        <motion.label
          className={styles.search}
          initial={{ opacity: 0, y: 14, clipPath: "inset(0 50% 0 50% round 18px)" }}
          animate={{ opacity: 1, y: 0, clipPath: "inset(0 0% 0 0% round 18px)" }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <Search size={18} />
          <span className={styles.srOnly}>Rechercher un module</span>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && firstOpen) open(firstOpen.path);
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Rechercher un module…"
          />
          {query && firstOpen ? (
            <span className={styles.enterHint}><CornerDownLeft size={13} /> {firstOpen.title}</span>
          ) : (
            <kbd className={styles.kbd}>/</kbd>
          )}
        </motion.label>

        {ready && (
          <motion.p className={styles.accessLine} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <b>{openCount}</b> module{openCount > 1 ? "s" : ""} ouvert{openCount > 1 ? "s" : ""} pour votre compte
            {openCount < PILOT_MODULES.length && <span><Lock size={12} /> {PILOT_MODULES.length - openCount} verrouillé{PILOT_MODULES.length - openCount > 1 ? "s" : ""}</span>}
          </motion.p>
        )}
      </motion.section>

      <section className={styles.grid} aria-label="Modules">
        <AnimatePresence mode="popLayout">
          {modules.map((mod, i) => (
            <HolographicCard
              key={mod.path}
              mod={mod}
              index={i}
              locked={ready && !can(mod.key)}
              onOpen={(x, y, iconEl) => open(mod.path, x, y, iconEl)}
            />
          ))}
        </AnimatePresence>
        {modules.length === 0 && (
          <div className={styles.empty}>
            Aucun module ne correspond à « {query} ».{" "}
            <button type="button" onClick={() => setQuery("")}>Effacer la recherche</button>
          </div>
        )}
      </section>
    </main>
  );
}
