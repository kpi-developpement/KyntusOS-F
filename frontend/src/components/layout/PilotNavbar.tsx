"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutList, KanbanSquare, History, LogOut, Terminal } from "lucide-react";
import styles from "./PilotNavbar.module.css";
import { useEffect, useState } from "react";

export default function PilotNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("kyntus_user");
    router.push("/login");
  };

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.navbarBody}>
        
        {/* Background Scan Effect */}
        <div className={styles.scanline}></div>

        {/* Déco Vis (Tech Screws) */}
        <div className={`${styles.screw} ${styles.tl}`}></div>
        <div className={`${styles.screw} ${styles.tr}`}></div>
        <div className={`${styles.screw} ${styles.bl}`}></div>
        <div className={`${styles.screw} ${styles.br}`}></div>

        {/* BRAND */}
        <div className={styles.brandZone}>
          <div className={styles.logoHex}>
             <Terminal size={20} color="black" />
          </div>
          <div className={styles.logoText}>
            KYNTUS<span style={{color:"var(--neon-cyan)"}}>OS</span>
          </div>
        </div>

        {/* NAVIGATION CENTER */}
        <div className={styles.navZone}>
          <Link 
            href="/pilot/board" 
            className={`${styles.navLink} ${pathname === '/pilot/board' ? styles.activeLink : ''}`}
          >
            <LayoutList size={16} /> Data Entry
          </Link>
          <Link 
            href="/pilot/kanban" 
            className={`${styles.navLink} ${pathname === '/pilot/kanban' ? styles.activeLink : ''}`}
          >
            <KanbanSquare size={16} /> Tactical
          </Link>
          <Link 
            href="/pilot/history" 
            className={`${styles.navLink} ${pathname === '/pilot/history' ? styles.activeLink : ''}`}
          >
            <History size={16} /> Archive
          </Link>
        </div>

        {/* USER ZONE */}
        <div className={styles.userZone}>
          <div className={styles.pilotBadge}>
             <div style={{width:8, height:8, background:"#39ff14", borderRadius:"50%", boxShadow:"0 0 5px #39ff14"}}></div>
             OP: {user?.username || "GUEST"}
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} title="Disconnect System">
             <LogOut size={18}/>
          </button>
        </div>

      </div>
    </div>
  );
}