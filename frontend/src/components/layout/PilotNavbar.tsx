"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutList, KanbanSquare, History, LogOut, Terminal, 
  Database, Cpu, BarChart2, Receipt, Cloud 
} from "lucide-react";
import styles from "./PilotNavbar.module.css";
import { useEffect, useState, MouseEvent } from "react";

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

  // 2026 Interactive Spatial Light Tracking
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const navItems = [
    { href: "/pilot/board", label: "Data Entry", icon: LayoutList },
    { href: "/pilot/kanban", label: "Tactical", icon: KanbanSquare },
    { href: "/pilot/recorde", label: "Terrain Records", icon: Database },
    { href: "/pilot/api", label: "API Bytel", icon: Cloud },
    { href: "/pilot/parametrage", label: "Paramétrage", icon: Cpu },
    { href: "/pilot/ventilation", label: "Ventilation", icon: BarChart2 },
    { href: "/pilot/facture", label: "Facturation", icon: Receipt },
    { href: "/pilot/history", label: "Archive", icon: History },
  ];

  return (
    <div className={styles.navbarWrapper}>
      <div className={styles.navbarBody} onMouseMove={handleMouseMove}>
        
        {/* Faisceau Photonique */}
        <div className={styles.scanline}></div>

        {/* Nœuds Optiques (Argon Nodes) */}
        <div className={`${styles.screw} ${styles.tl}`}></div>
        <div className={`${styles.screw} ${styles.tr}`}></div>
        <div className={`${styles.screw} ${styles.bl}`}></div>
        <div className={`${styles.screw} ${styles.br}`}></div>

        {/* BRAND ZONE */}
        <div className={styles.brandZone}>
          <div className={styles.logoHex}>
            <Terminal size={20} strokeWidth={2.5} />
          </div>
          <div className={styles.logoText}>
            KYNTUS<span className={styles.logoAccent}>OS</span>
          </div>
        </div>

        {/* NAVIGATION CENTER */}
        <div className={styles.navZone}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.activeLink : ""}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* USER ZONE */}
        <div className={styles.userZone}>
          <div className={styles.pilotBadge}>
            <div className={styles.statusDot}></div>
            <span>OP: {user?.username || "GUEST"}</span>
          </div>
          <button 
            onClick={handleLogout} 
            className={styles.logoutBtn} 
            title="Disconnect System"
          >
            <LogOut size={18} strokeWidth={2.2} />
          </button>
        </div>

      </div>
    </div>
  );
}