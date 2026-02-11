"use client";

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei';
import DataTerrain from './DataTerrain';
import Tooltip from './Tooltip';
import { TerrainData } from './types';

export default function Workflow3DChart() {
  const [data, setData] = useState<TerrainData[]>([]);
  const [hoveredData, setHoveredData] = useState<TerrainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/stats/terrain')
      .then(res => {
          if(!res.ok) throw new Error("API Error");
          return res.json();
      })
      .then(d => {
        // \ud83d\udee1\ufe0f Sécurité : Dima array
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(e => {
          console.error("3D Data Error:", e);
          setData([]); // Fallback vide pour éviter le crash
          setLoading(false);
      });
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      
      <Tooltip data={hoveredData} visible={!!hoveredData} />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#00f2ea', fontFamily: 'monospace', letterSpacing: 2 }}>
          [ INITIALIZING NEURAL MAP... ]
        </div>
      ) : (
        <Canvas shadows dpr={[1, 2]}>
          {/* Camera mbe33da bach tchoof l'scene kamla */}
          <PerspectiveCamera makeDefault position={[50, 40, 70]} fov={45} />
          
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={10}
            maxDistance={150}
            autoRotate={!hoveredData}
            autoRotateSpeed={0.2}
          />
          
          <ambientLight intensity={0.4} />
          <pointLight position={[20, 50, 20]} intensity={2} color="#00f2ea" distance={100} />
          <pointLight position={[-20, 20, -20]} intensity={1.5} color="#ff0055" distance={100} />
          
          <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
          <Environment preset="city" />

          {/* \ud83d\udd25 Pass Data safely */}
          <DataTerrain data={data} onHover={setHoveredData} />
        </Canvas>
      )}
    </div>
  );
}