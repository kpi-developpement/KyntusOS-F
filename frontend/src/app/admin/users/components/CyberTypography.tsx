import { motion } from "framer-motion";
import styles from "../Nexus.module.css";

export const GlitchHeader = ({ title, subtitle }: { title: string, subtitle: string }) => {
  return (
    <div style={{ marginBottom: '0' }}>
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={styles.glitchTitle}
      >
        {title}
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={styles.glitchSubtitle}
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export const CyberTypography = ({ children }: { children: React.ReactNode }) => (
  <label className={styles.cyberLabel}>
    {children}
  </label>
);