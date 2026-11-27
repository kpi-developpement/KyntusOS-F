import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Key, ScanFace, Shield, UserPlus, Loader2, Eye, EyeOff } from "lucide-react";
import { KxAlert } from "@/components/kx";
import styles from "../Users.module.css";

const ROLES = [
  { id: "PILOT", label: "Pilote", desc: "Traite les tâches qui lui sont assignées.", icon: ScanFace },
  { id: "ADMIN", label: "Administrateur", desc: "Dispatch, contrôle et configuration.", icon: Shield },
];

export default function UnitCreationTab() {
  const [form, setForm] = useState({ username: "", password: "", role: "PILOT" });
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "bad"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        setStatus({ type: "ok", msg: `Compte « ${form.username} » créé.` });
        setForm({ username: "", password: "", role: "PILOT" });
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus({ type: "bad", msg: data?.error || "La création du compte a échoué." });
      }
    } catch {
      setStatus({ type: "bad", msg: "Serveur injoignable." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.panel}>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Identifiant</span>
          <span className={styles.inputWrap}>
            <User size={17} />
            <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="prenom.nom" autoComplete="off" />
          </span>
        </label>
        <label className={styles.field}>
          <span>Mot de passe</span>
          <span className={styles.inputWrap}>
            <Key size={17} />
            <input required type={show ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Au moins 8 caractères" autoComplete="new-password" />
            <button type="button" className={styles.eye} onClick={() => setShow((v) => !v)} aria-label={show ? "Masquer" : "Afficher"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </span>
        </label>
      </div>

      <div className={styles.field}>
        <span>Rôle</span>
        <div className={styles.roles} role="radiogroup" aria-label="Rôle">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const on = form.role === r.id;
            return (
              <button key={r.id} type="button" role="radio" aria-checked={on} className={`${styles.role} ${on ? styles.roleOn : ""}`} onClick={() => setForm({ ...form, role: r.id })}>
                <span className={styles.roleIcon}><Icon size={22} /></span>
                <span className={styles.roleText}><b>{r.label}</b><small>{r.desc}</small></span>
                <span className={styles.radio} />
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{status && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><KxAlert tone={status.type}>{status.msg}</KxAlert></motion.div>}</AnimatePresence>

      <button type="submit" className="kx-btn kx-btn-lg" disabled={loading || !form.username || !form.password}>
        {loading ? <Loader2 size={18} className="kx-spin" /> : <UserPlus size={18} />}
        {loading ? "Création…" : `Créer le compte ${form.role === "ADMIN" ? "administrateur" : "pilote"}`}
      </button>
    </form>
  );
}
