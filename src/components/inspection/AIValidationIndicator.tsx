import { CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIValidationIndicatorProps {
  agreement?: 'agree' | 'disagree' | 'uncertain' | null;
  visualNote?: string | null;
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

export function AIValidationIndicator({ agreement, visualNote, compact = false, className }: AIValidationIndicatorProps) {
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
    </div>
  );
}
