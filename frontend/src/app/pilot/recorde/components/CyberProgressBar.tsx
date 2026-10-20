import React from 'react';

interface CyberProgressBarProps {
  progress: number;
  statusText: string;
}

export default function CyberProgressBar({ progress, statusText }: CyberProgressBarProps) {
  const isComplete = progress === 100;

  return (
    <div style={{ 
      width: "100%", 
      padding: "1.25rem 1.5rem", 
      backgroundColor: "#ffffff", 
      border: "1px solid #bfdbfe", 
      borderRadius: "12px",
      boxShadow: "0 8px 24px -4px rgba(37, 99, 235, 0.08)",
      marginTop: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      {/* HEADER: TITRE ET POURCENTAGE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ 
          color: "#1e40af", 
          fontFamily: "'Inter', -apple-system, sans-serif", 
          fontSize: "0.82rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          {statusText}
        </span>
        <span style={{ 
          color: isComplete ? "#059669" : "#2563eb", 
          fontFamily: "'Inter', -apple-system, sans-serif", 
          fontSize: "1.65rem", 
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums"
        }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* BARRE DE PROGRESSION HAUTE PERFORMANCE */}
      <div style={{ 
        width: "100%", 
        height: "12px", 
        backgroundColor: "#eff6ff", 
        borderRadius: "999px", 
        overflow: "hidden",
        border: "1px solid #dbeafe",
        position: "relative"
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: isComplete 
            ? "linear-gradient(90deg, #10b981, #059669)" 
            : "linear-gradient(90deg, #3b82f6, #2563eb, #0284c7)",
          borderRadius: "999px",
          transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease",
          position: "relative"
        }}>
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent)",
            backgroundSize: "1rem 1rem",
            animation: "move-stripes 0.8s linear infinite",
            opacity: isComplete ? 0 : 1
          }} />
        </div>
      </div>

      {/* METADATA FOOTER */}
      <div style={{
        color: "#64748b",
        fontFamily: "monospace",
        fontSize: "0.72rem",
        fontWeight: 600,
        marginTop: "2px",
        display: "flex",
        justifyContent: "space-between"
      }}>
        <span>SYS.UPLOAD.PROTOCOL_V2</span>
        <span style={{ color: isComplete ? "#059669" : "#2563eb" }}>
          {isComplete ? "PROCESS_COMPLETE" : "SYNCHRONIZING_STREAM..."}
        </span>
      </div>

      <style>{`
        @keyframes move-stripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}