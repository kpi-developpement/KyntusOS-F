"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, Eye, EyeOff, ArrowRight, Check, Loader2, AlertTriangle, Terminal,
  ShieldCheck, Activity, Scale, Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import styles from "./LoginPage.module.css";
import { useAuth } from "@/context/AuthContext";
import { navigate } from "@/lib/transition";
import { KineticText } from "@/components/motion";
import LoginMascot, { type MascotMood } from "./LoginMascot";

const LiquidScene = dynamic(() => import("@/components/three/LiquidScene"), { ssr: false });

type AuthStatus = "IDLE" | "SCANNING" | "SUCCESS" | "ERROR";

const FLOATERS = [
  { icon: Activity, title: "Analyse EPS", sub: "synchronisée avec Bytel", x: "7%", y: "20%", d: 0 },
  { icon: ShieldCheck, title: "Validation", sub: "suivie pilote par pilote", x: "22%", y: "38%", d: 0.15 },
  { icon: Scale, title: "Contestation", sub: "générée en un clic", x: "34%", y: "9%", d: 0.3 },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [shake, setShake] = useState(0);
  const [pwFocus, setPwFocus] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  // Parallaxe douce du panneau de gauche
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5).toFixed(3)}`);
    el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5).toFixed(3)}`);
  };

  const fail = (msg: string) => {
    setStatus("ERROR");
    setErrorMsg(msg);
    setShake((n) => n + 1);
    setTimeout(() => setStatus("IDLE"), 2600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || status === "SCANNING" || status === "SUCCESS") return;
    setStatus("SCANNING");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        const user = await res.json();
        setStatus("SUCCESS");
        login(user);
        const dest = user.role === "ADMIN" ? "/portal" : user.role === "PILOT" ? "/pilot/home" : "/";
        const r = submitRef.current?.getBoundingClientRect();
        // Sortie en fondu : la page suivante se dévoile en cercle depuis le bouton
        setTimeout(() => navigate(router, dest, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined), 700);
      } else {
        let msg = "Identifiant ou mot de passe incorrect.";
        try {
          const j = await res.json();
          if (j?.error) msg = String(j.error);
        } catch {
          if (res.status === 403) msg = "Ce compte a été désactivé par un administrateur.";
          else if (res.status >= 500) msg = "Le serveur démarre encore. Réessayez dans quelques secondes.";
        }
        fail(msg);
      }
    } catch {
      fail("Serveur injoignable. Vérifiez votre connexion puis réessayez.");
    }
  };

  const busy = status === "SCANNING";
  const done = status === "SUCCESS";
  const mood: MascotMood = done ? "success" : status === "ERROR" ? "error" : busy ? "busy" : pwFocus && password ? (showPassword ? "peek" : "shy") : pwFocus ? "shy" : "watch";

  return (
    <div className={styles.page}>
      {/* ---------- PANNEAU ÉDITORIAL ---------- */}
      <motion.section
        className={styles.story}
        ref={sceneRef}
        onPointerMove={onMove}
        aria-hidden="true"
        initial={{ clipPath: "inset(100% 0% 0% 0% round 32px)" }}
        animate={{ clipPath: done ? "inset(0% 0% 0% 0% round 60px)" : "inset(0% 0% 0% 0% round 32px)", scale: done ? 0.97 : 1 }}
        transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
      >
        <div className={styles.storyBg} />
        <div className={styles.storyGrid} />
        <div className={styles.scene}><LiquidScene excited={busy || done} /></div>

        <div className={styles.brand}>
          <span className={styles.mark}><Terminal size={18} strokeWidth={2.6} /></span>
          <span className={styles.word}>Kyntus<b>OS</b></span>
        </div>

        <div className={styles.storyText}>
          <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Sparkles size={13} /> Pilotage opérationnel
          </motion.span>
          <h1>
            <KineticText text="Chaque intervention," min={550} max={800} />
            <br />
            <em>maîtrisée</em> <KineticText text="de bout en bout." min={550} max={800} />
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}>
            Analyse, facturation, contestation et suivi des équipes réunis dans un seul espace de travail.
          </motion.p>
        </div>

        <div className={styles.floaters}>
          {FLOATERS.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className={styles.floater}
                style={{ left: f.x, top: f.y, "--depth": `${(i + 1) * 14}px` } as React.CSSProperties}
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.35 + f.d, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={styles.floaterIcon}><Icon size={17} /></span>
                <span><b>{f.title}</b><small>{f.sub}</small></span>
              </motion.div>
            );
          })}
        </div>

        <p className={styles.storyFoot}>© {new Date().getFullYear()} Kyntus · Accès réservé aux opérateurs habilités</p>
      </motion.section>

      {/* ---------- FORMULAIRE ---------- */}
      <section className={styles.formSide}>
        <motion.div
          key={shake}
          className={`${styles.card} ${done ? styles.cardDone : ""}`}
          initial={shake ? { x: 0 } : { opacity: 0, y: 18 }}
          animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : done ? { opacity: 1, y: 0, scale: 0.98 } : { opacity: 1, y: 0 }}
          transition={shake ? { duration: 0.45 } : { duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.cardHead}>
            <span className={styles.mascot}><LoginMascot mood={mood} /></span>
            <h2>Connexion</h2>
            <p>Entrez vos identifiants pour accéder à votre espace.</p>
          </div>

          <form onSubmit={handleLogin} className={styles.form} noValidate>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Identifiant</span>
              <span className={styles.inputWrap}>
                <User size={17} className={styles.inputIcon} />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="prenom.nom"
                  disabled={busy || done}
                  autoFocus
                  required
                />
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Mot de passe
                {capsLock && <span className={styles.caps}>Verr. Maj activé</span>}
              </span>
              <span className={styles.inputWrap}>
                <Lock size={17} className={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  placeholder="••••••••"
                  disabled={busy || done}
                  required
                />
                <button
                  type="button"
                  className={styles.eye}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            <AnimatePresence>
              {status === "ERROR" && errorMsg && (
                <motion.div
                  className={styles.error}
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertTriangle size={16} /> <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button ref={submitRef} type="submit" className={`${styles.submit} ${done ? styles.submitDone : ""}`} disabled={busy || done || !username.trim() || !password}>
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.span key="ok" className={styles.submitInner} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Check size={18} strokeWidth={3} /> Bienvenue
                  </motion.span>
                ) : busy ? (
                  <motion.span key="busy" className={styles.submitInner} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Loader2 size={18} className="kx-spin" /> Vérification…
                  </motion.span>
                ) : (
                  <motion.span key="idle" className={styles.submitInner} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Se connecter <ArrowRight size={17} className={styles.arrow} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </form>

          <p className={styles.help}>Mot de passe oublié ? Contactez votre administrateur.</p>
        </motion.div>
      </section>
    </div>
  );
}
