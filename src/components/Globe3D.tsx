import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { fleetSites, type FleetSite } from '@/lib/fleet-data';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, AlertTriangle, ChevronRight, X } from 'lucide-react';

// Convert lat/lng to 3D sphere position
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

// Generate globe wireframe geometry
function GlobeWireframe() {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
    }
  });

  const lines = useMemo(() => {
    const result: THREE.Vector3[][] = [];
    const r = 1.98;
    
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 3) {
        pts.push(latLngToVector3(lat, lng - 180, r));
      }
      result.push(pts);
    }
    
    // Longitude lines
    for (let lng = -180; lng < 180; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        pts.push(latLngToVector3(lat, lng, r));
      }
      result.push(pts);
    }
    
    return result;
  }, []);

  return (
    <group ref={ref}>
      {lines.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pts.length}
              array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#1a2540" transparent opacity={0.3} />
        </line>
      ))}
    </group>
  );
}

// Continent outlines (simplified polygons for key landmasses)
function ContinentOutlines() {
  const ref = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.03;
    }
  });

  // Simplified continent paths
  const continents = useMemo(() => {
    const r = 2.0;
    const paths: { name: string; coords: [number, number][] }[] = [
      // Africa outline (simplified)
      { name: 'africa', coords: [
        [37, 10], [32, 32], [30, 31], [23, 28], [20, 17], [14, -1], [5, 3], [4, 7], [-5, 12], [-12, 14],
        [-15, 12], [-22, 14], [-26, 17], [-29, 17], [-34, 18], [-35, 20], [-34, 26], [-30, 31], [-25, 33],
        [-14, 34], [-12, 40], [-5, 38], [2, 36], [10, 32], [15, 30], [30, 30], [32, 32],
      ]},
      // South America
      { name: 'south_america', coords: [
        [12, -70], [7, -77], [2, -80], [-5, -81], [-8, -79], [-15, -75], [-18, -70], [-22, -64],
        [-30, -57], [-35, -56], [-40, -62], [-47, -66], [-50, -69], [-55, -68], [-55, -70], [-52, -72],
        [-45, -74], [-40, -73], [-35, -72], [-25, -70], [-18, -70], [-15, -76], [-8, -80], [-3, -78],
        [5, -73], [10, -72], [12, -70],
      ]},
      // Australia
      { name: 'australia', coords: [
        [-12, 131], [-14, 127], [-16, 123], [-20, 119], [-24, 114], [-27, 114], [-30, 115], [-33, 116],
        [-35, 117], [-37, 140], [-38, 146], [-37, 150], [-34, 151], [-28, 153], [-23, 150], [-18, 146],
        [-15, 145], [-12, 142], [-11, 136], [-12, 131],
      ]},
      // Europe
      { name: 'europe', coords: [
        [36, -6], [38, -1], [43, 3], [44, 8], [47, 7], [48, 2], [51, 2], [52, 5], [54, 8], [56, 10],
        [58, 12], [60, 20], [62, 25], [65, 25], [70, 28], [70, 32], [65, 40], [60, 38], [55, 38],
        [50, 35], [47, 30], [44, 28], [42, 25], [40, 22], [37, 22], [36, 10], [36, -6],
      ]},
      // Asia outline (simplified)
      { name: 'asia', coords: [
        [42, 25], [45, 35], [40, 45], [35, 50], [30, 50], [25, 55], [20, 60], [15, 68], [10, 76],
        [5, 80], [0, 98], [2, 103], [7, 106], [10, 108], [20, 106], [22, 114], [30, 121], [35, 128],
        [40, 130], [45, 135], [50, 140], [55, 140], [60, 140], [65, 140], [70, 145], [70, 130],
        [68, 100], [65, 80], [60, 65], [55, 55], [50, 45], [45, 35], [42, 25],
      ]},
    ];
    
    return paths.map(p => ({
      name: p.name,
      points: p.coords.map(([lat, lng]) => latLngToVector3(lat, lng, r)),
    }));
  }, []);

  return (
    <group ref={ref}>
      {continents.map(c => (
        <line key={c.name}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={c.points.length}
              array={new Float32Array(c.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2a4060" transparent opacity={0.5} />
        </line>
      ))}
    </group>
  );
}

// Site markers on globe
function SiteMarkers({ onSiteClick }: { onSiteClick: (site: FleetSite) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03;
    }
  });

  const statusColor = (s: FleetSite['status']) => {
    switch (s) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  return (
    <group ref={groupRef}>
      {fleetSites.map((site) => {
        const pos = latLngToVector3(site.coords.lat, site.coords.lng, 2.02);
        const color = statusColor(site.status);
        return (
          <group key={site.name} position={pos} onClick={(e) => { e.stopPropagation(); onSiteClick(site); }}>
            {/* Glow sphere */}
            <mesh>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.3} />
            </mesh>
            {/* Core dot */}
            <mesh>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Pulse ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.06, 0.08, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Atmospheric glow
function AtmosphereGlow() {
  return (
    <mesh>
      <sphereGeometry args={[2.15, 64, 64]} />
      <meshBasicMaterial color="#1e40af" transparent opacity={0.04} side={THREE.BackSide} />
    </mesh>
  );
}

// The main globe scene
function GlobeScene({ onSiteClick }: { onSiteClick: (site: FleetSite) => void }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      
      {/* Globe sphere */}
      <mesh>
        <sphereGeometry args={[1.96, 64, 64]} />
        <meshPhongMaterial
          color="#0a0f1a"
          transparent
          opacity={0.95}
          shininess={20}
        />
      </mesh>
      
      <GlobeWireframe />
      <ContinentOutlines />
      <AtmosphereGlow />
      <SiteMarkers onSiteClick={onSiteClick} />
      
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        autoRotate={false}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />
    </>
  );
}

// Site info card overlay
function SiteInfoCard({ site, onClose, onNavigate }: { site: FleetSite; onClose: () => void; onNavigate: (site: FleetSite) => void }) {
  const statusColor = site.status === 'critical' ? 'text-status-fail' : site.status === 'warning' ? 'text-status-monitor' : 'text-status-pass';
  const statusBg = site.status === 'critical' ? 'bg-status-fail' : site.status === 'warning' ? 'bg-status-monitor' : 'bg-status-pass';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-4 left-3 right-3 z-20 ios-card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${statusBg}`} />
            <h3 className="ios-headline text-foreground">{site.name}</h3>
          </div>
          <p className="ios-caption text-muted-foreground">{site.country} · {site.region}</p>
        </div>
        <button onClick={onClose} className="glass-icon-btn w-7 h-7">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="inset-surface p-2.5 text-center">
          <p className="text-[18px] font-bold font-mono text-foreground">{site.machineCount}</p>
          <p className="ios-caption2 text-muted-foreground">Machines</p>
        </div>
        <div className="inset-surface p-2.5 text-center">
          <p className={`text-[18px] font-bold font-mono ${site.activeAlerts > 0 ? statusColor : 'text-foreground'}`}>{site.activeAlerts}</p>
          <p className="ios-caption2 text-muted-foreground">Alerts</p>
        </div>
        {site.production && (
          <div className="inset-surface p-2.5 text-center">
            <p className="text-[18px] font-bold font-mono text-foreground">{Math.round(site.production.actual / site.production.target * 100)}%</p>
            <p className="ios-caption2 text-muted-foreground">Production</p>
          </div>
        )}
      </div>

      <button
        onClick={() => onNavigate(site)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
        style={{
          background: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)',
        }}
      >
        View Site Details
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// Main Globe component
export function Globe3D({ onSiteSelect }: { onSiteSelect?: (site: FleetSite) => void }) {
  const [selectedSite, setSelectedSite] = useState<FleetSite | null>(null);

  const handleSiteClick = useCallback((site: FleetSite) => {
    setSelectedSite(site);
  }, []);

  return (
    <div className="relative">
      <div className="mx-5 ios-card overflow-hidden">
        <div style={{ height: 320 }} className="relative">
          <Canvas
            camera={{ position: [0, 1.5, 5], fov: 40 }}
            style={{ background: 'transparent' }}
            gl={{ alpha: true, antialias: true }}
          >
            <GlobeScene onSiteClick={handleSiteClick} />
          </Canvas>

          {/* Live indicator */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'hsl(var(--card) / 0.8)', backdropFilter: 'blur(20px)', border: '0.5px solid hsl(var(--border) / 0.3)' }}
          >
            <span className="w-2 h-2 rounded-full bg-status-pass animate-pulse" />
            <span className="text-[10px] font-semibold text-foreground tracking-wide uppercase">Live · {fleetSites.length} Sites</span>
          </div>

          {/* Site count badges */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            {['critical', 'warning', 'normal'].map(s => {
              const count = fleetSites.filter(site => site.status === s).length;
              if (count === 0) return null;
              const cls = s === 'critical' ? 'bg-status-fail' : s === 'warning' ? 'bg-status-monitor' : 'bg-status-pass';
              return (
                <div key={s} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'hsl(var(--card) / 0.8)', backdropFilter: 'blur(20px)' }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                  <span className="text-[10px] font-medium text-muted-foreground capitalize">{count} {s}</span>
                </div>
              );
            })}
          </div>

          {/* Site info overlay */}
          <AnimatePresence>
            {selectedSite && (
              <SiteInfoCard
                site={selectedSite}
                onClose={() => setSelectedSite(null)}
                onNavigate={(site) => { onSiteSelect?.(site); setSelectedSite(null); }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
