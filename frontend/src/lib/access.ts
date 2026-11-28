"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Droits d'accès du pilote connecté, partagés entre la navbar, l'accueil,
 * la palette Ctrl+K et la garde des pages.
 *
 * - Les permissions viennent de User.permissions (réglées par l'admin).
 * - Règle stricte : une clé absente ou à false = module fermé.
 * - Un ADMIN a accès à tout.
 * - Au montage on relit /api/users/{id} pour prendre en compte un changement
 *   fait par l'admin depuis la connexion ; si le serveur ne répond pas, on garde
 *   la dernière valeur connue (localStorage).
 */

type StoredUser = { id?: number; username?: string; role?: string; active?: boolean; permissions?: Record<string, boolean> | null };

type AccessState = {
  ready: boolean;
  role: string | null;
  permissions: Record<string, boolean>;
  username: string | null;
};

let state: AccessState = { ready: false, role: null, permissions: {}, username: null };
const listeners = new Set<() => void>();
let fetchedFor: number | null | undefined; // id du dernier utilisateur relu

function emit(next: AccessState) {
  state = next;
  listeners.forEach((l) => l());
}

function readStored(): StoredUser | null {
  try {
    return JSON.parse(localStorage.getItem("kyntus_user") || "null");
  } catch {
    return null;
  }
}

function fromUser(u: StoredUser | null, ready: boolean): AccessState {
  return { ready, role: u?.role ?? null, permissions: u?.permissions || {}, username: u?.username ?? null };
}

export async function refreshAccess() {
  const u = readStored();
  if (!u?.id) { emit(fromUser(u, true)); return; }
  try {
    const res = await fetch(`/api/users/${u.id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const fresh = (await res.json()) as StoredUser;
    const merged = { ...u, role: fresh.role ?? u.role, active: fresh.active, permissions: fresh.permissions || {} };
    try { localStorage.setItem("kyntus_user", JSON.stringify(merged)); } catch { /* stockage plein */ }
    emit(fromUser(merged, true));
  } catch {
    emit(fromUser(u, true));
  }
}

// Quand le pilote revient sur l'onglet, on relit ses droits (l'admin a pu les changer)
let lastFocusRefresh = 0;
function onFocus() {
  if (Date.now() - lastFocusRefresh < 10_000) return;
  lastFocusRefresh = Date.now();
  refreshAccess();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) window.addEventListener("focus", onFocus);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("focus", onFocus);
  };
}

export function useAccess() {
  const snap = useSyncExternalStore(subscribe, () => state, () => state);

  useEffect(() => {
    if (!state.ready) {
      const u = readStored();
      // Valeur locale immédiate (pas de clignotement), puis rafraîchissement serveur.
      if (u?.permissions) emit(fromUser(u, true));
    }
    const id = readStored()?.id ?? null;
    if (fetchedFor !== id) {
      // Nouvel utilisateur (connexion / changement de compte) : on repart de zéro
      if (fetchedFor !== undefined) { const u = readStored(); emit(fromUser(u, !!u?.permissions)); }
      fetchedFor = id;
      refreshAccess();
    }
  }, []);

  const isAdmin = snap.role === "ADMIN";
  const can = (key: string | null | undefined) => key == null || isAdmin || snap.permissions[key] === true;
  return { ...snap, isAdmin, can };
}
