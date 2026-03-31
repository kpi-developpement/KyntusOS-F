"use client";

import { useState, useEffect } from "react";
import Container from "@/components/layout/Container";
import Card from "@/components/layout/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AuditPage() {
  const [epsSearch, setEpsSearch] = useState("");
  const [foundTask, setFoundTask] = useState<any>(null);
  const [pilots, setPilots] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // 1. Charger le tableau des scores (Leaderboard)
  const loadStats = () => {
    fetch("http://localhost:8080/api/admin/pilots-stats")
      .then(res => res.json())
      .then(data => {
          // On ne garde que les pilotes
          const filtered = data.filter((u:any) => u.role === "PILOT");
          setPilots(filtered);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 2. Recherche par EPS
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setFoundTask(null);

    try {
        const res = await fetch(`http://localhost:8080/api/admin/search?eps=${epsSearch}`);
        if (res.ok) {
            const data = await res.json();
            setFoundTask(data);
        } else {
            setMsg("❌ EPS introuvable");
        }
    } catch (err) {
        console.error(err);
        setMsg("Erreur connexion");
    }
  };

  // 3. Signaler une Erreur (Le Blâme)
  const handleFlagError = async () => {
    if (!foundTask) return;
    if (!confirm(`Voulez-vous signaler une erreur sur ${foundTask.epsReference} ? \nCela ajoutera +1 erreur au pilote ${foundTask.assignee?.username}.`)) return;

    try {
        const res = await fetch(`http://localhost:8080/api/admin/flag-error/${foundTask.id}`, {
            method: "POST"
        });
        
        if (res.ok) {
            alert("✅ Erreur enregistrée !");
            // On met à jour l'affichage local pour montrer que c'est fait
            setFoundTask({ ...foundTask, flaggedError: true }); 
            // On recharge le tableau des scores pour voir le +1
            loadStats(); 
        } else {
            const txt = await res.text();
            alert("Erreur: " + txt);
        }
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <Container>
      <h1 style={{margin: "30px 0"}}>🕵️ Audit & Qualité</h1>

      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px"}}>
        
        {/* COLONNE 1 : RECHERCHE & FLAG */}
        <div style={{display:"flex", flexDirection:"column", gap: 20}}>
            <Card>
                <h3>🔎 Recherche par EPS (Key)</h3>
                <form onSubmit={handleSearch} style={{display: "flex", gap: 10, marginBottom: 20}}>
                    <Input 
                        placeholder="Ex: EPS-001641086" 
                        value={epsSearch} 
                        onChange={(e) => setEpsSearch(e.target.value)}
                    />
                    <Button type="submit">Chercher</Button>
                </form>
                {msg && <p style={{color: "red", fontWeight: "bold"}}>{msg}</p>}

                {foundTask && (
                    <div style={{background: "#f9f9f9", padding: 20, borderRadius: 8, border: "1px solid #eee"}}>
                        <div style={{marginBottom: 10}}>
                            <span style={{fontSize: "1.2rem", fontWeight: "bold", color: "#0070f3"}}>{foundTask.epsReference}</span>
                        </div>
                        <p><strong>Pilote:</strong> {foundTask.assignee ? `👤 ${foundTask.assignee.username}` : "Non assigné"}</p>
                        <p><strong>Status:</strong> {foundTask.status}</p>
                        
                        {/* Data JSON (Aperçu) */}
                        <div style={{marginTop: 15, background: "white", padding: 10, borderRadius: 4, fontSize: "0.85rem", color: "#555", border: "1px solid #eee"}}>
                            {foundTask.dynamicData && Object.entries(foundTask.dynamicData).map(([k, v]) => (
                                <div key={k} style={{marginBottom: 4}}><b>{k}:</b> {String(v)}</div>
                            ))}
                        </div>

                        <div style={{marginTop: 20}}>
                            {foundTask.flaggedError ? (
                                <div style={{
                                    background: "#ffebee", color: "#c62828", 
                                    padding: 10, borderRadius: 4, textAlign: "center", fontWeight: "bold"
                                }}>
                                    🚨 DÉJÀ SIGNALÉ COMME ERREUR
                                </div>
                            ) : (
                                <Button variant="danger" onClick={handleFlagError} style={{width: "100%"}}>
                                    ⚠️ Signaler une Erreur (+1)
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>

        {/* COLONNE 2 : TABLEAU D'HONNEUR (OU DE HONTE hhh) */}
        <div>
            <Card>
                <h3>🏆 Tableau des Erreurs (Mois en cours)</h3>
                <p style={{color: "#666", fontSize: "0.9rem", marginBottom: 15}}>Suivi de la qualité par pilote.</p>
                
                <table style={{width: "100%", borderCollapse: "collapse"}}>
                    <thead>
                        <tr style={{borderBottom: "2px solid #eee", textAlign: "left", color: "#888", fontSize: "0.9rem"}}>
                            <th style={{padding: 10}}>Pilote</th>
                            <th style={{padding: 10, textAlign: "right"}}>Fautes 🚩</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pilots.length === 0 && <tr><td colSpan={2} style={{padding:20, textAlign:"center"}}>Aucun pilote trouvé</td></tr>}
                        
                        {pilots.map(p => (
                            <tr key={p.id} style={{borderBottom: "1px solid #f0f0f0"}}>
                                <td style={{padding: 15, display: "flex", alignItems: "center", gap: 10}}>
                                    <div style={{
                                        width: 32, height: 32, 
                                        background: "#e6f7ff", color: "#0070f3", 
                                        borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", 
                                        fontWeight: "bold", fontSize: "0.8rem"
                                    }}>
                                        {p.username.substring(0,2).toUpperCase()}
                                    </div>
                                    <span style={{fontWeight: "500"}}>{p.username}</span>
                                </td>
                                <td style={{padding: 15, textAlign: "right", fontWeight: "bold", fontSize: "1.1rem", color: p.errorCount > 0 ? "#dc3545" : "#28a745"}}>
                                    {p.errorCount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>

      </div>
    </Container>
  );
}