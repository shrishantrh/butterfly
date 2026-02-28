import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Camera, Square, Wifi, MicOff, VideoOff, AlertCircle } from 'lucide-react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';

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

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  const {
    analyzedItems,
    isAnalyzing,
    addTranscript,
    analyzeNow,
    itemCount,
  } = useInspectionAI(machine?.activeFaultCodes ?? []);

  // ElevenLabs Scribe for real-time STT
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data) => {
      setLatestPartial(data.text);
    },
    onCommittedTranscript: (data) => {
      setCommittedTexts(prev => [...prev, data.text]);
      setLatestPartial('');
      addTranscript(data.text);
    },
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Start everything
  const startInspection = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Get ElevenLabs scribe token
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to get transcription token');
      }

      // Start transcription
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setCameraStream(stream);
        setIsCameraOn(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (camErr) {
        console.warn('Camera not available:', camErr);
        toast({
          title: 'Camera unavailable',
          description: 'Continuing with audio only. You can still capture findings by voice.',
          variant: 'default',
        });
      }
    } catch (e) {
      console.error('Failed to start inspection:', e);
      toast({
        title: 'Failed to start',
        description: e instanceof Error ? e.message : 'Could not initialize inspection',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, toast, addTranscript]);

  // Auto-start on mount
  useEffect(() => {
    startInspection();
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = useCallback(async () => {
    // Stop transcription
    scribe.disconnect();
    
    // Stop camera
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOn(false);

    // Run final analysis
    await analyzeNow();

    // Navigate to review with analyzed data in state
    navigate(`/review/${machine?.id}`, {
      state: {
        analyzedItems: Object.fromEntries(analyzedItems),
        transcript: committedTexts.join(' '),
      },
    });
  }, [scribe, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = Math.round((itemCount / totalFields) * 100);

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${scribe.isConnected ? 'bg-status-fail animate-recording-pulse' : 'bg-muted-foreground'}`} />
          <span className={`text-xs font-mono font-semibold ${scribe.isConnected ? 'text-status-fail' : 'text-muted-foreground'}`}>
            {scribe.isConnected ? 'REC' : isConnecting ? 'CONNECTING...' : 'OFF'}
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-2">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-sensor animate-pulse-glow" />
              <span className="text-[10px] font-mono text-sensor">AI</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-sensor" />
            <span className="text-[10px] font-mono text-sensor">LIVE</span>
          </div>
        </div>
      </header>

      {/* Camera preview (small) */}
      {isCameraOn && (
        <div className="relative mx-4 mt-3 rounded-lg overflow-hidden border border-border" style={{ height: '120px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-foreground">
            <Camera className="w-3 h-3" /> LIVE
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
        {/* Progress ring */}
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-foreground">{pct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Complete</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">{itemCount}/{totalFields} fields captured</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{machine.assetId}</p>
        </div>

        {/* Active indicators */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            scribe.isConnected 
              ? 'bg-status-fail/15 text-status-fail' 
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            {scribe.isConnected ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            Audio
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            isCameraOn 
              ? 'bg-primary/15 text-primary' 
              : 'bg-muted/50 text-muted-foreground'
          }`}>
            {isCameraOn ? <Camera className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            Video
          </div>
        </div>
      </div>

      {/* Live transcript ticker */}
      <div className="px-4 py-3 border-t border-border bg-card/30">
        <p className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">Live Transcript</p>
        <div className="min-h-[40px] max-h-[80px] overflow-y-auto">
          {committedTexts.length > 0 && (
            <p className="text-xs text-muted-foreground/70 mb-1">
              {committedTexts.slice(-2).join(' ')}
            </p>
          )}
          <p className="text-sm text-foreground animate-fade-in">
            {latestPartial || (scribe.isConnected ? 'Listening...' : isConnecting ? 'Connecting to transcription...' : 'Tap to start')}
          </p>
        </div>
      </div>

      {/* Stop button */}
      <div className="p-4 bg-card/50 border-t border-border">
        <button
          onClick={handleStop}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-status-fail text-accent-foreground font-bold text-base hover:brightness-110 transition-all"
        >
          <Square className="w-5 h-5" />
          End Inspection
        </button>
      </div>
    </div>
  );
}
