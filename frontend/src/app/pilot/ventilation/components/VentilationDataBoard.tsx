import React, { useState } from 'react';
import DataTableViewer from './DataTableViewer';
import { Layers } from 'lucide-react';

export default function VentilationDataBoard({ dataMap }: { dataMap: Record<string, any[]> }) {
  const sheetNames = Object.keys(dataMap);
  const [activeTab, setActiveTab] = useState<string>(sheetNames[0] || "");

  if (sheetNames.length === 0) return null;

  return (
    <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(51, 65, 85, 0.8)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginTop: '2rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
        <Layers size={20} color="#39ff14" />
        <h3 style={{ color: '#fff', fontFamily: 'monospace', margin: 0, letterSpacing: '1px' }}>WORKSPACE DATA TABS</h3>
      </div>

      {/* TABS HEADER */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', borderBottom: '1px solid rgba(51, 65, 85, 0.8)', paddingBottom: '10px', marginBottom: '20px' }}>
        {sheetNames.map((sheet) => (
          <button
            key={sheet}
            onClick={() => setActiveTab(sheet)}
            style={{
              padding: '8px 15px', fontFamily: 'monospace', fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              backgroundColor: activeTab === sheet ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
              border: activeTab === sheet ? '1px solid #00f0ff' : '1px solid transparent',
              color: activeTab === sheet ? '#00f0ff' : '#94a3b8',
              borderRadius: '6px'
            }}
          >
            {sheet} <span style={{fontSize:'0.7rem', color: '#64748b', marginLeft:'5px'}}>({dataMap[sheet].length})</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab && dataMap[activeTab] && (
        <DataTableViewer data={dataMap[activeTab]} />
      )}

    </div>
  );
}