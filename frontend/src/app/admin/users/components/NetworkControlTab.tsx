import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Power, Key, LayoutDashboard, Terminal, Cpu, Database, Settings2, Search, Check } from "lucide-react";
import { KxEmpty, KxAlert } from "@/components/kx";
import styles from "../Users.module.css";

type Pilot = { id: number; username: string; role: string; active: boolean; permissions?: Record<string, boolean> };

const MODULES = [
  { id: "tableau", label: "Tableau de tâches", icon: LayoutDashboard },
  { id: "analyse", label: "Analyse data", icon: Terminal },
  { id: "facture", label: "Facturation", icon: Cpu },
  { id: "ventilation", label: "Ventilation", icon: Database },
  { id: "parametrage", label: "Paramétrage", icon: Settings2 },
];

export default function NetworkControlTab() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "bad"; text: string } | null>(null);

  const fetchPilots = useCallback(async () => {
    try {
      const res = await fetch("/api/users/pilots");
      if (res.ok) setPilots(await res.json());
    } catch { /* réseau */ }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
  useEffect(() => { fetchPilots(); }, [fetchPilots]);

  const selected = pilots.find((p) => p.id === selectedId) || null;
  const list = useMemo(() => pilots.filter((p) => p.username.toLowerCase().includes(q.trim().toLowerCase())), [pilots, q]);

  const patchLocal = (id: number, patch: Partial<Pilot>) => setPilots((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const toggleStatus = async () => {
    if (!selected) return;
    setConfirmOff(false);
    const res = await fetch(`/api/users/${selected.id}/toggle-status`, { method: "PATCH" }).catch(() => null);
    if (res?.ok) { patchLocal(selected.id, { active: !selected.active }); setMsg({ type: "ok", text: `${selected.username} est maintenant ${selected.active ? "suspendu" : "actif"}.` }); }
    else setMsg({ type: "bad", text: "Impossible de modifier le statut." });
  };

  const resetPassword = async () => {
    if (!selected || !newPassword) return;
    const res = await fetch(`/api/users/${selected.id}/reset-password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword }) }).catch(() => null);
    if (res?.ok) { setNewPassword(""); setMsg({ type: "ok", text: `Mot de passe de ${selected.username} réinitialisé.` }); }
    else setMsg({ type: "bad", text: "La réinitialisation a échoué." });
  };

  const togglePerm = async (moduleId: string) => {
    if (!selected) return;
    const updated = { ...(selected.permissions || {}), [moduleId]: !(selected.permissions?.[moduleId] || false) };
    patchLocal(selected.id, { permissions: updated });
    const res = await fetch(`/api/users/${selected.id}/permissions`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) }).catch(() => null);
    if (!res?.ok) { patchLocal(selected.id, { permissions: selected.permissions }); setMsg({ type: "bad", text: "Permission non enregistrée." }); }
  };

  return (
    <div className={styles.manage}>
      <aside className={styles.roster}>
        <label className={styles.rosterSearch}>
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pilote" aria-label="Rechercher un pilote" />
        </label>
        <div className={styles.rosterList}>
          {list.map((p) => (
            <button key={p.id} type="button" className={`${styles.rosterItem} ${selectedId === p.id ? styles.rosterOn : ""}`} onClick={() => { setSelectedId(p.id); setMsg(null); setConfirmOff(false); }}>
              <span className={styles.avatar}>{p.username.slice(0, 2).toUpperCase()}</span>
              <span className={styles.rosterName}>{p.username}</span>
              <span className={`${styles.dot} ${p.active ? styles.dotOn : ""}`} title={p.active ? "Actif" : "Suspendu"} />
            </button>
          ))}
          {list.length === 0 && <p className={styles.rosterEmpty}>Aucun pilote</p>}
        </div>
      </aside>

      <section className={styles.deck}>
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <KxEmpty icon={Users} title="Sélectionnez un pilote"><span>Choisissez un pilote dans la liste pour gérer son accès.</span></KxEmpty>
            </motion.div>
          ) : (
            <motion.div key={selected.id} className={styles.deckBody} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className={styles.deckHead}>
                <span className={styles.bigAvatar}>{selected.username.slice(0, 2).toUpperCase()}</span>
                <div className={styles.deckWho}>
                  <h2>{selected.username}</h2>
                  <span className={`${styles.badge} ${selected.active ? styles.badgeOn : styles.badgeOff}`}>{selected.active ? "Actif" : "Suspendu"}</span>
                </div>
                {selected.active && confirmOff ? (
                  <div className={styles.confirm}>
                    <button type="button" className="kx-btn kx-btn-danger kx-btn-sm" onClick={toggleStatus}><Power size={14} /> Suspendre {selected.username}</button>
                    <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" onClick={() => setConfirmOff(false)}>Annuler</button>
                  </div>
                ) : (
                  <button type="button" className={`kx-btn ${selected.active ? "kx-btn-ghost" : ""}`} onClick={() => (selected.active ? setConfirmOff(true) : toggleStatus())}>
                    <Power size={16} /> {selected.active ? "Suspendre" : "Réactiver"}
                  </button>
                )}
              </div>

              {msg && <KxAlert tone={msg.type}>{msg.text}</KxAlert>}

              <div className={styles.block}>
                <h3>Réinitialiser le mot de passe</h3>
                <div className={styles.inline}>
                  <span className={styles.inputWrap}>
                    <Key size={17} />
                    <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" />
                  </span>
                  <button type="button" className="kx-btn" onClick={resetPassword} disabled={!newPassword}>Enregistrer</button>
                </div>
              </div>

              <div className={styles.block}>
                <h3>Modules autorisés</h3>
                <div className={styles.perms}>
                  {MODULES.map((m) => {
                    const on = selected.permissions?.[m.id] || false;
                    const Icon = m.icon;
                    return (
                      <button key={m.id} type="button" role="switch" aria-checked={on} className={`${styles.perm} ${on ? styles.permOn : ""}`} onClick={() => togglePerm(m.id)}>
                        <span className={styles.permIcon}><Icon size={18} /></span>
                        <span className={styles.permLabel}>{m.label}</span>
                        <span className={styles.switch}><span>{on && <Check size={11} strokeWidth={3} />}</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
