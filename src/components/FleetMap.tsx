import { useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { Navigation, ChevronRight } from 'lucide-react';

export function FleetMap() {
  const navigate = useNavigate();

  const statusColor = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'hsl(var(--status-fail))';
    if (m.activeFaultCodes.length > 0) return 'hsl(var(--status-monitor))';
    return 'hsl(var(--status-pass))';
  };

  return (
    <div className="mx-5 ios-card">
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
  );
}
