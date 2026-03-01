import { CheckCircle, AlertTriangle, HelpCircle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SensorEvidenceDisplay {
  sensorKey: string;
  sensorLabel: string;
  latestValue: number;
  unit: string;
  status: string;
  time: string;
}

interface AIValidationIndicatorProps {
  agreement?: 'agree' | 'disagree' | 'uncertain' | null;
  visualNote?: string | null;
  sensorEvidence?: SensorEvidenceDisplay | null;
  compact?: boolean;
  className?: string;
}

const agreementConfig = {
  agree: {
    icon: CheckCircle,
    label: 'AI Agrees',
    color: 'text-status-pass',
    bg: 'bg-status-pass/8 border-status-pass/15',
  },
  disagree: {
    icon: AlertTriangle,
    label: 'AI Disagrees',
    color: 'text-status-fail',
    bg: 'bg-status-fail/8 border-status-fail/15',
  },
  uncertain: {
    icon: HelpCircle,
    label: 'Uncertain',
    color: 'text-muted-foreground',
    bg: 'bg-muted/30 border-border/30',
  },
};

export function AIValidationIndicator({ agreement, visualNote, sensorEvidence, compact = false, className }: AIValidationIndicatorProps) {
  if (!agreement) return null;

  const config = agreementConfig[agreement];
  if (!config) return null;

  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn('inline-flex items-center gap-1', className)} title={visualNote || config.label}>
        <Icon className={cn('w-3 h-3', config.color)} />
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg p-2 border', config.bg, className)}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className={cn('w-3 h-3', config.color)} />
        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', config.color)}>{config.label}</span>
      </div>
      {visualNote && (
        <p className="text-[10px] text-muted-foreground leading-snug">{visualNote}</p>
      )}

      {/* Sensor evidence data point — shown when AI disagrees based on telemetry */}
      {sensorEvidence && agreement === 'disagree' && (
        <div className="mt-1.5 rounded-md bg-background/50 border border-border/30 p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-sensor" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-sensor">Telemetry Evidence</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-foreground">{sensorEvidence.sensorLabel}</span>
            <span className={cn(
              'text-sm font-bold font-mono',
              sensorEvidence.status === 'critical' ? 'text-status-fail' :
              sensorEvidence.status === 'warning' ? 'text-status-monitor' :
              'text-foreground'
            )}>
              {sensorEvidence.latestValue} {sensorEvidence.unit}
            </span>
            <span className={cn(
              'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
              sensorEvidence.status === 'critical' ? 'bg-status-fail/15 text-status-fail' :
              sensorEvidence.status === 'warning' ? 'bg-status-monitor/15 text-status-monitor' :
              'bg-muted text-muted-foreground'
            )}>
              {sensorEvidence.status}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">Reading at {sensorEvidence.time}</p>
        </div>
      )}
    </div>
  );
}
