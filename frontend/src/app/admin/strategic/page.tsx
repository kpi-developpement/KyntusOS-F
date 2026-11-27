"use client";

import React, { useState } from "react";
import { RefreshCw, Map, Radio, MousePointer2 } from "lucide-react";
import Workflow3DChart from "@/components/3d/Workflow3DChart";
import { KxHeader } from "@/components/kx";
import styles from "./Strategic.module.css";

const AXES = [
  { label: "X · Identité", color: "#e11d48" },
  { label: "Y · Charge en temps", color: "#059669" },
  { label: "Z · Complexité", color: "#2563eb" },
];

export default function StrategicPage() {
  const [version, setVersion] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    setLoading(true);
    setVersion((v) => v + 1);
    setLastUpdate(new Date());
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <main className="kx-page" style={{ maxWidth: 1600 }}>
      <KxHeader
        icon={Map}
        eyebrow="Bêta"
        title={<>Carte <em>stratégique</em></>}
        subtitle="Topologie 3D de tous les flux de travail. Faites glisser pour tourner, molette pour zoomer."
        actions={
          <>
            <span className={styles.sync}>Synchronisé à {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <button type="button" className="kx-btn kx-btn-ghost" onClick={refresh} disabled={loading}>
              <RefreshCw size={16} className={loading ? "kx-spin" : ""} /> Actualiser
            </button>
          </>
        }
      />

      <section className={styles.viewport}>
        <Workflow3DChart key={version} />
        <div className={styles.hint}><MousePointer2 size={14} /> Glisser pour explorer</div>
      </section>

      <footer className={styles.footer}>
        <ul className={styles.legend}>
          {AXES.map((a) => (
            <li key={a.label}><i style={{ background: a.color }} /> {a.label}</li>
          ))}
        </ul>
        <span className={styles.live}><Radio size={14} /> Rendu en direct</span>
      </footer>
    </main>
  );
}
