import { Machine } from '@/lib/mock-data';
import { StatusSummary } from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Fuel, Clock, AlertTriangle, MapPin, ChevronRight, Cpu, Gauge } from 'lucide-react';
import excavatorImg from '@/assets/excavator-schematic.png';

interface MachineCardProps {
  machine: Machine;
}

export function MachineCard({ machine }: MachineCardProps) {
  const navigate = useNavigate();
  const hasFaults = machine.activeFaultCodes.length > 0;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left card-elevated overflow-hidden active:scale-[0.98] transition-all duration-200 group"
    >
      {/* Machine Image Header */}
      <div className="relative h-40 bg-gradient-to-br from-surface-2 to-surface-3 overflow-hidden">
        <img
          src={excavatorImg}
          alt={machine.model}
          className="absolute inset-0 w-full h-full object-contain p-4 opacity-80 group-hover:scale-105 transition-transform duration-500"
        />
        {/* Status indicator */}
        {hasFaults ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-status-fail/20 backdrop-blur-md border border-status-fail/30 rounded-full px-3 py-1">
            <AlertTriangle className="w-3 h-3 text-status-fail" />
            <span className="text-[10px] font-bold text-status-fail uppercase">
              {machine.activeFaultCodes.length} Fault{machine.activeFaultCodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-status-pass/15 backdrop-blur-md border border-status-pass/25 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
            <span className="text-[10px] font-bold text-status-pass uppercase">Online</span>
          </div>
        )}
        {/* Fuel level badge */}
        <div className={`absolute top-3 right-3 flex items-center gap-1 backdrop-blur-md border rounded-full px-2.5 py-1 ${
          machine.fuelLevel < 25 
            ? 'bg-status-fail/20 border-status-fail/30 text-status-fail' 
            : 'bg-surface-2/60 border-border/40 text-foreground'
        }`}>
          <Fuel className="w-3 h-3" />
          <span className="text-[11px] font-bold font-mono">{machine.fuelLevel}%</span>
        </div>
        <ChevronRight className="absolute bottom-3 right-3 w-5 h-5 text-foreground/30 group-hover:text-primary transition-colors" />
      </div>

      {/* Info Section */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground leading-tight">{machine.model}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">{machine.assetId} · S/N {machine.serial}</p>
        </div>

        {/* Specification pills */}
        <div className="flex flex-wrap gap-2">
          <div className="metric-pill">
            <Clock className="w-3 h-3 text-primary" />
            <span>{machine.smuHours.toLocaleString()} hrs</span>
          </div>
          <div className="metric-pill">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="truncate max-w-[120px]">{machine.location.split('—')[0].trim()}</span>
          </div>
        </div>

        {/* Last inspection */}
        {machine.lastInspection && (
          <div className="flex items-center justify-between pt-3 divider">
            <span className="text-[11px] text-muted-foreground">
              Last: {machine.lastInspection.date}
            </span>
            <StatusSummary {...machine.lastInspection.summary} />
          </div>
        )}

        {/* Fault codes */}
        {hasFaults && (
          <div className="space-y-1.5">
            {machine.activeFaultCodes.slice(0, 2).map((fc) => (
              <div key={fc.code} className="flex items-center gap-2 bg-status-fail/6 border border-status-fail/12 rounded-xl px-3 py-2">
                <Cpu className="w-3.5 h-3.5 text-sensor shrink-0" />
                <span className="font-mono text-sensor text-xs shrink-0">{fc.code}</span>
                <span className="text-muted-foreground text-xs leading-snug truncate">{fc.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}