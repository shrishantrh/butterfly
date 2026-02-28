import { Machine } from '@/lib/mock-data';
import { StatusSummary } from './StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Fuel, Clock, AlertTriangle, MapPin } from 'lucide-react';
import catHero from '@/assets/cat-320-hero.jpg';

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
      className="w-full text-left glass-surface rounded-lg overflow-hidden hover:border-primary/30 transition-all duration-300 group animate-slide-up"
    >
      {/* Image header */}
      <div className="relative h-36 overflow-hidden">
        <img src={catHero} alt={machine.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        {hasFaults && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-status-fail/90 px-2 py-1 rounded text-xs font-semibold text-accent-foreground">
            <AlertTriangle className="w-3 h-3" />
            {machine.activeFaultCodes.length} Active Fault{machine.activeFaultCodes.length > 1 ? 's' : ''}
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <p className="text-xs text-muted-foreground font-mono">{machine.assetId}</p>
          <h3 className="text-base font-bold text-foreground">{machine.model}</h3>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">S/N {machine.serial}</span>
          {machine.lastInspection && (
            <StatusSummary {...machine.lastInspection.summary} />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{machine.smuHours.toLocaleString()} hrs</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Fuel className="w-3.5 h-3.5" />
            <span className="font-mono">{machine.fuelLevel}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{machine.location.split('—')[0]}</span>
          </div>
        </div>

        {hasFaults && (
          <div className="space-y-1 pt-1 border-t border-border">
            {machine.activeFaultCodes.slice(0, 2).map((fc) => (
              <div key={fc.code} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-sensor shrink-0">{fc.code}</span>
                <span className="text-muted-foreground truncate">{fc.description}</span>
              </div>
            ))}
          </div>
        )}

        {hasFails && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-status-fail font-semibold">
              {machine.lastInspection!.summary.fail} open FAIL item{machine.lastInspection!.summary.fail > 1 ? 's' : ''} from last inspection
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
