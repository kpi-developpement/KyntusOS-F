import styles from './CommandHeader.module.css';

export default function CommandHeader({ isConnected, lastUpdate }: { isConnected: boolean, lastUpdate: Date | null }) {
  return (
    <div className={styles.wrapper}>
      <div>
        <h1 className={styles.title}>Command<br/>Center</h1>
        <div className={styles.statusBadge}>
          <span className={styles.dot}></span>
          <span>{isConnected ? "SYSTEM_ONLINE" : "RECONNECTING..."}</span>
        </div>
      </div>
      <div className={styles.metaInfo}>
        <div>SECURE_CONN: <span className={styles.metaValue}>TLS_1.3</span></div>
        <div className="mt-1">LAST_SYNC: <span className={styles.metaValue}>{lastUpdate?.toLocaleTimeString()}</span></div>
      </div>
    </div>
  );
}