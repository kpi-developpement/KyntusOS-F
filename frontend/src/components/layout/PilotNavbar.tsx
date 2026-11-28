"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Terminal, Search, CornerDownLeft, Home, Lock, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PILOT_MODULES } from "@/lib/modules";
import { useAccess } from "@/lib/access";
import { navigate } from "@/lib/transition";
import styles from "./PilotNavbar.module.css";

type NavItem = { href: string; label: string; icon: LucideIcon; hint: string; key: string | null };

const NAV: NavItem[] = PILOT_MODULES.map((m) => ({ href: m.path, label: m.label, icon: m.icon, hint: m.hint, key: m.key }));

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function PilotNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ username?: string } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { can } = useAccess();

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage
    if (stored) setUser(JSON.parse(stored));
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("kyntus_user");
    navigate(router, "/login");
  };

  const name = user?.username || "Pilote";

  return (
    <>
      <nav className={`${styles.wrap} ${scrolled ? styles.scrolled : ""}`} aria-label="Navigation pilote">
        <div className={styles.bar}>
          <Link href="/pilot/home" className={styles.brand} aria-label="Accueil Kyntus OS" onClick={(e) => { e.preventDefault(); navigate(router, "/pilot/home", { x: e.clientX, y: e.clientY }); }}>
            <span className={styles.mark}><Terminal size={17} strokeWidth={2.6} /></span>
            <span className={styles.word}>Kyntus<b>OS</b></span>
          </Link>

          <ul className={styles.dock}>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(item.href + "/");
              const allowed = can(item.key);
              return (
                <li key={item.href} className={styles.item}>
                  {allowed ? (
                    <Link
                      href={item.href}
                      className={`${styles.link} ${active ? styles.active : ""}`}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      onClick={(e) => { if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(router, item.href, { x: e.clientX, y: e.clientY }); } }}
                    >
                      {active && (
                        <motion.span layoutId="pilot-nav-pill" className={styles.pill} transition={{ type: "spring", stiffness: 520, damping: 38 }} />
                      )}
                      <Icon size={17} strokeWidth={active ? 2.4 : 2} className={styles.icon} />
                      {active && <span className={styles.label}>{item.label}</span>}
                    </Link>
                  ) : (
                    <span className={`${styles.link} ${styles.locked}`} aria-disabled="true" aria-label={`${item.label} (non autorisé)`} tabIndex={0}>
                      <Icon size={17} strokeWidth={2} className={styles.icon} />
                      <Lock size={10} strokeWidth={3} className={styles.lockBadge} />
                    </span>
                  )}
                  {!active && <span className={styles.tip} role="tooltip">{allowed ? item.label : `${item.label} · non autorisé`}</span>}
                </li>
              );
            })}
          </ul>

          <div className={styles.right}>
            <button type="button" className={styles.search} onClick={() => setPaletteOpen(true)} aria-label="Ouvrir la recherche de modules">
              <Search size={15} />
              <span className={styles.searchText}>Aller à…</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className={styles.user} title={name}>
              <span className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</span>
              <span className={styles.userName}>{name}</span>
              <span className={styles.online} aria-hidden="true" />
            </span>
            <button type="button" onClick={logout} className={styles.logout} aria-label="Se déconnecter" title="Se déconnecter">
              <LogOut size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {paletteOpen && <CommandPalette can={can} onClose={() => setPaletteOpen(false)} onGo={(href) => { setPaletteOpen(false); navigate(router, href); }} />}
      </AnimatePresence>
    </>
  );
}

function CommandPalette({ onClose, onGo, can }: { onClose: () => void; onGo: (href: string) => void; can: (k: string | null) => boolean }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const all: NavItem[] = [{ href: "/pilot/home", label: "Accueil", icon: Home, hint: "Tous les modules", key: null }, ...NAV.filter((n) => can(n.key))];
    const t = norm(q.trim());
    return t ? all.filter((i) => norm(`${i.label} ${i.hint}`).includes(t)) : all;
  }, [q, can]);

  useEffect(() => { input.current?.focus(); }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter" && items[idx]) onGo(items[idx].href);
  };

  return (
    <motion.div className={styles.scrim} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Aller à un module"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <label className={styles.pSearch}>
          <Search size={18} />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            placeholder="Rechercher un module…"
            aria-label="Rechercher un module"
          />
          <kbd>Échap</kbd>
        </label>
        <ul className={styles.pList} role="listbox">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={it.href} role="option" aria-selected={i === idx}>
                <button
                  type="button"
                  className={`${styles.pItem} ${i === idx ? styles.pItemOn : ""}`}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => onGo(it.href)}
                >
                  <span className={styles.pIcon}><Icon size={17} /></span>
                  <span className={styles.pText}><b>{it.label}</b><small>{it.hint}</small></span>
                  {i === idx && <CornerDownLeft size={15} className={styles.pEnter} />}
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className={styles.pEmpty}>Aucun module pour « {q} »</li>}
        </ul>
      </motion.div>
    </motion.div>
  );
}
