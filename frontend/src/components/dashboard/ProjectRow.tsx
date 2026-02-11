import React from 'react';
import { ChevronRight, Activity, ShieldCheck } from 'lucide-react';
import styles from './ProjectRow.module.css';

interface Props {
  project: any;
  isOpen: boolean;
  onToggle: () => void;
  pilotsData: any[];
  isLoadingPilots: boolean;
}

export default function ProjectRow({ project, isOpen, onToggle, pilotsData, isLoadingPilots }: Props) {
  // Logic couleur dynamique (Neon Palette)
  let color = "#00f0ff"; // Cyan (Standard)
  if (project.progress < 30) color = "#fbbf24"; // Gold (Warning)
  else if (project.progress > 80) color = "#10b981"; // Emerald (Good)

  return (
    <div className={styles.wrapper} style={{ "--p-color": color } as React.CSSProperties}>
      
      {/* === THE STRIP (MAIN ROW) === */}
      <div className={`${styles.row} ${isOpen ? styles.active : ''}`} onClick={onToggle}>
        
        {/* COL 1: INFO */}
        <div className="flex flex-col gap-1 min-w-[220px]">
           <span className={styles.title}>{project.templateName}</span>
           <div className={styles.meta}>
              <span className={styles.metaTag}>ID: {project.templateId}</span>
              <span className={styles.metaTag}>{project.totalTasks} TASKS</span>
           </div>
        </div>
        
        {/* COL 2: PLASMA BAR */}
        <div className={styles.barContainer}>
           <div className={styles.barLabel}>
              <span>System Integrity</span>
              <span style={{color}}>{project.progress}%</span>
           </div>
           <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${project.progress}%` }}></div>
           </div>
        </div>

        {/* COL 3: STATS PILLS */}
        <div className={styles.statsGroup}>
           <div className={styles.statPill}>
              <span className={styles.statVal} style={{color: '#00f0ff'}}>{project.countActive}</span>
              <span className={styles.statLabel}>ACTIVE</span>
           </div>
           <div className={styles.statPill}>
              <span className={styles.statVal} style={{color: '#10b981'}}>{project.countValid}</span>
              <span className={styles.statLabel}>SECURE</span>
           </div>
        </div>

        {/* COL 4: TRIGGER */}
        <div className={styles.chevronBox} style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
           <ChevronRight size={20} color={color} />
        </div>
      </div>

      {/* === THE VAULT (EXPANDED) === */}
      <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
         <div className={styles.grid}>
            {pilotsData?.map((p: any) => (
               <div key={p.pilotId} className={styles.pilotCard}>
                  {/* Pilot Head */}
                  <div className={styles.pHeader}>
                     <div className={styles.pAvatar}>{p.pilotName.substring(0,2).toUpperCase()}</div>
                     <div className="flex flex-col">
                        <span className={styles.pName}>{p.pilotName}</span>
                        <span className={styles.pRole}>OPERATOR • CLASS A</span>
                     </div>
                  </div>
                  
                  {/* Mini Bar */}
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                     <div className="h-full" style={{ width: `${p.completionRate}%`, background: color }}></div>
                  </div>

                  {/* Stats Grid */}
                  <div className={styles.pStatsGrid}>
                     <div className={styles.psItem}>
                        <div className={styles.psLbl}>TODO</div>
                        <div className={styles.psVal} style={{color:'#fbbf24'}}>{p.todoCount}</div>
                     </div>
                     <div className={styles.psItem}>
                        <div className={styles.psLbl}>ACT</div>
                        <div className={styles.psVal} style={{color:'#00f0ff'}}>{p.inProgressCount}</div>
                     </div>
                     <div className={styles.psItem}>
                        <div className={styles.psLbl}>DONE</div>
                        <div className={styles.psVal} style={{color:'#a855f7'}}>{p.doneCount}</div>
                     </div>
                     <div className={styles.psItem}>
                        <div className={styles.psLbl}>VAL</div>
                        <div className={styles.psVal} style={{color:'#10b981'}}>{p.validCount}</div>
                     </div>
                  </div>
               </div>
            ))}
            
            {/* Loading State */}
            {isLoadingPilots && !pilotsData && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center gap-3 text-cyan-500 opacity-80">
                    <Activity className="animate-spin" size={24} />
                    <span className="font-mono text-xs tracking-widest animate-pulse">DECRYPTING DATA STREAM...</span>
                </div>
            )}
            
            {/* Empty State */}
            {!isLoadingPilots && pilotsData && pilotsData.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500 font-mono text-xs">
                    NO ACTIVE UNITS DETECTED IN THIS SECTOR.
                </div>
            )}
         </div>
      </div>
    </div>
  );
}