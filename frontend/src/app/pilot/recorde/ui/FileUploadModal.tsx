"use client";
import React, { useState } from 'react';
import { UploadCloud, X } from 'lucide-react';
import styles from '../recorde.module.css';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

export default function FileUploadModal({ isOpen, onClose, onUpload }: FileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    await onUpload(file);
    setIsUploading(false);
    setFile(null);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        <div className={styles.modalHeader}>
          <UploadCloud size={32} className={styles.modalIcon} />
          <h2>Importer vos données (Excel)</h2>
        </div>
        <div className={styles.modalBody}>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
            className={styles.fileInput}
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className={styles.fileLabel}>
            {file ? file.name : "Cliquez pour choisir un fichier Excel"}
          </label>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isUploading}>Annuler</button>
          <button className={styles.uploadBtn} onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "Importation..." : "Confirmer l'import"}
          </button>
        </div>
      </div>
    </div>
  );
}