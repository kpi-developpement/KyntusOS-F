"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

// 🔥 L-Import dyal l-Background l-Jdid Hna 🔥
import RoyalMatrixBG from "./components/RoyalMatrixBG";

import { GlitchHeader } from "./components/CyberTypography";
import UnitCreationTab from "./components/UnitCreationTab";
import NetworkControlTab from "./components/NetworkControlTab";
import styles from "./Nexus.module.css"; 

export default function UserManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CREATE' | 'MANAGE'>('CREATE');

  // Sécurité
  if (user?.role !== "ADMIN") {
    return (
      <div style={{
        minHeight: '100vh', 
        background:'#010308', 
        display:'flex', 
        alignItems:'center', 
        justifyContent:'center', 
        color:'red', 
        fontFamily:'monospace', 
        fontSize:'2rem', 
        letterSpacing:'0.5em'
      }}>
        ACCESS DENIED
      </div>
    );
  }

  return (
    <div className={styles.nexusWrapper}>
      
      {/* L-Background Interactive */}
      <RoyalMatrixBG />

      <motion.div 
        className={styles.glassCard}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className={styles.scannerLine}></div>

        {/* HEADER CONTENEUR PURE CSS */}
        <div className={styles.headerContainer}>
          <GlitchHeader title="NEXUS_COMMAND" subtitle="OVERSEER PROTOCOL ACTIVE // K-OS v.2080" />
          
          <div className={styles.tabsContainer}>
            <button 
              onClick={() => setActiveTab('CREATE')} 
              className={`${styles.tabBtn} ${activeTab === 'CREATE' ? styles.tabBtnActive : ''}`}
            >
              <UserPlus size={18} /> INITIALIZE
            </button>
            <button 
              onClick={() => setActiveTab('MANAGE')} 
              className={`${styles.tabBtn} ${activeTab === 'MANAGE' ? styles.tabBtnActive : ''}`}
            >
              <Users size={18} /> NETWORK_CTRL
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
          {activeTab === 'CREATE' ? <UnitCreationTab /> : <NetworkControlTab />}
        </div>

      </motion.div>
    </div>
  );
}