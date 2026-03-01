import { useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ChevronRight } from 'lucide-react';

// Simple SVG map illustration showing positions
export function FleetMap() {
  const navigate = useNavigate();

  // Normalize GPS coords to map space
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
      {/* Map visualization */}
      <div className="mx-5 ios-card overflow-hidden">
        <div className="relative">
          <svg
            viewBox={`0 0 ${mapW} ${mapH}`}
            className="w-full"
            style={{ height: 280 }}
          >
            <defs>
              <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="hsl(var(--surface-3))" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(var(--surface-1))" stopOpacity="0.3" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="hsla(210, 20%, 40%, 0.06)" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background */}
            <rect width={mapW} height={mapH} fill="url(#mapBg)" rx="0" />
            <rect width={mapW} height={mapH} fill="url(#grid)" />

            {/* Terrain contours */}
            {[0.3, 0.5, 0.7].map((r, i) => (
              <ellipse
                key={i}
                cx={mapW * 0.45}
                cy={mapH * 0.5}
                rx={mapW * r}
                ry={mapH * r * 0.65}
                fill="none"
                stroke="hsla(210, 20%, 40%, 0.04)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
              />
            ))}

            {/* Roads */}
            <path
              d={`M 10,${mapH * 0.7} Q ${mapW * 0.3},${mapH * 0.5} ${mapW * 0.6},${mapH * 0.4} T ${mapW - 10},${mapH * 0.3}`}
              fill="none"
              stroke="hsla(210, 20%, 40%, 0.1)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d={`M ${mapW * 0.2},10 Q ${mapW * 0.35},${mapH * 0.4} ${mapW * 0.5},${mapH - 10}`}
              fill="none"
              stroke="hsla(210, 20%, 40%, 0.08)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6 4"
            />

            {/* Site areas */}
            {mockMachines.map((m, i) => {
              const cx = toX(m.gpsCoords.lng);
              const cy = toY(m.gpsCoords.lat);
              return (
                <g key={`area-${m.id}`}>
                  <circle cx={cx} cy={cy} r={35} fill={statusColor(m)} fillOpacity={0.04} />
                  <circle cx={cx} cy={cy} r={35} fill="none" stroke={statusColor(m)} strokeOpacity={0.1} strokeWidth="0.5" strokeDasharray="3 3" />
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
                  {/* Pulse ring */}
                  <circle cx={cx} cy={cy} r={12} fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                    <animate attributeName="r" from="12" to="22" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>

                  {/* Outer ring */}
                  <circle cx={cx} cy={cy} r={12} fill={`${color}`} fillOpacity={0.15} stroke={color} strokeWidth="1" strokeOpacity={0.4} />

                  {/* Inner dot */}
                  <circle cx={cx} cy={cy} r={5} fill={color} filter="url(#glow)" />

                  {/* Label */}
                  <rect x={cx + 14} y={cy - 12} width={68} height={22} rx={6}
                    fill="hsla(224, 14%, 8%, 0.85)" stroke={color} strokeWidth="0.5" strokeOpacity="0.3" />
                  <text x={cx + 18} y={cy + 2} fill="hsl(var(--foreground))" fontSize="9" fontWeight="600" fontFamily="SF Mono, monospace">
                    {m.assetId}
                  </text>
                </g>
              );
            })}

            {/* Compass */}
            <g transform={`translate(${mapW - 30}, 25)`}>
              <circle r="14" fill="hsla(224, 14%, 8%, 0.6)" stroke="hsla(210, 20%, 40%, 0.1)" strokeWidth="0.5" />
              <text textAnchor="middle" y="-3" fill="hsl(var(--primary))" fontSize="7" fontWeight="700">N</text>
              <line x1="0" y1="1" x2="0" y2="8" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.3" />
            </g>
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-xl"
            style={{
              background: 'hsla(224, 14%, 8%, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid hsla(210, 20%, 40%, 0.1)',
            }}
          >
            {[
              ['Online', 'bg-status-pass'],
              ['Warning', 'bg-status-monitor'],
              ['Critical', 'bg-status-fail'],
            ].map(([label, cls]) => (
              <span key={label} className="flex items-center gap-1.5 ios-caption2 text-muted-foreground">
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
            className="ios-cell py-3.5 w-full text-left active:bg-white/[0.03] transition-colors"
            style={i < mockMachines.length - 1 ? { borderBottom: '0.33px solid hsla(210, 20%, 40%, 0.08)' } : {}}
          >
            <div className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                background: `${statusColor(m)}15`,
              }}
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
