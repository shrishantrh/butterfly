import { useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { Navigation, ChevronRight } from 'lucide-react';

export function FleetMap() {
  const navigate = useNavigate();

  const lats = mockMachines.map(m => m.gpsCoords.lat);
  const lngs = mockMachines.map(m => m.gpsCoords.lng);
  const latMin = Math.min(...lats) - 0.005;
  const latMax = Math.max(...lats) + 0.005;
  const lngMin = Math.min(...lngs) - 0.005;
  const lngMax = Math.max(...lngs) + 0.005;

  const mapW = 360;
  const mapH = 280;

  const toX = (lng: number) => ((lng - lngMin) / (lngMax - lngMin)) * (mapW - 60) + 30;
  const toY = (lat: number) => mapH - ((lat - latMin) / (latMax - latMin)) * (mapH - 60) - 30;

  const statusColor = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'hsl(var(--status-fail))';
    if (m.activeFaultCodes.length > 0) return 'hsl(var(--status-monitor))';
    return 'hsl(var(--status-pass))';
  };

  return (
    <div>
      <div className="mx-5 ios-card overflow-hidden">
        {/* SVG Map */}
        <div className="relative p-2">
          <svg
            viewBox={`0 0 ${mapW} ${mapH}`}
            className="w-full"
            style={{ height: 'auto' }}
          >
            <defs>
              <radialGradient id="mapBg" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="hsl(var(--surface-2))" />
                <stop offset="100%" stopColor="hsl(var(--background))" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={mapW} height={mapH} fill="url(#mapBg)" rx="12" />
            <rect x="0" y="0" width={mapW} height={mapH} fill="none" stroke="hsl(var(--border))" strokeOpacity="0.15" rx="12" />

            {/* Terrain contours */}
            {[0.3, 0.5, 0.7].map((r, i) => (
              <ellipse
                key={i}
                cx={mapW * 0.45}
                cy={mapH * 0.5}
                rx={mapW * r * 0.6}
                ry={mapH * r * 0.5}
                fill="none"
                stroke="hsl(var(--border))"
                strokeOpacity={0.08 + i * 0.03}
                strokeWidth="0.5"
                strokeDasharray="4 6"
              />
            ))}

            {/* Roads */}
            <line x1="20" y1={mapH * 0.7} x2={mapW - 20} y2={mapH * 0.25} stroke="hsl(var(--border))" strokeOpacity="0.2" strokeWidth="0.8" />
            <path d={`M 60 ${mapH - 20} Q ${mapW * 0.4} ${mapH * 0.3} ${mapW - 40} ${mapH * 0.6}`} fill="none" stroke="hsl(var(--border))" strokeOpacity="0.15" strokeWidth="0.8" />

            {/* Site areas (subtle glow behind each machine) */}
            {mockMachines.map((m, i) => {
              const cx = toX(m.gpsCoords.lng);
              const cy = toY(m.gpsCoords.lat);
              return (
                <g key={`site-${i}`}>
                  <circle cx={cx} cy={cy} r="28" fill={statusColor(m)} fillOpacity="0.04" />
                  <circle cx={cx} cy={cy} r="18" fill={statusColor(m)} fillOpacity="0.06" />
                </g>
              );
            })}

            {/* Machine markers */}
            {mockMachines.map((m, i) => {
              const cx = toX(m.gpsCoords.lng);
              const cy = toY(m.gpsCoords.lat);
              const color = statusColor(m);
              return (
                <g
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/pre-inspection/${m.id}`)}
                >
                  {/* Animated pulse ring */}
                  <circle cx={cx} cy={cy} r="12" fill="none" stroke={color} strokeOpacity="0.2" strokeWidth="1">
                    <animate attributeName="r" values="10;18;10" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                  </circle>

                  {/* Outer ring */}
                  <circle cx={cx} cy={cy} r="10" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.5" strokeWidth="1" />

                  {/* Inner dot */}
                  <circle cx={cx} cy={cy} r="4" fill={color} filter="url(#glow)" />

                  {/* Label background */}
                  <rect
                    x={cx + 14}
                    y={cy - 9}
                    width={m.assetId.length * 7.5 + 14}
                    height="18"
                    rx="9"
                    fill="hsl(var(--card))"
                    fillOpacity="0.9"
                    stroke="hsl(var(--border))"
                    strokeOpacity="0.2"
                    strokeWidth="0.5"
                  />
                  <text
                    x={cx + 21}
                    y={cy + 3}
                    fill="hsl(var(--foreground))"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="-apple-system, system-ui, sans-serif"
                  >
                    {m.assetId}
                  </text>
                </g>
              );
            })}

            {/* Compass */}
            <g transform={`translate(${mapW - 28}, 24)`}>
              <line x1="0" y1="-10" x2="0" y2="10" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.3" strokeWidth="0.8" />
              <text x="0" y="-14" textAnchor="middle" fill="hsl(var(--status-fail))" fontSize="9" fontWeight="700">N</text>
              <line x1="-4" y1="-6" x2="0" y2="-10" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.3" strokeWidth="0.8" />
              <line x1="4" y1="-6" x2="0" y2="-10" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.3" strokeWidth="0.8" />
            </g>
          </svg>

          {/* Legend overlay */}
          <div
            className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-1.5 rounded-xl"
            style={{
              background: 'hsl(var(--card) / 0.85)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid hsl(var(--border) / 0.3)',
            }}
          >
            {[
              ['Online', 'bg-status-pass'],
              ['Warning', 'bg-status-monitor'],
              ['Critical', 'bg-status-fail'],
            ].map(([label, cls]) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${cls}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Machine list below map */}
        {mockMachines.map((m, i) => (
          <motion.button
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
            onClick={() => navigate(`/pre-inspection/${m.id}`)}
            className="ios-cell py-3.5 w-full text-left active:bg-foreground/[0.03] transition-colors"
            style={i < mockMachines.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
          >
            <div
              className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: `${statusColor(m)}15` }}
            >
              <Navigation className="w-[14px] h-[14px]" style={{ color: statusColor(m) }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="ios-body font-medium text-foreground truncate">{m.assetId}</p>
              <p className="ios-caption text-muted-foreground truncate">{m.location}</p>
            </div>
            <div className="text-right shrink-0 mr-1">
              <p className="ios-caption font-mono text-muted-foreground">{m.gpsCoords.lat.toFixed(3)}°N</p>
              <p className="ios-caption font-mono text-muted-foreground/50">{m.gpsCoords.lng.toFixed(3)}°W</p>
            </div>
            <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/20 shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
