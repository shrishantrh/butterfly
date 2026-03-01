import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface SlideToInspectProps {
  onSlideComplete: () => void;
  label?: string;
}

export function SlideToInspect({ onSlideComplete, label = 'Start Inspection' }: SlideToInspectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [completed, setCompleted] = useState(false);
  const x = useMotionValue(0);

  const thumbSize = 56;
  const padding = 4;
  const maxDrag = containerWidth - thumbSize - padding * 2;

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const bgOpacity = useTransform(x, [0, maxDrag * 0.5, maxDrag], [0, 0.3, 1]);
  const textOpacity = useTransform(x, [0, maxDrag * 0.3], [1, 0]);
  const checkOpacity = useTransform(x, [maxDrag * 0.8, maxDrag], [0, 1]);
  const shimmerX = useTransform(x, [0, maxDrag], [0, 100]);

  const handleDragEnd = useCallback(() => {
    const currentX = x.get();
    if (currentX >= maxDrag * 0.75) {
      animate(x, maxDrag, { type: 'spring', stiffness: 300, damping: 30 });
      setCompleted(true);
      setTimeout(() => onSlideComplete(), 400);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [maxDrag, onSlideComplete, x]);

  return (
    <div
      ref={containerRef}
      className="relative h-[60px] rounded-[20px] overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, hsla(222, 12%, 14%, 0.7), hsla(222, 12%, 8%, 0.8))',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '0.5px solid hsla(210, 20%, 40%, 0.15)',
        boxShadow: '0 0 0 0.5px hsla(210, 20%, 100%, 0.04) inset, 0 8px 32px -4px hsla(225, 30%, 3%, 0.5)',
        padding: `${padding}px`,
      }}
    >
      {/* Filled track */}
      <motion.div
        className="absolute inset-0 rounded-[20px]"
        style={{
          opacity: bgOpacity,
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
        }}
      />

      {/* Shimmer animation */}
      <div className="absolute inset-0 overflow-hidden rounded-[20px]">
        <motion.div
          className="absolute top-0 bottom-0 w-[60px]"
          style={{
            left: shimmerX,
            background: 'linear-gradient(90deg, transparent, hsla(46, 100%, 70%, 0.08), transparent)',
          }}
          animate={{ left: ['0%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center gap-2 pointer-events-none"
        style={{ opacity: textOpacity }}
      >
        <span className="text-[15px] font-semibold text-muted-foreground tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-0.5 text-muted-foreground/40">
          <ChevronRight className="w-4 h-4 animate-pulse" />
          <ChevronRight className="w-4 h-4 animate-pulse" style={{ animationDelay: '0.15s' }} />
        </div>
      </motion.div>

      {/* Success label */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: checkOpacity }}
      >
        <span className="text-[15px] font-bold text-primary-foreground">Starting...</span>
      </motion.div>

      {/* Draggable thumb */}
      {containerWidth > 0 && (
        <motion.div
          className="relative z-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            width: thumbSize,
            height: thumbSize - padding * 2,
            borderRadius: 16,
            background: completed
              ? 'hsl(var(--primary))'
              : 'linear-gradient(145deg, hsl(var(--primary)), hsl(var(--accent)))',
            boxShadow: '0 4px 16px hsla(46, 100%, 50%, 0.3), 0 0 0 0.5px hsla(46, 100%, 70%, 0.2) inset',
            x,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.95 }}
        >
          <Play className="w-5 h-5 text-primary-foreground fill-primary-foreground ml-0.5" />
        </motion.div>
      )}
    </div>
  );
}
