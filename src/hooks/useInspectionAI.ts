import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InspectionItem, FaultCode } from '@/lib/mock-data';

interface AnalysisResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
}

export function useInspectionAI(faultCodes: FaultCode[], previousItems?: string) {
  const [analyzedItems, setAnalyzedItems] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const transcriptBuffer = useRef<string>('');
  const analysisTimer = useRef<number | null>(null);

  const faultCodesStr = faultCodes.length > 0
    ? faultCodes.map(fc => `${fc.code}: ${fc.description} (${fc.severity})`).join('\n')
    : 'None';

  const runAnalysis = useCallback(async (transcript: string) => {
    if (!transcript.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-inspection', {
        body: {
          transcript,
          faultCodes: faultCodesStr,
          previousItems: previousItems || 'None',
        },
      });

      if (fnError) throw fnError;

      if (data?.items && Array.isArray(data.items)) {
        setAnalyzedItems(prev => {
          const next = new Map(prev);
          for (const item of data.items as AnalysisResult[]) {
            next.set(item.id, item);
          }
          return next;
        });
      }
    } catch (e) {
      console.error('Analysis error:', e);
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [faultCodesStr, previousItems]);

  const addTranscript = useCallback((text: string) => {
    transcriptBuffer.current += ' ' + text;
    
    // Debounce: analyze every 8 seconds of accumulated transcript
    if (analysisTimer.current) {
      clearTimeout(analysisTimer.current);
    }
    analysisTimer.current = window.setTimeout(() => {
      const fullTranscript = transcriptBuffer.current.trim();
      if (fullTranscript.length > 20) {
        runAnalysis(fullTranscript);
        // Don't clear the buffer — accumulate for better context
      }
    }, 8000);
  }, [runAnalysis]);

  // Force immediate analysis (e.g., when stopping inspection)
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

  return {
    analyzedItems,
    isAnalyzing,
    error,
    addTranscript,
    analyzeNow,
    getFullTranscript,
    itemCount: analyzedItems.size,
  };
}
