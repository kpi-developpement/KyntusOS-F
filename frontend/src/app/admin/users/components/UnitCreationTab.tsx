import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Key, ScanFace, Shield, CheckCircle, XCircle } from "lucide-react";
import { CyberTypography } from "./CyberTypography";
import styles from "../Nexus.module.css";

export default function UnitCreationTab() {
  const [formData, setFormData] = useState({ username: "", password: "", role: "PILOT" });
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null); setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 800)); 
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setStatus({ type: 'success', msg: `[SUCCESS] UNIT ${formData.username} DEPLOYED.` });
        setFormData({ username: "", password: "", role: "PILOT" });
      } else {
        const data = await res.json();
        setStatus({ type: 'error', msg: `[ERROR] ${data.error}` });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: "[FATAL] CONNECTION LOST." });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.form variants={containerVariants} initial="hidden" animate="visible" onSubmit={handleSubmit}>
      
      <div className={styles.formGrid}>
        <motion.div variants={itemVariants} className={styles.inputWrapper}>
          <CyberTypography>IDENTITY_HANDLE</CyberTypography>
          <div style={{position: 'relative'}}>
            <Fingerprint className={styles.inputIcon} size={20} />
            <input 
              type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={styles.cyberInput} placeholder="AGENT_NAME" 
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className={styles.inputWrapper}>
          <CyberTypography>CLEARANCE_KEY</CyberTypography>
          <div style={{position: 'relative'}}>
            <Key className={styles.inputIcon} size={20} />
            <input 
              type="text" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={styles.cyberInput} placeholder="********" 
            />
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <CyberTypography>ASSIGN_RANK</CyberTypography>
        <div className={styles.roleGrid}>
          <motion.div 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setFormData({ ...formData, role: "PILOT" })} 
            className={`${styles.roleCard} ${formData.role === "PILOT" ? styles.roleCardActivePilot : ""}`}
          >
            <ScanFace size={48} />
            <span style={{letterSpacing:'0.2em', fontWeight:'bold'}}>PILOT</span>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setFormData({ ...formData, role: "ADMIN" })} 
            className={`${styles.roleCard} ${formData.role === "ADMIN" ? styles.roleCardActiveAdmin : ""}`}
          >
            <Shield size={48} />
            <span style={{letterSpacing:'0.2em', fontWeight:'bold'}}>OVERSEER</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.button 
        variants={itemVariants}
        disabled={loading}
        className={styles.deployBtn}
      >
        {loading ? "PROCESSING..." : "DEPLOY UNIT"}
      </motion.button>

      <AnimatePresence>
        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} 
            className={`${styles.statusBox} ${status.type === 'success' ? styles.statusSuccess : styles.statusError}`}
          >
            {status.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <span>{status.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}