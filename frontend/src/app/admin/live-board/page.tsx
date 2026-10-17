"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Radio, FolderKanban, Users } from "lucide-react";
import styles from "./LiveBoard.module.css";

import TemplateList from "./components/TemplateList";
import PilotList from "./components/PilotList";
import LiveBoardView from "./components/LiveBoardView";

const RoyalBackground = dynamic(() => import("../../pilot/board/ux/RoyalBackground"), {
  ssr: false,
});

type ViewState = "TEMPLATES" | "PILOTS" | "BOARD";

export default function AdminLiveBoardOrchestrator() {
  const [view, setView] = useState<ViewState>("TEMPLATES");
  
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedPilot, setSelectedPilot] = useState<any>(null);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setView("PILOTS");
  };

  const handleSelectPilot = (pilot: any) => {
    setSelectedPilot(pilot);
    setView("BOARD");
  };

  const goBack = () => {
    if (view === "BOARD") setView("PILOTS");
    else if (view === "PILOTS") {
      setView("TEMPLATES");
      setSelectedTemplate(null);
    }
  };

  return (
    <div className={styles.container}>
      <RoyalBackground />

      {/* HEADER BREADCRUMB */}
      <div className={styles.header}>
        <div className={styles.titleBox}>
          <div className={styles.iconWrap}>
            {view === "TEMPLATES" && <FolderKanban size={24} />}
            {view === "PILOTS" && <Users size={24} />}
            {view === "BOARD" && <Radio size={24} />}
          </div>
          <div className={styles.titleText}>
            <h1>
              {view === "TEMPLATES" && "Live Monitor : Choix de la Mission"}
              {view === "PILOTS" && `Équipe active : ${selectedTemplate?.name}`}
              {view === "BOARD" && `Live : ${selectedPilot?.pilotName}`}
            </h1>
            <p>
              {view === "TEMPLATES" && "Sélectionnez une mission pour voir les pilotes qui y travaillent."}
              {view === "PILOTS" && "Sélectionnez un pilote pour observer son travail en temps réel."}
              {view === "BOARD" && `Mission: ${selectedTemplate?.name} | Mode Spectateur Actif`}
            </p>
          </div>
        </div>

        {view !== "TEMPLATES" && (
          <button onClick={goBack} className={styles.backBtn}>
            <ChevronLeft size={16} />
            Retour
          </button>
        )}
      </div>

      {/* DYNAMIC CONTENT */}
      {view === "TEMPLATES" && (
        <TemplateList onSelect={handleSelectTemplate} />
      )}

      {view === "PILOTS" && selectedTemplate && (
        <PilotList 
          templateId={selectedTemplate.id} 
          onSelect={handleSelectPilot} 
        />
      )}

      {view === "BOARD" && selectedTemplate && selectedPilot && (
        <LiveBoardView 
          pilotId={selectedPilot.pilotId.toString()}
          pilotName={selectedPilot.pilotName}
          templateId={selectedTemplate.id.toString()}
          templateName={selectedTemplate.name}
        />
      )}
    </div>
  );
}