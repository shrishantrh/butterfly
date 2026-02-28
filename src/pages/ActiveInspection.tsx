import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Square, Camera, Mic, MicOff, Upload, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import type { AnalysisResult } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';
import { LiveFormChecklist } from '@/components/inspection/LiveFormChecklist';

export default function ActiveInspection() {
  const { machineId } = useParams();
  const [searchParams] = useSearchParams();
  const isUploadMode = searchParams.get('mode') === 'upload';
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const [elapsed, setElapsed] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [latestPartial, setLatestPartial] = useState('');
  const [committedTexts, setCommittedTexts] = useState<string[]>([]);
  const prevItemCount = useRef(0);
  const isMounted = useRef(true);
  const scribeConnected = useRef(false);
  const [showForm, setShowForm] = useState(true);
  const [viewMode, setViewMode] = useState<'form' | 'camera'>('form');

  // Upload mode state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  const {
    analyzedItems,
    isAnalyzing,
    error: aiError,
    addTranscript,
    analyzeNow,
    itemCount,
    getFullTranscript,
    registerFrameCapture,
    setManualItem,
  } = useInspectionAI(machine?.activeFaultCodes ?? []);

  // Register frame capture function
  useEffect(() => {
    registerFrameCapture(() => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.7);
    });
  }, [registerFrameCapture]);

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
        if (hasFail) navigator.vibrate([100, 50, 100, 50, 100]);
        else if (hasMonitor) navigator.vibrate([100, 50, 100]);
        else navigator.vibrate(50);
      }

      const count = itemCount - prevItemCount.current;
      toast({
        title: `${count} item${count > 1 ? 's' : ''} detected`,
        description: hasFail ? 'FAIL detected — review required' : hasMonitor ? 'MONITOR item flagged' : 'Items logged',
      });

      prevItemCount.current = itemCount;
    }
  }, [itemCount, analyzedItems, toast]);

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
    if (isUploadMode) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isUploadMode]);

  const startCamera = useCallback(async () => {
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
      console.log('Camera not available');
    }
  }, []);

  const startLiveInspection = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (error || !data?.token) {
        throw new Error(data?.error || error?.message || 'Failed to get transcription token');
      }

      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      scribeConnected.current = true;
      await startCamera();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not initialize inspection';
      setConnectionError(msg);
      toast({ title: 'Connection failed', description: msg, variant: 'destructive' });
      // Still start camera even if mic fails
      await startCamera();
    } finally {
      if (isMounted.current) setIsConnecting(false);
    }
  }, [scribe, toast, startCamera]);

  // Auto-start
  useEffect(() => {
    if (!isUploadMode) {
      startLiveInspection();
    }
    return () => {
      if (scribeConnected.current) {
        try { scribe.disconnect(); } catch {}
        scribeConnected.current = false;
      }
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Handle video upload
  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Extracting audio...');

    try {
      setUploadProgress('Transcribing audio...');

      // Simulate transcription from uploaded video (in production, send to a transcription API)
      const mockTranscript = `Video inspection uploaded: ${file.name}. The inspector walked around the machine performing a full daily safety and maintenance inspection. Starting from the ground level, the machine appears to be parked level with chocks in place. Walking around the undercarriage, tracks look good, tension is within spec. Rollers and idlers spinning freely. Track frames and guards intact. Moving to the boom, no visible cracks or damage to the structure or welds. Stick looks good structurally. Bucket teeth are showing wear on two of the center teeth, cutting edge has some chipping. Hydraulic cylinders on the boom show minor seepage at the rod seal. Stick and bucket cylinders look fine. Hoses and fittings are secure, no leaks visible. Swing bearing and drive operating smooth. Counterweight secure. All lights working except the right rear work light is out. Safety labels are legible. No fluid leaks on the ground. Moving to the engine compartment. Oil level is good, color looks normal. Coolant is slightly low, should top off. Hydraulic oil in the sight glass is at the right level but the temp warning was on yesterday. Air filter indicator is green. Belts look good, no cracking. Radiator has a lot of debris packed in the fins, needs cleaning. DEF tank at about sixty-five percent. Battery connections are clean and tight. On the machine outside, steps and handrails are solid. Cab glass and seals look good. Right side mirror has a small scratch. ROPS FOPS structure is fine. Fuel cap is secure. Inside the cab, seat and seatbelt working. Controls all responsive. Horn works. Backup alarm tested and working. Gauges show the hydraulic temp warning light. HVAC blowing cold. Fire extinguisher is present and charged. Wipers working, washer fluid dispensing. Monitor display is functional, Cat Grade system calibrated.`;

      setUploadProgress('Analyzing with AI...');
      addTranscript(mockTranscript);
      setCommittedTexts([mockTranscript]);

      await new Promise(resolve => setTimeout(resolve, 1500));
      await analyzeNow();

      setUploadProgress('Complete');
      toast({ title: 'Video analyzed', description: 'AI has processed the inspection recording.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Failed to process video', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }, [addTranscript, analyzeNow, toast]);

  const handleStop = useCallback(async () => {
    if (scribeConnected.current) {
      try { scribe.disconnect(); } catch {}
      scribeConnected.current = false;
    }
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
  }, [scribe, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts, elapsed]);

  const handleManualEdit = useCallback((id: string, result: AnalysisResult) => {
    setManualItem(id, result);
  }, [setManualItem]);

  if (!machine) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = Math.round((itemCount / totalFields) * 100);
  const liveText = latestPartial || (committedTexts.length > 0 ? committedTexts[committedTexts.length - 1] : '');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar with safe area */}
      <header className="flex items-center justify-between px-5 py-4 pt-14 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {!isUploadMode ? (
            <>
              <div className={`w-3.5 h-3.5 rounded-full ${scribe.isConnected ? 'bg-status-fail animate-pulse' : 'bg-muted-foreground'}`} />
              <span className={`text-base font-mono font-semibold ${scribe.isConnected ? 'text-status-fail' : 'text-muted-foreground'}`}>
                {scribe.isConnected ? 'REC' : isConnecting ? 'CONNECTING...' : 'OFF'}
              </span>
              <span className="text-base font-mono text-muted-foreground">{formatTime(elapsed)}</span>
            </>
          ) : (
            <span className="text-base font-mono font-semibold text-primary">UPLOAD MODE</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sensor animate-pulse" />
              <span className="text-base font-mono text-sensor font-semibold">AI</span>
            </div>
          )}
          <span className="text-base font-mono text-muted-foreground">{machine.assetId}</span>
        </div>
      </header>

      {/* Live transcript bar — always visible */}
      <div className="px-4 py-3 bg-surface-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-1">
          {scribe.isConnected ? (
            <Mic className="w-4 h-4 text-status-fail shrink-0" />
          ) : (
            <MicOff className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-mono text-muted-foreground">
            {scribe.isConnected ? 'Listening...' : isUploadMode ? 'Upload transcript' : 'Mic offline'}
          </span>
        </div>
        <p className="text-base text-foreground leading-snug min-h-[1.5em]">
          {latestPartial && <span className="text-primary">{latestPartial}</span>}
          {!latestPartial && liveText && (
            <span className="text-muted-foreground">{liveText.slice(-120)}</span>
          )}
          {!latestPartial && !liveText && (
            <span className="text-muted-foreground/50 italic">
              {isUploadMode ? 'Upload a video to begin analysis' : 'Speak to begin inspection...'}
            </span>
          )}
        </p>
      </div>

      {/* Connection error */}
      {connectionError && !isUploadMode && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-status-fail/10 border border-status-fail/20 rounded-xl p-4 shrink-0">
          <AlertCircle className="w-5 h-5 text-status-fail shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-semibold text-status-fail">Microphone connection failed</p>
            <p className="text-sm text-muted-foreground mt-1">{connectionError}</p>
            <button onClick={startLiveInspection} className="mt-2 text-base text-primary font-semibold touch-target">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* AI error */}
      {aiError && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-status-monitor/10 border border-status-monitor/20 rounded-xl p-3 shrink-0">
          <AlertCircle className="w-4 h-4 text-status-monitor shrink-0" />
          <p className="text-sm text-status-monitor">{aiError}</p>
        </div>
      )}

      {/* Progress bar + view toggle */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-base font-mono text-muted-foreground font-semibold shrink-0">
            {itemCount}/{totalFields}
          </span>
        </div>
        {/* View toggle tabs */}
        {!isUploadMode && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setViewMode('form')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                viewMode === 'form' ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground'
              }`}
            >
              Form ({itemCount}/{totalFields})
            </button>
            <button
              onClick={() => setViewMode('camera')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                viewMode === 'camera' ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground'
              }`}
            >
              Camera
            </button>
          </div>
        )}
      </div>

      {/* Upload area */}
      {isUploadMode && itemCount === 0 && (
        <div className="mx-4 mb-3 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-xl border-2 border-dashed border-border bg-surface-2 hover:border-primary/40 active:scale-[0.98] transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-lg text-foreground font-semibold">{uploadProgress}</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">Tap to upload video or audio</p>
                <p className="text-base text-muted-foreground">MP4, MOV, MP3 — AI will transcribe & analyze</p>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Camera view */}
        {viewMode === 'camera' && !isUploadMode && (
          <div className="px-4 pb-4">
            {isCameraOn ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 px-3 py-1.5 rounded-lg text-sm font-mono text-foreground">
                  <Camera className="w-4 h-4" /> LIVE
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center aspect-video rounded-xl bg-surface-2 border border-border">
                <p className="text-muted-foreground">Camera not available</p>
              </div>
            )}

            {/* Recent transcript in camera view */}
            {committedTexts.length > 0 && (
              <div className="mt-3 bg-surface-2 rounded-xl p-3">
                <p className="text-sm font-mono text-muted-foreground mb-1">Full Transcript</p>
                <p className="text-base text-foreground/80 leading-relaxed max-h-40 overflow-y-auto">
                  {committedTexts.join(' ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form view */}
        {(viewMode === 'form' || isUploadMode) && (
          <div className="px-4 pb-4">
            <LiveFormChecklist
              sections={inspectionFormSections}
              analyzedItems={analyzedItems}
              isAnalyzing={isAnalyzing}
              onManualEdit={handleManualEdit}
            />
          </div>
        )}
      </div>

      {/* Hidden video for frame capture when in form view */}
      {viewMode === 'form' && isCameraOn && (
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      )}

      {/* Bottom controls */}
      <div className="p-4 bg-card border-t border-border safe-bottom shrink-0">
        {isUploadMode ? (
          <button
            onClick={handleStop}
            disabled={itemCount === 0}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg active:scale-[0.98] transition-all disabled:opacity-40 touch-target"
          >
            Review Results ({itemCount}/{totalFields})
          </button>
        ) : (
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${
                scribe.isConnected ? 'bg-status-fail/15 border border-status-fail/30' : 'bg-surface-2 border border-border'
              }`}>
                {scribe.isConnected ? <Mic className="w-6 h-6 text-status-fail" /> : <MicOff className="w-6 h-6 text-muted-foreground" />}
              </div>
              {isCameraOn && (
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/15 border border-primary/30">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl bg-status-fail text-accent-foreground font-bold text-lg active:scale-[0.98] transition-all touch-target"
            >
              <Square className="w-5 h-5" />
              End Inspection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
