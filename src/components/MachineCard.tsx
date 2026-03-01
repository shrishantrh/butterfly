import { Machine } from '@/lib/mock-data';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, MapPin, ChevronRight } from 'lucide-react';

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
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-foreground leading-tight">{machine.model}</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{machine.assetId} · {machine.serial}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasFaults ? (
              <span className="flex items-center gap-1 bg-status-fail/15 border border-status-fail/25 rounded-full px-2.5 py-1">
                <AlertTriangle className="w-3 h-3 text-status-fail" />
                <span className="text-[10px] font-bold text-status-fail">{machine.activeFaultCodes.length}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-status-pass/12 border border-status-pass/20 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-pass" />
                <span className="text-[10px] font-bold text-status-pass">OK</span>
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-colors" />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-primary/60" />
            {machine.smuHours.toLocaleString()}h
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary/60" />
            <span className="truncate max-w-[140px]">{machine.location.split('—')[0].trim()}</span>
          </span>
        </div>

        {lastInsp && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/20">
            <span className="text-[10px] text-muted-foreground/60">Last: {lastInsp.date}</span>
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold">
              <span className="text-status-pass">{lastInsp.summary.pass}P</span>
              <span className="text-status-monitor">{lastInsp.summary.monitor}M</span>
              {lastInsp.summary.fail > 0 && <span className="text-status-fail">{lastInsp.summary.fail}F</span>}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
