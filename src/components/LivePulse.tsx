import { motion } from 'framer-motion';

interface LivePulseProps {
  label?: string;
  className?: string;
}

export function LivePulse({ label = 'LIVE', className }: LivePulseProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className || ''}`}>
      <div className="relative">
        <motion.span
          className="absolute inset-0 rounded-full bg-status-fail"
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="relative block w-2 h-2 rounded-full bg-status-fail" />
      </div>
      <span className="text-[10px] font-mono font-bold tracking-widest text-status-fail uppercase">
        {label}
      </span>
    </div>
  );
}
