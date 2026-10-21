"use client";

import { useState, useRef, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Fingerprint, ScanEye, ShieldCheck, AlertTriangle } from "lucide-react";
import styles from "./LoginPage.module.css";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); 
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");

  const tiltRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // --- 2026 Interactive 3D Aero-Glass Effect ---
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!tiltRef.current || !cardRef.current || status === "SUCCESS") return;
    
    const rect = tiltRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 3D Tilt calculation
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg tilt
    const rotateY = ((x - centerX) / centerX) * 6;
    
    tiltRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Dynamic Light Glare
    cardRef.current.style.setProperty("--glare-x", `${x}px`);
    cardRef.current.style.setProperty("--glare-y", `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!tiltRef.current) return;
    tiltRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
    tiltRef.current.style.transition = `transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`;
    setTimeout(() => {
        if (tiltRef.current) tiltRef.current.style.transition = '';
    }, 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setStatus("SCANNING");
    setErrorMsg("");

    // Lock the card flat during scanning/success
    if (tiltRef.current) {
        tiltRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
        tiltRef.current.style.transition = `transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)`;
    }

    try {
      await new Promise(r => setTimeout(r, 800)); 

      // 🔥 L-FIX HOWA HADA: Mse7na API_URL w darna fetch direct b /api wla l-IP host
      const res = await fetch(`http://10.10.10.25:8082/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
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
        }, 1200);

      } else {
        throw new Error("Identifiants Incorrects");
      }
    } catch (err) {
      setStatus("ERROR");
      setErrorMsg("ACCÈS REFUSÉ // IDENTIFIANTS INVALIDS");
      setTimeout(() => setStatus("IDLE"), 2000);
    }
  };

  return (
    <div 
        className={styles.container} 
        onMouseMove={handleMouseMove} 
        onMouseLeave={handleMouseLeave}
    >
      {/* Optional: Your interactive background if it exists, keeping it subtle */}
      <div style={{opacity: 0.1, position: "absolute", inset: 0, pointerEvents: "none"}}>
         <InteractiveBackground />
      </div>

      <div ref={tiltRef} className={styles.tiltWrapper}>
        <div ref={cardRef} className={`${styles.loginCard} ${status === "SUCCESS" ? styles.success : ""}`}>
            
            <div className={styles.glare}></div>
            <div className={styles.scannerLine}></div>

            <div className={styles.logoWrapper}>
                {/* 2026 SAPPHIRE HOLO NODE */}
                <div className={styles.holoNode}>
                    <div className={`${styles.nodeRing} ${styles.ring1}`}></div>
                    <div className={`${styles.nodeRing} ${styles.ring2}`}></div>
                    <div className={`${styles.nodeRing} ${styles.ring3}`}></div>
                    <div className={styles.nodeCore}></div>
                </div>

                <h1 className={styles.brandName}>
                    KYNTUS<span className={styles.osTag}>OS</span>
                </h1>
                
                <div 
                    className={styles.statusText} 
                    style={{
                        color: status==="SUCCESS" ? "#059669" : status==="ERROR" ? "#e11d48" : "#64748b",
                        borderColor: status==="SUCCESS" ? "#a7f3d0" : status==="ERROR" ? "#fecdd3" : "rgba(15, 23, 42, 0.08)",
                        background: status==="SUCCESS" ? "#ecfdf5" : status==="ERROR" ? "#fff1f2" : "rgba(15, 23, 42, 0.04)"
                    }}
                >
                {status === "IDLE" && "SYSTEM LOCKED // WAITING INPUT"}
                {status === "SCANNING" && "VERIFYING CREDENTIALS..."}
                {status === "SUCCESS" && "IDENTITY CONFIRMED. REDIRECTING..."}
                {status === "ERROR" && "SECURITY ALERT: INVALID ACCESS"}
                </div>
            </div>

            {status === "ERROR" && (
                <div className={styles.errorMsg}>
                    <AlertTriangle size={15} style={{display:"inline", marginRight:6, verticalAlign:"-3px"}}/>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleLogin} style={{ transform: "translateZ(10px)" }}>
                <div className={styles.inputGroup}>
                    <input 
                        type="text" 
                        className={styles.inputField} 
                        placeholder="IDENTIFIANT (USERNAME)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={status === "SCANNING" || status === "SUCCESS"}
                    />
                    <User size={18} className={styles.inputIcon} />
                </div>

                <div className={styles.inputGroup}>
                    <input 
                        type="password" 
                        className={styles.inputField} 
                        placeholder="CODE D'ACCÈS (PASSWORD)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={status === "SCANNING" || status === "SUCCESS"}
                    />
                    <Lock size={18} className={styles.inputIcon} />
                </div>

                <button 
                    type="submit" 
                    className={`${styles.loginBtn} ${status === "SUCCESS" ? styles.successBtn : ""}`}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                >
                    {status === "SCANNING" ? (
                    <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                        <ScanEye size={18} className={styles.spin}/> PROCESSING
                    </span>
                    ) : status === "SUCCESS" ? (
                    <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                        <ShieldCheck size={18}/> ACCESS GRANTED
                    </span>
                    ) : (
                    <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                        <Fingerprint size={18}/> AUTHENTICATE
                    </span>
                    )}
                </button>
            </form>

        </div>
      </div>
    </div>
  );
}