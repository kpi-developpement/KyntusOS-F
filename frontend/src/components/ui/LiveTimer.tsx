"use client";

import { useEffect, useState } from "react";

interface LiveTimerProps {
  startTime?: string;       // Date ISO (lastStartedAt)
  cumulativeSeconds?: number; // Temps déjà passé avant (cumulativeTimeSeconds)
}

export default function LiveTimer({ startTime, cumulativeSeconds = 0 }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(cumulativeSeconds);

  useEffect(() => {
    // Si pas de startTime (pas en cours), on affiche juste le cumulé fixe
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diffSeconds = Math.floor((now - start) / 1000);
      setElapsed(cumulativeSeconds + diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, cumulativeSeconds]);

  // Format MM:SS
  const format = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace",
      color: "#39ff14",
      fontWeight: "bold",
      fontSize: "0.9rem",
      display: "flex",
      alignItems: "center",
      gap: "5px",
      background: "rgba(57, 255, 20, 0.1)",
      padding: "2px 8px",
      borderRadius: "4px",
      border: "1px solid rgba(57, 255, 20, 0.3)",
      boxShadow: "0 0 10px rgba(57, 255, 20, 0.1)"
    }}>
      <span style={{width: 6, height: 6, background: "#39ff14", borderRadius: "50%", display: "inline-block", animation: "pulse 1s infinite"}}></span>
      {format(elapsed)}
    </span>
  );
}