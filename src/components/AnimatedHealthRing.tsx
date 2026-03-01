import { motion } from 'framer-motion';

interface AnimatedHealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedHealthRing({ score, size = 56, strokeWidth = 4, className }: AnimatedHealthRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const color = score >= 80 ? 'hsl(var(--status-pass))' : score >= 50 ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-fail))';
  const gradientId = `health-gradient-${size}-${score}`;

  // Tick marks around the ring for a gauge feel
  const tickCount = 20;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (i / tickCount) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const innerR = radius + strokeWidth * 0.6;
    const outerR = radius + strokeWidth * 1.4;
    const isMajor = i % 5 === 0;
    return {
      x1: center + innerR * Math.cos(rad),
      y1: center + innerR * Math.sin(rad),
      x2: center + (isMajor ? outerR : outerR - 1.5) * Math.cos(rad),
      y2: center + (isMajor ? outerR : outerR - 1.5) * Math.sin(rad),
      isMajor,
      filled: (i / tickCount) * 100 <= score,
    };
  });

  return (
    <div className={`relative ${className || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        
        {/* Progress arc */}
        <motion.circle
          cx={center} cy={center} r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <motion.line
            key={i}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke={tick.filled ? color : 'hsl(var(--muted-foreground))'}
            strokeWidth={tick.isMajor ? 1.5 : 0.75}
            opacity={tick.filled ? 0.6 : 0.15}
            initial={{ opacity: 0 }}
            animate={{ opacity: tick.filled ? 0.6 : 0.15 }}
            transition={{ delay: 0.3 + i * 0.02, duration: 0.3 }}
          />
        ))}
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center rotate-0">
        <motion.span
          className="font-bold font-mono text-foreground"
          style={{ fontSize: size * 0.3 }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
        >
          {score}
        </motion.span>
      </div>
    </div>
  );
}
