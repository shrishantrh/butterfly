import { useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, ChevronRight, Maximize2, RotateCcw, Eye } from 'lucide-react';
import { useState, useRef } from 'react';

export function FleetMap() {
  const navigate = useNavigate();
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Position machine markers around the 3D model viewport
  const markerPositions = [
    { top: '18%', left: '12%' },
    { top: '72%', left: '78%' },
    { top: '28%', right: '10%' },
    { top: '65%', left: '15%' },
    { top: '45%', right: '8%' },
  ];

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div>
      {/* 3D Model Viewer */}
      <div className="mx-5 ios-card overflow-hidden" ref={containerRef}>
        <div className="relative" style={{ height: isFullscreen ? '100vh' : 340 }}>
          {/* Sketchfab Embed */}
          <iframe
            title="Excavator (CAT) 3D Model"
            src="https://sketchfab.com/models/5f195244108c46e495a1e78040f02f7e/embed?autostart=1&ui_hint=0&ui_theme=dark&dnt=1&ui_infos=0&ui_watermark_link=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_inspector=0&ui_fullscreen=0&ui_annotations=0&ui_vr=0&ui_color=FFCD11&preload=1&transparent=1&camera=0"
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none', background: 'transparent' }}
            allow="autoplay; fullscreen; xr-spatial-tracking"
          />

          {/* Gradient overlays for depth */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, hsl(var(--background) / 0.3) 0%, transparent 20%, transparent 80%, hsl(var(--background) / 0.5) 100%)',
            }}
          />

          {/* Floating machine markers */}
          {mockMachines.slice(0, 5).map((m, i) => {
            const pos = markerPositions[i] || markerPositions[0];
            const color = statusColor(m);
            const isSelected = selectedMachine === m.id;

            return (
              <motion.button
                key={m.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.12, type: 'spring', stiffness: 300 }}
                className="absolute z-10 group"
                style={{ ...pos } as React.CSSProperties}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMachine(isSelected ? null : m.id);
                }}
              >
                {/* Pulse */}
                <span className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    background: color,
                    opacity: 0.2,
                    animationDuration: '2.5s',
                  }}
                />
                {/* Dot */}
                <span className="relative flex items-center justify-center w-5 h-5 rounded-full"
                  style={{
                    background: `${color}25`,
                    border: `1.5px solid ${color}`,
                    boxShadow: `0 0 12px ${color}40`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                </span>

                {/* Expanded info card */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 4 }}
                      className="absolute left-7 top-1/2 -translate-y-1/2 z-20 min-w-[160px]"
                      style={{
                        background: 'hsl(var(--card) / 0.92)',
                        backdropFilter: 'blur(24px)',
                        border: `0.5px solid ${color}30`,
                        borderRadius: 14,
                        padding: '10px 14px',
                        boxShadow: `0 8px 32px hsl(var(--background) / 0.5), 0 0 0 0.5px ${color}15`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[11px] font-semibold text-foreground">{m.assetId}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.location}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="text-[9px] font-medium" style={{ color }}>{statusLabel(m)}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/pre-inspection/${m.id}`)}
                        className="mt-2 w-full text-[10px] font-semibold py-1.5 rounded-lg transition-colors"
                        style={{
                          background: `${color}18`,
                          color: color,
                          border: `0.5px solid ${color}30`,
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

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <button
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{
                background: 'hsl(var(--card) / 0.7)',
                backdropFilter: 'blur(16px)',
                border: '0.5px solid hsl(var(--border) / 0.3)',
              }}
            >
              <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Title badge */}
          <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl"
            style={{
              background: 'hsl(var(--card) / 0.8)',
              backdropFilter: 'blur(20px)',
              border: '0.5px solid hsl(var(--border) / 0.3)',
            }}
          >
            <p className="text-[10px] font-semibold text-foreground tracking-wide uppercase">Live Fleet · 3D</p>
          </div>

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

          {/* Interaction hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-lg"
            style={{
              background: 'hsl(var(--card) / 0.6)',
              backdropFilter: 'blur(16px)',
              border: '0.5px solid hsl(var(--border) / 0.2)',
            }}
          >
            <p className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
              <RotateCcw className="w-2.5 h-2.5" /> Drag to rotate
            </p>
          </motion.div>
        </div>

        {/* Machine list below model */}
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
