import React from 'react';

interface CyberProgressBarProps {
  progress: number;
  statusText: string;
}

export default function CyberProgressBar({ progress, statusText }: CyberProgressBarProps) {
  return (
    <div style={{ 
      width: "100%", 
      padding: "1.5rem", 
      backgroundColor: "rgba(15, 23, 42, 0.8)", 
      border: "1px solid #0ff", 
      borderRadius: "8px",
      boxShadow: "0 0 15px rgba(0, 255, 255, 0.2) inset",
      marginTop: "1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    }}>
      {/* HEADER: TITRE ET POURCENTAGE */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ 
          color: "#0ff", 
          fontFamily: "monospace", 
          fontSize: "0.9rem",
          textTransform: "uppercase",
          letterSpacing: "1px",
          textShadow: "0 0 5px #0ff"
        }}>
          {statusText}
        </span>
        <span style={{ 
          color: progress === 100 ? "#39ff14" : "#0ff", 
          fontFamily: "monospace", 
          fontSize: "2rem", 
          fontWeight: "bold",
          textShadow: progress === 100 ? "0 0 10px #39ff14" : "0 0 10px #0ff"
        }}>
          {Math.round(progress)}%
        </span>
      </div>

      {/* LA BARRE DE PROGRESSION HBIILA */}
      <div style={{ 
        width: "100%", 
        height: "20px", 
        backgroundColor: "#020617", 
        borderRadius: "10px", 
        overflow: "hidden",
        border: "1px solid #334155",
        position: "relative"
      }}>
        {/* L'EFFET DE CHARGEMENT (SAIYAN KI / NEON) */}
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: progress === 100 
            ? "linear-gradient(90deg, #10b981, #39ff14)" 
            : "linear-gradient(90deg, #3b82f6, #0ff)",
          boxShadow: progress === 100 
            ? "0 0 10px #39ff14, 0 0 20px #39ff14" 
            : "0 0 10px #0ff, 0 0 20px #0ff",
          transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease",
          position: "relative"
        }}>
          {/* LIGNES DE VITESSE (SPEED LINES EFFECT) */}
          <div style={{
            content: '""',
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)",
            backgroundSize: "1rem 1rem",
            animation: "move-stripes 1s linear infinite",
            opacity: progress === 100 ? 0 : 1
          }}></div>
        </div>
      </div>

      {/* LIGNE DE CODE STYLE "MATRIX" */}
      <div style={{
        color: "#64748b",
        fontFamily: "monospace",
        fontSize: "0.75rem",
        marginTop: "5px",
        display: "flex",
        justifyContent: "space-between"
      }}>
        <span>SYS.UPLOAD.PROTOCOL_V2</span>
        <span>{progress === 100 ? "PROCESS_COMPLETE" : "WAITING_RESPONSE..."}</span>
      </div>

      {/* ANIMATION INLINE (Pour les rayures qui bougent) */}
      <style>{`
        @keyframes move-stripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}