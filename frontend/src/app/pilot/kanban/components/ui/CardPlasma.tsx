"use client";
// Hada CSS Pure Animation (Performance 3aliya 7sen mn 50 Canvas)
export default function CardPlasma({ type }: { type: string }) {
  
  // Couleurs dynamiques
  let gradient = "linear-gradient(45deg, rgba(0,242,234,0.1), transparent)";
  if(type === 'DONE') gradient = "linear-gradient(45deg, rgba(0,255,136,0.1), transparent)";
  if(type === 'TODO') gradient = "linear-gradient(45deg, rgba(255,255,255,0.05), transparent)";

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '200%', height: '200%',
      background: `
        radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 50%),
        ${gradient}
      `,
      opacity: 0.5,
      animation: 'plasmaMove 10s linear infinite',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <style jsx>{`
        @keyframes plasmaMove {
          0% { transform: translate(-25%, -25%) rotate(0deg); }
          100% { transform: translate(-25%, -25%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}