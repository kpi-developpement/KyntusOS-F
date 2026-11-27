"use client";

/**
 * ============================================================================
 * KYNTUS NEXUS · BYTEL API — 2026 ENTERPRISE EDITION (70% WHITE / 30% BLUE)
 * ============================================================================
 * Aesthetic: Alabaster & Sapphire Glass, Linear/Stripe/Vercel 2026 DataGrid,
 * Spring micro-interactions, GPU-accelerated transitions, zero native dropdowns.
 */
export default function NexusStyles() {
  return (
    <style>{`
      :root {
        --nx-blue-950: #0a1938;
        --nx-blue-900: #0f2557;
        --nx-blue-800: #1e3a8a;
        --nx-blue-700: #1d4ed8;
        --nx-blue-600: #2563eb;
        --nx-blue-500: #3b82f6;
        --nx-blue-400: #60a5fa;
        --nx-blue-300: #93c5fd;
        --nx-blue-200: #bfdbfe;
        --nx-blue-100: #dbeafe;
        --nx-blue-50:  #eff6ff;
        --nx-sky-500:  #0ea5e9;
        --nx-sky-100:  #e0f2fe;

        --nx-white:    #ffffff;
        --nx-bg:       #f4f8ff;
        --nx-surface:  #f8fbff;
        --nx-line:     #e2ecf8;
        --nx-line-str: #cbdcf2;

        --nx-ink:      #0f2557;
        --nx-ink-2:    #334e7b;
        --nx-muted:    #647a9e;

        --nx-ok:       #059669;
        --nx-ok-bg:    #ecfdf5;
        --nx-ok-line:  #a7f3d0;

        --nx-warn:     #d97706;
        --nx-warn-bg:  #fffbeb;
        --nx-warn-line:#fde68a;

        --nx-err:      #dc2626;
        --nx-err-bg:   #fef2f2;
        --nx-err-line: #fecaca;

        --nx-ease:     cubic-bezier(0.22, 1, 0.36, 1);
        --nx-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes nxEntrance {
        0%   { opacity: 0; transform: translateY(14px) scale(0.995); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes nxBackdrop {
        0%   { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes nxPop {
        0%   { opacity: 0; transform: scale(0.95) translateY(12px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes nxRow {
        0%   { opacity: 0; transform: translateY(5px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes nxPulse {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.45; }
      }
      @keyframes nxSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes nxBlink {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.84); }
      }
      @keyframes nxSweep {
        0%   { transform: translateX(-110%); }
        100% { transform: translateX(260%); }
      }
      @keyframes nxRing {
        0%   { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5); }
        100% { box-shadow: 0 0 0 9px rgba(37, 99, 235, 0); }
      }
      @keyframes nxRingGreen {
        0%   { box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.5); }
        100% { box-shadow: 0 0 0 8px rgba(5, 150, 105, 0); }
      }
      @keyframes nxSlideLight {
        0%        { transform: translateX(-130%); }
        65%, 100% { transform: translateX(420%); }
      }
      @keyframes nxFloatOrb {
        0%   { transform: translate3d(0, 0, 0) scale(1); }
        100% { transform: translate3d(26px, -20px, 0) scale(1.06); }
      }

      /* ======================== STAGE & BACKGROUND ======================== */
      .nx-viewport {
        position: relative;
        isolation: isolate;
        min-height: 100vh;
        width: 100%;
        background: linear-gradient(155deg, #ffffff 0%, #f4f8ff 52%, #e8f1fe 100%);
        color: var(--nx-ink);
        font-family: var(--k-font-display);
        -webkit-font-smoothing: antialiased;
        margin-top: -120px;
        padding: 132px 1.75rem 3.5rem;
        overflow-x: hidden;
      }
      .nx-viewport::before {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -2;
        pointer-events: none;
        background:
          radial-gradient(850px 420px at 92% 4%, rgba(37, 99, 235, 0.11), transparent 70%),
          radial-gradient(750px 420px at 8% 92%, rgba(14, 165, 233, 0.10), transparent 70%),
          linear-gradient(155deg, #ffffff 0%, #f4f8ff 55%, #eaf2ff 100%);
      }
      .nx-viewport::after {
        content: "";
        position: fixed;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        background-image:
          linear-gradient(rgba(37, 99, 235, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37, 99, 235, 0.045) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: radial-gradient(ellipse 85% 65% at 50% 10%, #000 25%, transparent 80%);
        -webkit-mask-image: radial-gradient(ellipse 85% 65% at 50% 10%, #000 25%, transparent 80%);
      }

      .nx-stage {
        animation: nxEntrance 0.5s var(--nx-ease) forwards;
        max-width: 1760px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }
      .nx-spin  { animation: nxSpin 0.95s linear infinite; }
      .nx-pulse { animation: nxPulse 1.3s ease-in-out infinite; }

      /* ======================== SURFACES & CARDS ======================== */
      .nx-card {
        position: relative;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--nx-line);
        border-radius: 20px;
        box-shadow:
          0 1px 2px rgba(15, 37, 87, 0.04),
          0 14px 36px -16px rgba(29, 78, 216, 0.14),
          inset 0 1px 0 #ffffff;
        transition: border-color 0.25s var(--nx-ease), box-shadow 0.25s var(--nx-ease), transform 0.25s var(--nx-ease);
      }
      .nx-card:hover {
        border-color: var(--nx-blue-200);
        box-shadow:
          0 4px 12px rgba(15, 37, 87, 0.05),
          0 20px 44px -18px rgba(29, 78, 216, 0.22),
          inset 0 1px 0 #ffffff;
      }

      .nx-hero-stripe {
        position: absolute;
        left: 0; right: 0; top: 0;
        height: 3.5px;
        overflow: hidden;
        border-radius: 20px 20px 0 0;
        background: linear-gradient(90deg, var(--nx-blue-300), var(--nx-blue-700) 45%, var(--nx-sky-500) 75%, var(--nx-blue-200));
      }
      .nx-hero-stripe::after {
        content: "";
        position: absolute;
        inset: 0;
        width: 32%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.92), transparent);
        animation: nxSlideLight 4.8s var(--nx-ease) infinite;
      }

      /* ======================== BUTTONS ======================== */
      .nx-btn {
        position: relative;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        height: 38px;
        padding: 0 14px;
        background: var(--nx-white);
        color: var(--nx-ink-2);
        border: 1px solid var(--nx-line-str);
        font-family: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        border-radius: 11px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
        transition:
          transform 0.2s var(--nx-ease),
          background-color 0.18s,
          border-color 0.18s,
          box-shadow 0.2s var(--nx-ease),
          color 0.18s;
        box-shadow: 0 1px 2px rgba(15, 37, 87, 0.04);
      }
      .nx-btn::before {
        content: '';
        position: absolute;
        top: 0; left: -130%;
        width: 65%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
        transform: skewX(-20deg);
        transition: left 0.55s var(--nx-ease);
        pointer-events: none;
      }
      .nx-btn:hover:not(:disabled)::before { left: 145%; }
      .nx-btn:hover:not(:disabled) {
        transform: translateY(-1.5px);
        background: var(--nx-blue-50);
        border-color: var(--nx-blue-300);
        color: var(--nx-blue-700);
        box-shadow: 0 8px 18px -8px rgba(37, 99, 235, 0.25);
      }
      .nx-btn:active:not(:disabled) { transform: translateY(0) scale(0.975); }
      .nx-btn:disabled { opacity: 0.42; cursor: not-allowed; box-shadow: none; }

      .nx-btn.sm { height: 33px; padding: 0 11px; font-size: 0.73rem; border-radius: 9px; gap: 6px; }
      .nx-btn.xs { height: 27px; padding: 0 9px; font-size: 0.68rem; border-radius: 12px; gap: 4px; font-weight: 800; }
      .nx-btn.icon { width: 34px; height: 34px; padding: 0; border-radius: 10px; }

      .nx-primary {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        border-color: #1d4ed8;
        box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.28);
      }
      .nx-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
        border-color: #1e3a8a;
        color: #ffffff;
        box-shadow: 0 12px 26px -6px rgba(29, 78, 216, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.35);
      }

      .nx-soft {
        background: var(--nx-blue-50);
        border-color: var(--nx-blue-200);
        color: var(--nx-blue-700);
      }
      .nx-soft:hover:not(:disabled) {
        background: var(--nx-blue-100);
        border-color: var(--nx-blue-400);
        color: var(--nx-blue-800);
        box-shadow: 0 8px 18px -8px rgba(37, 99, 235, 0.28);
      }

      .nx-sky {
        background: #f0f9ff;
        border-color: #bae6fd;
        color: #0369a1;
      }
      .nx-sky:hover:not(:disabled) {
        background: #e0f2fe;
        border-color: #38bdf8;
        color: #075985;
        box-shadow: 0 8px 18px -8px rgba(14, 165, 233, 0.28);
      }

      .nx-violet {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        border-color: #93c5fd;
        color: #1e40af;
      }
      .nx-violet:hover:not(:disabled) {
        background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
        border-color: #1e40af;
        color: #ffffff;
        box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.45);
      }

      .nx-ok {
        background: var(--nx-ok-bg);
        border-color: var(--nx-ok-line);
        color: var(--nx-ok);
      }
      .nx-ok:hover:not(:disabled) {
        background: var(--nx-ok);
        border-color: var(--nx-ok);
        color: #ffffff;
        box-shadow: 0 8px 18px -6px rgba(5, 150, 105, 0.4);
      }

      .nx-warn {
        background: var(--nx-warn-bg);
        border-color: var(--nx-warn-line);
        color: var(--nx-warn);
      }
      .nx-warn:hover:not(:disabled) {
        background: #f59e0b;
        border-color: #d97706;
        color: #ffffff;
        box-shadow: 0 8px 18px -6px rgba(217, 119, 6, 0.4);
      }

      .nx-danger {
        background: var(--nx-err-bg);
        border-color: var(--nx-err-line);
        color: var(--nx-err);
      }
      .nx-danger:hover:not(:disabled) {
        background: var(--nx-err);
        border-color: var(--nx-err);
        color: #ffffff;
        box-shadow: 0 8px 18px -6px rgba(220, 38, 38, 0.4);
      }

      /* ======================== INPUTS & TEXTAREAS ======================== */
      .nx-input {
        height: 38px;
        background: var(--nx-surface);
        border: 1px solid var(--nx-line-str);
        color: var(--nx-ink);
        padding: 0 0.85rem;
        border-radius: 11px;
        font-family: inherit;
        font-size: 0.81rem;
        font-weight: 600;
        outline: none;
        transition: all 0.18s var(--nx-ease);
        color-scheme: light;
      }
      .nx-input::placeholder { color: var(--nx-muted); font-weight: 500; }
      .nx-input:hover { border-color: var(--nx-blue-300); background: var(--nx-white); }
      .nx-input:focus {
        background: var(--nx-white);
        border-color: var(--nx-blue-600);
        box-shadow: 0 0 0 3.5px rgba(37, 99, 235, 0.14), 0 4px 12px rgba(29, 78, 216, 0.08);
      }

      .nx-textarea {
        background: var(--nx-surface);
        border: 1px solid var(--nx-line-str);
        color: var(--nx-ink);
        padding: 0.85rem 1rem;
        border-radius: 13px;
        font-family: var(--k-font-mono);
        font-size: 0.81rem;
        font-weight: 500;
        line-height: 1.55;
        outline: none;
        resize: vertical;
        width: 100%;
        transition: all 0.18s var(--nx-ease);
      }
      .nx-textarea::placeholder { color: var(--nx-muted); }
      .nx-textarea:hover { border-color: var(--nx-blue-300); background: var(--nx-white); }
      .nx-textarea:focus {
        background: var(--nx-white);
        border-color: var(--nx-blue-600);
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
      }
      .nx-textarea:disabled { opacity: 0.55; background: #f1f5f9; }

      /* ======================== SCROLLBARS ======================== */
      .nx-scroll {
        scrollbar-width: thin;
        scrollbar-color: var(--nx-blue-300) var(--nx-surface);
      }
      .nx-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .nx-scroll::-webkit-scrollbar-track { background: var(--nx-surface); border-radius: 12px; }
      .nx-scroll::-webkit-scrollbar-thumb {
        background: var(--nx-blue-200);
        border-radius: 12px;
        border: 2px solid var(--nx-surface);
      }
      .nx-scroll::-webkit-scrollbar-thumb:hover { background: var(--nx-blue-500); }

      /* ======================== MODALS ======================== */
      .nx-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 37, 87, 0.34);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100500;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        animation: nxBackdrop 0.2s ease forwards;
        padding: 18px;
      }
      .nx-panel { animation: nxPop 0.28s var(--nx-ease) forwards; }

      /* ======================== TYPOGRAPHY & BADGES ======================== */
      .nx-label   { color: var(--nx-ink-2); font-size: 0.76rem; font-weight: 800; letter-spacing: 0.01em; }
      .nx-eyebrow { color: var(--nx-muted); font-size: 0.64rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .nx-divider { width: 1px; height: 24px; background: var(--nx-line-str); margin: 0 4px; flex-shrink: 0; }

      .nx-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 0.68rem;
        font-weight: 800;
        letter-spacing: 0.04em;
        border: 1px solid var(--nx-blue-200);
        background: var(--nx-blue-50);
        color: var(--nx-blue-700);
        white-space: nowrap;
      }
      .nx-live-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: #059669;
        animation: nxRingGreen 1.8s infinite;
      }
      .nx-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }

      /* ======================== KPI CHIPS ======================== */
      .nx-chip {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0.45rem 0.85rem;
        border-radius: 12px;
        font-size: 0.74rem;
        font-weight: 700;
        background: var(--nx-white);
        border: 1px solid var(--nx-line-str);
        color: var(--nx-ink-2);
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(15, 37, 87, 0.04);
        transition: all 0.2s var(--nx-ease);
        user-select: none;
      }
      .nx-chip:hover {
        transform: translateY(-1.5px);
        border-color: var(--nx-blue-400);
        box-shadow: 0 8px 18px -10px rgba(37, 99, 235, 0.25);
      }
      .nx-chip.active {
        background: var(--nx-blue-50) !important;
        border-color: var(--nx-blue-600) !important;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18), 0 8px 18px -8px rgba(37, 99, 235, 0.28);
      }

      /* ======================== SEGMENTED TABS ======================== */
      .nx-tabs {
        display: inline-flex;
        gap: 4px;
        padding: 5px;
        background: var(--nx-white);
        border: 1px solid var(--nx-line-str);
        border-radius: 15px;
        box-shadow: 0 4px 16px -6px rgba(15, 37, 87, 0.08);
      }
      .nx-tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0.52rem 1.15rem;
        border-radius: 11px;
        font-size: 0.79rem;
        font-weight: 800;
        color: var(--nx-muted);
        cursor: pointer;
        transition: all 0.22s var(--nx-ease);
        user-select: none;
        border: 1px solid transparent;
      }
      .nx-tab:hover {
        color: var(--nx-blue-700);
        background: var(--nx-blue-50);
      }
      .nx-tab.on {
        color: #ffffff;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        border-color: #1d4ed8;
        box-shadow: 0 6px 16px -4px rgba(37, 99, 235, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
      }
      .nx-tab .count {
        font-size: 0.66rem;
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--nx-blue-50);
        color: var(--nx-blue-700);
        font-weight: 900;
        font-variant-numeric: tabular-nums;
      }
      .nx-tab.on .count {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
      }

      /* ======================== 2026 ENTERPRISE DATAGRID ======================== */
      .nx-grid-wrap {
        overflow: auto;
        max-height: calc(100vh - 320px);
        min-height: 380px;
        background: var(--nx-white);
        position: relative;
      }
      table.nx-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 0.8rem;
        font-family: var(--k-font-display);
      }
      table.nx-table.compact td {
        padding-top: 0.36rem;
        padding-bottom: 0.36rem;
        font-size: 0.77rem;
      }
      table.nx-table.compact th {
        padding-top: 0.55rem;
        padding-bottom: 0.55rem;
      }

      table.nx-table th {
        position: sticky;
        top: 0;
        z-index: 25;
        background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
        color: var(--nx-blue-900);
        text-align: left;
        padding: 0.78rem 0.85rem;
        font-size: 0.65rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        white-space: nowrap;
        border-bottom: 1.5px solid var(--nx-blue-200);
        border-right: 1px solid rgba(203, 220, 242, 0.45);
        user-select: none;
        box-shadow: 0 2px 6px rgba(15, 37, 87, 0.03);
        transition: background-color 0.15s, color 0.15s;
      }
      table.nx-table th:last-child { border-right: none; }
      table.nx-table th.sortable { cursor: pointer; }
      table.nx-table th.sortable:hover {
        background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
        color: var(--nx-blue-700);
      }
      table.nx-table th.sorted {
        background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
        color: var(--nx-blue-700);
        box-shadow: inset 0 -2.5px 0 var(--nx-blue-600);
      }

      table.nx-table td {
        padding: 0.62rem 0.85rem;
        border-bottom: 1px solid var(--nx-line);
        border-right: 1px solid rgba(226, 236, 248, 0.6);
        color: var(--nx-ink-2);
        vertical-align: middle;
        background: var(--nx-white);
        transition: background-color 0.14s ease;
      }
      table.nx-table td:last-child { border-right: none; }

      table.nx-table tbody tr {
        animation: nxRow 0.28s var(--nx-ease) both;
      }
      table.nx-table tbody tr:nth-child(even) td {
        background: #fafdff;
      }
      table.nx-table tbody tr:hover td {
        background: #eff6ff !important;
      }
      table.nx-table tbody tr:hover td:first-child {
        box-shadow: inset 3.5px 0 0 var(--nx-blue-600);
      }
      table.nx-table tbody tr.sel td {
        background: #dbeafe !important;
      }
      table.nx-table tbody tr.sel td:first-child {
        box-shadow: inset 4px 0 0 var(--nx-blue-700);
      }

      table.nx-table td.num {
        font-variant-numeric: tabular-nums;
        font-family: var(--k-font-mono);
        text-align: right;
        white-space: nowrap;
      }

      table.nx-table tr.group td {
        background: linear-gradient(90deg, #eff6ff 0%, #f8fbff 65%, #ffffff 100%) !important;
        border-top: 1.5px solid var(--nx-blue-200);
        border-bottom: 1px solid var(--nx-blue-200);
        padding: 0.65rem 1rem;
      }

      /* Sticky first & last columns for enterprise ergonomics */
      table.nx-table th.sticky-left,
      table.nx-table td.sticky-left {
        position: sticky;
        left: 0;
        z-index: 15;
      }
      table.nx-table th.sticky-left { z-index: 30; }

      table.nx-table th.sticky-right,
      table.nx-table td.sticky-right {
        position: sticky;
        right: 0;
        z-index: 15;
        border-left: 1px solid var(--nx-line-str);
        box-shadow: -6px 0 14px -8px rgba(15, 37, 87, 0.12);
      }
      table.nx-table th.sticky-right { z-index: 30; }

      /* EPS Badge inside table */
      .nx-eps-group {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .nx-eps {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 12px;
        cursor: pointer;
        font-family: var(--k-font-mono);
        font-weight: 800;
        font-size: 0.76rem;
        color: var(--nx-blue-800);
        background: var(--nx-blue-50);
        border: 1px solid var(--nx-blue-200);
        transition: all 0.16s var(--nx-ease);
        white-space: nowrap;
      }
      .nx-eps:hover {
        background: var(--nx-blue-600);
        color: #ffffff;
        border-color: var(--nx-blue-600);
        transform: translateY(-1px);
        box-shadow: 0 6px 14px -4px rgba(37, 99, 235, 0.45);
      }
      .nx-eps:hover svg { color: #ffffff !important; }

      .nx-copy-mini {
        width: 24px;
        height: 24px;
        border-radius: 7px;
        border: 1px solid var(--nx-line-str);
        background: var(--nx-white);
        color: var(--nx-blue-600);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0;
        transition: all 0.15s var(--nx-ease);
        flex-shrink: 0;
      }
      tr:hover .nx-copy-mini { opacity: 0.85; }
      .nx-copy-mini:hover {
        opacity: 1 !important;
        background: var(--nx-blue-600);
        color: #ffffff;
        border-color: var(--nx-blue-600);
        transform: scale(1.06);
      }

      .nx-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 3.5px 9px;
        border-radius: 999px;
        font-size: 0.66rem;
        font-weight: 800;
        letter-spacing: 0.025em;
        border: 1px solid;
        white-space: nowrap;
      }

      .nx-check {
        width: 16px;
        height: 16px;
        accent-color: var(--nx-blue-600);
        cursor: pointer;
        border-radius: 10px;
      }

      /* ======================== PROGRESS & LOADERS ======================== */
      .nx-progress {
        position: relative;
        height: 7px;
        border-radius: 99px;
        background: var(--nx-blue-100);
        overflow: hidden;
      }
      .nx-progress > div {
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #2563eb, #0ea5e9, #1d4ed8);
        transition: width 0.35s var(--nx-ease);
      }
      .nx-progress.indet > div {
        width: 40% !important;
        animation: nxSweep 1.2s ease-in-out infinite;
      }

      .nx-empty {
        padding: 4.5rem 1.5rem;
        text-align: center;
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      }
      .nx-loader {
        width: 52px;
        height: 52px;
        margin: 0 auto 1rem;
        border-radius: 50%;
        border: 3.5px solid var(--nx-blue-100);
        border-top-color: var(--nx-blue-600);
        animation: nxSpin 0.85s linear infinite;
        box-shadow: 0 8px 24px rgba(37, 99, 235, 0.18);
      }

      /* ======================== FLOATING SELECTION DOCK ======================== */
      .nx-floating-dock {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 950;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1.5px solid var(--nx-blue-300);
        border-radius: 18px;
        box-shadow:
          0 24px 48px -12px rgba(15, 37, 87, 0.28),
          0 0 0 4px rgba(37, 99, 235, 0.10);
        animation: nxPop 0.28s var(--nx-spring) forwards;
      }
    `}</style>
  );
}
