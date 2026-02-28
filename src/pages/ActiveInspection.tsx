import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Square, Camera, Mic, MicOff, Upload, AlertCircle, Eye, List, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { AnalysisResult } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';
import { LiveFormChecklist } from '@/components/inspection/LiveFormChecklist';
import { VoiceAgent, FormState } from '@/components/inspection/VoiceAgent';

export default function ActiveInspection() {
  const { machineId } = useParams();
  const [searchParams] = useSearchParams();
  const isUploadMode = searchParams.get('mode') === 'upload';
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const [elapsed, setElapsed] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [latestPartial, setLatestPartial] = useState('');
  const [committedTexts, setCommittedTexts] = useState<string[]>([]);
  const prevItemCount = useRef(0);
  const isMounted = useRef(true);
  const [viewMode, setViewMode] = useState<'form' | 'camera'>('form');
  const hasStarted = useRef(false);

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
    addFrame,
    analyzeNow,
    itemCount,
    registerFrameCapture,
    setManualItem,
  } = useInspectionAI(machine?.activeFaultCodes ?? []);

  // Native Speech Recognition
  const speech = useSpeechRecognition({
    onTranscript: useCallback((text: string) => {
      setCommittedTexts(prev => [...prev, text]);
      setLatestPartial('');
      addTranscript(text);
    }, [addTranscript]),
    onPartial: useCallback((text: string) => {
      setLatestPartial(text);
    }, []),
  });

  // Register frame capture for evidence photos
  useEffect(() => {
    registerFrameCapture(() => {
      const video = videoRef.current;
      if (!video || !canvasRef.current) return null;
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
      } else {
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      console.log('[Inspection] Camera not available:', err);
    }
  }, []);

  // Sync video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, viewMode]);

  // Periodic video frame capture for multimodal AI analysis
  useEffect(() => {
    if (!isCameraOn || isUploadMode) return;

    const captureInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || !canvasRef.current || video.readyState < 2) return;

      const canvas = canvasRef.current;
      // Resize to 512px max for efficient transfer
      const scale = Math.min(512 / video.videoWidth, 512 / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.4);
      addFrame(frameBase64);
      console.log('[Inspection] Frame captured for vision analysis');
    }, 12000); // every 12 seconds

    return () => clearInterval(captureInterval);
  }, [isCameraOn, isUploadMode, addFrame]);

  // Auto-start on mount
  useEffect(() => {
    if (isUploadMode || hasStarted.current) return;
    hasStarted.current = true;

    const init = async () => {
      // Start camera
      await startCamera();
      // Start speech recognition
      speech.start();
    };
    init();

    return () => {
      speech.stop();
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle video upload
  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress('Extracting audio...');

    try {
      setUploadProgress('Transcribing audio...');

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
    speech.stop();
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
  }, [speech, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts, elapsed]);

  const handleManualEdit = useCallback((id: string, result: AnalysisResult) => {
    setManualItem(id, result);
  }, [setManualItem]);

  // Build formState for VoiceAgent from analyzedItems + schema
  const formState: FormState = React.useMemo(() => {
    const components: FormState['components'] = {};
    inspectionFormSections.forEach(section => {
      section.items.forEach(item => {
        const result = analyzedItems.get(item.id);
        components[item.id] = {
          id: item.id,
          name: item.label,
          status: result ? result.status : null,
          notes: result?.comment || '',
          inspected: !!result,
        };
      });
    });
    return { components };
  }, [analyzedItems]);

  const setFormState = useCallback((updater: React.SetStateAction<FormState>) => {
    const next = typeof updater === 'function' ? updater(formState) : updater;
    Object.entries(next.components).forEach(([id, comp]) => {
      const prev = formState.components[id];
      if (comp.inspected && (!prev || prev.status !== comp.status || prev.notes !== comp.notes)) {
        setManualItem(id, {
          id,
          status: (comp.status || 'normal') as AnalysisResult['status'],
          comment: comp.notes,
          evidence: ['audio'],
        });
      }
    });
  }, [formState, setManualItem]);

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
      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar — recording status */}
      <header className="flex items-center justify-between px-5 py-3 pt-14 bg-card/95 backdrop-blur-xl border-b border-border shrink-0 z-40">
        <div className="flex items-center gap-3">
          {!isUploadMode ? (
            <>
              <div className={`w-3 h-3 rounded-full ${speech.isListening ? 'bg-status-fail animate-recording-pulse' : 'bg-muted-foreground'}`} />
              <span className={`text-sm font-mono font-bold tracking-wider ${speech.isListening ? 'text-status-fail' : 'text-muted-foreground'}`}>
                {speech.isListening ? 'REC' : 'STANDBY'}
              </span>
              <span className="text-sm font-mono text-muted-foreground">{formatTime(elapsed)}</span>
            </>
          ) : (
            <span className="text-sm font-mono font-bold text-primary tracking-wider">UPLOAD MODE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 bg-sensor/10 px-2.5 py-1 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-sensor animate-pulse" />
              <span className="text-xs font-mono text-sensor font-bold">AI</span>
            </div>
          )}
          {isCameraOn && (
            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-lg">
              <Eye className="w-3 h-3 text-primary" />
              <span className="text-xs font-mono text-primary font-bold">VISION</span>
            </div>
          )}
          <span className="text-sm font-mono text-muted-foreground ml-1">{machine.assetId}</span>
        </div>
      </header>

      {/* Live transcript bar */}
      <div className="px-4 py-3 bg-surface-2/80 backdrop-blur-sm border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          {speech.isListening ? (
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-status-pass animate-pulse" />
              <span className="text-xs font-mono text-status-pass font-bold tracking-wider">LISTENING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <MicOff className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground tracking-wider">
                {isUploadMode ? 'UPLOAD' : speech.error ? 'ERROR' : 'MIC OFF'}
              </span>
            </div>
          )}
          <div className="flex-1" />
          <span className="text-xs font-mono text-muted-foreground">
            {committedTexts.length} segment{committedTexts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="min-h-[2.5em] flex items-start">
          {latestPartial ? (
            <p className="text-sm text-primary leading-snug animate-fade-in">{latestPartial}</p>
          ) : liveText ? (
            <p className="text-sm text-foreground/70 leading-snug">{liveText.slice(-200)}</p>
          ) : (
            <p className="text-sm text-muted-foreground/40 italic">
              {isUploadMode ? 'Upload a video to begin analysis' : speech.isListening ? 'Start speaking to inspect...' : 'Tap mic to begin'}
            </p>
          )}
        </div>
      </div>

      {/* Connection error */}
      {speech.error && !isUploadMode && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-status-fail/8 border border-status-fail/15 rounded-xl p-4 shrink-0">
          <AlertCircle className="w-5 h-5 text-status-fail shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-status-fail">Microphone Issue</p>
            <p className="text-xs text-muted-foreground mt-1">{speech.error}</p>
            <button onClick={speech.start} className="mt-2 text-sm text-primary font-semibold touch-target">
              Retry
            </button>
          </div>
        </div>
      )}

      {/* AI error */}
      {aiError && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-status-monitor/8 border border-status-monitor/15 rounded-xl p-3 shrink-0">
          <AlertCircle className="w-4 h-4 text-status-monitor shrink-0" />
          <p className="text-xs text-status-monitor">{aiError}</p>
        </div>
      )}

      {/* Progress bar + view toggle */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? 'hsl(var(--status-pass))' : pct >= 40 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }}
            />
          </div>
          <span className="text-sm font-mono text-muted-foreground font-bold shrink-0">
            {itemCount}<span className="text-muted-foreground/50">/{totalFields}</span>
          </span>
        </div>
        {!isUploadMode && isCameraOn && (
          <div className="flex gap-1.5 bg-surface-2 rounded-lg p-1">
            <button
              onClick={() => setViewMode('form')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all ${
                viewMode === 'form' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Checklist
            </button>
            <button
              onClick={() => setViewMode('camera')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all ${
                viewMode === 'camera' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Camera
            </button>
          </div>
        )}
      </div>

      {/* Upload area */}
      {isUploadMode && itemCount === 0 && (
        <div className="mx-4 mb-3 shrink-0">
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex flex-col items-center justify-center gap-3 py-14 rounded-xl border-2 border-dashed border-border/60 bg-surface-2/50 hover:border-primary/40 active:scale-[0.98] transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-base text-foreground font-semibold">{uploadProgress}</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground/60" />
                <p className="text-base font-bold text-foreground">Upload inspection video</p>
                <p className="text-sm text-muted-foreground">MP4, MOV, MP3 — AI transcribes & analyzes</p>
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
              <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-lg">
                <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover" />
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-status-fail animate-pulse" />
                  <span className="text-xs font-mono text-foreground font-bold">LIVE</span>
                </div>
                {isAnalyzing && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-sensor/20 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-sensor animate-pulse" />
                    <span className="text-xs font-mono text-sensor font-bold">ANALYZING</span>
                  </div>
                )}
                {/* Vision analysis indicator */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-background/70 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <Eye className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-mono text-primary font-bold">VISION AI ACTIVE</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center aspect-video rounded-xl bg-surface-2 border border-border/50">
                <p className="text-muted-foreground text-sm">Camera not available</p>
              </div>
            )}

            {committedTexts.length > 0 && (
              <div className="mt-3 bg-surface-2/50 rounded-xl p-3 border border-border/30">
                <p className="text-xs font-mono text-muted-foreground mb-1 tracking-wider">TRANSCRIPT</p>
                <p className="text-sm text-foreground/70 leading-relaxed max-h-32 overflow-y-auto">
                  {committedTexts.join(' ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form view */}
        {(viewMode === 'form' || isUploadMode || !isCameraOn) && (
          <div className="px-4 pb-4">
            {/* Show mini camera preview in form view */}
            {isCameraOn && viewMode === 'form' && (
              <div className="mb-3 relative rounded-xl overflow-hidden border border-border/30 h-28">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-fail animate-pulse" />
                    <span className="text-[10px] font-mono text-foreground font-bold">LIVE</span>
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-1 bg-sensor/20 backdrop-blur-sm px-2 py-0.5 rounded">
                      <Eye className="w-3 h-3 text-sensor" />
                      <span className="text-[10px] font-mono text-sensor font-bold">AI VISION</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <LiveFormChecklist
              sections={inspectionFormSections}
              analyzedItems={analyzedItems}
              isAnalyzing={isAnalyzing}
              onManualEdit={handleManualEdit}
              allEvaluated={analyzedItems.size >= totalFields}
            />
          </div>
        )}
      </div>

      {/* Voice Agent FAB */}
      {!isUploadMode && <VoiceAgent formState={formState} setFormState={setFormState} />}

      {/* Bottom controls */}
      <div className="p-4 bg-card/95 backdrop-blur-xl border-t border-border safe-bottom shrink-0">
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
            <button
              onClick={speech.toggle}
              className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all ${
                speech.isListening 
                  ? 'bg-status-pass/15 border-2 border-status-pass/40 shadow-[0_0_12px_hsl(var(--status-pass)/0.2)]' 
                  : 'bg-surface-2 border border-border hover:border-muted-foreground'
              }`}
            >
              {speech.isListening 
                ? <Mic className="w-6 h-6 text-status-pass" /> 
                : <MicOff className="w-6 h-6 text-muted-foreground" />
              }
            </button>
            {isCameraOn && (
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20">
                <Camera className="w-6 h-6 text-primary" />
              </div>
            )}
            <button
              onClick={handleStop}
              disabled={analyzedItems.size < totalFields}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-xl bg-status-fail text-accent-foreground font-bold text-base active:scale-[0.98] transition-all touch-target disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-5 h-5" />
              {analyzedItems.size < totalFields ? `${itemCount}/${totalFields} evaluated` : 'End Inspection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
