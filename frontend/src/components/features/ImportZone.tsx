"use client";

import React, { useState, useRef } from "react";
import styles from "./ImportZone.module.css";

interface ImportZoneProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export default function ImportZone({ onFileSelect, isLoading }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`${styles.container} ${isDragging ? styles.active : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={inputRef}
        className={styles.hiddenInput}
        accept=".xlsx, .xls"
        onChange={handleInputChange}
        disabled={isLoading}
      />
      
      <div className={styles.icon}>📂</div>
      <div className={styles.text}>
        {isLoading ? "Import en cours..." : "Glissez votre fichier Excel ici"}
      </div>
      <div className={styles.subtext}>ou cliquez pour parcourir</div>
      
      {isLoading && <div style={{ marginTop: "15px", color: "#00f3ff" }}>⏳ Traitement...</div>}
    </div>
  );
}