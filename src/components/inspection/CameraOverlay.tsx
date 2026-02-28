import { useState, useRef, useEffect } from 'react';
import { Minimize2, Maximize2, X, Eye, GripVertical } from 'lucide-react';

interface CameraOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraStream: MediaStream | null;
  isAnalyzing: boolean;
  isCameraOn: boolean;
}

type CameraSize = 'minimized' | 'compact' | 'expanded';

export function CameraOverlay({ videoRef, cameraStream, isAnalyzing, isCameraOn }: CameraOverlayProps) {
  const [size, setSize] = useState<CameraSize>('compact');
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Assign stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, videoRef, size]);

  if (!isCameraOn) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setPosition({
      x: Math.max(0, e.clientX - dragStart.current.x),
      y: Math.max(0, e.clientY - dragStart.current.y),
    });
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const cycleSize = () => {
    setSize(prev => prev === 'minimized' ? 'compact' : prev === 'compact' ? 'expanded' : 'minimized');
  };

  const sizeConfig = {
    minimized: { width: 80, height: 60, className: 'rounded-lg' },
    compact: { width: 180, height: 135, className: 'rounded-xl' },
    expanded: { width: 320, height: 240, className: 'rounded-2xl' },
  };

  const config = sizeConfig[size];

  return (
    <div
      ref={overlayRef}
      className={`fixed z-50 shadow-2xl border border-border/40 overflow-hidden ${config.className} transition-all duration-200`}
      style={{
        width: config.width,
        height: config.height,
        right: position.x,
        top: position.y + 100, // offset below header
      }}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        onClick={cycleSize}
      />

      {/* Drag handle */}
      <div
        className="absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="w-8 h-1 rounded-full bg-foreground/30" />
      </div>

      {/* LIVE badge */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
        <div className="w-1.5 h-1.5 rounded-full bg-status-fail animate-pulse" />
        <span className="text-[8px] font-mono text-foreground font-bold">LIVE</span>
      </div>

      {/* Analysis indicator */}
      {isAnalyzing && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-sensor/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
          <div className="w-1.5 h-1.5 rounded-full bg-sensor animate-pulse" />
          <span className="text-[8px] font-mono text-sensor font-bold">AI</span>
        </div>
      )}

      {/* Vision AI badge */}
      {size !== 'minimized' && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-background/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
          <Eye className="w-2.5 h-2.5 text-primary" />
          <span className="text-[7px] font-mono text-primary font-bold">VISION</span>
        </div>
      )}

      {/* Size toggle */}
      <button
        onClick={cycleSize}
        className="absolute top-1.5 left-1.5 p-1 rounded bg-background/50 backdrop-blur-sm"
      >
        {size === 'expanded' ? (
          <Minimize2 className="w-3 h-3 text-foreground/70" />
        ) : (
          <Maximize2 className="w-3 h-3 text-foreground/70" />
        )}
      </button>
    </div>
  );
}
