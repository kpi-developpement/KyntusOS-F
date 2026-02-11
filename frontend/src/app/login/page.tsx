"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Fingerprint, ScanEye, ShieldCheck, AlertTriangle } from "lucide-react";
import styles from "./LoginPage.module.css";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth(); // Kan-sta3mloha ghir bach n-activiw Sidebar
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "ERROR">("IDLE");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setStatus("SCANNING");
    setErrorMsg("");

    try {
      await new Promise(r => setTimeout(r, 800)); 

      const res = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const user = await res.json();
        setStatus("SUCCESS");
        
        // 1. UPDATE STATE (Bla redirection)
        login(user); 

        // 2. REDIRECTION CUSTOM (Kif ma bgheti nti)
        setTimeout(() => {
            if (user.role === "ADMIN") {
                // Hna rje3na l /portal
                router.push("/portal"); 
            } else if (user.role === "PILOT") {
                router.push("/pilot/board");
            } else {
                router.push("/");
            }
        }, 1000);

      } else {
        throw new Error("Identifiants Incorrects");
      }
    } catch (err) {
      setStatus("ERROR");
      setErrorMsg("ACCESS DENIED // AUTH FAILED");
      setTimeout(() => setStatus("IDLE"), 2000);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{opacity: 0.3}}>
         <InteractiveBackground />
      </div>

      <div className={`${styles.loginCard} ${status === "SUCCESS" ? styles.success : ""}`}>
        <div className={styles.scannerLine}></div>

        <div className={styles.logoWrapper}>
            <div className={styles.cubeContainer}>
                <div className={`${styles.face} ${styles.front}`}></div>
                <div className={`${styles.face} ${styles.back}`}></div>
                <div className={`${styles.face} ${styles.right}`}></div>
                <div className={`${styles.face} ${styles.left}`}></div>
                <div className={`${styles.face} ${styles.top}`}></div>
                <div className={`${styles.face} ${styles.bottom}`}></div>
                <div className={styles.innerCube}></div>
            </div>

            <h1 className={styles.brandName}>
                KYNTUS<span className={styles.osTag}>OS</span>
            </h1>
            
            <div className={styles.statusText} style={{marginTop: 10, color: status==="SUCCESS" ? "#39ff14" : status==="ERROR" ? "#ff0055" : "#666"}}>
               {status === "IDLE" && "SYSTEM LOCKED // WAITING INPUT"}
               {status === "SCANNING" && "VERIFYING CREDENTIALS..."}
               {status === "SUCCESS" && "IDENTITY CONFIRMED. REDIRECTING..."}
               {status === "ERROR" && "SECURITY ALERT: INVALID ACCESS"}
            </div>
        </div>

        {status === "ERROR" && (
            <div className={styles.errorMsg}>
                <AlertTriangle size={16} style={{display:"inline", marginRight:5}}/>
                {errorMsg}
            </div>
        )}

        <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
                <input 
                    type="text" 
                    className={styles.inputField} 
                    placeholder="IDENTIFIANT"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                />
                <User size={20} className={styles.inputIcon} />
            </div>

            <div className={styles.inputGroup}>
                <input 
                    type="password" 
                    className={styles.inputField} 
                    placeholder="CODE D'ACCÈS"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={status === "SCANNING" || status === "SUCCESS"}
                />
                <Lock size={20} className={styles.inputIcon} />
            </div>

            <button 
                type="submit" 
                className={styles.loginBtn}
                disabled={status === "SCANNING" || status === "SUCCESS"}
                style={{
                    background: status === "SUCCESS" ? "#39ff14" : undefined,
                    color: status === "SUCCESS" ? "black" : undefined,
                    boxShadow: status === "SUCCESS" ? "0 0 20px #39ff14" : undefined
                }}
            >
                {status === "SCANNING" ? (
                   <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                       <ScanEye size={20} className="spin"/> PROCESSING
                   </span>
                ) : status === "SUCCESS" ? (
                   <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                       <ShieldCheck size={20}/> GRANTED
                   </span>
                ) : (
                   <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                       <Fingerprint size={20}/> AUTHENTICATE
                   </span>
                )}
            </button>
        </form>

      </div>
    </div>
  );
}