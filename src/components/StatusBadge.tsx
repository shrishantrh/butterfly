import { InspectionStatus } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: InspectionStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<InspectionStatus, { label: string; dotClass: string; bgClass: string }> = {
  pass: { label: 'PASS', dotClass: 'status-dot-pass', bgClass: 'bg-status-pass/15 text-status-pass' },
  monitor: { label: 'MONITOR', dotClass: 'status-dot-monitor', bgClass: 'bg-status-monitor/15 text-status-monitor' },
  fail: { label: 'FAIL', dotClass: 'status-dot-fail', bgClass: 'bg-status-fail/15 text-status-fail' },
  normal: { label: 'NORMAL', dotClass: 'status-dot-normal', bgClass: 'bg-muted text-muted-foreground' },
  unconfirmed: { label: 'UNCONFIRMED', dotClass: 'bg-border', bgClass: 'bg-border/30 text-muted-foreground' },
};

export function StatusBadge({ status, className, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-mono font-semibold uppercase tracking-wider', config.bgClass, className)}>
      <span className={cn('status-dot', config.dotClass)} />
      {showLabel && config.label}
    </span>
  );
}

export function StatusSummary({ pass, monitor, fail, normal }: { pass: number; monitor: number; fail: number; normal: number }) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className="flex items-center gap-1"><span className="status-dot status-dot-pass" />{pass}</span>
      <span className="flex items-center gap-1"><span className="status-dot status-dot-monitor" />{monitor}</span>
      <span className="flex items-center gap-1"><span className="status-dot status-dot-fail" />{fail}</span>
      <span className="flex items-center gap-1"><span className="status-dot status-dot-normal" />{normal}</span>
    </div>
  );
}
