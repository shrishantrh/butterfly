import { Machine } from '@/lib/mock-data';
import { StatusSummary } from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Fuel, Clock, AlertTriangle, MapPin, ChevronRight, Cpu } from 'lucide-react';

interface MachineCardProps {
  machine: Machine;
}

export function MachineCard({ machine }: MachineCardProps) {
  const navigate = useNavigate();
  const hasFaults = machine.activeFaultCodes.length > 0;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left card-elevated overflow-hidden hover:border-primary/30 active:scale-[0.99] transition-all duration-200 group"
    >
      <div className="p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="label-caps">{machine.assetId}</p>
            <h3 className="text-base font-bold text-foreground leading-tight mt-1">{machine.model}</h3>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 mt-1 shrink-0 group-hover:text-primary transition-colors" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
            {machine.smuHours.toLocaleString()}h
          </span>
          <span className="flex items-center gap-1.5 font-mono">
            <Fuel className="w-3.5 h-3.5 text-muted-foreground/60" />
            {machine.fuelLevel}%
          </span>
          <span className="flex items-center gap-1.5 truncate text-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60" />
            {machine.location.split('—')[0].trim()}
          </span>
        </div>

        {/* Last inspection summary */}
        {machine.lastInspection && (
          <div className="flex items-center justify-between pt-3 divider">
            <span className="text-xs text-muted-foreground">
              Last: {machine.lastInspection.date}
            </span>
            <StatusSummary {...machine.lastInspection.summary} />
          </div>
        )}

        {/* Fault codes */}
        {hasFaults && (
          <div className="space-y-2 pt-3 divider">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-status-fail" />
              <span className="text-[10px] font-semibold text-status-fail uppercase tracking-widest">Active Faults</span>
            </div>
            {machine.activeFaultCodes.slice(0, 2).map((fc) => (
              <div key={fc.code} className="flex items-start gap-2 pl-0.5">
                <Cpu className="w-3 h-3 text-sensor mt-0.5 shrink-0" />
                <span className="font-mono text-sensor shrink-0 text-xs">{fc.code}</span>
                <span className="text-muted-foreground text-xs leading-snug">{fc.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
