import { Machine } from '@/lib/mock-data';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import excavatorHero from '@/assets/cat-320-hero.jpg';

interface MachineCardProps {
  machine: Machine;
}

export function MachineCard({ machine }: MachineCardProps) {
  const navigate = useNavigate();
  const hasFaults = machine.activeFaultCodes.length > 0;
  const lastInsp = machine.lastInspection;

  return (
    <button
      onClick={() => navigate(`/pre-inspection/${machine.id}`)}
      className="w-full text-left card-elevated overflow-hidden active:scale-[0.99] transition-all group"
    >
      <div className="flex items-center gap-3.5 p-3.5">
        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-xl bg-surface-2 overflow-hidden shrink-0">
          <img src={excavatorHero} alt={machine.model} className="w-full h-full object-cover" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {lastInsp && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/20">
                {hasFaults ? 'Needs Attention' : 'Ready'}
              </span>
            )}
            {hasFaults && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-status-fail/12 text-status-fail border border-status-fail/20">
                {machine.activeFaultCodes.length} Fault{machine.activeFaultCodes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">
            {machine.model.replace('Hydraulic Excavator', '').trim()}, {machine.smuHours.toLocaleString()}h
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{machine.assetId} · S/N {machine.serial}</p>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground/20 shrink-0 group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}
