"use client";

import PilotStatsGrid from "@/components/features/PilotStatsGrid";
import InteractiveBackground from "@/components/ui/InteractiveBackground"; // ✅
import { useRouter } from "next/navigation";

export default function TeamStatsPage() {
  const router = useRouter();

  return (
    <div style={{ padding: "40px", minHeight: "100vh", position: "relative", zIndex: 1, backgroundColor: "rgba(2,4,10,0.85)" }}>
      
      {/* BACKGROUND ACTIF */}
      <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:-1, pointerEvents:'none', opacity: 0.6}}>
          <InteractiveBackground />
      </div>

      <div style={{ marginBottom: "30px", display: "flex", alignItems: "center", gap: "15px" }}>
        <button 
            onClick={() => router.back()}
            style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "white", padding: "10px 15px", borderRadius: "10px", cursor: "pointer",
                fontSize: "1.2rem"
            }}
        >
            ←
        </button>
        <h1 style={{ margin: 0, fontSize: "1rem", color: "#666", textTransform:"uppercase", letterSpacing:2 }}>Dashboard / Performance</h1>
      </div>

      <PilotStatsGrid />
      
    </div>
  );
}