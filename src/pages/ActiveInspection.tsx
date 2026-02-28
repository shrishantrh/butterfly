import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Square, Camera, Mic, MicOff, Upload, AlertCircle, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { AnalysisResult } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';
import { LiveFormChecklist } from '@/components/inspection/LiveFormChecklist';
import { CameraOverlay } from '@/components/inspection/CameraOverlay';
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
  const hasStarted = useRef(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  const {
    analyzedItems, isAnalyzing, error: aiError, addTranscript, addFrame, analyzeNow, itemCount, registerFrameCapture, setManualItem,
  } = useInspectionAI(machine?.activeFaultCodes ?? []);

  const speech = useSpeechRecognition({
    onTranscript: useCallback((text: string) => {
      setCommittedTexts(prev => [...prev, text]);
      setLatestPartial('');
      addTranscript(text);
    }, [addTranscript]),
    onPartial: useCallback((text: string) => { setLatestPartial(text); }, []),
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
      return canvas.toDataURL('image/jpeg', 0.8);
    });
  }, [registerFrameCapture]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

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
      toast({ title: `${count} item${count > 1 ? 's' : ''} detected`, description: hasFail ? 'FAIL detected — review required' : hasMonitor ? 'MONITOR item flagged' : 'Items logged' });
      prevItemCount.current = itemCount;
    }
  }, [itemCount, analyzedItems, toast]);

  useEffect(() => {
    if (isUploadMode) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isUploadMode]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (isMounted.current) { setCameraStream(stream); setIsCameraOn(true); }
      else stream.getTracks().forEach(t => t.stop());
    } catch (err) { console.log('[Inspection] Camera not available:', err); }
  }, []);

  // Capture frames every 6s (reduced from 12s) for more robust visual analysis
  useEffect(() => {
    if (!isCameraOn || isUploadMode) return;
    const captureInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || !canvasRef.current || video.readyState < 2) return;
      const canvas = canvasRef.current;
      // Use higher resolution for better analysis
      const scale = Math.min(640 / video.videoWidth, 640 / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.6);
      addFrame(frameBase64);
    }, 6000);
    return () => clearInterval(captureInterval);
  }, [isCameraOn, isUploadMode, addFrame]);

  useEffect(() => {
    if (isUploadMode || hasStarted.current) return;
    hasStarted.current = true;
    const init = async () => { await startCamera(); speech.start(); };
    init();
    return () => { speech.stop(); cameraStream?.getTracks().forEach(t => t.stop()); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    navigate(`/review/${machine?.id}`, { state: { analyzedItems: Object.fromEntries(analyzedItems), transcript: committedTexts.join(' '), elapsed } });
  }, [speech, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts, elapsed]);

  const handleManualEdit = useCallback((id: string, result: AnalysisResult) => { setManualItem(id, result); }, [setManualItem]);

  const formState: FormState = React.useMemo(() => {
    const components: FormState['components'] = {};
    inspectionFormSections.forEach(section => {
      section.items.forEach(item => {
        const result = analyzedItems.get(item.id);
        components[item.id] = { id: item.id, name: item.label, status: result ? result.status : null, notes: result?.comment || '', inspected: !!result };
      });
    });
    return { components };
  }, [analyzedItems]);

  const setFormState = useCallback((updater: React.SetStateAction<FormState>) => {
    const next = typeof updater === 'function' ? updater(formState) : updater;
    Object.entries(next.components).forEach(([id, comp]) => {
      const prev = formState.components[id];
      if (comp.inspected && (!prev || prev.status !== comp.status || prev.notes !== comp.notes)) {
        setManualItem(id, { id, status: (comp.status || 'normal') as AnalysisResult['status'], comment: comp.notes, evidence: ['audio'] });
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

      {/* Floating camera overlay */}
      {!isUploadMode && (
        <CameraOverlay
          videoRef={videoRef}
          cameraStream={cameraStream}
          isAnalyzing={isAnalyzing}
          isCameraOn={isCameraOn}
        />
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 pt-14 bg-background/80 backdrop-blur-2xl border-b border-border/40 shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          {!isUploadMode ? (
            <>
              <div className={`w-2.5 h-2.5 rounded-full ${speech.isListening ? 'bg-status-fail animate-recording-pulse' : 'bg-muted-foreground/40'}`} />
              <span className={`text-xs font-mono font-bold tracking-wider ${speech.isListening ? 'text-status-fail' : 'text-muted-foreground'}`}>
                {speech.isListening ? 'REC' : 'STANDBY'}
              </span>
              <span className="text-xs font-mono text-muted-foreground/60">{formatTime(elapsed)}</span>
            </>
          ) : (
            <span className="text-xs font-mono font-bold text-primary tracking-wider">UPLOAD MODE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 bg-sensor/8 border border-sensor/15 px-2 py-1 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-sensor animate-pulse" />
              <span className="text-[10px] font-mono text-sensor font-bold">AI</span>
            </div>
          )}
          <span className="text-xs font-mono text-muted-foreground/60 ml-1">{machine.assetId}</span>
        </div>
      </header>

      {/* Live transcript bar */}
      <div className="px-4 py-2.5 bg-surface-2/40 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          {speech.isListening ? (
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-status-pass animate-pulse" />
              <span className="text-[10px] font-mono text-status-pass font-bold tracking-wider">LISTENING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                {isUploadMode ? 'UPLOAD' : speech.error ? 'ERROR' : 'MIC OFF'}
              </span>
            </div>
          )}
          <div className="flex-1" />
          <span className="text-[10px] font-mono text-muted-foreground/40">
            {committedTexts.length} segment{committedTexts.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="min-h-[2em] flex items-start">
          {latestPartial ? (
            <p className="text-sm text-primary leading-snug animate-fade-in">{latestPartial}</p>
          ) : liveText ? (
            <p className="text-sm text-foreground/60 leading-snug">{liveText.slice(-200)}</p>
          ) : (
            <p className="text-sm text-muted-foreground/30 italic">
              {isUploadMode ? 'Upload a video to begin analysis' : speech.isListening ? 'Start speaking to inspect...' : 'Tap mic to begin'}
            </p>
          )}
        </div>
      </div>

      {/* Connection error */}
      {speech.error && !isUploadMode && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-status-fail/6 border border-status-fail/12 rounded-lg p-3.5 shrink-0">
          <AlertCircle className="w-4 h-4 text-status-fail shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-status-fail">Microphone Issue</p>
            <p className="text-xs text-muted-foreground mt-0.5">{speech.error}</p>
            <button onClick={speech.start} className="mt-1.5 text-sm text-primary font-semibold touch-target">Retry</button>
          </div>
        </div>
      )}

      {aiError && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-status-monitor/6 border border-status-monitor/12 rounded-lg p-3 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-status-monitor shrink-0" />
          <p className="text-xs text-status-monitor">{aiError}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? 'hsl(var(--status-pass))' : pct >= 40 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground font-bold shrink-0">
            {itemCount}<span className="text-muted-foreground/40">/{totalFields}</span>
          </span>
        </div>
      </div>

      {/* Upload area */}
      {isUploadMode && itemCount === 0 && (
        <div className="mx-4 mb-3 shrink-0">
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex flex-col items-center justify-center gap-3 py-12 rounded-xl border border-dashed border-border/40 bg-surface-2/30 hover:border-primary/30 active:scale-[0.99] transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-foreground font-semibold">{uploadProgress}</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">Upload inspection video</p>
                <p className="text-xs text-muted-foreground/60">MP4, MOV, MP3 — AI transcribes & analyzes</p>
              </>
            )}
          </button>
        </div>
      )}

      {/* Main content — form checklist (always visible, camera is floating) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 pb-4">
          <LiveFormChecklist
            sections={inspectionFormSections}
            analyzedItems={analyzedItems}
            isAnalyzing={isAnalyzing}
            onManualEdit={handleManualEdit}
          />
        </div>
      </div>

      {!isUploadMode && <VoiceAgent formState={formState} setFormState={setFormState} speechTranscript={committedTexts.join(' ')} />}

      {/* Bottom controls */}
      <div className="p-4 bg-background/80 backdrop-blur-2xl border-t border-border/40 safe-bottom shrink-0">
        {isUploadMode ? (
          <button
            onClick={handleStop}
            disabled={itemCount === 0}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-all disabled:opacity-30 touch-target"
          >
            Review Results ({itemCount}/{totalFields})
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button
              onClick={speech.toggle}
              className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                speech.isListening
                  ? 'bg-status-pass/10 border border-status-pass/30'
                  : 'bg-surface-2/60 border border-border/40 hover:border-muted-foreground/30'
              }`}
            >
              {speech.isListening
                ? <Mic className="w-5 h-5 text-status-pass" />
                : <MicOff className="w-5 h-5 text-muted-foreground/50" />
              }
            </button>
            {isCameraOn && (
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/8 border border-primary/15">
                <Camera className="w-5 h-5 text-primary" />
              </div>
            )}
            <button
              onClick={handleStop}
              disabled={analyzedItems.size < totalFields}
              className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-status-fail text-accent-foreground font-bold text-sm active:scale-[0.98] transition-all touch-target disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
              {analyzedItems.size < totalFields ? `${itemCount}/${totalFields} evaluated` : 'End Inspection'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
