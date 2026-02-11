"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutGrid, Target, SquareActivity, DatabaseZap, UsersRound, Cpu, LogOut, ScanSearch, FileDown,
  TableProperties, Map, ShieldAlert 
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Liste des menus (BLA CHOUROUT - Hit Sidebar ghir dyal Admin)
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
    // Dima bayna db:
    { name: "Access Control", path: "/admin/users", icon: ShieldAlert } 
  ];

  return (
    <div className={styles.sidebar}>
      <div className={styles.logoArea}>
         <div className={styles.logoHex}>K</div>
         <div className={styles.logoText}>KYNTUS<span style={{color:"#00f2ea"}}>OS</span></div>
      </div>
      
      <div className={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`${styles.menuItem} ${isActive ? styles.active : ""}`}
            >
              <item.icon size={22} />
              <span className={styles.itemLabel}>{item.name}</span>
              {isActive && <div className={styles.activeBar}></div>}
            </Link>
          );
        })}
      </div>

      <div className={styles.footer}>
          <div className={styles.userSection}>
              {/* Fallback "A" bach mayb9ach khawi ila kan null */}
              <div className={styles.avatar}>
                {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
              </div>
              <div className={styles.userInfo}>
                  {/* Fallback Admin bach tban dima 3amra */}
                  <div className={styles.userName}>{user?.username || "Admin"}</div>
                  <div className={styles.userStatus}>SECURE LINK ●</div>
              </div>
          </div>
          <button onClick={logout} className={styles.logoutBtn} title="Disconnect">
              <LogOut size={18} />
          </button>
      </div>
    </div>
  );
}