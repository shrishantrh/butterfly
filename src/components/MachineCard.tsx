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
  const hasFails = machine.lastInspection && machine.lastInspection.summary.fail > 0;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors group"
    >
      <div className="p-4 space-y-3">
        {/* Top row: model + asset ID */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-muted-foreground tracking-wide">{machine.assetId}</p>
            <h3 className="text-sm font-bold text-foreground leading-tight">{machine.model}</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 shrink-0 group-hover:text-primary transition-colors" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {machine.smuHours.toLocaleString()} hrs
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Fuel className="w-3.5 h-3.5" />
            {machine.fuelLevel}%
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {machine.location.split('—')[0].trim()}
          </span>
        </div>

        {/* Last inspection summary */}
        {machine.lastInspection && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              Last: {machine.lastInspection.date} — {machine.lastInspection.inspector}
            </span>
            <StatusSummary {...machine.lastInspection.summary} />
          </div>
        )}

        {/* Fault codes */}
        {hasFaults && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-status-fail" />
              <span className="text-[10px] font-semibold text-status-fail uppercase tracking-wider">Active Faults</span>
            </div>
            {machine.activeFaultCodes.slice(0, 2).map((fc) => (
              <div key={fc.code} className="flex items-start gap-2 text-xs pl-0.5">
                <span className="font-mono text-sensor shrink-0 text-[10px]">{fc.code}</span>
                <span className="text-muted-foreground text-[10px] truncate">{fc.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
