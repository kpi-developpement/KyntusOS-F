"use client";

import React, { useState } from "react";
import { Cpu, DownloadCloud, Database } from "lucide-react";
import * as XLSX from "xlsx";
import { KxHeader, KxDropzone, KxAlert, KxTable } from "@/components/kx";

const API_BASE = "";

export default function ParametragePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);

  const download = (blob: Blob) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Resultat_Parametrage_${new Date().getTime()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // UPLOAD -> DOWNLOAD -> PREVIEW
  const processFile = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");
    setTableData([]);
    setTableColumns([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/parametrage/process`, { method: "POST", body: formData });
      if (!response.ok) throw new Error("Erreur lors du traitement par le serveur.");

      const blob = await response.blob();
      setLastBlob(blob);
      download(blob);

      const workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
      if (jsonData.length > 0) {
        setTableColumns(Object.keys(jsonData[0]));
        setTableData(jsonData);
      }
      setSuccessMsg(`Paramétrage terminé : ${jsonData.length.toLocaleString("fr-FR")} lignes traitées, fichier téléchargé.`);
    } catch (error: unknown) {
      console.error(error);
      setErrorMsg((error as Error)?.message || "Échec de l'opération.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="kx-page" style={{ maxWidth: 1240 }}>
      <KxHeader
        icon={Cpu}
        eyebrow="Billing engine"
        title={<>Moteur de <em>paramétrage</em></>}
        subtitle="Importez la feuille « Feuil1 » : les règles de facturation sont appliquées automatiquement et le résultat est téléchargé."
        actions={lastBlob && (
          <button type="button" className="kx-btn kx-btn-ghost" onClick={() => download(lastBlob)}>
            <DownloadCloud size={16} /> Retélécharger
          </button>
        )}
      />

      {successMsg && <KxAlert tone="ok">{successMsg}</KxAlert>}
      {errorMsg && <KxAlert tone="bad">{errorMsg}</KxAlert>}

      <KxDropzone
        onFile={processFile}
        busy={isProcessing}
        title="Glissez le fichier « Feuil1 » ici"
        busyTitle="Application des règles…"
        busyHint="Calcul des montants et génération du fichier"
      />

      {tableData.length > 0 && (
        <KxTable title="Résultat" icon={Database} rows={tableData} columns={tableColumns} />
      )}
    </main>
  );
}
