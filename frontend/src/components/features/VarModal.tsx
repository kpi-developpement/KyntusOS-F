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
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={`Ajuster les points de ${pilotName}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Ajustement de points</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Fermer"><X size={18}/></button>
        </div>
        
        <div className={styles.body}>
          <p className={styles.target}>Pilote <b>{pilotName}</b></p>
          
          <div className={styles.inputGroup}>
            <label>Points (+ bonus / − pénalité)</label>
            <input 
              type="number" 
              className={styles.input} 
              value={points} 
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Ex: 50 ou -20"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Justification</label>
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
            <CheckCircle size={18} /> Appliquer {points && points !== "0" ? `${Number(points) > 0 ? "+" : ""}${points} pts` : "l'ajustement"}
          </button>
        </div>
      </div>
    </div>
  );
}