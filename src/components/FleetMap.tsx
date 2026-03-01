import { useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, ChevronRight, Compass } from 'lucide-react';
import { useState } from 'react';

export function FleetMap() {
  const navigate = useNavigate();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  const statusColor = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'hsl(var(--status-fail))';
    if (m.activeFaultCodes.length > 0) return 'hsl(var(--status-monitor))';
    return 'hsl(var(--status-pass))';
  };

  const statusLabel = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'Critical';
    if (m.activeFaultCodes.length > 0) return 'Warning';
    return 'Online';
  };

  // Spread markers across the map area
  const markerPositions = [
    { top: '25%', left: '42%' },
    { top: '48%', right: '18%' },
    { top: '68%', left: '25%' },
    { top: '35%', right: '28%' },
    { top: '58%', left: '55%' },
  ];

  return (
    <div>
      <div className="mx-5 ios-card overflow-hidden">
        {/* 2D Map Area */}
        <div className="relative" style={{ height: 340 }}>
          {/* Dark map background with grid/road lines */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(160deg, hsl(var(--card)), hsl(var(--background)))',
          }}>
            {/* Road/grid lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 340" preserveAspectRatio="none">
              {/* Diagonal roads */}
              <line x1="0" y1="280" x2="400" y2="60" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
              <line x1="50" y1="340" x2="350" y2="0" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
              <line x1="0" y1="180" x2="400" y2="200" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.15" />
              <line x1="200" y1="0" x2="150" y2="340" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
              {/* Curved path */}
              <path d="M 0 120 Q 200 80 400 160" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.25" />
              <path d="M 100 0 Q 180 170 300 340" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.2" />
            </svg>

            {/* Subtle scan line effect */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, hsl(var(--foreground)) 3px, hsl(var(--foreground)) 4px)',
            }} />
          </div>

          {/* Compass indicator */}
          <div className="absolute top-3 right-4 z-10 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold tracking-wider" style={{ color: 'hsl(var(--status-fail))' }}>N</span>
            <div className="w-px h-3" style={{ background: 'hsl(var(--muted-foreground) / 0.4)' }} />
          </div>

          {/* Machine markers */}
          {mockMachines.slice(0, 5).map((m, i) => {
            const pos = markerPositions[i] || markerPositions[0];
            const color = statusColor(m);
            const isSelected = selectedMachine === m.id;

            return (
              <motion.button
                key={m.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 300 }}
                className="absolute z-10"
                style={{ ...pos } as React.CSSProperties}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMachine(isSelected ? null : m.id);
                }}
              >
                {/* Outer glow ring */}
                <span className="absolute rounded-full"
                  style={{
                    width: 44,
                    height: 44,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, ${color}15 0%, ${color}08 50%, transparent 70%)`,
                  }}
                />

                {/* Pulse ring */}
                <span className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: color, opacity: 0.15, animationDuration: '3s' }}
                />

                {/* Dot with border */}
                <span className="relative flex items-center justify-center w-6 h-6 rounded-full"
                  style={{
                    background: `${color}20`,
                    border: `1.5px solid ${color}80`,
                    boxShadow: `0 0 16px ${color}30`,
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                </span>

                {/* Label tag */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg"
                  style={{
                    background: 'hsl(var(--card) / 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '0.5px solid hsl(var(--border) / 0.3)',
                  }}
                >
                  <span className="text-[11px] font-semibold text-foreground">{m.assetId}</span>
                </div>

                {/* Expanded info card on tap */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 6 }}
                      className="absolute left-8 top-8 z-20 min-w-[150px]"
                      style={{
                        background: 'hsl(var(--card) / 0.95)',
                        backdropFilter: 'blur(24px)',
                        border: `0.5px solid ${color}25`,
                        borderRadius: 14,
                        padding: '10px 14px',
                        boxShadow: `0 8px 32px hsl(var(--background) / 0.6)`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[11px] font-semibold text-foreground">{m.assetId}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.location}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="text-[9px] font-medium" style={{ color }}>{statusLabel(m)}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/pre-inspection/${m.id}`)}
                        className="mt-2 w-full text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
                        style={{
                          background: `${color}15`,
                          color: color,
                          border: `0.5px solid ${color}25`,
                        }}
                      >
                        Inspect →
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Bottom legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-xl z-10"
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
            <div className="w-[32px] h-[32px] rounded-[10px] flex items-center justify-center shrink-0"
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
