"use client";

import React, { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { Settings, X, Cpu } from "lucide-react";
import styles from "./CyberMatrixBackground.module.css";

export default function CyberMatrixBackground() {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Simulation Params
  const [intensity, setIntensity] = useState(40);
  const [speed, setSpeed] = useState(50);
  const [density, setDensity] = useState(60);
  const [motionStyle, setMotionStyle] = useState("vibrate");
  const [mouseTrail, setMouseTrail] = useState(true);

  const gridRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const [grid, setGrid] = useState({ columns: 0, rows: 0 });
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  // 📐 Calculation Logic
  useEffect(() => {
    const calculateGrid = () => {
      const size = 130 - (density * 0.9); 
      const columns = Math.ceil(window.innerWidth / size);
      const rows = Math.ceil(window.innerHeight / size);
      setGrid({ columns, rows });
    };
    calculateGrid();
    window.addEventListener("resize", calculateGrid);
    return () => window.removeEventListener("resize", calculateGrid);
  }, [density]);

  // 🎬 Motion Engine (v4 animate)
  useEffect(() => {
    if (animationRef.current) animationRef.current.pause();

    const targets = gridRef.current?.querySelectorAll(".matrix-sq");
    if (!targets || targets.length === 0) return;

    const duration = 6000 - (speed * 45);
    const amp = intensity / 2;

    const options: any = {
      duration: duration,
      easing: "inOutSine",
      alternate: true,
      loop: true,
    };

    if (motionStyle === "vibrate") {
      options.x = () => (Math.random() - 0.5) * amp * 2.5;
      options.y = () => (Math.random() - 0.5) * amp * 2.5;
      options.scale = () => (100 + (Math.random() - 0.5) * intensity) / 100;
    } else if (motionStyle === "pulse") {
      options.scale = [1, 1 + (intensity / 100)];
      options.opacity = [0.2, 0.7];
    } else if (motionStyle === "wave") {
      options.y = [0, amp];
    }

    animationRef.current = animate(targets, options);

    return () => {
      if (animationRef.current) animationRef.current.pause();
    };
  }, [grid, intensity, speed, motionStyle]);

  return (
    <div 
      className={styles.container} 
      onMouseMove={(e) => mouseTrail && setMousePos({ x: e.clientX, y: e.clientY })}
    >
      {/* 🖱️ Radar Glow */}
      <div style={{
        position: "fixed", top: mousePos.y - 150, left: mousePos.x - 150,
        width: 300, height: 300, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(circle, rgba(0, 255, 136, 0.08) 0%, transparent 70%)",
        filter: "blur(40px)", transition: "top 0.15s ease-out, left 0.15s ease-out"
      }} />

      {/* 🕸️ The Matrix Grid */}
      <div 
        ref={gridRef} 
        className={styles.cyberMatrixCanvas}
        style={{ 
          display: "grid", 
          gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
          width: "100%", height: "100vh"
        }}
      >
        {Array.from({ length: grid.columns * grid.rows }).map((_, i) => {
          const rand = Math.random();
          let bg = "transparent";
          if (rand > 0.9) bg = "rgba(0, 255, 136, 0.15)"; // Green
          else if (rand > 0.6) bg = "rgba(255, 255, 255, 0.05)"; // White

          return (
            <div key={i} className="matrix-sq" style={{
              border: "1px solid rgba(255, 255, 255, 0.02)",
              backgroundColor: bg,
              width: "100%", height: "100%"
            }} />
          );
        })}
      </div>

      {/* ⚙️ THE SMART MODIFIER WRAPPER */}
      <div className={styles.controlsWrapper}>
        {!isExpanded ? (
          <button 
            className={styles.triggerBtn} 
            onClick={() => setIsExpanded(true)}
            title="Open Matrix Settings"
          >
            <Settings size={24} />
          </button>
        ) : (
          <div className={styles.controlsPanel}>
            <button className={styles.closeBtn} onClick={() => setIsExpanded(false)}>
              <X size={18} />
            </button>
            
            <h4><Cpu size={14} style={{marginRight: 8}}/> CORE_MATRIX_v4</h4>
            
            <div className={styles.controlItem}>
              <label>Intensity <span>{intensity}%</span></label>
              <input type="range" min="0" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))} />
            </div>

            <div className={styles.controlItem}>
              <label>Speed <span>{speed}%</span></label>
              <input type="range" min="0" max="100" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </div>

            <div className={styles.controlItem}>
              <label>Density <span>{density}%</span></label>
              <input type="range" min="20" max="100" value={density} onChange={e => setDensity(Number(e.target.value))} />
            </div>

            <div className={styles.controlItem}>
              <label>Motion Logic</label>
              <select value={motionStyle} onChange={e => setMotionStyle(e.target.value)}>
                <option value="vibrate">Chaos Vibrate</option>
                <option value="pulse">Neural Pulse</option>
                <option value="wave">Data Wave</option>
              </select>
            </div>

            <div className={styles.controlItem} style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: '5px'}}>
              <label>Mouse Radar</label>
              <input type="checkbox" checked={mouseTrail} onChange={e => setMouseTrail(e.target.checked)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}