"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminLoader from "@/components/ui/AdminLoader"; // On utilise le loader stylé

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Pages publiques
    if (pathname === "/login") {
      setAuthorized(true);
      return;
    }

    // 2. Check User
    const storedUser = localStorage.getItem("kyntus_user");

    if (!storedUser) {
      router.push("/login");
      return;
    }

    const user = JSON.parse(storedUser);
    
    // 3. LOGIQUE DE PROTECTION STRICTE
    const isAdminArea = pathname === "/" || pathname === "/portal" || pathname.startsWith("/admin") || pathname.startsWith("/import");
    const isPilotArea = pathname.startsWith("/pilot");

    if (user.role === "PILOT" && isAdminArea) {
        // Si un pilote essaie d'aller chez l'admin -> DEHRA (Kick)
        console.warn("INTRUSION DETECTED: PILOT IN ADMIN AREA");
        router.replace("/pilot/board");
    } 
    else if (user.role === "ADMIN" && isPilotArea) {
        // L'admin peut techniquement voir, mais on peut le rediriger si on veut.
        // Pour l'instant on laisse l'admin aller partout (God Mode)
        setAuthorized(true);
    }
    else {
        // Tout est bon
        setAuthorized(true);
    }

  }, [pathname, router]);

  // Pendant le check, on montre le Loader Cyberpunk (pas de flash blanc)
  if (!authorized) {
    return <AdminLoader />;
  }

  return <>{children}</>;
}