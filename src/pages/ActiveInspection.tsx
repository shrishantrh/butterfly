import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Square, Camera, Mic, MicOff, Upload, AlertCircle, Volume2, Play, Pause, SkipForward, Film } from 'lucide-react';
import { LivePulse } from '@/components/LivePulse';
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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'select' | 'playing' | 'done'>('select');
  const uploadVideoRef = useRef<HTMLVideoElement>(null);
  const uploadCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunkIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  const sensorContext = useMemo(() => buildSensorContextForAI(machineId), [machineId]);
  const sensorSnapshot = useMemo(() => buildSensorSnapshot(machineId), [machineId]);

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

  // Register frame capture
  useEffect(() => {
    registerFrameCapture(() => {
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

  // Mount tracking
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Item count toast
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
      toast({ title: `${count} item${count > 1 ? 's' : ''} detected`, description: hasFail ? 'FAIL detected' : hasMonitor ? 'MONITOR flagged' : 'Items logged' });
      prevItemCount.current = itemCount;
    }
  }, [itemCount, analyzedItems, toast]);

  // Timer
  useEffect(() => {
    if (isUploadMode) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [isUploadMode]);

  // Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (isMounted.current) { setCameraStream(stream); setIsCameraOn(true); }
      else stream.getTracks().forEach(t => t.stop());
    } catch (err) { console.log('[Inspection] Camera not available:', err); }
  }, []);

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
      addFrame(canvas.toDataURL('image/jpeg', 0.6));
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

  // Upload mode handlers
  // Refs for stable interval callbacks (avoid stale closures)
  const addTranscriptRef = useRef(addTranscript);
  const addFrameRef = useRef(addFrame);
  const analyzeNowRef = useRef(analyzeNow);
  useEffect(() => { addTranscriptRef.current = addTranscript; }, [addTranscript]);
  useEffect(() => { addFrameRef.current = addFrame; }, [addFrame]);
  useEffect(() => { analyzeNowRef.current = analyzeNow; }, [analyzeNow]);

  // Transcribe a short audio chunk via the server
  const transcribeChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'chunk.webm');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: formData });
      if (error) throw error;
      const text = data?.text?.trim() || '';
      if (text && text.length > 3) {
        console.log('[Upload] Transcribed chunk:', text.slice(0, 80));
        addTranscriptRef.current(text);
        setCommittedTexts(prev => [...prev, text]);
      }
    } catch (e) {
      console.error('[Upload] Chunk transcription failed:', e);
    }
  }, []);

  // Start recording audio from the video element and capturing frames
  const startVideoStream = useCallback((video: HTMLVideoElement) => {
    setUploadPhase('playing');
    video.currentTime = 0;
    video.play().catch(console.error);
    setIsVideoPlaying(true);

    // === AUDIO: Capture from video using captureStream ===
    try {
      const stream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioStream = new MediaStream(audioTracks);
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm';
          const recorder = new MediaRecorder(audioStream, { mimeType });
          let chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = () => {
            if (chunks.length > 0) {
              const audioBlob = new Blob(chunks, { type: mimeType });
              console.log(`[Upload] Audio chunk: ${(audioBlob.size / 1024).toFixed(0)}KB`);
              transcribeChunk(audioBlob);
              chunks = [];
            }
          };

          recorder.start();
          audioRecorderRef.current = recorder;

          // Every 10 seconds: stop recorder to flush chunk, then restart
          audioChunkIntervalRef.current = window.setInterval(() => {
            if (video.paused || video.ended) return;
            if (recorder.state === 'recording') {
              recorder.stop();
              // Restart after a tiny delay so onstop fires first
              setTimeout(() => {
                if (!video.paused && !video.ended) {
                  try { recorder.start(); } catch { /* video may have ended */ }
                }
              }, 50);
            }
          }, 10000);

          console.log('[Upload] Audio capture started via captureStream');
        } else {
          console.warn('[Upload] No audio tracks in video');
        }
      } else {
        console.warn('[Upload] captureStream not supported');
      }
    } catch (e) {
      console.error('[Upload] Audio capture setup failed:', e);
    }

    // === FRAMES: Capture every 6 seconds ===
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
      addFrameRef.current(canvas.toDataURL('image/jpeg', 0.6));
      // Trigger analysis with whatever transcript + frames have accumulated
      analyzeNowRef.current();
    }, 6000);
  }, [transcribeChunk]);

  // Cleanup audio recorder
  const stopAudioCapture = useCallback(() => {
    if (audioChunkIntervalRef.current) {
      clearInterval(audioChunkIntervalRef.current);
      audioChunkIntervalRef.current = null;
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
      audioRecorderRef.current.stop(); // This fires onstop which sends final chunk
    }
    audioRecorderRef.current = null;
  }, []);

  useEffect(() => {
    const video = uploadVideoRef.current;
    if (!video) return;
    const onTimeUpdate = () => { setVideoProgress(video.currentTime); setElapsed(Math.round(video.currentTime)); };
    const onLoadedMetadata = () => { setVideoDuration(video.duration); };
    const onEnded = () => {
      setIsVideoPlaying(false);
      setUploadPhase('done');
      if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
      stopAudioCapture();
      // Final analysis with all remaining data
      setTimeout(() => analyzeNowRef.current(), 2000);
      toast({ title: 'Video analysis complete', description: 'Review results below.' });
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
  }, [uploadedFile, toast, stopAudioCapture]);

  const handleFileSelected = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please upload a video or audio file.', variant: 'destructive' });
      return;
    }
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadVideoUrl(url);

    // Wait for video to be ready, then start streaming analysis (same as live mode)
    const waitForVideo = () => {
      const video = uploadVideoRef.current;
      if (video && video.readyState >= 2) {
        startVideoStream(video);
      } else {
        setTimeout(waitForVideo, 200);
      }
    };
    setTimeout(waitForVideo, 500);
  }, [startVideoStream, toast]);

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFileSelected(file); }, [handleFileSelected]);

  const togglePlayPause = useCallback(() => {
    const video = uploadVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      // Restart frame capture if needed
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
          addFrameRef.current(canvas.toDataURL('image/jpeg', 0.6));
          analyzeNowRef.current();
        }, 6000);
      }
      // Resume audio capture
      if (audioRecorderRef.current && audioRecorderRef.current.state === 'paused') {
        audioRecorderRef.current.resume();
      }
    } else {
      video.pause();
      if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
      if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        audioRecorderRef.current.pause();
      }
    }
  }, []);

  const skipForward = useCallback(() => {
    const video = uploadVideoRef.current;
    if (video) video.currentTime = Math.min(video.currentTime + 10, video.duration);
  }, []);

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
    const uploadVideo = uploadVideoRef.current;
    if (uploadVideo) {
      uploadVideo.pause();
      if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
      stopAudioCapture();
    }
    await analyzeNow();
    navigate(`/review/${machine?.id}`, { state: { analyzedItems: Object.fromEntries(analyzedItems), transcript: committedTexts.join(' '), elapsed } });
  }, [speech, cameraStream, analyzeNow, navigate, machine, analyzedItems, committedTexts, elapsed, stopAudioCapture]);

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

      {!isUploadMode && (
        <CameraOverlay videoRef={videoRef} cameraStream={cameraStream} isAnalyzing={isAnalyzing} isCameraOn={isCameraOn} />
      )}

      {/* Compact header */}
      <header className="flex items-center justify-between px-4 py-2.5 pt-14 bg-background/90 backdrop-blur-xl border-b border-border/30 shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          {!isUploadMode ? (
            <>
              {speech.isListening ? (
                <LivePulse label="REC" />
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs font-mono font-bold text-muted-foreground/60">OFF</span>
                </>
              )}
              <span className="text-xs font-mono text-muted-foreground/40">{formatTime(elapsed)}</span>
            </>
          ) : (
            <>
              <Film className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold text-primary">
                {uploadPhase === 'select' ? 'UPLOAD' : uploadPhase === 'playing' ? 'ANALYZING' : 'DONE'}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-1 bg-sensor/8 border border-sensor/15 px-2 py-0.5 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-sensor animate-pulse" />
              <span className="text-[10px] font-mono text-sensor font-bold">AI</span>
            </div>
          )}
          <span className="text-[11px] font-mono text-muted-foreground/40">{machine.assetId}</span>
        </div>
      </header>

      {/* Transcript */}
      <div className="px-4 py-2 bg-surface-2/30 border-b border-border/20 shrink-0">
        <div className="min-h-[1.5em]">
          {latestPartial ? (
            <p className="text-sm text-primary animate-fade-in line-clamp-2">{latestPartial}</p>
          ) : liveText ? (
            <p className="text-sm text-foreground/50 line-clamp-2">{liveText.slice(-200)}</p>
          ) : (
            <p className="text-sm text-muted-foreground/20 italic">
              {isUploadMode ? 'Upload a file to begin' : speech.isListening ? 'Speak to inspect...' : 'Tap mic to start'}
            </p>
          )}
        </div>
      </div>

      {/* Errors */}
      {speech.error && !isUploadMode && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-status-fail/6 border border-status-fail/12 rounded-xl p-3 shrink-0">
          <AlertCircle className="w-4 h-4 text-status-fail shrink-0" />
          <p className="text-xs text-status-fail flex-1">{speech.error}</p>
          <button onClick={speech.start} className="text-xs text-primary font-bold">Retry</button>
        </div>
      )}

      {aiError && (
        <div className="mx-4 mt-2 flex items-center gap-2 bg-status-monitor/6 border border-status-monitor/12 rounded-xl p-2.5 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-status-monitor" />
          <p className="text-xs text-status-monitor">{aiError}</p>
        </div>
      )}

      {/* Progress */}
      <div className="px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-border/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: pct >= 80 ? 'hsl(var(--status-pass))' : pct >= 40 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground font-bold shrink-0">
            {itemCount}<span className="text-muted-foreground/30">/{totalFields}</span>
          </span>
        </div>
      </div>

      {/* Upload mode content */}
      {isUploadMode && uploadPhase === 'select' && (
        <div className="mx-4 mb-2 shrink-0">
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" onChange={handleVideoUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed transition-all ${
              isDragging ? 'border-primary bg-primary/5' : 'border-border/30 bg-surface-2/20'
            }`}
          >
            <Upload className="w-8 h-8 text-primary/60" />
            <div className="text-center">
              <p className="text-sm font-bold">Drop video here or tap to browse</p>
              <p className="text-xs text-muted-foreground/40 mt-1">MP4, MOV, WebM, MP3</p>
            </div>
          </button>
        </div>
      )}

      {/* Audio is now streamed live from video — no separate transcription phase */}

      {isUploadMode && uploadVideoUrl && (
        <div className="mx-4 mb-2 shrink-0">
          <div className="card-elevated overflow-hidden">
            <div className="relative">
              <video ref={uploadVideoRef} src={uploadVideoUrl} className="w-full aspect-video bg-black" playsInline />
              {uploadPhase === 'done' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="bg-card/90 backdrop-blur-xl rounded-xl px-4 py-2">
                    <p className="text-sm font-bold text-status-pass">✓ Complete — {itemCount} items</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2.5 flex items-center gap-2 bg-surface-2/40">
              <button onClick={togglePlayPause} className="w-8 h-8 rounded-lg bg-card border border-border/40 flex items-center justify-center">
                {isVideoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <div className="flex-1 h-1 bg-border/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: videoDuration > 0 ? `${(videoProgress / videoDuration) * 100}%` : '0%' }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{formatTime(videoProgress)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form checklist */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 pb-4">
          <LiveFormChecklist sections={inspectionFormSections} analyzedItems={analyzedItems} isAnalyzing={isAnalyzing} onManualEdit={handleManualEdit} />
        </div>
      </div>

      {!isUploadMode && <VoiceAgent formState={formState} setFormState={setFormState} speechTranscript={committedTexts.join(' ')} sensorSnapshot={sensorSnapshot} />}

      {/* Bottom controls */}
      <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-border/30 safe-bottom shrink-0">
        {isUploadMode ? (
          <button
            onClick={handleStop}
            disabled={uploadPhase === 'select'}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-all disabled:opacity-30"
          >
            Review Results ({itemCount}/{totalFields})
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button
              onClick={speech.toggle}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                speech.isListening
                  ? 'bg-status-pass/10 border border-status-pass/30'
                  : 'bg-surface-2 border border-border/40'
              }`}
            >
              {speech.isListening ? <Mic className="w-5 h-5 text-status-pass" /> : <MicOff className="w-5 h-5 text-muted-foreground/40" />}
            </button>
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] transition-all"
            >
              <Square className="w-4 h-4" />
              End & Review ({itemCount}/{totalFields})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
