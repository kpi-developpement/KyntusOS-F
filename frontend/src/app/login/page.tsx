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
  Wifi,
  KeyRound,
  Sparkles,
  CheckCircle2,
  Server,
} from "lucide-react";
import styles from "./LoginPage.module.css";
import { useAuth } from "@/context/AuthContext";

type AuthStatus = "IDLE" | "SCANNING" | "SUCCESS" | "ERROR";
type RouteChannel = "AUTO_FAILOVER" | "PROXY_ONLY" | "DIRECT_8082";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<AuthStatus>("IDLE");
  const [errorMsg, setErrorMsg] = useState("");
  const [rescueMsg, setRescueMsg] = useState("");
  const [channelMode, setChannelMode] = useState<RouteChannel>("AUTO_FAILOVER");
  const [activeEndpointUsed, setActiveEndpointUsed] = useState<string>("/api/auth/login");

  const stageRef = useRef<HTMLDivElement>(null);
  const chassisRef = useRef<HTMLDivElement>(null);

  // ==========================================================================
  // 1. 2026 SPATIAL 3D TILT & SPECULAR GLARE TRACKING
  // ==========================================================================
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
    stageRef.current.style.transition = "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
    stageRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    setTimeout(() => {
      if (stageRef.current) stageRef.current.style.transition = "";
    }, 550);
  };

  // ==========================================================================
  // 2. MULTI-CHANNEL SMART REQUEST ENGINE (BYPASSES PROXY OR PORT ISSUES)
  // ==========================================================================
  const executeSmartFetch = async (
    path: string,
    options: RequestInit
  ): Promise<Response> => {
    const hostIp =
      typeof window !== "undefined" ? window.location.hostname : "10.10.10.25";

    const candidateUrls =
      channelMode === "PROXY_ONLY"
        ? [`/api${path}`]
        : channelMode === "DIRECT_8082"
        ? [`http://${hostIp}:8082/api${path}`, `http://10.10.10.25:8082/api${path}`]
        : [
            `/api${path}`,
            `http://${hostIp}:8082/api${path}`,
            `http://10.10.10.25:8082/api${path}`,
          ];

    let lastError: any = null;

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, options);
        // If Next.js Rewrite Proxy returns 500/502/504 because it couldn't resolve `backend:8082`,
        // automatically try the next candidate URL!
        if (res.status >= 500 && candidateUrls.length > 1) {
          lastError = new Error(`Proxy HTTP ${res.status} sur ${url}`);
          continue;
        }
        setActiveEndpointUsed(url);
        return res;
      } catch (networkErr) {
        lastError = networkErr;
      }
    }

    throw lastError || new Error("Serveur Backend injoignable sur tous les canaux");
  };

  // ==========================================================================
  // 3. 1-CLICK RESCUE ACCOUNT INITIALIZER (/api/rescue/admin & /api/rescue/pilot)
  // ==========================================================================
  const handleTriggerRescue = async (roleType: "admin" | "pilot") => {
    setErrorMsg("");
    setRescueMsg(
      roleType === "admin"
        ? "Synchronisation du compte Admin 'elabdi'..."
        : "Synchronisation du compte Pilote 'saad'..."
    );

    try {
      const res = await executeSmartFetch(`/rescue/${roleType}`, {
        method: "GET",
      });
      const text = await res.text();

      if (roleType === "admin") {
        setUsername("elabdi");
        setPassword("admin123");
      } else {
        setUsername("saad");
        setPassword("pilot123");
      }

      setRescueMsg(
        text.replace(/[^\w\sÀ-ÿ'!:.,/-]/g, "").trim() ||
          `Compte ${roleType.toUpperCase()} initialisé et pré-rempli.`
      );
    } catch (err) {
      setRescueMsg("");
      setStatus("ERROR");
      setErrorMsg(
        "Impossible de joindre le Backend (Port 8082). Vérifiez que kyntus-backend a terminé son démarrage."
      );
    }
  };

  // ==========================================================================
  // 4. AUTHENTICATION HANDLER (WITH PRECISE DIAGNOSTICS)
  // ==========================================================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setStatus("SCANNING");
    setErrorMsg("");
    setRescueMsg("");

    if (stageRef.current) {
      stageRef.current.style.transition = "transform 0.4s ease";
      stageRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    }

    try {
      await new Promise((r) => setTimeout(r, 450));

      const res = await executeSmartFetch(`/auth/login`, {
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
        let serverMessage = "IDENTIFIANTS INCORRECTS (401)";
        try {
          const errJson = await res.json();
          if (errJson?.error) serverMessage = errJson.error.toUpperCase();
        } catch {
          if (res.status === 403) {
            serverMessage = "COMPTE DÉSACTIVÉ PAR L'ADMINISTRATEUR (403)";
          }
        }
        setStatus("ERROR");
        setErrorMsg(serverMessage);
        setTimeout(() => setStatus("IDLE"), 3500);
      }
    } catch (err: any) {
      setStatus("ERROR");
      setErrorMsg(
        "CONNEXION SERVEUR REFUSÉE : Vérifiez que le conteneur 'kyntus-backend' est bien démarré sur le port 8082."
      );
      setTimeout(() => setStatus("IDLE"), 4000);
    }
  };

  const cycleChannelMode = () => {
    setChannelMode((prev) =>
      prev === "AUTO_FAILOVER"
        ? "PROXY_ONLY"
        : prev === "PROXY_ONLY"
        ? "DIRECT_8082"
        : "AUTO_FAILOVER"
    );
  };

  return (
    <div
      className={styles.viewport}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 2026 Spatial Background Elements */}
      <div className={styles.topLaserBeam} />
      <div className={styles.orbPrimary} />
      <div className={styles.orbSecondary} />
      <div className={styles.horizonGrid} />

      {/* 3D Tilt Stage */}
      <div ref={stageRef} className={styles.cockpitTiltStage}>
        <div
          ref={chassisRef}
          className={`${styles.cockpitChassis} ${
            status === "SUCCESS" ? styles.cockpitSuccess : ""
          }`}
        >
          <div className={styles.specularGlare} />
          <div className={styles.scannerLine} />

          {/* ================================================================ */}
          {/* LEFT WING: 3D GYROSCOPIC TESSERACT & TELEMETRY                   */}
          {/* ================================================================ */}
          <div className={styles.showcaseWing}>
            <div className={styles.wingTopBar}>
              <div className={styles.protocolTag}>
                <span className={styles.liveDot} />
                <span>KYNTUS QUANTUM NODE</span>
              </div>
              <span className={styles.versionBadge}>v2026.4 // AERO</span>
            </div>

            {/* 3D Holographic Tesseract */}
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
                 Architecture de Pilotage Opérationnel & Synchronisation Haute
                Fréquence. Authentification biométrique sécurisée par BCrypt.
              </p>
            </div>

            {/* Live System Telemetry */}
            <div className={styles.telemetryGrid}>
              <div className={styles.telemetryTile}>
                <span className={styles.tileLabel}> passerelle active</span>
                <span className={styles.tileValue}>
                  <Server size={13} />
                  <span>{activeEndpointUsed}</span>
                </span>
              </div>
              <div className={styles.telemetryTile}>
                <span className={styles.tileLabel}>CHIFFREMENT</span>
                <span className={styles.tileValue}>
                  <Cpu size={13} />
                  <span>BCRYPT // STATELESS</span>
                </span>
              </div>
            </div>

            {/* 1-Click Rescue & Quick Fill Bar */}
            <div className={styles.rescueBox}>
              <div className={styles.rescueHeader}>
                <span>INITIALISATION RAPIDE (RESCUE API)</span>
                <Sparkles size={13} />
              </div>
              <div className={styles.rescueBtnsRow}>
                <button
                  type="button"
                  onClick={() => handleTriggerRescue("admin")}
                  className={styles.rescueQuickBtn}
                  title="Initialiser et remplir le compte Admin elabdi"
                >
                  <KeyRound size={13} />
                  <span>ADMIN (elabdi)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerRescue("pilot")}
                  className={styles.rescueQuickBtn}
                  title="Initialiser et remplir le compte Pilote saad"
                >
                  <KeyRound size={13} />
                  <span>PILOT (saad)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT WING: BIOMETRIC AUTHENTICATION TERMINAL                    */}
          {/* ================================================================ */}
          <div className={styles.authWing}>
            <div className={styles.authHeader}>
              <div className={styles.authTitleRow}>
                <h2 className={styles.authTitle}>Portail d&apos;Accès</h2>
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
                {status === "IDLE" && "SYSTÈME VERROUILLÉ // EN ATTENTE"}
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

            {rescueMsg && !errorMsg && (
              <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{rescueMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className={styles.formStack}>
              <div className={styles.fieldWrapper}>
                <label className={styles.fieldLabel}>
                  <span>Identifiant Opérateur</span>
                  <span> OBLIGATOIRE</span>
                </label>
                <div className={styles.inputGroup}>
                  <User size={18} className={styles.inputIcon} />
                  <input
                    type="text"
                    className={styles.inputField}
                    placeholder="Ex: elabdi ou saad"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className={styles.fieldWrapper}>
                <label className={styles.fieldLabel}>
                  <span>Clé d&apos;Accès Cryptographique</span>
                  <span>BCRYPT</span>
                </label>
                <div className={styles.inputGroup}>
                  <Lock size={18} className={styles.inputIcon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className={styles.inputField}
                    placeholder="Saisir votre mot de passe..."
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
                    title={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
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
                    <span>SYNCHRONISATION...</span>
                  </>
                ) : status === "SUCCESS" ? (
                  <>
                    <ShieldCheck size={19} />
                    <span>ACCÈS AUTORISÉ</span>
                  </>
                ) : (
                  <>
                    <Fingerprint size={19} />
                    <span>AUTHENTIFIER LA SESSION</span>
                  </>
                )}
              </button>
            </form>

            {/* Smart Network Channel Switcher */}
            <div className={styles.channelFooter}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Wifi size={13} color="#0284c7" />
                <span>ROUTAGE RÉSEAU :</span>
              </span>
              <button
                type="button"
                onClick={cycleChannelMode}
                className={styles.channelSwitchBtn}
                title="Cliquer pour changer le mode de connexion au Backend"
              >
                {channelMode === "AUTO_FAILOVER"
                  ? "AUTO-FAILOVER (PROXY + 8082)"
                  : channelMode === "PROXY_ONLY"
                  ? "PROXY NEXT.JS (/api)"
                  : "DIRECT PORT 8082"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}