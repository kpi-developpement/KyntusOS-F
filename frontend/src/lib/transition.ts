"use client";

/**
 * Navigation avec la View Transitions API.
 *
 *  - L'ancienne page reste figée pendant que la nouvelle se dévoile en cercle
 *    depuis le point de clic (clip-path), comme une app mobile.
 *  - Si un élément porte `view-transition-name: kx-page-icon` des deux côtés
 *    (icône de la carte cliquée → icône du header de la page), il « morphe ».
 *  - Navigateurs sans support ou utilisateurs « mouvement réduit » : navigation simple.
 *
 * `TransitionResolver` (monté dans les layouts) signale au navigateur que la
 * nouvelle page est rendue, à chaque changement de route.
 */

type Router = { push: (href: string) => void; prefetch?: (href: string) => void };
type VTDocument = Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void> } };

let pending: (() => void) | null = null;

export function resolvePendingTransition() {
  if (!pending) return;
  const done = pending;
  pending = null;
  // Pas de requestAnimationFrame ici : pendant une View Transition le rendu est
  // suspendu, rAF ne se déclenche pas et l'écran restait figé jusqu'au timeout.
  setTimeout(done, 0);
}

export function navigate(router: Router, href: string, opts?: { x?: number; y?: number; morph?: HTMLElement | null }) {
  const doc = document as VTDocument;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce || location.pathname === href) {
    router.push(href);
    return;
  }
  // La page cible est préchargée pour que l'écran ne reste jamais figé longtemps
  try { router.prefetch?.(href); } catch { /* prefetch facultatif */ }
  const root = document.documentElement;
  root.style.setProperty("--vt-x", `${opts?.x ?? window.innerWidth / 2}px`);
  root.style.setProperty("--vt-y", `${opts?.y ?? window.innerHeight / 2}px`);
  root.dataset.vt = "reveal";
  if (opts?.morph) opts.morph.style.viewTransitionName = "kx-page-icon";

  const vt = doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pending = resolve;
        router.push(href);
        // Filet de sécurité : au pire 700 ms de gel, jamais plus
        setTimeout(() => { if (pending === resolve) { pending = null; resolve(); } }, 700);
      })
  );
  vt.finished.finally(() => {
    delete root.dataset.vt;
    if (opts?.morph) opts.morph.style.viewTransitionName = "";
  });
}
