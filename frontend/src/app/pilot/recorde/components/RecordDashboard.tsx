"use client";
import React, { useState, useEffect } from 'react';
import SmartTable from './SmartTable';
import FileUploadModal from '../ui/FileUploadModal';
import styles from '../recorde.module.css';

export default function RecordDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const PILOT_ID = 1; 

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pilot-records/${PILOT_ID}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : (data.content || []));
    } catch (error) {
      console.error("Erreur fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const getUploadApiUrl = () => {
        if (typeof window !== 'undefined') {
          return `http://${window.location.hostname}:8082`;
        }
        return 'http://localhost:8082';
      };

      const UPLOAD_API_URL = getUploadApiUrl();

      const res = await fetch(`${UPLOAD_API_URL}/api/pilot-records/import/${PILOT_ID}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert("Fichier importé et traité avec succès !");
        fetchRecords(); 
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
        <SmartTable 
          data={records} 
          loading={loading}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalPages={1}
          totalItems={records.length}
        />
      </div>

      <FileUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUpload={handleUpload}
        onUploadSuccess={() => {
          setIsModalOpen(false);
          fetchRecords();
        }}
      />
    </div>
  );
}