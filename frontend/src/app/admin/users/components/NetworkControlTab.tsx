import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, User, Power, Key, LayoutDashboard, Terminal, Cpu, Database, Settings2 } from "lucide-react";
import { CyberTypography } from "./CyberTypography";
import styles from "../Nexus.module.css";

const MODULES = [
  { id: "tableau", label: "Tableau de Tâches", icon: LayoutDashboard },
  { id: "analyse", label: "Analyse Data", icon: Terminal },
  { id: "facture", label: "Facturation", icon: Cpu },
  { id: "ventilation", label: "Ventilation", icon: Database },
  { id: "parametrage", label: "Paramétrage", icon: Settings2 },
];

export default function NetworkControlTab() {
  const [pilots, setPilots] = useState<any[]>([]);
  const [selectedPilot, setSelectedPilot] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchPilots = async () => {
    try {
      const res = await fetch("/api/users/pilots");
      if (res.ok) setPilots(await res.json());
    } catch (e) {}
  };

  useEffect(() => { fetchPilots(); }, []);

  const handleToggleStatus = async () => {
    if(!selectedPilot) return;
    try {
      const res = await fetch(`/api/users/${selectedPilot.id}/toggle-status`, { method: "PATCH" });
      if (res.ok) {
        setSelectedPilot({ ...selectedPilot, active: !selectedPilot.active });
        fetchPilots();
      }
    } catch (e) {}
  };

  const handleResetPassword = async () => {
    if (!selectedPilot || !newPassword) return;
    try {
      const res = await fetch(`/api/users/${selectedPilot.id}/reset-password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }),
      });
      if (res.ok) { setNewPassword(""); alert("Password Overriden!"); }
    } catch (e) {}
  };

  const handleTogglePermission = async (moduleId: string) => {
    if (!selectedPilot) return;
    const updated = { ...(selectedPilot.permissions || {}), [moduleId]: !(selectedPilot.permissions?.[moduleId] || false) };
    try {
      const res = await fetch(`/api/users/${selectedPilot.id}/permissions`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated),
      });
      if (res.ok) {
        setSelectedPilot({ ...selectedPilot, permissions: updated });
        setPilots(pilots.map(p => p.id === selectedPilot.id ? { ...p, permissions: updated } : p));
      }
    } catch (e) {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.controlGrid}>
      
      {/* SIDEBAR */}
      <div className={styles.rosterPanel}>
        <div className={styles.rosterHeader}>
          <Users size={18}/> ACTIVE ROSTER
        </div>
        <div className={`${styles.pilotList} ${styles.customScroll}`}>
          {pilots.map((p) => (
            <div 
              key={p.id} onClick={() => { setSelectedPilot(p); }}
              className={`${styles.pilotItem} ${selectedPilot?.id === p.id ? styles.pilotItemActive : ''}`}
            >
              <div className={styles.pilotInfo}>
                <div className={styles.pilotIcon}><User size={18}/></div>
                <span className={styles.pilotName}>{p.username}</span>
              </div>
              <div className={`${styles.statusDot} ${p.active ? styles.dotOn : styles.dotOff}`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN DECK */}
      <div className={styles.deckPanel}>
        {!selectedPilot ? (
          <div className={styles.deckEmpty}>SELECT TARGET ID</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{display:'flex', flexDirection:'column', gap:'2.5rem'}}>
            
            <div className={styles.deckHeader}>
              <div>
                <h2 className={styles.targetName}>{selectedPilot.username}</h2>
                <p className={styles.targetRole}>SYS_ROLE: {selectedPilot.role} | ID: {selectedPilot.id}</p>
              </div>
              <button 
                onClick={handleToggleStatus} 
                className={`${styles.actionBtn} ${selectedPilot.active ? styles.btnKill : styles.btnRevive}`}
              >
                <Power size={18} /> {selectedPilot.active ? 'KILL SWITCH' : 'REVIVE'}
              </button>
            </div>

            <div>
              <CyberTypography>SECURITY_OVERRIDE</CyberTypography>
              <div className={styles.overrideFlex}>
                <div className={styles.inputWrapper} style={{flex: 1}}>
                  <Key className={styles.inputIcon} size={20} />
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.cyberInput} placeholder="INJECT NEW KEY..." />
                </div>
                <button onClick={handleResetPassword} className={`${styles.actionBtn} ${styles.btnForce}`}>FORCE</button>
              </div>
            </div>

            <div>
              <CyberTypography>GRANULAR_MATRIX_CONTROL</CyberTypography>
              <div className={styles.matrixGrid}>
                {MODULES.map(mod => {
                  const hasAccess = selectedPilot.permissions?.[mod.id] || false;
                  return (
                    <div key={mod.id} className={`${styles.moduleCard} ${hasAccess ? styles.moduleCardOn : ''}`}>
                      <div className={styles.moduleInfo}>
                        <mod.icon size={22} className={styles.moduleIcon} />
                        <span className={styles.moduleLabel}>{mod.label}</span>
                      </div>
                      
                      <div onClick={() => handleTogglePermission(mod.id)} className={`${styles.cyberToggle} ${hasAccess ? styles.cyberToggleOn : ''}`}>
                        <div className={styles.toggleKnob}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </motion.div>
  );
}