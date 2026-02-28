import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Camera, Square, MicOff, VideoOff } from 'lucide-react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';
import { InspectionHUD } from '@/components/inspection/InspectionHUD';
import { InspectionTranscript } from '@/components/inspection/InspectionTranscript';

export default function ActiveInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const [elapsed, setElapsed] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [latestPartial, setLatestPartial] = useState('');
  const [committedTexts, setCommittedTexts] = useState<string[]>([]);
  const prevItemCount = useRef(0);
  const isMounted = useRef(true);

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  const {
    analyzedItems,
    isAnalyzing,
    addTranscript,
    analyzeNow,
    itemCount,
  } = useInspectionAI(machine?.activeFaultCodes ?? []);

  // Track mount state
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Haptic feedback when AI captures a finding
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      const newItems = Array.from(analyzedItems.values()).slice(prevItemCount.current);
      const hasFail = newItems.some(i => i.status === 'fail');
      const hasMonitor = newItems.some(i => i.status === 'monitor');

      if (navigator.vibrate) {
        if (hasFail) {
          navigator.vibrate([100, 50, 100, 50, 100]);
        } else if (hasMonitor) {
          navigator.vibrate([100, 50, 100]);
        } else {
          navigator.vibrate(50);
        }
      }
      prevItemCount.current = itemCount;
    }
  }, [itemCount, analyzedItems]);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      if (isMounted.current) setLatestPartial(data.text);
    },
    onCommittedTranscript: (data) => {
      if (isMounted.current) {
        setCommittedTexts(prev => [...prev, data.text]);
        setLatestPartial('');
        addTranscript(data.text);
      }
    },
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const startInspection = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (isMounted.current) {
          setCameraStream(stream);
          setIsCameraOn(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch {
        toast({ title: 'Camera unavailable', description: 'Continuing with audio only.', variant: 'default' });
      }
    } catch (e) {
      toast({
        title: 'Failed to start',
        description: e instanceof Error ? e.message : 'Could not initialize inspection',
        variant: 'destructive',
      });
    } finally {
      if (isMounted.current) setIsConnecting(false);
    }
  }, [scribe, toast, addTranscript]);

  useEffect(() => {
    startInspection();
    return () => {
      // Cleanup on unmount — safe disconnect
      try { scribe.disconnect(); } catch {}
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = useCallback(async () => {
    const coverage = itemCount / totalFields;
    if (coverage < 0.7 && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    try { scribe.disconnect(); } catch {}
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOn(false);

    await analyzeNow();

    navigate(`/review/${machine?.id}`, {
      state: {
        analyzedItems: Object.fromEntries(analyzedItems),
        transcript: committedTexts.join(' '),
        elapsed,
      },
    });
  }, [scribe, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts, elapsed, itemCount, totalFields]);

  if (!machine) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const sectionProgress = inspectionFormSections.map(section => {
    const covered = section.items.filter(item => analyzedItems.has(item.id)).length;
    return { id: section.id, title: section.title, covered, total: section.items.length };
  });

  const pct = Math.round((itemCount / totalFields) * 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${scribe.isConnected ? 'bg-status-fail animate-recording-pulse' : 'bg-muted-foreground'}`} />
          <span className={`text-xs font-mono font-semibold ${scribe.isConnected ? 'text-status-fail' : 'text-muted-foreground'}`}>
            {scribe.isConnected ? 'REC' : isConnecting ? 'CONNECTING' : 'OFF'}
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-1">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-sensor animate-pulse-glow" />
              <span className="text-xs font-mono text-sensor">ANALYZING</span>
            </div>
          )}
          <span className="text-xs font-mono text-muted-foreground">{machine.assetId}</span>
        </div>
      </header>

      {/* Camera preview */}
      {isCameraOn && (
        <div className="relative mx-5 mt-3 rounded-lg overflow-hidden border border-border" style={{ height: '120px' }}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/80 px-2 py-1 rounded-md text-xs font-mono text-foreground">
            <Camera className="w-3 h-3" /> LIVE
          </div>
        </div>
      )}

      {/* Main: HUD */}
      <div className="flex-1 flex flex-col">
        <InspectionHUD
          pct={pct}
          itemCount={itemCount}
          totalFields={totalFields}
          sectionProgress={sectionProgress}
          isConnected={scribe.isConnected}
          isCameraOn={isCameraOn}
        />
      </div>

      {/* Transcript */}
      <InspectionTranscript
        committedTexts={committedTexts}
        latestPartial={latestPartial}
        isConnected={scribe.isConnected}
        isConnecting={isConnecting}
      />

      {/* Stop */}
      <div className="p-5 bg-card border-t border-border safe-bottom">
        <button
          onClick={handleStop}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-status-fail text-accent-foreground font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Square className="w-5 h-5" />
          End Inspection
        </button>
      </div>
    </div>
  );
}
