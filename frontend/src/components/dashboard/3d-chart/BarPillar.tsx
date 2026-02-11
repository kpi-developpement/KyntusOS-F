"use client";

import { useState, useMemo } from "react";
import { Text, Html, MeshTransmissionMaterial, Edges } from "@react-three/drei";
import { useSpring, animated, config } from "@react-spring/three";
import { Activity, CheckCircle, Layers, AlertCircle } from "lucide-react";

const COLORS = [
    "#00f2ea", "#7928ca", "#ff0080", "#ff4d4d", "#fca311", "#39ff14",
];

export function BarPillar({ data, position, index }: any) {
  const [hovered, setHovered] = useState(false);
  
  const themeColor = useMemo(() => COLORS[index % COLORS.length], [index]);
  const targetHeight = (data.progress / 100) * 5; 

  // Animation dyal Tla3 + Shape Morphing (Scale X/Z)
  const { scaleY, widthScale } = useSpring({
    from: { scaleY: 0, widthScale: 0.8 },
    to: { 
        scaleY: targetHeight,
        widthScale: hovered ? 1 : 0.8 // Kayghlad chwiya f l'hover
    },
    delay: index * 100,
    config: config.wobbly,
  });

  return (
    <group position={position}>
      {/* 1. LA BARRE PRINCIPALE (Fixe, pas de rotation) */}
      <animated.mesh 
        position-y={scaleY.to(s => s / 2)}
        scale-y={scaleY}
        scale-x={widthScale}
        scale-z={widthScale}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* Changement de forme visuel : Box avec edges */}
        <boxGeometry args={[1, 1, 1]} /> 
        
        {/* Material Simple et Clean */}
        <meshPhysicalMaterial 
            color={hovered ? themeColor : "#222"} // Noir au repos, Couleur au hover
            emissive={themeColor}
            emissiveIntensity={hovered ? 0.5 : 0.1} // Cha3el f l'hover
            metalness={0.8}
            roughness={0.2}
            transparent
            opacity={0.9}
        />

        {/* 2. EFFET "SHAPE CHANGE" (Wireframe apparaît au hover) */}
        {/* Hada kay3ti l'impression anna l'structure tbdlat */}
        <Edges 
            visible={true} 
            scale={1.05} 
            threshold={15} 
            color={hovered ? "#fff" : themeColor} 
        />
      </animated.mesh>
      
      {/* 3. LABEL AXE X (Nom du projet en bas) - Fixe */}
      <Text
        position={[0, -0.5, 0.8]} // Avancé un peu pour être lisible
        fontSize={0.22}
        color={hovered ? "#fff" : "#888"}
        anchorX="center"
        anchorY="top"
        // Rotation légere pour lecture facile
        rotation={[-Math.PI / 6, 0, 0]} 
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      >
        {data.templateName.length > 12 ? data.templateName.substring(0, 12) + ".." : data.templateName}
      </Text>

      {/* 4. HTML TOOLTIP (CORRIGÉ: Smya kamla katban) */}
      {hovered && (
        <Html center position={[0, targetHeight + 1.2, 0]} style={{pointerEvents:'none', zIndex: 100}}>
            <div style={{
                background: "rgba(10, 10, 10, 0.95)",
                border: `1px solid ${themeColor}`,
                borderRadius: "8px",
                padding: "12px",
                width: "max-content", // S'adapte au contenu
                maxWidth: "250px",    // Max limite pour pas casser l'écran
                backdropFilter: "blur(8px)",
                boxShadow: `0 5px 20px rgba(0,0,0,0.5)`,
                color: "white",
                fontFamily: "sans-serif",
                textAlign: "left"
            }}>
                {/* Header: Nom Complet sans coupure */}
                <h4 style={{
                    margin: "0 0 8px 0", 
                    fontSize: "0.85rem", 
                    color: "white", 
                    borderBottom:`1px solid ${themeColor}50`, 
                    paddingBottom:"5px",
                    whiteSpace: "normal", // Permet le retour à la ligne
                    lineHeight: "1.2"
                }}>
                    {data.templateName}
                </h4>

                {/* Data Grid Compacte */}
                <div style={{display: "flex", flexDirection:"column", gap: "6px", fontSize: "0.75rem", color:"#ccc"}}>
                    <div style={{display:"flex", justifyContent:"space-between"}}>
                        <span>Status:</span>
                        <span style={{color: themeColor, display:"flex", alignItems:"center", gap:"4px"}}>
                            {data.progress === 100 ? <CheckCircle size={10}/> : <Activity size={10}/>}
                            {data.progress === 100 ? "Terminé" : "En cours"}
                        </span>
                    </div>
                    
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                         <span>Progress:</span>
                         <span style={{fontWeight:"bold", color:"white"}}>{data.progress}%</span>
                    </div>

                    {/* Mini Bar dans le tooltip */}
                    <div style={{width:"100%", height:"4px", background:"#333", borderRadius:"2px", marginTop:"2px"}}>
                        <div style={{width: `${data.progress}%`, height:"100%", background: themeColor, borderRadius:"2px"}}></div>
                    </div>
                </div>
            </div>
        </Html>
      )}
    </group>
  );
}