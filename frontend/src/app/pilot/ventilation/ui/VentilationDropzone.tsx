import React, { useRef } from 'react';
import { UploadCloud, Activity } from 'lucide-react';

export default function VentilationDropzone({ onFileUpload, isProcessing, year, month }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div 
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      style={{
        border: '2px dashed rgba(0, 240, 255, 0.4)', backgroundColor: 'rgba(10, 15, 30, 0.6)', borderRadius: '12px', padding: '4rem 2rem', textAlign: 'center', cursor: isProcessing ? 'wait' : 'pointer', transition: 'all 0.3s', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)'
      }}
    >
      <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={onFileUpload} disabled={isProcessing} />
      
      {isProcessing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <Activity size={50} color="#00f0ff" style={{ animation: 'pulse 1s infinite' }} />
          <h3 style={{ color: '#00f0ff', fontFamily: 'monospace', margin: 0, letterSpacing: '2px' }}>UPLOADING TO NEXUS CORE...</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <UploadCloud size={50} color="#38bdf8" />
          <h3 style={{ color: '#e2e8f0', fontFamily: 'monospace', margin: 0 }}>
            DROP FINANCIAL DATA FOR <span style={{ color: '#00f0ff' }}>{year}-M{month < 10 ? `0${month}` : month}</span>
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace', margin: 0 }}>.xlsx files supported (TCD, PPD, Contrat Qualité)</p>
        </div>
      )}
    </div>
  );
}