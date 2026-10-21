"use client";

import React, { useState, useRef, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  Fingerprint,
  ScanEye,
  ShieldCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  Cpu,
  Shield,
} from "lucide-react";
import styles from "./LoginPage.module.css";
import { useAuth } from "@/context/AuthContext";

type AuthStatus = "IDLE" | "SCANNING" | "SUCCESS" | "ERROR";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("IDLE");
  const [errorMsg, setErrorMsg] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const chassisRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current || !chassisRef.current || status === "SUCCESS") return;

    const rect = chassisRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -3.5;
    const rotateY = ((x - centerX) / centerX) * 3.5;

    stageRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    chassisRef.current.style.setProperty("--mouse-x", `${x}px`);
    chassisRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!stageRef.current) return;
    stageRef.current.style.transition =
      "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    stageRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    setTimeout(() => {
      if (stageRef.current) stageRef.current.style.transition = "";
    }, 550);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setStatus("SCANNING");
    setErrorMsg("");

    if (stageRef.current) {
      stageRef.current.style.transition = "transform 0.4s ease";
      stageRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    }

    try {
      await new Promise((r) => setTimeout(r, 500));

      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (res.ok) {
        const user = await res.json();
        setStatus("SUCCESS");
        login(user);

        setTimeout(() => {
          if (user.role === "ADMIN") {
            router.push("/portal");
          } else if (user.role === "PILOT") {
            router.push("/pilot/home");
          } else {
            router.push("/");
          }
        }, 900);
      } else {
        let serverMessage = "ACCÈS REFUSÉ // IDENTIFIANTS INCORRECTS";
        try {
          const errJson = await res.json();
          if (errJson?.error) serverMessage = errJson.error.toUpperCase();
        } catch {
          if (res.status === 403) {
            serverMessage = "COMPTE DÉSACTIVÉ PAR L'ADMINISTRATEUR";
          } else if (res.status >= 500) {
            serverMessage = "SERVEUR BACKEND EN COURS D'INITIALISATION (500)";
          }
        }
        setStatus("ERROR");
        setErrorMsg(serverMessage);
        setTimeout(() => setStatus("IDLE"), 3000);
      }
    } catch {
      setStatus("ERROR");
      setErrorMsg("ERREUR RÉSEAU // SERVEUR INJOIGNABLE");
      setTimeout(() => setStatus("IDLE"), 3000);
    }
  };

  return (
    <div
      className={styles.viewport}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.topLaserBeam} />
      <div className={styles.orbPrimary} />
      <div className={styles.orbSecondary} />
      <div className={styles.horizonGrid} />

      <div ref={stageRef} className={styles.cockpitTiltStage}>
        <div
          ref={chassisRef}
          className={`${styles.cockpitChassis} ${
            status === "SUCCESS" ? styles.cockpitSuccess : ""
          }`}
        >
          <div className={styles.specularGlare} />
          <div className={styles.scannerLine} />

          {/* LEFT WING: 3D HOLOGRAPHIC TESSERACT */}
          <div className={styles.showcaseWing}>
            <div className={styles.wingTopBar}>
              <div className={styles.protocolTag}>
                <span className={styles.liveDot} />
                <span>KYNTUS QUANTUM CORE</span>
              </div>
              <span className={styles.versionBadge}>v2026.4</span>
            </div>

            <div className={styles.holoStage}>
              <div className={styles.orbitalRingOuter} />
              <div className={styles.orbitalRingMid} />
              <div className={styles.cubeContainer}>
                <div className={`${styles.face} ${styles.front}`} />
                <div className={`${styles.face} ${styles.back}`} />
                <div className={`${styles.face} ${styles.right}`} />
                <div className={`${styles.face} ${styles.left}`} />
                <div className={`${styles.face} ${styles.top}`} />
                <div className={`${styles.face} ${styles.bottom}`} />
                <div className={styles.innerCube} />
              </div>
            </div>

            <div className={styles.heroTextBlock}>
              <h1 className={styles.brandName}>
                <span>KYNTUS</span>
                <span className={styles.osTag}>OS</span>
              </h1>
              <p className={styles.heroDesc}>
                Système Central de Pilotage Opérationnel &amp; Synchronisation
                Haute Fréquence. Accès strictement réservé aux opérateurs
                habilités.
              </p>
            </div>

            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryTile}>
                <span className={styles.tileLabel}>SÉCURITÉ</span>
                <span className={styles.tileValue}>
                  <Shield size={13} />
                  <span>ZERO-TRUST // ACTIF</span>
                </span>
              </div>
              <div className={styles.telemetryTile}>
                <span className={styles.tileLabel}>CHIFFREMENT</span>
                <span className={styles.tileValue}>
                  <Cpu size={13} />
                  <span>BCRYPT // TLS</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT WING: AUTHENTICATION FORM */}
          <div className={styles.authWing}>
            <div className={styles.authHeader}>
              <div className={styles.authTitleRow}>
                <h2 className={styles.authTitle}>Authentification</h2>
                <div className={styles.shieldIconBadge}>
                  <ShieldCheck size={20} />
                </div>
              </div>

              <div
                className={`${styles.statusPill} ${
                  status === "SCANNING"
                    ? styles.statusScanning
                    : status === "SUCCESS"
                    ? styles.statusSuccess
                    : status === "ERROR"
                    ? styles.statusError
                    : styles.statusIdle
                }`}
              >
                {status === "IDLE" && "TERMINAL VERROUILLÉ // EN ATTENTE"}
                {status === "SCANNING" && "VÉRIFICATION DES HABILITATIONS..."}
                {status === "SUCCESS" && "IDENTITÉ CONFIRMÉE // REDIRECTION"}
                {status === "ERROR" && "ALERTE SÉCURITÉ // ACCÈS REFUSÉ"}
              </div>
            </div>

            {errorMsg && (
              <div className={`${styles.alertBox} ${styles.alertError}`}>
                <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className={styles.formStack}>
              <div className={styles.fieldWrapper}>
                <label className={styles.fieldLabel}>
                  <span>Identifiant Opérateur</span>
                  <span>REQUIS</span>
                </label>
                <div className={styles.inputGroup}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="Saisir votre identifiant..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.fieldWrapper}>
                <label className={styles.fieldLabel}>
                  <span>Code d&apos;Accès</span>
                  <span>CRYPTÉ</span>
                </label>
                <div className={styles.inputGroup}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.inputField}
                    placeholder="Saisir votre code d'accès..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={styles.eyeToggleBtn}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`${styles.loginBtn} ${
                  status === "SUCCESS" ? styles.loginBtnSuccess : ""
                }`}
                disabled={status === "SCANNING" || status === "SUCCESS"}
              >
                {status === "SCANNING" ? (
                  <>
                    <ScanEye size={19} className={styles.spin} />
                    <span>VÉRIFICATION...</span>
                  </>
                ) : status === "SUCCESS" ? (
                  <>
                    <ShieldCheck size={19} />
                    <span>ACCÈS AUTORISÉ</span>
                  </>
                ) : (
                  <>
                    <Fingerprint size={19} />
                    <span>CONNEXION SÉCURISÉE</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}