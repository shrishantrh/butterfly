import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { InspectionSection, Machine } from '@/lib/mock-data';

export interface ExecutiveSummary {
  healthScore: number;
  status: 'READY' | 'CAUTION' | 'DOWN';
  summary: string;
}

export interface RootCause {
  itemId: string;
  itemLabel: string;
  status: string;
  rootCause: string;
  cascadeRisk?: string;
  relatedItems?: string[];
}

export interface WorkOrder {
  itemId: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  estimatedHours: number;
  canOperate: boolean;
  procedure?: string;
}

export interface PredictiveInsight {
  itemId: string;
  itemLabel: string;
  prediction: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedHoursToFailure?: number;
  recommendation: string;
}

export interface PartRecommendation {
  itemId: string;
  itemLabel: string;
  partType: string;
  searchKeywords: string;
  urgency: 'immediate' | 'soon' | 'scheduled';
}

export interface InspectorCoaching {
  overallGrade: 'A' | 'B' | 'C' | 'D';
  coverageScore: number;
  strengths: string[];
  improvements: string[];
}

export interface DebriefAnalysis {
  executiveSummary: ExecutiveSummary;
  rootCauseAnalysis: RootCause[];
  workOrders: WorkOrder[];
  predictiveInsights: PredictiveInsight[];
  partsRecommendations: PartRecommendation[];
  inspectorCoaching: InspectorCoaching;
}

export interface PartLookupResult {
  itemId: string;
  partType: string;
  keywords: string;
  results: { title: string; url: string; description: string; snippet?: string }[];
  directUrl: string;
  markdown?: string;
  error?: string;
}

export function useDebriefAnalysis() {
  const [analysis, setAnalysis] = useState<DebriefAnalysis | null>(null);
  const [partsResults, setPartsResults] = useState<PartLookupResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (
    sections: InspectionSection[],
    machine: Machine,
    transcript?: string,
    elapsed?: number
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('debrief-analysis', {
        body: { sections, machine, transcript, elapsed },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setAnalysis(data);
      return data as DebriefAnalysis;
    } catch (e) {
      console.error('Debrief analysis error:', e);
      const msg = e instanceof Error ? e.message : 'Analysis failed';
      setError(msg);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const lookupParts = useCallback(async (
    recommendations: PartRecommendation[],
    machine: Machine
  ) => {
    if (recommendations.length === 0) return;
    setIsLoadingParts(true);

    try {
      const searchTerms = recommendations.map(r => ({
        itemId: r.itemId,
        keywords: r.searchKeywords,
        partType: r.partType,
      }));

      const { data, error: fnError } = await supabase.functions.invoke('parts-lookup', {
        body: {
          searchTerms,
          machineModel: machine.model,
          machineSerial: machine.serial,
        },
      });

      if (fnError) throw fnError;
      if (data?.parts) {
        setPartsResults(data.parts);
      }
    } catch (e) {
      console.error('Parts lookup error:', e);
    } finally {
      setIsLoadingParts(false);
    }
  }, []);

  return {
    analysis,
    partsResults,
    isAnalyzing,
    isLoadingParts,
    error,
    runAnalysis,
    lookupParts,
  };
}
