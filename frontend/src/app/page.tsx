"use client";

import { useEffect, useState, useCallback } from "react";
import { Layers, ChevronsDown } from "lucide-react";
import styles from "./page.module.css";
import AuthGuard from "@/components/layout/AuthGuard";
import AdminLoader from "@/components/ui/AdminLoader";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ProcessChart3D from "@/components/dashboard/3d-chart"; 

// Modular Components
import CommandHeader from "@/components/dashboard/CommandHeader";
import HudStats from "@/components/dashboard/HudStats";
import ProjectRow from "@/components/dashboard/ProjectRow";

export default function CommandPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pilotsData, setPilotsData] = useState<Record<number, any[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchDashboardData = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch("http://localhost:8080/api/stats/dashboard-summary");
      const d = await res.json();
      if (isInitial) {
        setTimeout(() => { setData(d); setLoading(false); setLastUpdate(new Date()); }, 500);
      } else {
        setData(d); setLastUpdate(new Date());
        if (expandedId) fetchPilotDetails(expandedId);
      }
    } catch (e) { console.error(e); setLoading(false); }
  }, [expandedId]);

  const fetchPilotDetails = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/stats/template/${id}/pilots`);
      const d = await res.json();
      setPilotsData(prev => ({...prev, [id]: d}));
    } catch(e) { console.error(e); }
  };

  useEffect(() => { setLastUpdate(new Date()); fetchDashboardData(true); }, []);

  useEffect(() => {
    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => { setIsConnected(true); stompClient.subscribe("/topic/workflow-events", (m) => { if(m.body==="TASK_UPDATE") fetchDashboardData(false); }); },
      onDisconnect: () => setIsConnected(false),
    });
    stompClient.activate();
    return () => stompClient.deactivate();
  }, [fetchDashboardData]);

  const toggleExpand = (id: number) => {
    if (expandedId === id) setExpandedId(null);
    else { setExpandedId(id); fetchPilotDetails(id); }
  };

  if (loading) return <AdminLoader />;

  return (
    <AuthGuard>
      <div className={styles.snapContainer}>
        
        {/* === SECTION 1: COMMAND DECK === */}
        <section className={styles.sectionOne}>
           <CommandHeader isConnected={isConnected} lastUpdate={lastUpdate} />
           
           <div className={styles.deckContent}>
              <HudStats data={data} />
              
              <div className="mb-6 flex items-center gap-3 text-slate-500 uppercase tracking-widest text-xs font-bold border-b border-white/5 pb-2">
                 <Layers size={14}/> Active Operations
              </div>

              <div className="flex flex-col gap-4">
                 {data?.projects?.map((proj: any) => (
                    <ProjectRow 
                       key={proj.templateId} 
                       project={proj} 
                       isOpen={expandedId === proj.templateId} 
                       onToggle={() => toggleExpand(proj.templateId)}
                       pilotsData={pilotsData[proj.templateId]}
                       isLoadingPilots={!pilotsData[proj.templateId]}
                    />
                 ))}
              </div>
           </div>

           <div className={styles.scrollPrompt}>
              <ChevronsDown size={24}/>
              <span className={styles.promptText}>ACCESS CORE</span>
           </div>
        </section>

        {/* === SECTION 2: THE CORE (CHART) === */}
        <section className={styles.sectionTwo}>
           <div className={styles.chartContainer}>
              <ProcessChart3D projects={data?.projects || []} />
           </div>
        </section>

      </div>
    </AuthGuard>
  );
}