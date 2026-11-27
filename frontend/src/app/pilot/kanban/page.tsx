"use client";

import { useCallback, useEffect, useState } from "react";
import { KanbanSquare, Loader2, Target } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { KxHeader, KxEmpty } from "@/components/kx";
import LuxSelect from "@/components/ui/LuxSelect";
import KanbanBoard, { type KanbanTask } from "./components/KanbanBoard";
import styles from "./PilotKanban.module.css";

export default function PilotKanban() {
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id?: number; username?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage
    if (stored) setUser(JSON.parse(stored));
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTemplates(d); })
      .catch((e) => console.error(e));
  }, []);

  const refreshTasks = useCallback(() => {
    if (!user || !selectedTemplate) return;
    setLoading(true);
    fetch(`/api/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
      .then((r) => r.json())
      .then((d) => setTasks(Array.isArray(d) ? d : []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [user, selectedTemplate]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement à la sélection d'une mission
  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  const handleMoveTask = async (taskId: number, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erreur Backend");
      toast({ message: `Tâche déplacée vers ${newStatus.replace("_", " ").toLowerCase()}`, type: "success" });
    } catch {
      toast({ message: "Synchronisation impossible, retour à l'état précédent", type: "error" });
      refreshTasks();
    }
  };

  const options = templates.map((t) => ({ value: t.id.toString(), label: t.name }));

  return (
    <main className="kx-page" style={{ maxWidth: 1600 }}>
      <KxHeader
        icon={KanbanSquare}
        eyebrow="Tactical"
        title={<>Tableau de <em>tâches</em></>}
        subtitle={`Pilote ${user?.username || "—"} · faites avancer vos tâches d'une colonne à l'autre.`}
        actions={
          <div className={styles.headerTools}>
            {selectedTemplate && <span className={styles.activeCount}><span className={styles.pulse} />{tasks.length} tâches</span>}
            <div className={styles.mission}>
              <LuxSelect options={options} value={selectedTemplate} onChange={setSelectedTemplate} placeholder="Choisir une mission" />
            </div>
          </div>
        }
      />

      {!selectedTemplate ? (
        <div className={styles.idle}>
          <KxEmpty icon={Target} title="Aucune mission chargée">
            <span>Choisissez une mission en haut à droite pour afficher son tableau.</span>
          </KxEmpty>
        </div>
      ) : loading ? (
        <div className={styles.idle}>
          <KxEmpty icon={Loader2} title="Chargement des tâches…" />
        </div>
      ) : (
        <KanbanBoard tasks={tasks} onMoveTask={handleMoveTask} />
      )}
    </main>
  );
}
