"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import styles from "./ActionButton.module.css";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "secondary" | "cyan" | "danger" | "warning";
  onClick: () => void;
}

export default function ActionButton({
  icon: Icon,
  label,
  variant = "primary",
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.luxeBtn} ${styles[variant] || styles.primary}`}
      onClick={onClick}
    >
      <span className={styles.shimmer} />
      <span className={styles.content}>
        <Icon size={16} className={styles.icon} />
        <span>{label}</span>
      </span>
    </button>
  );
}