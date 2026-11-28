"use client";

import { usePathname, useRouter } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";
import AuthGuard from "@/components/layout/AuthGuard";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import PilotNavbar from "@/components/layout/PilotNavbar";
import Toaster from "@/components/ui/Toaster";
import { KxEmpty } from "@/components/kx";
import { useAccess } from "@/lib/access";
import { moduleForPath } from "@/lib/modules";
import { navigate } from "@/lib/transition";
import styles from "./PilotLayout.module.css";

export default function PilotLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/pilot/home";

  return (
    <AuthGuard>
      <div className={styles.shell}>
        <InteractiveBackground />
        {!isHome && <PilotNavbar />}

        <div className={isHome ? styles.homeWrapper : styles.contentWrapper}>
          <div key={pathname} className={styles.page}>
            <ModuleGate pathname={pathname}>{children}</ModuleGate>
          </div>
        </div>

        <Toaster />
      </div>
    </AuthGuard>
  );
}

/** Bloque l'accès direct (URL) à un module que l'admin n'a pas ouvert pour ce pilote. */
function ModuleGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const router = useRouter();
  const { ready, can } = useAccess();
  const mod = moduleForPath(pathname);
  if (!mod || mod.key === null) return <>{children}</>;
  if (!ready) return <div className={styles.gateWait}><div className="kx-skeleton" style={{ height: 120, borderRadius: 22 }} /></div>;
  if (can(mod.key)) return <>{children}</>;
  return (
    <div className={styles.gate}>
      <KxEmpty icon={Lock} title={`${mod.title} n'est pas ouvert pour votre compte`}>
        <span>Demandez à un administrateur d&apos;activer ce module dans « Contrôle des accès ».</span>
        <button type="button" className="kx-btn kx-btn-ghost" style={{ marginTop: 12 }} onClick={(e) => navigate(router, "/pilot/home", { x: e.clientX, y: e.clientY })}>
          <ArrowLeft size={16} /> Retour à l&apos;accueil
        </button>
      </KxEmpty>
    </div>
  );
}
