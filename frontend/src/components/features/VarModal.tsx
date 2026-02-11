"use client";

import { useState } from "react";
import { X, ShieldAlert, CheckCircle } from "lucide-react";
import styles from "./VarModal.module.css"; // On va créer ce CSS juste après

interface VarModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilotName: string;
  onSubmit: (points: number, reason: string) => void;
}

export default function VarModal({ isOpen, onClose, pilotName, onSubmit }: VarModalProps) {
  const [points, setPoints] = useState<string>("0");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(parseInt(points), reason);
    setPoints("0");
    setReason("");
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>⚖️ VAR DECISION</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={20}/></button>
        </div>
        
        <div className={styles.body}>
          <p className={styles.target}>CIBLE : <span style={{color:"#00f2ea"}}>{pilotName}</span></p>
          
          <div className={styles.inputGroup}>
            <label>AJUSTEMENT POINTS (+/-)</label>
            <input 
              type="number" 
              className={styles.input} 
              value={points} 
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Ex: 50 ou -20"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>JUSTIFICATION (OBLIGATOIRE)</label>
            <textarea 
              className={styles.textarea} 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Intervention rapide sur PBO-12..."
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.confirmBtn} onClick={handleSubmit} disabled={!points || !reason}>
            <CheckCircle size={18} /> CONFIRMER SANCTION/BONUS
          </button>
        </div>
      </div>
    </div>
  );
}