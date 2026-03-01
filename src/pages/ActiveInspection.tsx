import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Square, Camera, Mic, MicOff, Upload, AlertCircle, Volume2, Play, Pause, SkipForward, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInspectionAI } from '@/hooks/useInspectionAI';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { AnalysisResult } from '@/hooks/useInspectionAI';
import { useToast } from '@/hooks/use-toast';
import { LiveFormChecklist } from '@/components/inspection/LiveFormChecklist';
import { CameraOverlay } from '@/components/inspection/CameraOverlay';
import { VoiceAgent, FormState } from '@/components/inspection/VoiceAgent';
import { buildSensorContextForAI, buildSensorSnapshot } from '@/lib/sensor-data';

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

  // Upload mode state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadVideoUrl, setUploadVideoUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'select' | 'transcribing' | 'playing' | 'done'>('select');
  const uploadVideoRef = useRef<HTMLVideoElement>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const analysisQueueRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  // Build sensor context for AI cross-reference
  const sensorContext = useMemo(() => buildSensorContextForAI(), []);
  const sensorSnapshot = useMemo(() => buildSensorSnapshot(), []);

  const {
    analyzedItems, isAnalyzing, error: aiError, addTranscript, addFrame, analyzeNow, itemCount, registerFrameCapture, setManualItem,
  } = useInspectionAI(machine?.activeFaultCodes ?? [], undefined, sensorContext);

  const speech = useSpeechRecognition({
    onTranscript: useCallback((text: string) => {
      setCommittedTexts(prev => [...prev, text]);
      setLatestPartial('');
      addTranscript(text);
    }, [addTranscript]),
    onPartial: useCallback((text: string) => { setLatestPartial(text); }, []),
  });

  // Register frame capture — works for both camera and uploaded video
  useEffect(() => {
    registerFrameCapture(() => {
      // Try upload video first, then camera
      const video = uploadVideoRef.current || videoRef.current;
      const canvas = uploadCanvasRef.current || canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return null;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    });
  }, [registerFrameCapture, uploadPhase]);

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

  // Timer for live mode
  useEffect(() => {
    if (isUploadMode) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isUploadMode]);

  // ─── LIVE CAMERA MODE ───
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (isMounted.current) { setCameraStream(stream); setIsCameraOn(true); }
      else stream.getTracks().forEach(t => t.stop());
    } catch (err) { console.log('[Inspection] Camera not available:', err); }
  }, []);

  // Capture frames every 6s for live camera
  useEffect(() => {
    if (!isCameraOn || isUploadMode) return;
    const captureInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || !canvasRef.current || video.readyState < 2) return;
      const canvas = canvasRef.current;
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

  // ─── UPLOAD MODE: VIDEO PLAYBACK + FRAME EXTRACTION ───

  // Extract audio from video and transcribe via ElevenLabs Scribe
  const transcribeVideoAudio = useCallback(async (file: File): Promise<string> => {
    setIsTranscribing(true);
    setUploadPhase('transcribing');
    try {
      // Send the file directly — ElevenLabs Scribe accepts video files too
      const formData = new FormData();
      formData.append('audio', file);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const transcript = data?.text || '';
      console.log('[Upload] Transcription complete:', transcript.length, 'chars');
      return transcript;
    } catch (e) {
      console.error('[Upload] Transcription failed:', e);
      toast({ title: 'Transcription issue', description: 'Could not extract audio — proceeding with visual analysis only.', variant: 'destructive' });
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, [toast]);

  // Start video playback and frame extraction
  const startVideoAnalysis = useCallback((transcript: string) => {
    const video = uploadVideoRef.current;
    if (!video) return;

    setUploadPhase('playing');

    // Feed transcript to AI
    if (transcript.trim()) {
      addTranscript(transcript);
      setCommittedTexts([transcript]);
    }

    // Play video
    video.currentTime = 0;
    video.playbackRate = 2.0; // 2x speed for faster processing
    video.play().catch(console.error);
    setIsVideoPlaying(true);

    // Capture frames every 3s of real time (= every 6s of video at 2x)
    frameIntervalRef.current = window.setInterval(() => {
      if (!video || video.paused || video.ended) return;
      const canvas = uploadCanvasRef.current;
      if (!canvas || video.readyState < 2) return;

      const scale = Math.min(640 / video.videoWidth, 640 / video.videoHeight, 1);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.6);
      addFrame(frameBase64);

      // Trigger analysis periodically
      analysisQueueRef.current++;
      if (analysisQueueRef.current >= 2) {
        analysisQueueRef.current = 0;
        analyzeNow();
      }
    }, 3000);
  }, [addTranscript, addFrame, analyzeNow]);

  // Handle video time updates
  useEffect(() => {
    const video = uploadVideoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setVideoProgress(video.currentTime);
      setElapsed(Math.round(video.currentTime));
    };
    const onLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };
    const onEnded = () => {
      setIsVideoPlaying(false);
      setUploadPhase('done');
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      // Final analysis pass
      analyzeNow();
      toast({ title: 'Video analysis complete', description: 'All frames processed. Review results below.' });
    };
    const onPlay = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', onEnded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [uploadedFile, analyzeNow, toast]);

  // Handle file selection (from input or drop)
  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please upload a video (MP4, MOV) or audio file.', variant: 'destructive' });
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadVideoUrl(url);

    // Step 1: Transcribe audio
    const transcript = await transcribeVideoAudio(file);

    // Step 2: Start playback + frame analysis (for video files)
    if (file.type.startsWith('video/')) {
      // Wait for video to load before starting
      const waitForVideo = () => {
        const video = uploadVideoRef.current;
        if (video && video.readyState >= 2) {
          startVideoAnalysis(transcript);
        } else {
          setTimeout(waitForVideo, 200);
        }
      };
      setTimeout(waitForVideo, 500);
    } else {
      // Audio-only — just feed transcript
      if (transcript.trim()) {
        addTranscript(transcript);
        setCommittedTexts([transcript]);
        setUploadPhase('done');
        await analyzeNow();
        toast({ title: 'Audio analysis complete', description: 'Transcript processed.' });
      }
    }
  }, [transcribeVideoAudio, startVideoAnalysis, addTranscript, analyzeNow, toast]);

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  // Video playback controls
  const togglePlayPause = useCallback(() => {
    const video = uploadVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      // Restart frame capture if stopped
      if (!frameIntervalRef.current) {
        frameIntervalRef.current = window.setInterval(() => {
          if (!video || video.paused || video.ended) return;
          const canvas = uploadCanvasRef.current;
          if (!canvas || video.readyState < 2) return;
          const scale = Math.min(640 / video.videoWidth, 640 / video.videoHeight, 1);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          addFrame(canvas.toDataURL('image/jpeg', 0.6));
          analysisQueueRef.current++;
          if (analysisQueueRef.current >= 2) {
            analysisQueueRef.current = 0;
            analyzeNow();
          }
        }, 3000);
      }
    } else {
      video.pause();
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
  }, [addFrame, analyzeNow]);

  const skipForward = useCallback(() => {
    const video = uploadVideoRef.current;
    if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (uploadVideoUrl) URL.revokeObjectURL(uploadVideoUrl);
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [uploadVideoUrl]);

  const handleStop = useCallback(async () => {
    speech.stop();
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOn(false);
    // Stop upload video too
    const uploadVideo = uploadVideoRef.current;
    if (uploadVideo) {
      uploadVideo.pause();
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
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
    const sec = Math.round(s) % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = Math.round((itemCount / totalFields) * 100);
  const liveText = latestPartial || (committedTexts.length > 0 ? committedTexts[committedTexts.length - 1] : '');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={uploadCanvasRef} className="hidden" />

      {/* Floating camera overlay — live mode only */}
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
            <>
              <Film className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold text-primary tracking-wider">
                {uploadPhase === 'select' ? 'UPLOAD' : uploadPhase === 'transcribing' ? 'TRANSCRIBING' : uploadPhase === 'playing' ? 'ANALYZING' : 'COMPLETE'}
              </span>
              {videoDuration > 0 && (
                <span className="text-xs font-mono text-muted-foreground/60">
                  {formatTime(videoProgress)} / {formatTime(videoDuration)}
                </span>
              )}
            </>
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
          {isUploadMode ? (
            <div className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-mono text-primary font-bold tracking-wider">
                {uploadPhase === 'transcribing' ? 'EXTRACTING AUDIO...' : uploadPhase === 'playing' ? 'LIVE ANALYSIS' : uploadPhase === 'done' ? 'COMPLETE' : 'AWAITING FILE'}
              </span>
            </div>
          ) : speech.isListening ? (
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-status-pass animate-pulse" />
              <span className="text-[10px] font-mono text-status-pass font-bold tracking-wider">LISTENING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <MicOff className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                {speech.error ? 'ERROR' : 'MIC OFF'}
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
            <p className="text-sm text-foreground/60 leading-snug line-clamp-3">{liveText.slice(-300)}</p>
          ) : (
            <p className="text-sm text-muted-foreground/30 italic">
              {isUploadMode ? 'Drop a video file or tap below to begin' : speech.isListening ? 'Start speaking to inspect...' : 'Tap mic to begin'}
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

      {/* ─── UPLOAD MODE: File Drop + Video Player ─── */}
      {isUploadMode && uploadPhase === 'select' && (
        <div className="mx-4 mb-3 shrink-0">
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center justify-center gap-3 py-14 rounded-xl border-2 border-dashed transition-all active:scale-[0.99] ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border/40 bg-surface-2/30 hover:border-primary/30'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Drop video here or tap to browse</p>
              <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV, WebM, MP3 — AI analyzes frames + audio</p>
            </div>
          </button>
        </div>
      )}

      {/* Transcribing state */}
      {isUploadMode && uploadPhase === 'transcribing' && (
        <div className="mx-4 mb-3 shrink-0">
          <div className="card-elevated p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">Extracting & Transcribing Audio</p>
              <p className="text-xs text-muted-foreground mt-1">Processing {uploadedFile?.name}...</p>
            </div>
          </div>
        </div>
      )}

      {/* Video player — shown during playback and after */}
      {isUploadMode && uploadVideoUrl && (uploadPhase === 'playing' || uploadPhase === 'done') && (
        <div className="mx-4 mb-3 shrink-0">
          <div className="card-elevated overflow-hidden">
            <div className="relative">
              <video
                ref={uploadVideoRef}
                src={uploadVideoUrl}
                className="w-full aspect-video bg-black"
                playsInline
                muted={false}
              />
              {/* AI scanning overlay */}
              {isAnalyzing && uploadPhase === 'playing' && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
                    <div className="w-2 h-2 rounded-full bg-sensor animate-pulse" />
                    <span className="text-[10px] font-mono text-sensor font-bold">AI SCANNING</span>
                  </div>
                </div>
              )}
              {uploadPhase === 'done' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-card/90 backdrop-blur-xl rounded-xl px-5 py-3 text-center">
                    <p className="text-sm font-bold text-status-pass">✓ Analysis Complete</p>
                    <p className="text-xs text-muted-foreground mt-1">{itemCount} items detected</p>
                  </div>
                </div>
              )}
            </div>
            {/* Video controls */}
            <div className="p-3 flex items-center gap-3 bg-surface-2/60">
              <button onClick={togglePlayPause} className="w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center active:scale-95 transition-transform">
                {isVideoPlaying ? <Pause className="w-4 h-4 text-foreground" /> : <Play className="w-4 h-4 text-foreground" />}
              </button>
              <button onClick={skipForward} className="w-9 h-9 rounded-lg bg-card border border-border/50 flex items-center justify-center active:scale-95 transition-transform">
                <SkipForward className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex-1 h-1.5 bg-border/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: videoDuration > 0 ? `${(videoProgress / videoDuration) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {formatTime(videoProgress)}
              </span>
              <span className="text-[10px] font-mono text-primary px-1.5 py-0.5 bg-primary/10 rounded">
                2×
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main content — form checklist */}
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

      {!isUploadMode && <VoiceAgent formState={formState} setFormState={setFormState} speechTranscript={committedTexts.join(' ')} sensorSnapshot={sensorSnapshot} />}

      {/* Bottom controls */}
      <div className="p-4 bg-background/80 backdrop-blur-2xl border-t border-border/40 safe-bottom shrink-0">
        {isUploadMode ? (
          <button
            onClick={handleStop}
            disabled={uploadPhase === 'select' || uploadPhase === 'transcribing'}
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
              className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-status-fail text-accent-foreground font-bold text-sm active:scale-[0.98] transition-all touch-target"
            >
              <Square className="w-4 h-4" />
              End Inspection ({itemCount}/{totalFields})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
