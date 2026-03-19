import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Activity } from 'lucide-react';

export default function ParametrageDropzone({ onFileSelect, isProcessing }: any) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      onClick={() => !isProcessing && fileInputRef.current?.click()}
      style={{
        position: 'relative', overflow: 'hidden', cursor: isProcessing ? 'not-allowed' : 'pointer',
        border: isDragging ? '2px dashed #39ff14' : '2px dashed rgba(0, 240, 255, 0.4)',
        backgroundColor: isDragging ? 'rgba(57, 255, 20, 0.1)' : 'rgba(10, 15, 30, 0.6)',
        borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        boxShadow: isDragging ? '0 0 30px rgba(57, 255, 20, 0.2), inset 0 0 15px rgba(57, 255, 20, 0.1)' : '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* SCANNING LINE ANIMATION */}
      {isProcessing && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, transparent, #39ff14, transparent)', animation: 'scanline-vertical 2s linear infinite', boxShadow: '0 0 15px #39ff14' }}></div>
      )}

      <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleChange} disabled={isProcessing} />

      {isProcessing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <Activity size={60} color="#39ff14" style={{ animation: 'pulse-neon 1.5s infinite' }} />
          <h3 style={{ color: '#39ff14', fontFamily: 'monospace', margin: 0, letterSpacing: '2px', textShadow: '0 0 10px rgba(57,255,20,0.5)' }}>PROCESSING MATRIX...</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace', margin: 0 }}>Applying billing rules and generating secure output</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <UploadCloud size={60} color={isDragging ? "#39ff14" : "#00f0ff"} style={{ filter: isDragging ? "drop-shadow(0 0 15px #39ff14)" : "drop-shadow(0 0 10px rgba(0,240,255,0.5))", transition: 'all 0.3s ease' }} />
          <h3 style={{ color: isDragging ? '#39ff14' : '#e2e8f0', fontFamily: 'monospace', margin: 0, letterSpacing: '1px' }}>
            {isDragging ? "DROP TO INJECT PAYLOAD" : "DRAG & DROP 'Feuil1' EXCEL HERE"}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', fontFamily: 'monospace', margin: 0 }}>or click to browse your system</p>
        </div>
      )}

      <style>{`
        @keyframes scanline-vertical { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        @keyframes pulse-neon { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } }
      `}</style>
    </div>
  );
}