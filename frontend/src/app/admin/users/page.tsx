"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  UserPlus, Shield, User, Save, CheckCircle, XCircle, 
  Cpu, Terminal, ScanFace 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Users.module.css";

export default function UserManagementPage() {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "PILOT",
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      // Simulation d'un petit délai pour l'effet "Processing"
      await new Promise(r => setTimeout(r, 800));

      const res = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus({ type: 'success', msg: `>> SYSTEM SUCCESS: UNIT [${formData.username}] DEPLOYED.` });
        setFormData({ username: "", password: "", role: "PILOT" });
      } else {
        const text = await res.text();
        setStatus({ type: 'error', msg: `>> SYSTEM ERROR: ${text}` });
      }
    } catch (error) {
      setStatus({ type: 'error', msg: ">> FATAL ERROR: CONNECTION LOST." });
    } finally {
      setLoading(false);
    }
  };

  // UI Protection
  if (user?.role !== "ADMIN") {
    return (
      <div className={styles.wrapper}>
        <div className="text-red-500 font-bold text-2xl animate-pulse">
          ACCESS DENIED [403]
        </div>
      </div>
    );
  }

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.5, staggerChildren: 0.1 } 
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  return (
    <div className={styles.wrapper}>
      {/* Background Grid */}
      <div className={styles.gridBackground}></div>

      <motion.div 
        className={styles.holoCard}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className={styles.headerTitle}>
            <Terminal className="inline-block mr-3 mb-1" size={32} />
            USER_CREATION_PROTOCOL
          </h1>
          <span className={styles.headerSubtitle}>
            SECURE CHANNEL // ADMIN ACCESS ONLY // v.2080
          </span>
        </motion.div>

        <form onSubmit={handleSubmit}>
          {/* Inputs Grid */}
          <div className={styles.formGrid}>
            <motion.div className={styles.inputGroup} variants={itemVariants}>
              <label className={styles.label}>Identity Handle (Username)</label>
              <User className={styles.icon} size={18} />
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={styles.inputField}
                placeholder="ex: AGENT_007"
                autoComplete="off"
              />
            </motion.div>

            <motion.div className={styles.inputGroup} variants={itemVariants}>
              <label className={styles.label}>Access Key (Password)</label>
              <Cpu className={styles.icon} size={18} />
              <input
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={styles.inputField}
                placeholder="********"
                autoComplete="off"
              />
            </motion.div>
          </div>

          {/* Role Selection */}
          <motion.div variants={itemVariants}>
            <label className={styles.label} style={{display:'block', marginBottom:'10px'}}>
              Assigned Clearance Level
            </label>
            <div className={styles.roleContainer}>
              <div 
                onClick={() => setFormData({ ...formData, role: "PILOT" })}
                className={`${styles.roleCard} ${formData.role === "PILOT" ? styles.active : ""}`}
              >
                <ScanFace size={32} className={styles.roleIcon} />
                <span className="font-bold tracking-widest text-cyan-400">UNIT: PILOT</span>
                <span className="text-[10px] text-gray-400 mt-1">OPERATIONAL TASKS ONLY</span>
              </div>

              <div 
                onClick={() => setFormData({ ...formData, role: "ADMIN" })}
                className={`${styles.roleCard} ${formData.role === "ADMIN" ? styles.activeAdmin : ""}`}
              >
                <Shield size={32} className={styles.roleIcon} />
                <span className="font-bold tracking-widest text-purple-400">UNIT: OVERSEER</span>
                <span className="text-[10px] text-gray-400 mt-1">FULL SYSTEM CONTROL</span>
              </div>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            className={styles.submitBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variants={itemVariants}
            disabled={loading}
          >
            {loading ? "INITIALIZING UPLOAD..." : "EXECUTE CREATION"}
          </motion.button>

          {/* Feedback Message */}
          <AnimatePresence>
            {status && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`${styles.statusMessage} ${status.type === 'success' ? styles.success : styles.error}`}
              >
                <div className="flex items-center gap-2">
                  {status.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span className="font-mono">{status.msg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </form>
      </motion.div>
    </div>
  );
}