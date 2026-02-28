import { Machine } from '@/lib/mock-data';
import { StatusSummary } from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Fuel, Clock, AlertTriangle, MapPin, ChevronRight } from 'lucide-react';

interface MachineCardProps {
  machine: Machine;
}

export function MachineCard({ machine }: MachineCardProps) {
  const navigate = useNavigate();
  const hasFaults = machine.activeFaultCodes.length > 0;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 active:scale-[0.98] transition-all group touch-target"
    >
      <div className="p-5 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-mono text-muted-foreground tracking-wide">{machine.assetId}</p>
            <h3 className="text-lg font-bold text-foreground leading-tight mt-0.5">{machine.model}</h3>
          </div>
          <ChevronRight className="w-6 h-6 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 text-base text-muted-foreground">
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="w-4 h-4" />
            {machine.smuHours.toLocaleString()}h
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Fuel className="w-4 h-4" />
            {machine.fuelLevel}%
          </span>
          <span className="flex items-center gap-1.5 truncate text-sm">
            <MapPin className="w-4 h-4 shrink-0" />
            {machine.location.split('—')[0].trim()}
          </span>
        </div>

        {/* Last inspection summary */}
        {machine.lastInspection && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Last: {machine.lastInspection.date}
            </span>
            <StatusSummary {...machine.lastInspection.summary} />
          </div>
        )}

        {/* Fault codes */}
        {hasFaults && (
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-status-fail" />
              <span className="text-sm font-semibold text-status-fail uppercase tracking-wider">Active Faults</span>
            </div>
            {machine.activeFaultCodes.slice(0, 2).map((fc) => (
              <div key={fc.code} className="flex items-start gap-2 pl-0.5">
                <span className="font-mono text-sensor shrink-0 text-sm">{fc.code}</span>
                <span className="text-muted-foreground text-sm">{fc.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
