"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import styles from "./NotificationCenter.module.css";

// Types
type NotifType = "SUCCESS" | "INFO" | "ALERT";
interface Notification {
  id: number;
  message: string;
  type: NotifType;
  time: string;
  read: boolean;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  
  // Toast State (Le popup qui apparait 3s)
  const [toast, setToast] = useState<{msg: string, type: NotifType} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // WebSocket Connection
  useEffect(() => {
    if (!user) return;

    const socket = new SockJS("http://localhost:8080/ws");
    const client = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        // Subscribe to Notifications Topic
        client.subscribe("/topic/notifications", (msg) => {
          const payload = JSON.parse(msg.body);
          
          // --- 🧠 SMART FILTER (Le Cerveau) ---
          // Est-ce que cette notif est pour moi ?
          const isForMe = 
             payload.targetUsername === "ALL" || 
             payload.targetUsername === user.username ||
             (user.role === "ADMIN" && payload.targetUsername === "admin");

          if (isForMe) {
             const newNotif: Notification = {
                id: Date.now(),
                message: payload.message,
                type: payload.type || "INFO",
                time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                read: false
             };

             // Ajouter à la liste
             setNotifications(prev => [newNotif, ...prev]);
             setUnreadCount(prev => prev + 1);
             
             // Trigger Toast
             setToast({ msg: newNotif.message, type: newNotif.type });
             // Hide Toast after 4s
             setTimeout(() => setToast(null), 4000);
          }
        });
      }
    });

    client.activate();
    return () => { if(client.active) client.deactivate(); };
  }, [user]);

  // Mark all as read when opening
  const handleOpen = () => {
    if (!isOpen) {
        setUnreadCount(0); // Reset badge
    }
    setIsOpen(!isOpen);
  };

  const clearAll = () => setNotifications([]);

  // Helper pour l'icone et couleur
  const getIcon = (type: NotifType) => {
    switch(type) {
        case "SUCCESS": return <CheckCircle size={18} />;
        case "ALERT": return <AlertTriangle size={18} />;
        default: return <Info size={18} />;
    }
  };

  const getTypeStyle = (type: NotifType) => {
      switch(type) {
          case "SUCCESS": return styles.success;
          case "ALERT": return styles.alert;
          default: return styles.info;
      }
  };

  if (!user) return null;

  return (
    <>
      {/* 1. TOAST POPUP (Notification Volante) */}
      {toast && (
          <div className={`${styles.toast} ${getTypeStyle(toast.type)}`} style={{ "--neon-color": toast.type === 'SUCCESS' ? '#39ff14' : '#00f2ea' } as any}>
              <div className={styles.iconBox} style={{width: 24, height: 24, borderRadius: "50%"}}>
                  {getIcon(toast.type)}
              </div>
              <span style={{color: "white", fontWeight: "bold", fontSize: "0.9rem"}}>{toast.msg}</span>
          </div>
      )}

      {/* 2. ORBITAL BELL WRAPPER */}
      <div className={styles.orbWrapper}>
        
        {/* La Cloche */}
        <div 
            className={`${styles.bellOrb} ${unreadCount > 0 ? styles.hasUnread : ''}`} 
            onClick={handleOpen}
        >
            <Bell size={22} className={styles.bellIcon} />
            {unreadCount > 0 && <div className={styles.badgeCount}>{unreadCount}</div>}
        </div>

        {/* 3. HOLO-DROPDOWN */}
        {isOpen && (
            <div className={styles.dropdown}>
                {/* Header */}
                <div className={styles.header}>
                    <span className={styles.title}>SYSTEM LOGS</span>
                    {notifications.length > 0 && (
                        <button onClick={clearAll} className={styles.clearBtn}>PURGE DATA</button>
                    )}
                </div>

                {/* List */}
                <div className={styles.list}>
                    {notifications.length === 0 ? (
                        <div className={styles.emptyState}>
                            [ NO NEW SIGNALS ]<br/>
                            <span style={{opacity: 0.5, fontSize: "0.7rem"}}>System monitoring active...</span>
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif.id} className={`${styles.item} ${getTypeStyle(notif.type)}`}>
                                <div className={styles.iconBox}>
                                    {getIcon(notif.type)}
                                </div>
                                <div className={styles.content}>
                                    <div className={styles.msg}>{notif.message}</div>
                                    <div className={styles.time}>{notif.time}</div>
                                </div>
                                {!notif.read && <div className={styles.newDot}></div>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
      </div>
    </>
  );
}