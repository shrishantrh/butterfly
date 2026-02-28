import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FaultCode } from '@/lib/mock-data';

export interface AnalysisResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
  photoUrl?: string;
  annotation?: string; // AI-generated annotation for photo evidence
  aiAgreement?: 'agree' | 'disagree' | 'uncertain'; // AI cross-validation
  aiVisualNote?: string; // AI's independent visual assessment
}

export function useInspectionAI(faultCodes: FaultCode[], previousItems?: string) {
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

  const runAnalysis = useCallback(async (transcript: string, frames: string[]) => {
    if ((!transcript.trim() && frames.length === 0) || analysisInFlight.current) return;

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
          frames, // base64 JPEG frames for vision analysis
          faultCodes: faultCodesStr,
          previousItems: prevItemsStr || previousItems || 'None',
        },
      });

      if (fnError) throw fnError;

      if (data?.items && Array.isArray(data.items)) {
        // Capture frame for ALL items — universal visual evidence
        let frameUrl: string | null = null;
        if (captureFrameFn.current) {
          frameUrl = captureFrameFn.current();
        }

        setAnalyzedItems(prev => {
          const next = new Map(prev);
          for (const item of data.items as AnalysisResult[]) {
            const existing = next.get(item.id);
            const severityOrder = { fail: 3, monitor: 2, pass: 1, normal: 0 };
            if (!existing || severityOrder[item.status] >= severityOrder[existing.status]) {
              // Capture photo for ALL items (not just fail/monitor) for universal visual evidence
              next.set(item.id, {
                ...item,
                photoUrl: frameUrl || existing?.photoUrl,
                annotation: item.annotation || existing?.annotation,
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
    }
  }, [faultCodesStr, previousItems, analyzedItems]);

  const addTranscript = useCallback((text: string) => {
    transcriptBuffer.current += ' ' + text;

    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    // Reduced from 6s to 3s for faster response
    analysisTimer.current = window.setTimeout(() => {
      const fullTranscript = transcriptBuffer.current.trim();
      const frames = [...frameBuffer.current];
      frameBuffer.current = []; // clear after sending
      // Lower threshold — trigger faster
      if (fullTranscript.length > 10 || frames.length > 0) {
        runAnalysis(fullTranscript, frames);
      }
    }, 3000);
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
