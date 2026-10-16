"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutGrid, Target, SquareActivity, DatabaseZap, UsersRound, Cpu, LogOut, ScanSearch, FileDown,
  TableProperties, Map, ShieldAlert, FileCheck 
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useAuth } from "@/context/AuthContext";
import { MouseEvent } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // 2026 Spatial Cursor Glow Tracking
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const menuItems = [
    { name: "Command Center", path: "/", icon: LayoutGrid },
    { name: "Strategic Map", path: "/admin/strategic", icon: Map },
    { name: "Task Dispatch", path: "/admin/tasks", icon: Target },
    { name: "Tactical Board", path: "/admin/kanban", icon: SquareActivity },
    { name: "Inspector (Audit)", path: "/admin/check", icon: ScanSearch },
    { name: "Omni-Grid (Data)", path: "/admin/data", icon: TableProperties },
    { name: "Data Extraction", path: "/admin/export", icon: FileDown },
    { name: "Data Injection", path: "/import", icon: DatabaseZap },
    { name: "Team Ops", path: "/admin/stats", icon: UsersRound },
    { name: "System Config", path: "/admin/templates", icon: Cpu },
    { name: "Contrat Qualité", path: "http://localhost:8741", icon: FileCheck, isExternal: true },
    { name: "Access Control", path: "/admin/users", icon: ShieldAlert } 
  ];

  return (
    <div className={styles.sidebar} onMouseMove={handleMouseMove}>
      <div className={styles.logoArea}>
        <div className={styles.logoHex}>K</div>
        <div className={styles.logoText}>
          KYNTUS<span className={styles.logoAccent}>OS</span>
        </div>
      </div>
      
      <div className={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          
          if (item.isExternal) {
            return (
              <a
                key={item.path}
                href={item.path}
                className={styles.menuItem}
              >
                <item.icon size={21} strokeWidth={2} />
                <span className={styles.itemLabel}>
                  {item.name}
                  <span className={styles.externalBadge}>EXT ↗</span>
                </span>
              </a>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
            >
              <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
              <span className={styles.itemLabel}>{item.name}</span>
              {isActive && <div className={styles.activeBar}></div>}
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.userSection}>
          <div className={styles.avatar}>
            {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.username || "Admin"}</div>
            <div className={styles.userStatus}>ARGON LINK ●</div>
          </div>
        </div>
        <button onClick={logout} className={styles.logoutBtn} title="Disconnect">
          <LogOut size={17} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}