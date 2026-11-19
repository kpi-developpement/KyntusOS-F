"use client";

/**
 * Langage visuel de Terrain Records (cartes vitrees, boutons a reflet,
 * modales a ressort), etendu pour la section API : pastilles live,
 * onglets segmentes, grille de donnees et chronologie.
 * Toutes les classes sont prefixees "nx-" pour ne rien heriter d'ailleurs.
 */
export default function NexusStyles() {
  return (
    <style>{`
      @keyframes nxEntrance { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes nxBackdrop { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes nxPop { 0% { opacity: 0; transform: scale(.94) translateY(16px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
      @keyframes nxRow { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes nxPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
      @keyframes nxSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      @keyframes nxBlink { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.85); } }
      @keyframes nxSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
      @keyframes nxRing { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,.55); } 100% { box-shadow: 0 0 0 9px rgba(16,185,129,0); } }

      .nx-stage { animation: nxEntrance .55s cubic-bezier(.16,1,.3,1) forwards; }
      .nx-spin { animation: nxSpin 1s linear infinite; }
      .nx-pulse { animation: nxPulse 1.2s infinite; }

      .nx-card {
        position: relative;
        background: rgba(11,15,25,.85);
        backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(56,189,248,.15);
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,.2), 0 10px 30px -6px rgba(2,132,199,.2), inset 0 1px 0 rgba(255,255,255,.05);
        transition: border-color .28s cubic-bezier(.16,1,.3,1), box-shadow .28s cubic-bezier(.16,1,.3,1);
      }
      .nx-card:hover {
        border-color: rgba(56,189,248,.35);
        box-shadow: 0 8px 24px -4px rgba(0,0,0,.3), 0 16px 40px -8px rgba(2,132,199,.35), inset 0 1px 0 rgba(255,255,255,.1);
      }

      .nx-btn {
        position: relative; overflow: hidden;
        display: inline-flex; align-items: center; gap: 8px;
        padding: .58rem 1.08rem;
        background-color: rgba(15,23,42,.6); color: #f1f5f9;
        border: 1px solid rgba(148,163,184,.3);
        font-family: 'Inter', -apple-system, sans-serif; font-size: .8rem; font-weight: 600;
        letter-spacing: .01em; border-radius: 10px; cursor: pointer; user-select: none; white-space: nowrap;
        transition: transform .22s cubic-bezier(.16,1,.3,1), background-color .2s, border-color .2s, box-shadow .22s cubic-bezier(.16,1,.3,1), color .2s;
        box-shadow: 0 1px 2px rgba(0,0,0,.2);
      }
      .nx-btn::before {
        content: ''; position: absolute; top: 0; left: -120%; width: 65%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent);
        transform: skewX(-20deg); transition: left .55s cubic-bezier(.16,1,.3,1); pointer-events: none;
      }
      .nx-btn:hover:not(:disabled)::before { left: 140%; }
      .nx-btn:hover:not(:disabled) { transform: translateY(-2px); background-color: rgba(30,41,59,.8); border-color: rgba(148,163,184,.5); }
      .nx-btn:active:not(:disabled) { transform: translateY(0) scale(.97); }
      .nx-btn:disabled { opacity: .4; cursor: not-allowed; }
      .nx-btn.sm { padding: .38rem .7rem; font-size: .72rem; border-radius: 8px; gap: 6px; }
      .nx-btn.xs { padding: .26rem .5rem; font-size: .66rem; border-radius: 7px; gap: 5px; }
      .nx-btn.icon { padding: .42rem; }

      .nx-primary { background: linear-gradient(135deg,#0284c7 0%,#0369a1 100%); color: #fff; border-color: #0369a1;
        box-shadow: 0 4px 12px rgba(2,132,199,.4), inset 0 1px 0 rgba(255,255,255,.15); }
      .nx-primary:hover:not(:disabled) { background: linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%); border-color: #0ea5e9;
        box-shadow: 0 8px 22px rgba(14,165,233,.4), inset 0 1px 0 rgba(255,255,255,.25); }
      .nx-soft { background-color: rgba(2,132,199,.15); border-color: rgba(2,132,199,.4); color: #38bdf8; }
      .nx-soft:hover:not(:disabled) { background-color: rgba(2,132,199,.25); border-color: #38bdf8; color: #bae6fd; box-shadow: 0 6px 16px rgba(2,132,199,.25); }
      .nx-sky { background-color: rgba(56,189,248,.1); border-color: rgba(56,189,248,.3); color: #7dd3fc; }
      .nx-sky:hover:not(:disabled) { background-color: rgba(56,189,248,.2); border-color: #7dd3fc; color: #e0f2fe; box-shadow: 0 6px 16px rgba(56,189,248,.25); }
      .nx-danger { background-color: rgba(220,38,38,.1); border-color: rgba(220,38,38,.3); color: #f87171; }
      .nx-danger:hover:not(:disabled) { background-color: rgba(220,38,38,.2); border-color: #f87171; color: #fca5a5; box-shadow: 0 6px 16px rgba(220,38,38,.25); }
      .nx-ok { background-color: rgba(16,185,129,.12); border-color: rgba(16,185,129,.35); color: #34d399; }
      .nx-ok:hover:not(:disabled) { background-color: rgba(16,185,129,.22); border-color: #34d399; color: #a7f3d0; box-shadow: 0 6px 16px rgba(16,185,129,.25); }
      .nx-warn { background-color: rgba(245,158,11,.1); border-color: rgba(245,158,11,.35); color: #fbbf24; }
      .nx-warn:hover:not(:disabled) { background-color: rgba(245,158,11,.2); border-color: #fbbf24; color: #fde68a; box-shadow: 0 6px 16px rgba(245,158,11,.25); }
      .nx-violet { background-color: rgba(168,85,247,.12); border-color: rgba(168,85,247,.35); color: #c084fc; }
      .nx-violet:hover:not(:disabled) { background-color: rgba(168,85,247,.22); border-color: #c084fc; color: #e9d5ff; box-shadow: 0 6px 16px rgba(168,85,247,.25); }

      .nx-input {
        background-color: rgba(15,23,42,.6); border: 1px solid rgba(148,163,184,.3); color: #f8fafc;
        padding: .55rem .85rem; border-radius: 10px; font-family: 'Inter', -apple-system, sans-serif;
        font-size: .85rem; font-weight: 500; outline: none; transition: all .2s cubic-bezier(.16,1,.3,1); color-scheme: dark;
      }
      .nx-input::placeholder { color: #64748b; }
      .nx-input:hover { border-color: rgba(56,189,248,.4); background-color: rgba(15,23,42,.8); }
      .nx-input:focus { background-color: rgba(15,23,42,.9); border-color: #38bdf8; box-shadow: 0 0 0 3.5px rgba(56,189,248,.15), 0 4px 12px rgba(2,132,199,.2); }

      .nx-textarea {
        background-color: rgba(15,23,42,.6); border: 1px solid rgba(148,163,184,.3); color: #f8fafc;
        padding: .9rem 1rem; border-radius: 12px; font-family: 'JetBrains Mono','Fira Code',monospace;
        font-size: .84rem; line-height: 1.5; outline: none; resize: vertical; width: 100%; transition: all .2s cubic-bezier(.16,1,.3,1);
      }
      .nx-textarea:focus { background-color: rgba(15,23,42,.9); border-color: #38bdf8; box-shadow: 0 0 0 4px rgba(56,189,248,.15); }
      .nx-textarea:disabled { opacity: .6; }

      .nx-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .nx-scroll::-webkit-scrollbar-track { background-color: rgba(15,23,42,.5); border-radius: 6px; }
      .nx-scroll::-webkit-scrollbar-thumb { background-color: rgba(56,189,248,.3); border-radius: 6px; }
      .nx-scroll::-webkit-scrollbar-thumb:hover { background-color: #38bdf8; }

      .nx-backdrop { position: fixed; inset: 0; background-color: rgba(2,4,10,.65); display: flex; justify-content: center; align-items: center;
        z-index: 1050; backdrop-filter: blur(12px); animation: nxBackdrop .22s ease forwards; padding: 16px; }
      .nx-panel { animation: nxPop .32s cubic-bezier(.16,1,.3,1) forwards; }

      .nx-label { color: #94a3b8; font-size: .76rem; font-weight: 700; letter-spacing: .02em; }
      .nx-eyebrow { color: #64748b; font-size: .66rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
      .nx-divider { width: 1px; height: 22px; background-color: rgba(148,163,184,.2); margin: 0 4px; }

      .nx-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: .68rem;
        font-weight: 700; letter-spacing: .04em; border: 1px solid; white-space: nowrap; }
      .nx-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; animation: nxRing 1.6s infinite; }
      .nx-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }

      .nx-chip { display: inline-flex; align-items: center; gap: 7px; padding: .42rem .8rem; border-radius: 10px; font-size: .74rem; font-weight: 600;
        border: 1px solid; cursor: pointer; transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s, background-color .18s; user-select: none; }
      .nx-chip:hover { transform: translateY(-1px); }
      .nx-chip.active { box-shadow: 0 0 0 2px currentColor inset; }

      .nx-tabs { display: inline-flex; gap: 4px; padding: 4px; background: rgba(11,15,25,.85); border: 1px solid rgba(56,189,248,.15);
        border-radius: 13px; backdrop-filter: blur(24px); }
      .nx-tab { display: inline-flex; align-items: center; gap: 8px; padding: .55rem 1.1rem; border-radius: 10px; font-size: .8rem; font-weight: 700;
        color: #64748b; cursor: pointer; transition: all .22s cubic-bezier(.16,1,.3,1); user-select: none; border: 1px solid transparent; }
      .nx-tab:hover { color: #cbd5e1; background: rgba(30,41,59,.5); }
      .nx-tab.on { color: #fff; background: linear-gradient(135deg, rgba(2,132,199,.35), rgba(3,105,161,.25)); border-color: rgba(56,189,248,.4);
        box-shadow: 0 4px 14px -4px rgba(2,132,199,.5); }
      .nx-tab .count { font-size: .66rem; padding: 1px 7px; border-radius: 999px; background: rgba(148,163,184,.15); color: #94a3b8; }
      .nx-tab.on .count { background: rgba(255,255,255,.15); color: #e0f2fe; }

      .nx-grid-wrap { overflow: auto; max-height: 64vh; }
      table.nx-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: .8rem; font-family: 'Inter', -apple-system, sans-serif; }
      table.nx-table th { position: sticky; top: 0; z-index: 2; background: rgba(8,12,22,.97); color: #64748b; text-align: left;
        padding: .8rem .75rem; font-size: .66rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap;
        border-bottom: 1px solid rgba(56,189,248,.2); }
      table.nx-table td { padding: .62rem .75rem; border-bottom: 1px solid rgba(148,163,184,.07); color: #cbd5e1; vertical-align: middle; }
      table.nx-table tbody tr { animation: nxRow .35s cubic-bezier(.16,1,.3,1) both; transition: background-color .15s; }
      table.nx-table tbody tr:hover td { background: rgba(56,189,248,.05); }
      table.nx-table tbody tr.sel td { background: rgba(2,132,199,.1); }
      table.nx-table td.num { font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
      table.nx-table tr.group td { background: linear-gradient(90deg, rgba(168,85,247,.14), rgba(11,15,25,0) 70%); border-top: 1px solid rgba(168,85,247,.35); }

      .nx-eps { display: inline-flex; align-items: center; gap: 7px; padding: 4px 9px; border-radius: 8px; cursor: pointer;
        font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: .78rem; color: #e0f2fe;
        background: rgba(2,132,199,.12); border: 1px solid rgba(56,189,248,.22); transition: all .18s; white-space: nowrap; }
      .nx-eps:hover { background: rgba(2,132,199,.28); border-color: #38bdf8; box-shadow: 0 4px 14px -4px rgba(56,189,248,.5); }

      .nx-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 7px; font-size: .66rem; font-weight: 800;
        letter-spacing: .03em; border: 1px solid; white-space: nowrap; }

      .nx-check { width: 15px; height: 15px; accent-color: #0ea5e9; cursor: pointer; }

      .nx-progress { position: relative; height: 7px; border-radius: 99px; background: rgba(148,163,184,.15); overflow: hidden; }
      .nx-progress > div { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#0284c7,#38bdf8,#10b981); transition: width .4s; }
      .nx-progress.indet > div { width: 40% !important; animation: nxSweep 1.2s ease-in-out infinite; }

      .nx-empty { padding: 4rem 1rem; text-align: center; }
      .nx-loader { width: 54px; height: 54px; margin: 0 auto 1rem; border-radius: 50%; border: 3px solid rgba(56,189,248,.15);
        border-top-color: #38bdf8; animation: nxSpin .9s linear infinite; box-shadow: 0 0 30px rgba(56,189,248,.25); }
    `}</style>
  );
}
