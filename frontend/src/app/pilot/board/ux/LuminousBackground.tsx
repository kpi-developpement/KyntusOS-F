"use client";

import React, { useEffect, useRef } from "react";

export default function LuminousBackground() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (blobRef.current) {
        blobRef.current.animate(
          { left: `${e.clientX}px`, top: `${e.clientY}px` },
          { duration: 3000, fill: "forwards" }
        );
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1, overflow: "hidden", backgroundColor: "#020617" }}>
      <div
        ref={blobRef}
        style={{
          position: "absolute", width: "1000px", height: "1000px",
          background: "linear-gradient(to right, #00f0ff, #b026ff)",
          borderRadius: "50%", filter: "blur(180px)", opacity: 0.5,
          transform: "translate(-50%, -50%)", animation: "spinBlob 15s linear infinite",
        }}
      />
      <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(60px)", backgroundColor: "rgba(2, 6, 23, 0.4)" }} />
      <style>{`
        @keyframes spinBlob {
          from { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.2); }
          to { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
}