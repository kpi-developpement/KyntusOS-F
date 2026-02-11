import styles from "./Button.module.css";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "danger";
  isLoading?: boolean;
}

export default function Button({ 
  children, 
  variant = "primary", 
  isLoading, 
  className, 
  ...props 
}: ButtonProps) {
  return (
    <button 
      className={`${styles.btn} ${styles[variant]} ${className || ""}`} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <span className={styles.spinner}>↻</span>} {/* Dir spinner component hna mn b3d */}
      {children}
    </button>
  );
}