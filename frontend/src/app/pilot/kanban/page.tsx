"use client";

import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import styles from "./PilotKanban.module.css";
// IMPORT DU BACKGROUND GLOBAL
import GlobalWarp from "./components/ui/GlobalWarp"; 
import BoardStats from "./components/BoardStats";
import KanbanColumn from "./components/KanbanColumn";

export default function PilotKanban() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ todo: 0, inProgress: 0, done: 0 });

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      fetchTasks(u.id);
    }
  }, []);

  const fetchTasks = (userId: number) => {
    setLoading(true);
    fetch(`http://kyntusos.kyntus.fr:8082/api/tasks?assigneeId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTasks(data);
          updateStats(data);
        }
      })
      .finally(() => setLoading(false));
  };

  const updateStats = (data: any[]) => {
    setStats({
      todo: data.filter((t) => t.status === "A_FAIRE").length,
      inProgress: data.filter((t) => t.status === "EN_COURS").length,
      done: data.filter((t) => ["DONE", "VALIDE", "REJETE"].includes(t.status)).length,
    });
  };

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    const oldTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Erreur Backend");

      const updatedTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      updateStats(oldTasks.map((t) => (t.id === taskId ? updatedTask : t)));
      
    } catch (error) {
      console.error(error);
      setTasks(oldTasks);
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "A_FAIRE");
  const progressTasks = tasks.filter((t) => t.status === "EN_COURS");
  const doneTasks = tasks.filter((t) => ["DONE", "VALIDE", "REJETE"].includes(t.status)).reverse().slice(0, 10);

  return (
    <div className={styles.container}>
      {/* BACKGROUND GLOBAL: WARP SPEED */}
      <GlobalWarp />

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.glitchTitle} data-text="MISSION_CONTROL">MISSION_CONTROL</h1>
          <div className={styles.subTitle}>
            <Terminal size={14} color="#00f2ea" />
            <span>UNIT: {user?.username?.toUpperCase()} // LIVE FEED</span>
          </div>
        </div>
        <BoardStats stats={stats} />
      </header>

      <div className={styles.boardGrid}>
        <KanbanColumn 
          title="STAGING AREA" 
          tasks={todoTasks} 
          type="TODO" 
          onAction={handleMoveTask} 
          loading={loading}
        />
        <KanbanColumn 
          title="ACTIVE PROTOCOLS" 
          tasks={progressTasks} 
          type="PROGRESS" 
          onAction={handleMoveTask}
          loading={loading}
        />
        <KanbanColumn 
          title="SECURED ARCHIVES" 
          tasks={doneTasks} 
          type="DONE" 
          onAction={handleMoveTask}
          loading={loading}
        />
      </div>
    </div>
  );
}