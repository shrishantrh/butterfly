import { InspectionStatus } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface StatusBadgeProps {
  status: InspectionStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<InspectionStatus, { label: string; dotClass: string; bgClass: string }> = {
  pass: { label: 'PASS', dotClass: 'status-dot-pass', bgClass: 'bg-status-pass/12 text-status-pass border border-status-pass/20' },
  monitor: { label: 'MONITOR', dotClass: 'status-dot-monitor', bgClass: 'bg-status-monitor/12 text-status-monitor border border-status-monitor/20' },
  fail: { label: 'FAIL', dotClass: 'status-dot-fail', bgClass: 'bg-status-fail/12 text-status-fail border border-status-fail/20' },
  normal: { label: 'N/A', dotClass: 'status-dot-normal', bgClass: 'bg-muted/50 text-muted-foreground border border-border/40' },
  unconfirmed: { label: '—', dotClass: 'bg-border', bgClass: 'bg-border/20 text-muted-foreground/60 border border-border/30 border-dashed' },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, className, showLabel = true }, ref) => {
    const config = statusConfig[status];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider',
          config.bgClass,
          className
        )}
      >
        <span className={cn('status-dot', config.dotClass)} />
        {showLabel && config.label}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

export const StatusSummary = forwardRef<HTMLDivElement, { pass: number; monitor: number; fail: number; normal: number }>(
  ({ pass, monitor, fail, normal }, ref) => {
    return (
      <div ref={ref} className="flex items-center gap-2.5 text-sm font-mono font-semibold">
        <span className="flex items-center gap-1"><span className="status-dot status-dot-pass" />{pass}</span>
        <span className="flex items-center gap-1"><span className="status-dot status-dot-monitor" />{monitor}</span>
        <span className="flex items-center gap-1"><span className="status-dot status-dot-fail" />{fail}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><span className="status-dot status-dot-normal" />{normal}</span>
      </div>
    );
  }
);
StatusSummary.displayName = 'StatusSummary';
