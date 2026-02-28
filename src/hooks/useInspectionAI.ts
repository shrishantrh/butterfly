import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FaultCode } from '@/lib/mock-data';

export interface AnalysisResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
  photoUrl?: string; // captured frame for FAIL/MONITOR items
}

export function useInspectionAI(faultCodes: FaultCode[], previousItems?: string) {
  const [analyzedItems, setAnalyzedItems] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptBuffer = useRef<string>('');
  const analysisTimer = useRef<number | null>(null);
  const captureFrameFn = useRef<(() => string | null) | null>(null);

  const faultCodesStr = faultCodes.length > 0
    ? faultCodes.map(fc => `${fc.code}: ${fc.description} (${fc.severity})`).join('\n')
    : 'None';

  // Register a function that captures a video frame as data URL
  const registerFrameCapture = useCallback((fn: () => string | null) => {
    captureFrameFn.current = fn;
  }, []);

  const runAnalysis = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const prevItemsStr = Array.from(analyzedItems.entries())
        .map(([id, r]) => `${id}: ${r.status} - ${r.comment}`)
        .join('; ');

      const { data, error: fnError } = await supabase.functions.invoke('analyze-inspection', {
        body: {
          transcript,
          faultCodes: faultCodesStr,
          previousItems: prevItemsStr || previousItems || 'None',
        },
      });

      if (fnError) throw fnError;

      if (data?.items && Array.isArray(data.items)) {
        // Capture frame for FAIL/MONITOR items
        let frameUrl: string | null = null;
        const hasIssue = data.items.some((i: AnalysisResult) => i.status === 'fail' || i.status === 'monitor');
        if (hasIssue && captureFrameFn.current) {
          frameUrl = captureFrameFn.current();
        }

        setAnalyzedItems(prev => {
          const next = new Map(prev);
          for (const item of data.items as AnalysisResult[]) {
            const existing = next.get(item.id);
            // Only update if new result is more severe or item doesn't exist
            const severityOrder = { fail: 3, monitor: 2, pass: 1, normal: 0 };
            if (!existing || severityOrder[item.status] >= severityOrder[existing.status]) {
              next.set(item.id, {
                ...item,
                photoUrl: (item.status === 'fail' || item.status === 'monitor') ? (frameUrl || existing?.photoUrl) : existing?.photoUrl,
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
    }
  }, [faultCodesStr, previousItems, analyzedItems]);

  const addTranscript = useCallback((text: string) => {
    transcriptBuffer.current += ' ' + text;

    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    analysisTimer.current = window.setTimeout(() => {
      const fullTranscript = transcriptBuffer.current.trim();
      if (fullTranscript.length > 20) {
        runAnalysis(fullTranscript);
      }
    }, 6000); // 6 second debounce for faster feedback
  }, [runAnalysis]);

  const analyzeNow = useCallback(async () => {
    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    const fullTranscript = transcriptBuffer.current.trim();
    if (fullTranscript.length > 0) {
      await runAnalysis(fullTranscript);
    }
  }, [runAnalysis]);

  const getFullTranscript = useCallback(() => {
    return transcriptBuffer.current.trim();
  }, []);

  // Allow manual override of any item
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
    analyzeNow,
    getFullTranscript,
    itemCount: analyzedItems.size,
    registerFrameCapture,
    setManualItem,
  };
}
