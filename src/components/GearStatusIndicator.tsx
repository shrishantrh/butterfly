import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { InspectionStatus } from '@/lib/mock-data';

interface GearStatusSelectorProps {
  status: InspectionStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig: Record<string, { color: string; label: string; glow: string }> = {
  pass: { color: 'hsl(var(--status-pass))', label: 'PASS', glow: 'var(--status-pass)' },
  monitor: { color: 'hsl(var(--status-monitor))', label: 'MON', glow: 'var(--status-monitor)' },
  fail: { color: 'hsl(var(--status-fail))', label: 'FAIL', glow: 'var(--status-fail)' },
  normal: { color: 'hsl(var(--status-normal))', label: 'N/A', glow: 'var(--status-normal)' },
  unconfirmed: { color: 'hsl(var(--border))', label: '—', glow: 'var(--border)' },
  conflicted: { color: 'hsl(var(--status-conflicted))', label: '!!', glow: 'var(--status-conflicted)' },
};

// Generates SVG path for a gear shape
function gearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number): string {
  const points: string[] = [];
  const toothAngle = (Math.PI * 2) / teeth;
  const halfTooth = toothAngle * 0.3;

  for (let i = 0; i < teeth; i++) {
    const angle = i * toothAngle - Math.PI / 2;
    // Start of tooth (inner)
    points.push(`${cx + innerR * Math.cos(angle - halfTooth)},${cy + innerR * Math.sin(angle - halfTooth)}`);
    // Tooth tip left
    points.push(`${cx + outerR * Math.cos(angle - halfTooth * 0.5)},${cy + outerR * Math.sin(angle - halfTooth * 0.5)}`);
    // Tooth tip right
    points.push(`${cx + outerR * Math.cos(angle + halfTooth * 0.5)},${cy + outerR * Math.sin(angle + halfTooth * 0.5)}`);
    // End of tooth (inner)
    points.push(`${cx + innerR * Math.cos(angle + halfTooth)},${cy + innerR * Math.sin(angle + halfTooth)}`);
  }

  return `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(' ')} Z`;
}

export function GearStatusIndicator({ status, showLabel = true, size = 'md', className }: GearStatusSelectorProps) {
  const normalizedStatus = (status?.toLowerCase() ?? 'unconfirmed') as string;
  const config = statusConfig[normalizedStatus] ?? statusConfig.unconfirmed;
  const isActive = normalizedStatus !== 'unconfirmed';

  const sizeMap = { sm: 20, md: 28, lg: 36 };
  const s = sizeMap[size];
  const center = s / 2;
  const outerR = s * 0.46;
  const innerR = s * 0.34;
  const teeth = size === 'sm' ? 6 : 8;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <motion.svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        className="block"
        initial={false}
        animate={isActive ? { rotate: 360 } : { rotate: 0 }}
        transition={isActive ? { duration: 0.6, ease: [0.32, 0.72, 0, 1] } : { duration: 0 }}
      >
        {isActive ? (
          <>
            {/* Glow */}
            <circle cx={center} cy={center} r={outerR + 2} fill="none" stroke={config.color} strokeWidth="0.5" opacity="0.2" />
            {/* Gear shape */}
            <motion.path
              d={gearPath(center, center, outerR, innerR, teeth)}
              fill={config.color}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ transformOrigin: `${center}px ${center}px` }}
            />
            {/* Center hole */}
            <circle cx={center} cy={center} r={s * 0.14} fill="hsl(var(--background))" />
          </>
        ) : (
          <>
            {/* Simple circle when inactive */}
            <circle cx={center} cy={center} r={innerR} fill="none" stroke={config.color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
          </>
        )}
      </motion.svg>
      {showLabel && (
        <span
          className="text-[10px] font-mono font-bold uppercase tracking-wider"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
