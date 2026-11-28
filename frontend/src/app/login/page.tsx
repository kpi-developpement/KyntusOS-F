"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [userFocus, setUserFocus] = useState(false);
  const [remember, setRemember] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState("");

  // « Se souvenir de moi » : on ne garde que l'identifiant, jamais le mot de passe
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kx-remember-user");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-remplissage unique au montage
      if (saved) { setUsername(saved); setRemember(true); setWelcomeBack(saved); }
    } catch { /* stockage indisponible */ }
  }, []);
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
        try {
          if (remember) localStorage.setItem("kx-remember-user", username.trim());
          else localStorage.removeItem("kx-remember-user");
        } catch { /* stockage indisponible */ }
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
          className={`${styles.card} ${done ? styles.cardDone : ""} ${status === "ERROR" ? styles.cardError : ""}`}
          initial={shake ? { x: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
          animate={shake ? { x: [0, -10, 9, -6, 4, 0] } : done ? { opacity: 1, y: 0, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
          transition={shake ? { duration: 0.45 } : { type: "spring", stiffness: 160, damping: 22, delay: 0.3 }}
        >
          <span className={styles.cardBorder} aria-hidden="true" />
          <div className={styles.cardInner}>
            <div className={styles.cardHead}>
              <span className={styles.mascot}><LoginMascot mood={mood} /></span>
              <AnimatePresence mode="wait">
                <motion.div key={welcomeBack ? "back" : "new"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <h2>{welcomeBack ? <>Bon retour, <em>{welcomeBack}</em></> : <>Connexion</>}</h2>
                  <p>{welcomeBack ? "Entrez votre mot de passe pour reprendre où vous en étiez." : "Entrez vos identifiants pour accéder à votre espace."}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <form onSubmit={handleLogin} className={styles.form} noValidate>
              <motion.div className={`${styles.float} ${userFocus ? styles.floatFocus : ""} ${username ? styles.floatFilled : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <User size={18} className={styles.floatIcon} />
                <input
                  id="kx-user"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); if (welcomeBack) setWelcomeBack(""); }}
                  onFocus={() => setUserFocus(true)}
                  onBlur={() => setUserFocus(false)}
                  disabled={busy || done}
                  autoFocus={!welcomeBack}
                  required
                />
                <label htmlFor="kx-user">Identifiant</label>
                <span className={styles.floatLine} />
                {username && <Check size={16} className={styles.floatOk} />}
              </motion.div>

              <motion.div className={`${styles.float} ${pwFocus ? styles.floatFocus : ""} ${password ? styles.floatFilled : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
                <Lock size={18} className={styles.floatIcon} />
                <input
                  id="kx-pass"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  disabled={busy || done}
                  autoFocus={!!welcomeBack}
                  required
                />
                <label htmlFor="kx-pass">Mot de passe</label>
                <span className={styles.floatLine} />
                <button type="button" className={styles.eye} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={showPassword ? "off" : "on"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: "grid" }}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
              </motion.div>

              <AnimatePresence>
                {capsLock && (
                  <motion.div className={styles.caps} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    Verr. Maj activé
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div className={styles.row} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <button type="button" role="switch" aria-checked={remember} className={`${styles.remember} ${remember ? styles.rememberOn : ""}`} onClick={() => setRemember((v) => !v)}>
                  <span className={styles.switch}><span /></span>
                  Se souvenir de moi
                </button>
                <span className={styles.secure}><ShieldCheck size={14} /> Connexion chiffrée</span>
              </motion.div>

              <AnimatePresence>
                {status === "ERROR" && errorMsg && (
                  <motion.div className={styles.error} role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <AlertTriangle size={16} /> <span>{errorMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                ref={submitRef}
                type="submit"
                className={`${styles.submit} ${busy ? styles.submitBusy : ""} ${done ? styles.submitDone : ""}`}
                disabled={busy || done || !username.trim() || !password}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.68 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className={styles.submitProgress} aria-hidden="true" />
                <AnimatePresence mode="wait" initial={false}>
                  {done ? (
                    <motion.span key="ok" className={styles.submitInner} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                      <Check size={18} strokeWidth={3} /> Bienvenue
                    </motion.span>
                  ) : busy ? (
                    <motion.span key="busy" className={styles.submitInner} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <Loader2 size={18} className="kx-spin" /> Vérification…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" className={styles.submitInner} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      Se connecter <ArrowRight size={17} className={styles.arrow} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            <p className={styles.help}>Mot de passe oublié ? Contactez votre administrateur.</p>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
