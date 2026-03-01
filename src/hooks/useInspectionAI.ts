import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FaultCode } from '@/lib/mock-data';

export interface SensorEvidencePoint {
  sensorKey: string;
  sensorLabel: string;
  latestValue: number;
  unit: string;
  status: string;
  time: string;
}

export interface AnalysisResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal' | 'conflicted';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
  photoUrl?: string;
  annotation?: string;
  aiAgreement?: 'agree' | 'disagree' | 'uncertain';
  aiVisualNote?: string;
  sensorEvidence?: SensorEvidencePoint;
}

export function useInspectionAI(faultCodes: FaultCode[], previousItems?: string, sensorContext?: string) {
  const [analyzedItems, setAnalyzedItems] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptBuffer = useRef<string>('');
  const frameBuffer = useRef<string[]>([]); // base64 frames
  const analysisTimer = useRef<number | null>(null);
  const captureFrameFn = useRef<(() => string | null) | null>(null);
  const analysisInFlight = useRef(false);

  const faultCodesStr = faultCodes.length > 0
    ? faultCodes.map(fc => `${fc.code}: ${fc.description} (${fc.severity})`).join('\n')
    : 'None';

  const registerFrameCapture = useCallback((fn: () => string | null) => {
    captureFrameFn.current = fn;
  }, []);

  // Add a video frame to the buffer for the next analysis cycle
  const addFrame = useCallback((base64: string) => {
    // Keep last 3 frames for better visual coverage
    frameBuffer.current = [...frameBuffer.current.slice(-2), base64];
  }, []);

  const pendingAnalysis = useRef<{ transcript: string; frames: string[] } | null>(null);

  const runAnalysis = useCallback(async (transcript: string, frames: string[]) => {
    if (!transcript.trim() && frames.length === 0) return;

    // If already in-flight, queue this for later (don't lose frames)
    if (analysisInFlight.current) {
      pendingAnalysis.current = {
        transcript: pendingAnalysis.current
          ? pendingAnalysis.current.transcript + ' ' + transcript
          : transcript,
        frames: [...(pendingAnalysis.current?.frames || []), ...frames],
      };
      return;
    }

    analysisInFlight.current = true;
    setIsAnalyzing(true);
    setError(null);

    try {
      const prevItemsStr = Array.from(analyzedItems.entries())
        .map(([id, r]) => `${id}: ${r.status} - ${r.comment}`)
        .join('; ');

      const { data, error: fnError } = await supabase.functions.invoke('analyze-inspection', {
        body: {
          transcript,
          frames: frames.slice(-3), // Send last 3 frames max
          faultCodes: faultCodesStr,
          previousItems: prevItemsStr || previousItems || 'None',
          sensorTelemetry: sensorContext || 'None',
        },
      });

      if (fnError) throw fnError;

      if (data?.items && Array.isArray(data.items)) {
        let frameUrl: string | null = null;
        if (captureFrameFn.current) {
          frameUrl = captureFrameFn.current();
        }

        setAnalyzedItems(prev => {
          const next = new Map(prev);
          for (const item of data.items as AnalysisResult[]) {
            const existing = next.get(item.id);
            const severityOrder: Record<string, number> = { fail: 4, conflicted: 3, monitor: 2, pass: 1, normal: 0 };

            let finalStatus = item.status;
            if (item.aiAgreement === 'disagree' && item.sensorEvidence) {
              finalStatus = 'conflicted';
            }

            // Only update if new item or severity increased
            if (!existing || (severityOrder[finalStatus] ?? 0) >= (severityOrder[existing.status] ?? 0)) {
              // Only capture a new photo if this is a NEW item (no existing photo)
              // or if the status actually changed (re-evaluation)
              const isNewItem = !existing;
              const statusChanged = existing && existing.status !== finalStatus;
              const commentChanged = existing && item.comment && existing.comment !== item.comment;
              const shouldCaptureNewPhoto = isNewItem || statusChanged || commentChanged;

              next.set(item.id, {
                ...item,
                status: finalStatus,
                photoUrl: shouldCaptureNewPhoto ? (frameUrl || existing?.photoUrl) : (existing?.photoUrl || frameUrl),
                annotation: item.annotation || existing?.annotation,
                sensorEvidence: item.sensorEvidence || existing?.sensorEvidence,
              });
            }
          }
          return next;
        });
      }

      if (data?.error) {
        setError(data.error);
      }
    } catch (e) {
      console.error('Analysis error:', e);
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      analysisInFlight.current = false;

      // Process queued analysis if any
      if (pendingAnalysis.current) {
        const pending = pendingAnalysis.current;
        pendingAnalysis.current = null;
        runAnalysis(pending.transcript, pending.frames);
      }
    }
  }, [faultCodesStr, previousItems, analyzedItems, sensorContext]);

  const addTranscript = useCallback((text: string) => {
    transcriptBuffer.current += ' ' + text;

    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    // Trigger analysis quickly — 1.5s debounce
    analysisTimer.current = window.setTimeout(() => {
      const fullTranscript = transcriptBuffer.current.trim();
      const frames = [...frameBuffer.current];
      frameBuffer.current = [];
      if (fullTranscript.length > 5 || frames.length > 0) {
        runAnalysis(fullTranscript, frames);
      }
    }, 1500);
  }, [runAnalysis]);

  const analyzeNow = useCallback(async () => {
    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    const fullTranscript = transcriptBuffer.current.trim();
    const frames = [...frameBuffer.current];
    frameBuffer.current = [];
    if (fullTranscript.length > 0 || frames.length > 0) {
      await runAnalysis(fullTranscript, frames);
    }
  }, [runAnalysis]);

  const getFullTranscript = useCallback(() => {
    return transcriptBuffer.current.trim();
  }, []);

  const setManualItem = useCallback((id: string, result: AnalysisResult) => {
    setAnalyzedItems(prev => {
      const next = new Map(prev);
      next.set(id, result);
      return next;
    });
  }, []);

  return {
    analyzedItems,
    isAnalyzing,
    error,
    addTranscript,
    addFrame,
    analyzeNow,
    getFullTranscript,
    itemCount: analyzedItems.size,
    registerFrameCapture,
    setManualItem,
  };
}
