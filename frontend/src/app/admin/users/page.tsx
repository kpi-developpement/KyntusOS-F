"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, UserPlus, Users, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { KxHeader, KxEmpty } from "@/components/kx";
import UnitCreationTab from "./components/UnitCreationTab";
import NetworkControlTab from "./components/NetworkControlTab";
import styles from "./Users.module.css";

const TABS = [
  { id: "CREATE", label: "Créer un compte", icon: UserPlus },
  { id: "MANAGE", label: "Gérer les pilotes", icon: Users },
] as const;

export default function UserManagementPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"CREATE" | "MANAGE">("CREATE");

  if (user?.role !== "ADMIN") {
    return (
      <main className="kx-page">
        <KxEmpty icon={Lock} title="Accès réservé aux administrateurs">
          <span>Connectez-vous avec un compte administrateur pour gérer les accès.</span>
        </KxEmpty>
      </main>
    );
  }

  return (
    <main className="kx-page" style={{ maxWidth: 1240 }}>
      <KxHeader
        icon={ShieldAlert}
        eyebrow="Organisation"
        title={<>Contrôle des <em>accès</em></>}
        subtitle="Créez des comptes, activez ou suspendez un pilote et choisissez les modules qu'il peut ouvrir."
        actions={
          <div className={styles.tabs} role="tablist" aria-label="Sections">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button key={t.id} type="button" role="tab" aria-selected={on} className={`${styles.tab} ${on ? styles.tabOn : ""}`} onClick={() => setTab(t.id)}>
                  {on && <motion.span layoutId="users-tab" className={styles.tabPill} transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className={styles.tabLabel}><Icon size={16} /> {t.label}</span>
                </button>
              );
            })}
          </div>
        }
      />
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        {tab === "CREATE" ? <UnitCreationTab /> : <NetworkControlTab />}
      </motion.div>
    </main>
  );
}
