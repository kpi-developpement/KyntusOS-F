"use client";
import React, { useState, useEffect } from 'react';
import SmartTable from './SmartTable';
import FileUploadModal from '../ui/FileUploadModal';
import styles from '../recorde.module.css';

// 🔥 LE CERVEAU: Bypassing l-Proxy ghir f l-Upload 🔥
const IS_DEV = process.env.NODE_ENV === 'development';
const UPLOAD_API_URL = IS_DEV ? 'http://localhost:8082' : 'http://kyntusos.kyntus.fr:8082';

export default function RecordDashboard() {
  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // N.B: L'ID dyal l'pilote khasso yji mn l'Auth Context (JWT). Hna dert 1 pour le test.
  const PILOT_ID = 1; 

  const fetchRecords = async () => {
    try {
      // Hada kayb9a y-hder m3a Proxy /api/ 7it ghir requete JSON sghira
      const res = await fetch(`/api/pilot-records/${PILOT_ID}`);
      const data = await res.json();
      setRecords(data);
    } catch (error) {
      console.error("Erreur fetching data:", error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 🔥 L-URL DYNAMIQUE BLA PROXY BACH T-DOWEZ DEFC7A KBIRA 🔥
      const res = await fetch(`${UPLOAD_API_URL}/api/pilot-records/import/${PILOT_ID}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert("Fichier importé et traité avec succès !");
        fetchRecords(); // Rafraîchir le tableau automatiquement
      } else {
        const errorText = await res.text();
        alert("Erreur: " + errorText);
      }
    } catch (error) {
      console.error("Erreur upload:", error);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.headerArea}>
        <div>
          <h1 className={styles.title}>Mes Données Terrain</h1>
          <p className={styles.subtitle}>Gestion intelligente des versions et déduplication.</p>
        </div>
        <button className={styles.actionBtn} onClick={() => setIsModalOpen(true)}>
          + Nouvel Import Excel
        </button>
      </div>

      <div className={styles.tableCard}>
        <SmartTable data={records} />
      </div>

      <FileUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUpload={handleUpload} 
      />
    </div>
  );
}