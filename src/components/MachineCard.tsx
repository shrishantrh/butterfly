import { Machine } from '@/lib/mock-data';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import excavatorHero from '@/assets/cat-320-hero.jpg';

interface MachineCardProps {
  machine: Machine;
  showSeparator?: boolean;
}

export function MachineCard({ machine, showSeparator = true }: MachineCardProps) {
  const navigate = useNavigate();
  const hasFaults = machine.activeFaultCodes.length > 0;
  const lastInsp = machine.lastInspection;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-surface-2 transition-colors"
      style={showSeparator ? { borderBottom: '0.33px solid hsl(var(--ios-separator))' } : {}}
    >
      {/* Thumbnail */}
      <div className="w-[56px] h-[56px] rounded-xl bg-surface-2 overflow-hidden shrink-0">
        <img src={excavatorHero} alt={machine.model} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="ios-body font-semibold text-foreground truncate">
          {machine.model.replace('Hydraulic Excavator', '').trim()}
        </p>
        <p className="ios-subhead text-muted-foreground truncate mt-0.5">
          {machine.assetId} · {machine.smuHours.toLocaleString()} hrs
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lastInsp && (
            <span className="ios-caption font-medium text-primary">
              {hasFaults ? 'Needs Attention' : 'Ready'}
            </span>
          )}
          {hasFaults && (
            <span className="ios-caption font-medium text-status-fail">
              {machine.activeFaultCodes.length} Fault{machine.activeFaultCodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40 shrink-0" />
    </button>
  );
}
