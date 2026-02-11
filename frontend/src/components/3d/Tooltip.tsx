import React from 'react';
import { TerrainData } from './types';

interface TooltipProps {
  data: TerrainData | null;
  visible: boolean;
}

export default function Tooltip({ data, visible }: TooltipProps) {
  if (!visible || !data) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(10, 15, 25, 0.95)',
      border: '1px solid #00f2ea',
      padding: '20px',
      borderRadius: '12px',
      color: 'white',
      backdropFilter: 'blur(10px)',
      pointerEvents: 'none',
      zIndex: 100,
      width: '280px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#00f2ea', textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
        {data.templateName}
      </h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
        <span style={{ color: '#888' }}>CHARGE (Y)</span>
        <span style={{ fontWeight: 'bold' }}>{data.totalTimeRemainingHours}h</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
        <span style={{ color: '#888' }}>COMPLEXIT\u00c9 (Z)</span>
        <span style={{ fontWeight: 'bold', color: '#ffd700' }}>LVL {data.complexity}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.8rem' }}>
        <span style={{ color: '#888' }}>ACTIVE TASKS</span>
        <span style={{ fontWeight: 'bold' }}>{data.activeTaskCount}</span>
      </div>
      
      {/* Risk Bar */}
      <div style={{ fontSize: '0.65rem', color: '#666', marginBottom: '5px' }}>RISK FACTOR</div>
      <div style={{ height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${data.riskFactor * 100}%`,
          background: data.riskFactor > 0.5 ? '#ff0055' : '#39ff14',
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  );
}