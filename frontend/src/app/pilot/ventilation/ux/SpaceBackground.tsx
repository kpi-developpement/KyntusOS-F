"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

import * as THREE from 'three';

// ---------------------------------------------------------
// 0. SHADERS L-N-NEJMA (ALSINAT N-NAR) 🔥
// ---------------------------------------------------------
const starVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float time;
  
  // Classic 3D Noise for Fire Flares
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vPosition = position;
    
    // Alsinat n-nar (Vertex Displacement)
    float noise = snoise(position * 3.0 + time * 1.5); // Sro3a d-nar w l-hajm dyalha
    vec3 displacedPosition = position + normal * (noise * 0.25); // 0.25 howa toul d-nar
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const starFragmentShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float time;
  uniform vec3 baseColor;
  
  // Simple noise for fire colors
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(in vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(p + vec3(0,0,0)), hash(p + vec3(1,0,0)), f.x),
                   mix(hash(p + vec3(0,1,0)), hash(p + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(p + vec3(0,0,1)), hash(p + vec3(1,0,1)), f.x),
                   mix(hash(p + vec3(0,1,1)), hash(p + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    float n = noise(vPosition * 8.0 - time * 3.0);
    vec3 darkFire = vec3(1.0, 0.3, 0.0); // Nar mghlouqa f-l-wst
    vec3 fireColor = mix(darkFire, baseColor, n + 0.3);
    gl_FragColor = vec4(fireColor, 1.0);
  }
`;

// ---------------------------------------------------------
// 1. GENERATEUR DYAL TEXTURES ULTRA HD (1024x1024)
// ---------------------------------------------------------
const createPlanetTextures = () => {
  const textures = [];
  const types = [
    { bg: '#0f4c81', spots: '#2e7d32', filter: 'blur(10px)', count: 120 }, // Earth HD
    { bg: '#bf360c', spots: 'rgba(0,0,0,0.5)', filter: 'blur(5px)', count: 150 }, // Mars HD
    { bg: '#e0f7fa', spots: '#b2ebf2', filter: 'blur(3px)', count: 80 },  // Ice HD
    { bg: '#1a0000', spots: '#ff3d00', filter: 'blur(8px)', count: 100 }, // Lava HD
    { bg: '#212121', spots: '#000000', filter: 'blur(2px)', count: 60 },  // Obsidian HD
    { bg: '#4a148c', spots: '#e040fb', filter: 'blur(6px)', count: 90 }   // Amethyst HD
  ];

  types.forEach(t => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024; // 🔥 QUALITY UPGRADE 🔥
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, 1024, 1024);
    ctx.filter = t.filter;
    for (let i = 0; i < t.count; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 80 + 10, 0, Math.PI * 2);
      ctx.fillStyle = t.spots; ctx.fill();
    }
    textures.push(new THREE.CanvasTexture(canvas));
  });

  const gasTypes = [
    { c1: '#e6ceb8', c2: '#c4a484', c3: '#cd853f', c4: '#8b4513' }, // Jupiter HD
    { c1: '#00bcd4', c2: '#0288d1', c3: '#01579b', c4: '#004d40' }  // Neptune HD
  ];

  gasTypes.forEach(g => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, g.c1); grad.addColorStop(0.3, g.c2);
    grad.addColorStop(0.6, g.c3); grad.addColorStop(1, g.c4);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1024, 1024);
    ctx.filter = 'blur(8px)';
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(0, Math.random() * 1024, 1024, Math.random() * 40);
    }
    textures.push(new THREE.CanvasTexture(canvas));
  });

  return textures;
};

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
};

// ---------------------------------------------------------
// 2. MEJMOU3A CHAMSIYA (PERFECT ORBIT PHYSICS)
// ---------------------------------------------------------
const SolarSystem = ({ position, textures }: { position: [number, number, number], textures: THREE.CanvasTexture[] }) => {
  const systemRef = useRef<THREE.Group>(null);
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null);
  
  const planets = useMemo(() => {
    const numPlanets = Math.floor(Math.random() * 4) + 3; 
    return Array.from({ length: numPlanets }).map((_, i) => ({
      radius: (i + 1) * (Math.random() * 15 + 10), // Orbit wseee3 chwiya
      speed: (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1), 
      startAngle: Math.random() * Math.PI * 2, // Mnin ghay-bda f' l-massar
      scale: Math.random() * 2 + 1,
      textureId: Math.floor(Math.random() * 8),
      hasRing: Math.random() > 0.8,
      orbitColor: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      hasMoon: Math.random() > 0.5,
      moonRadius: Math.random() * 1.5 + 2,
      moonSpeed: Math.random() * 2 + 1,
    }));
  }, []);

  const starColor = useMemo(() => {
    const colors = ['#ffffff', '#e0f8ff', '#ffd27f', '#ff4d4d', '#b026ff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const starUniforms = useMemo(() => ({
    time: { value: 0 },
    baseColor: { value: new THREE.Color(starColor) }
  }), [starColor]);

  useFrame((state, delta) => {
    // T-7rik dyal nar f' n-nejma
    if (starMaterialRef.current) {
      starMaterialRef.current.uniforms.time.value += delta;
    }

    if (!systemRef.current) return;
    
    // 🔥 L-MANTIQ DYAL L-MASSARAT D-BSA7 🔥
    systemRef.current.children.forEach((orbitGroup) => {
      if (orbitGroup.userData.isOrbit) {
        // L-Group kamel kay-dour (L-Massar + L-Kawkab)
        orbitGroup.rotation.y += orbitGroup.userData.speed * delta;
        
        // L-Kawkab b-rasso (Child 1) kay-dour 3la rasso
        const planetGroup = orbitGroup.children[1];
        if (planetGroup) {
          planetGroup.rotation.y += 0.5 * delta;
          planetGroup.rotation.x += 0.2 * delta;
          
          // L-Qamar kay-dour 3la l-Kawkab
          const moonOrbit = planetGroup.children.find(c => c.userData.isMoonOrbit);
          if (moonOrbit) moonOrbit.rotation.y += moonOrbit.userData.speed * delta;
        }
      }
    });
  });

  return (
    <group ref={systemRef} position={position}>
      {/* ☀️ N-NEJMA (ALSINAT N-NAR / SHADER HIGH FPS) */}
      <mesh scale={[5, 5, 5]}>
        {/* 64x64 hiya l-asliya dyalek, khellinaha bash n-nar tban m-détayé */}
        <sphereGeometry args={[1, 64, 64]} /> 
        <shaderMaterial 
          ref={starMaterialRef}
          vertexShader={starVertexShader}
          fragmentShader={starFragmentShader}
          uniforms={starUniforms}
        />
      </mesh>
      
      {/* Glow dyal n-nejma (Optimized to 32x32 to boost FPS, identical look) */}
      <mesh scale={[11, 11, 11]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={starColor} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 🌍 L-KAWAKIB W L-MASSARAT */}
      {planets.map((p, i) => (
        // 🔥 L-GROUP LI KAY-DOUR KAMEL (KAY-HZZ L-MASSAR W L-KAWKAB) 🔥
        <group key={`orbit-${i}`} rotation={[0, p.startAngle, 0]} userData={{ isOrbit: true, speed: p.speed }}>
          
          {/* L-MASSAR (ORBIT LINE) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[p.radius, 0.05, 32, 200]} /> {/* Orbit N9iiii */}
            <meshBasicMaterial color={p.orbitColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
          </mesh>

          {/* L-KAWKAB (M-fixi f' l-qent dyal l-Massar `p.radius`) */}
          <group position={[p.radius, 0, 0]} scale={p.scale}>
            
            {/* L-QELB D-L-KAWKAB */}
            <mesh>
              <sphereGeometry args={[1, 64, 64]} /> {/* 64x64 HD Sphere (Kif bghitiha) */}
              <meshStandardMaterial map={textures[p.textureId]} bumpMap={textures[p.textureId]} bumpScale={0.1} roughness={0.8} metalness={0.2} />
            </mesh>
            
            {/* 🔥 L-GHLIFA D-L-KAWKAB (ATMOSPHERE) */}
            <mesh scale={[1.05, 1.05, 1.05]}>
              <sphereGeometry args={[1, 32, 32]} /> {/* Optimized to 32x32 for high FPS */}
              <meshPhysicalMaterial 
                color="#ffffff" transmission={1} opacity={1} transparent 
                roughness={0.1} ior={1.3} clearcoat={1} clearcoatRoughness={0.2} depthWrite={false} 
              />
            </mesh>
            
            {/* 🌘 L-QAMAR W L-MASSAR DYALO */}
            {p.hasMoon && (
              <group userData={{ isMoonOrbit: true, speed: p.moonSpeed }}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[p.moonRadius, 0.03, 16, 64]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
                </mesh>
                <mesh position={[p.moonRadius, 0, 0]} scale={[0.3, 0.3, 0.3]}>
                  <sphereGeometry args={[1, 16, 16]} /> {/* Optimized moon geometry for FPS */}
                  <meshStandardMaterial color="#90a4ae" roughness={0.9} bumpScale={0.1} />
                </mesh>
              </group>
            )}

            {/* L-KHWATEM DYAL L-KAWKAB */}
            {p.hasRing && (
              <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                <torusGeometry args={[2.5, 0.2, 32, 128]} />
                <meshStandardMaterial map={textures[p.textureId]} roughness={0.4} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------
// 3. UNIVERSE ENGINE
// ---------------------------------------------------------
const Universe = ({ isWarping }: { isWarping: boolean }) => {
  const universeRef = useRef<THREE.Group>(null);
  const speedMult = useRef(2.5);
  const isWarpingRef = useRef(isWarping);
  const planetTextures = useMemo(() => createPlanetTextures(), []);

  useEffect(() => { isWarpingRef.current = isWarping; }, [isWarping]);

  const systems = useMemo(() => {
    return Array.from({ length: 35 }).map(() => ({
      x: (Math.random() - 0.5) * 300,
      y: (Math.random() - 0.5) * 1800,
      z: (Math.random() - 0.5) * -5000 - 300 
    }));
  }, []);

  useFrame((state) => {
    if (!universeRef.current) return;
    
    const targetSpeed = isWarpingRef.current ? 600 : 2.5; 
    speedMult.current = THREE.MathUtils.lerp(speedMult.current, targetSpeed, 0.02);

    const targetFov = isWarpingRef.current ? 140 : 60;
    state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, 0.04);
    state.camera.updateProjectionMatrix();

    if (speedMult.current > 50) {
      const shakeForce = (speedMult.current / 600) * 1.5;
      state.camera.position.x = (Math.random() - 0.5) * shakeForce;
      state.camera.position.y = (Math.random() - 0.5) * shakeForce;
    } else {
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.1);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 0, 0.1);
    }

    universeRef.current.children.forEach((systemObj) => {
      systemObj.position.z += speedMult.current;
      if (systemObj.position.z > 200) {
        systemObj.position.z -= 5000;
        systemObj.position.x = (Math.random() - 0.5) * 1200;
        systemObj.position.y = (Math.random() - 0.5) * 600;
      }
    });

    if (!isWarpingRef.current) {
      const mouseX = state.pointer.x;
      const mouseY = state.pointer.y;
      state.camera.rotation.y = THREE.MathUtils.lerp(state.camera.rotation.y, -mouseX * 0.15, 0.03);
      state.camera.rotation.x = THREE.MathUtils.lerp(state.camera.rotation.x, mouseY * 0.15, 0.03);
    } else {
      state.camera.rotation.y = THREE.MathUtils.lerp(state.camera.rotation.y, 0, 0.05);
      state.camera.rotation.x = THREE.MathUtils.lerp(state.camera.rotation.x, 0, 0.05);
    }
  });

  return (
    <group ref={universeRef}>
      {systems.map((pos, i) => (
        <SolarSystem key={i} position={[pos.x, pos.y, pos.z]} textures={planetTextures} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------
// 4. DEEP SPACE EXTRAS (Stars & Nebulas)
// ---------------------------------------------------------
const DeepSpaceExtras = ({ isWarping }: { isWarping: boolean }) => {
  const starsRef = useRef<THREE.Points>(null);
  const heroStarsRef = useRef<THREE.InstancedMesh>(null);
  const nebulasRef = useRef<THREE.Points>(null);
  const speedMult = useRef(2.5);
  const isWarpingRef = useRef(isWarping);
  const glowTexture = useMemo(() => createGlowTexture(), []);

  useEffect(() => { isWarpingRef.current = isWarping; }, [isWarping]);

  // MICRO STARS
  const starsCount = 60000;
  const { starPos } = useMemo(() => {
    const pos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1500;
      pos[i * 3 + 2] = (Math.random() - 0.5) * -5000; 
    }
    return { starPos: pos };
  }, []);

  // HERO STARS (ULTRA SMOOTH 3D SPHERES)
  const heroCount = 2000;
  const { dummy, heroData, heroColors } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const data = Array.from({ length: heroCount }).map(() => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 1000,
      z: (Math.random() - 0.5) * -4000,
      scale: Math.random() * 0.6 + 0.3
    }));
    const colors = [new THREE.Color('#ffffff'), new THREE.Color('#e0f8ff'), new THREE.Color('#ffd27f')];
    const array = new Float32Array(heroCount * 3);
    for (let i = 0; i < heroCount; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)];
      c.toArray(array, i * 3);
    }
    return { dummy, heroData: data, heroColors: array };
  }, []);

  // NEBULAS
  const nebCount = 40;
  const { nebPos, nebCol } = useMemo(() => {
    const pos = new Float32Array(nebCount * 3);
    const col = new Float32Array(nebCount * 3);
    const colors = [new THREE.Color('#4a00e0'), new THREE.Color('#00d2ff'), new THREE.Color('#ff0055')];
    for (let i = 0; i < nebCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2000;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 1000;
      pos[i * 3 + 2] = (Math.random() - 0.5) * -4000;
      const c = colors[Math.floor(Math.random() * colors.length)];
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { nebPos: pos, nebCol: col };
  }, []);

  useFrame((state) => {
   const targetSpeed = isWarpingRef.current ? 400 : 2.5; 
    speedMult.current = THREE.MathUtils.lerp(speedMult.current, targetSpeed, 0.05);

    if (starsRef.current) {
      const sPos = starsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < starsCount; i++) {
        sPos[i * 3 + 2] += 1 * speedMult.current;
        if (sPos[i * 3 + 2] > 200) sPos[i * 3 + 2] -= 5000;
      }
      starsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (heroStarsRef.current) {
      for (let i = 0; i < heroCount; i++) {
        const star = heroData[i];
        star.z += 1.5 * speedMult.current;
        if (star.z > 200) star.z -= 4000;
        dummy.position.set(star.x, star.y, star.z);
        dummy.scale.set(star.scale, star.scale, star.scale);
        dummy.updateMatrix();
        heroStarsRef.current.setMatrixAt(i, dummy.matrix);
      }
      heroStarsRef.current.instanceMatrix.needsUpdate = true;
    }

    if (nebulasRef.current) {
      nebulasRef.current.rotation.z = state.clock.getElapsedTime() * 0.003;
      const nPos = nebulasRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < nebCount; i++) {
        nPos[i * 3 + 2] += 0.5 * speedMult.current; 
        if (nPos[i * 3 + 2] > 200) nPos[i * 3 + 2] -= 4000;
      }
      nebulasRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group>
      <points ref={starsRef}>
        <bufferGeometry><bufferAttribute attach="attributes-position" count={starsCount} array={starPos} itemSize={3} /></bufferGeometry>
        <pointsMaterial size={0.6} color="#ffffff" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      
      {/* 🔥 HERO STARS 3D ULTRA HD (32x32 Segments) 🔥 */}
      <instancedMesh ref={heroStarsRef} args={[undefined, undefined, heroCount]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial toneMapped={false} />
        <instancedBufferAttribute attach="instanceColor" args={[heroColors, 3]} />
      </instancedMesh>

      <points ref={nebulasRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={nebCount} array={nebPos} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={nebCount} array={nebCol} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial map={glowTexture} size={800} vertexColors transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
};

export default function SpaceBackground({ isWarping = false, hoverColor = null }: { isWarping?: boolean, hoverColor?: string | null }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, backgroundColor: '#000000' }}>
      <Canvas camera={{ position: [0, 0, 0], fov: 60 }} dpr={[1, 2]} frameloop="always">
        <ambientLight intensity={0.6} color="#ffffff" />
        {/* 🔥 L-IDA2A 3LA L-KAWAKIB BASH T-BEYYEN L-HD 🔥 */}
        <directionalLight position={[200, 100, 50]} intensity={3} color="#ffffff" />
       <pointLight 
          position={[0, 0, 0]} 
          intensity={hoverColor ? 15 : 3} 
          color={hoverColor || "#b026ff"} 
          distance={500} 
        />
        <DeepSpaceExtras isWarping={isWarping} hoverColor={hoverColor} />
        <Universe isWarping={isWarping} hoverColor={hoverColor} />
        
        <fog attach="fog" args={['#000000', 200, 4500]} />
      </Canvas>
    </div>
  );
}