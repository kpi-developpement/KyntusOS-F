"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Info, Terminal } from "lucide-react";
import styles from "./Toaster.module.css";

// Hack Global Event Bus
export const toast = (detail: { message: string, type: 'success' | 'error' | 'info' }) => {
  const event = new CustomEvent('kyntus-toast', { detail });
  window.dispatchEvent(event);
};

export default function Toaster() {
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handleToast = (e: any) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { ...e.detail, id }]);

      // Auto remove après 4s (correspond à l'animation CSS)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('kyntus-toast', handleToast);
    return () => window.removeEventListener('kyntus-toast', handleToast);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: string) => {
    switch(type) {
        case 'success': return <CheckCircle2 size={24} color="#39ff14" />;
        case 'error': return <AlertTriangle size={24} color="#ff0055" />;
        default: return <Info size={24} color="#00f2ea" />;
    }
  };

  const getTitle = (type: string) => {
      switch(type) {
          case 'success': return "OPÉRATION RÉUSSIE";
          case 'error': return "ERREUR CRITIQUE";
          default: return "NOUVELLE NOTIFICATION";
      }
  };

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          
          {/* ICON AREA */}
          <div className={styles.iconSection}>
             {getIcon(t.type)}
          </div>

          {/* TEXT AREA */}
          <div className={styles.content}>
             <div className={styles.title}>
                <Terminal size={12} style={{marginRight: 5}}/>
                {getTitle(t.type)}
             </div>
             <div className={styles.message}>{t.message}</div>
          </div>

          {/* CLOSE BTN */}
          <button onClick={() => removeToast(t.id)} className={styles.closeBtn}>
             <X size={18}/>
          </button>

          {/* TIMER BAR */}
          <div className={styles.progressBar}></div>
        </div>
      ))}
    </div>
  );
}