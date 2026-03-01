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
      className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 active:bg-white/[0.03] transition-colors"
      style={showSeparator ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}
    >
      {/* Thumbnail */}
      <div className="w-[52px] h-[52px] rounded-[14px] bg-surface-2 overflow-hidden shrink-0 ring-1 ring-white/[0.06]">
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
        <div className="flex items-center gap-2.5 mt-1">
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

      <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/30 shrink-0" />
    </button>
  );
}
