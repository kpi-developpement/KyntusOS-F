import { Clock, Zap, CheckCircle, ShieldCheck } from 'lucide-react';
import styles from './HudStats.module.css';

export default function HudStats({ data }: { data: any }) {
  return (
    <div className={styles.grid}>
      <Card label="Pending" value={data?.global?.totalToDo} icon={<Clock size={16}/>} color="#fbbf24" />
      <Card label="Active" value={data?.global?.totalInProgress} icon={<Zap size={16}/>} color="#00f0ff" />
      <Card label="Done" value={data?.global?.totalDone} icon={<CheckCircle size={16}/>} color="#a855f7" />
      <Card label="Secured" value={data?.global?.totalValid} icon={<ShieldCheck size={16}/>} color="#10b981" />
    </div>
  );
}

function Card({ label, value, icon, color }: any) {
  return (
    <div className={styles.card} style={{ borderTop: `2px solid ${color}` }}>
      <div className={styles.label}>{icon} {label}</div>
      <div className={styles.value} style={{ color: color, textShadow: `0 0 20px ${color}40` }}>
        {value || 0}
      </div>
    </div>
  );
}