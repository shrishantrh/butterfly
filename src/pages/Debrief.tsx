import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts, InspectionSection } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary, StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useDebriefAnalysis } from '@/hooks/useDebriefAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import excavatorSchematic from '@/assets/excavator-schematic.png';
import { VoiceAgent, FormState } from '@/components/inspection/VoiceAgent';
import {
  AlertTriangle, TrendingUp, CheckCircle2, Clock,
  Home, ExternalLink, Wrench,
  Package, ChevronRight, Loader2, ChevronDown,
  ArrowUpRight, Target,
  Download, History, ShieldCheck, ShieldAlert, ShieldX,
  DollarSign, ShoppingCart, Truck, Timer,
  AlertCircle, CheckCircle, Brain, GraduationCap,
  CircleDot, Eye,
} from 'lucide-react';

export default function Debrief() {
  const { machineId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const routerState = location.state as {
    sections?: InspectionSection[];
    transcript?: string;
    elapsed?: number;
    inspectionId?: string;
  } | null;
  const sections = routerState?.sections ?? completedInspection;
  const counts = getStatusCounts(sections);
  const elapsed = routerState?.elapsed;

  const {
    analysis, partsResults, isAnalyzing, isLoadingParts, error,
    runAnalysis, lookupParts,
  } = useDebriefAnalysis();

  const [activeTab, setActiveTab] = useState('actions');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (machine && !analysis && !isAnalyzing && !error) {
      runAnalysis(sections, machine, routerState?.transcript, elapsed).then(result => {
        if (result?.partsRecommendations?.length && machine) {
          lookupParts(result.partsRecommendations, machine);
        }
        if (result && routerState?.inspectionId) {
          supabase
            .from('inspections')
            .update({
              health_score: result.executiveSummary?.healthScore,
              status: result.executiveSummary?.status,
              executive_summary: result.executiveSummary?.summary,
              analysis_json: result as any,
            })
            .eq('id', routerState.inspectionId)
            .then(({ error }) => {
              if (error) console.error('Failed to update analysis:', error);
            });
        }
      });
    }
  }, [machine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const formState: FormState = useMemo(() => {
    const components: FormState['components'] = {};
    sections.forEach(section => {
      section.items.forEach(item => {
        components[item.id] = {
          id: item.id,
          name: item.label,
          status: item.status === 'unconfirmed' ? null : item.status,
          notes: item.comment || '',
          inspected: item.status !== 'unconfirmed',
        };
      });
    });
    return { components };
  }, [sections]);

  const setFormState = useCallback(() => {}, []);

  const failItems = useMemo(() => sections.flatMap(s => s.items.filter(i => i.status === 'fail')), [sections]);
  const monitorItems = useMemo(() => sections.flatMap(s => s.items.filter(i => i.status === 'monitor')), [sections]);
  const totalItems = useMemo(() => sections.reduce((acc, s) => acc + s.items.length, 0), [sections]);

  // Combine parts + predictions + schedule into unified maintenance items
  const maintenanceItems = useMemo(() => {
    if (!analysis) return [];
    const items: Array<{
      id: string;
      label: string;
      urgency: string;
      type: 'order' | 'predict' | 'schedule';
      cost?: number;
      partNumber?: string;
      hoursToFailure?: number;
      remainingLife?: number;
      recommendation?: string;
      prediction?: string;
      confidence?: string;
      partType?: string;
      searchKeywords?: string;
      orderDate?: string;
      nextService?: number;
      partName?: string;
    }> = [];

    analysis.partsRecommendations?.forEach(p => {
      items.push({
        id: p.itemId, label: p.itemLabel, urgency: p.urgency,
        type: 'order', cost: p.estimatedPartCost, partNumber: p.catPartNumber,
        partType: p.partType, searchKeywords: p.searchKeywords,
      });
    });

    analysis.predictiveInsights?.forEach(p => {
      if (!items.find(i => i.id === p.itemId)) {
        items.push({
          id: p.itemId, label: p.itemLabel, urgency: p.confidence === 'high' ? 'immediate' : p.confidence === 'medium' ? 'soon' : 'scheduled',
          type: 'predict', hoursToFailure: p.estimatedHoursToFailure,
          prediction: p.prediction, confidence: p.confidence, recommendation: p.recommendation,
        });
      } else {
        const existing = items.find(i => i.id === p.itemId)!;
        existing.hoursToFailure = p.estimatedHoursToFailure;
        existing.prediction = p.prediction;
        existing.confidence = p.confidence;
        existing.recommendation = p.recommendation;
      }
    });

    analysis.predictiveMaintenanceSchedule?.forEach(m => {
      const existing = items.find(i => i.id === m.itemId);
      if (existing) {
        existing.remainingLife = m.estimatedRemainingLife;
        existing.orderDate = m.recommendedOrderDate;
        existing.nextService = m.nextServiceInterval;
        existing.partName = m.partName;
        if (!existing.cost) existing.cost = m.estimatedCost;
        if (!existing.partNumber) existing.partNumber = m.partNumber;
      } else {
        items.push({
          id: m.itemId, label: m.itemLabel, urgency: m.urgency,
          type: 'schedule', cost: m.estimatedCost, partNumber: m.partNumber,
          remainingLife: m.estimatedRemainingLife, orderDate: m.recommendedOrderDate,
          nextService: m.nextServiceInterval, partName: m.partName,
        });
      }
    });

    const urgencyOrder: Record<string, number> = { immediate: 0, 'order-now': 0, soon: 1, 'order-soon': 1, scheduled: 2, schedule: 2, monitor: 3 };
    items.sort((a, b) => (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3));
    return items;
  }, [analysis]);

  const totalEstCost = maintenanceItems.reduce((acc, i) => acc + (i.cost || 0), 0);
  const totalLabor = analysis?.workOrders?.reduce((acc, wo) => acc + wo.estimatedHours, 0) || 0;

  if (!machine) return null;
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      const items = sections.flatMap(s =>
        s.items.map(item => ({
          item_id: item.id, label: item.label, section_id: s.id, section_title: s.title,
          status: item.status, comment: item.comment, fault_code: item.faultCode,
          annotation: (item as any).annotation, photo_url: (item as any).photoUrl,
          evidence_types: item.evidence,
        }))
      );
      const inspection = {
        id: routerState?.inspectionId || 'draft', machine_id: machine.id,
        machine_model: machine.model, machine_serial: machine.serial,
        asset_id: machine.assetId, smu_hours: machine.smuHours,
        inspector_name: 'Marcus Chen', location: machine.location,
        duration_seconds: elapsed, created_at: new Date().toISOString(),
      };
      const { data, error: fnError } = await supabase.functions.invoke('generate-report-pdf', {
        body: { inspection, items, analysis },
      });
      if (fnError) throw fnError;
      if (!data?.html) throw new Error('No report generated');
      const blob = new Blob([data.html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
      toast({ title: 'Report generated', description: 'Use Ctrl+P / ⌘+P to save as PDF.' });
    } catch (e) {
      console.error('PDF generation error:', e);
      toast({ title: 'PDF generation failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const clearanceConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string; border: string }> = {
    GO: { icon: <ShieldCheck className="w-6 h-6" />, bg: 'bg-status-pass/10', text: 'text-status-pass', label: 'CLEAR TO OPERATE', border: 'border-status-pass/20' },
    CONDITIONAL: { icon: <ShieldAlert className="w-6 h-6" />, bg: 'bg-status-monitor/10', text: 'text-status-monitor', label: 'CONDITIONAL USE', border: 'border-status-monitor/20' },
    NO_GO: { icon: <ShieldX className="w-6 h-6" />, bg: 'bg-status-fail/10', text: 'text-status-fail', label: 'DO NOT OPERATE', border: 'border-status-fail/20' },
  };

  // Machine schematic zones
  const statusPriority: Record<string, number> = { fail: 3, monitor: 2, pass: 1, normal: 0, unconfirmed: -1 };
  const worstStatus = (ids: string[]) => {
    const allItems = sections.flatMap(s => s.items);
    const relevant = allItems.filter(i => ids.includes(i.id));
    if (relevant.length === 0) return 'normal';
    return relevant.reduce((worst, i) => statusPriority[i.status] > statusPriority[worst] ? i.status : worst, 'normal' as string);
  };
  const dotColor: Record<string, string> = { pass: 'bg-status-pass', fail: 'bg-status-fail', monitor: 'bg-status-monitor', normal: 'bg-muted-foreground' };
  const zones = [
    { label: 'Bucket', ids: ['1.7'], top: '63%', left: '69%' },
    { label: 'Boom', ids: ['1.5', '1.8'], top: '35%', left: '54%' },
    { label: 'Cab', ids: ['4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','3.2','3.3','3.4'], top: '59%', left: '38%' },
    { label: 'Engine', ids: ['2.1','2.2','2.4','2.5','2.6','2.7','2.8'], top: '65%', left: '21%' },
    { label: 'Hydraulics', ids: ['2.3','1.11'], top: '32%', left: '66%' },
    { label: 'Tracks', ids: ['1.1','1.2','1.3','1.4','1.12','1.13','1.16'], top: '78%', left: '25%' },
  ];

  const tabs = [
    { id: 'actions', label: 'Actions', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'maintenance', label: 'Maintain', icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'coaching', label: 'Review', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  // maintenanceItems, totalEstCost, totalLabor defined above early return

  const urgencyLabel: Record<string, { text: string; cls: string }> = {
    immediate: { text: 'NOW', cls: 'bg-status-fail/15 text-status-fail' },
    'order-now': { text: 'NOW', cls: 'bg-status-fail/15 text-status-fail' },
    soon: { text: 'SOON', cls: 'bg-status-monitor/15 text-status-monitor' },
    'order-soon': { text: 'SOON', cls: 'bg-status-monitor/15 text-status-monitor' },
    scheduled: { text: 'PLANNED', cls: 'bg-muted/50 text-muted-foreground' },
    schedule: { text: 'PLANNED', cls: 'bg-muted/50 text-muted-foreground' },
    monitor: { text: 'WATCH', cls: 'bg-muted/50 text-muted-foreground' },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* iOS header */}
      <header className="sticky top-0 z-50 glass-surface">
        <div className="px-5 pt-14 pb-2.5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-0.5 text-primary active:opacity-50 transition-opacity touch-target">
            <Home className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="ios-title text-foreground">Inspection Report</h1>
            <p className="ios-caption text-muted-foreground">{machine.assetId} · {machine.model}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPdf} disabled={isDownloadingPdf}
              className="w-[36px] h-[36px] rounded-full bg-white/[0.06] backdrop-blur-xl flex items-center justify-center ring-1 ring-white/[0.06]"
            >
              {isDownloadingPdf ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" /> : <Download className="w-4 h-4 text-muted-foreground" />}
            </button>
            <button onClick={() => navigate(`/history/${machineId}`)}
              className="w-[36px] h-[36px] rounded-full bg-white/[0.06] backdrop-blur-xl flex items-center justify-center ring-1 ring-white/[0.06]"
            >
              <History className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="pb-28">
        {/* Loading */}
        {isAnalyzing && (
          <div className="mx-4 mt-4 ios-card p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="ios-body font-semibold text-foreground">Analyzing inspection...</p>
            <p className="ios-caption text-muted-foreground">Generating safety clearance & maintenance plan</p>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 ios-card p-4 border border-status-fail/20">
            <p className="ios-subhead text-status-fail font-semibold">Analysis failed: {error}</p>
            <button onClick={() => runAnalysis(sections, machine, routerState?.transcript, elapsed)} className="mt-2 ios-subhead text-primary font-semibold">Retry</button>
          </div>
        )}

        {analysis && (
          <>
            {/* ─── SAFETY CLEARANCE ─── */}
            {analysis.executiveSummary && (() => {
              const clearance = analysis.executiveSummary.safetyClearance || 'CONDITIONAL';
              const cfg = clearanceConfig[clearance] || clearanceConfig.CONDITIONAL;
              return (
                <div className={`rounded-2xl ${cfg.bg} ${cfg.border} border overflow-hidden`}>
                  <div className="p-5 flex items-center gap-4">
                    <div className={cfg.text}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                       <p className={`ios-headline font-bold ${cfg.text}`}>{cfg.label}</p>
                      {analysis.executiveSummary.safetyClearanceReason && (
                        <p className="ios-caption text-muted-foreground mt-1 leading-relaxed">{analysis.executiveSummary.safetyClearanceReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                          <circle cx="28" cy="28" r="23" fill="none"
                            stroke={clearance === 'GO' ? 'hsl(var(--status-pass))' : clearance === 'NO_GO' ? 'hsl(var(--status-fail))' : 'hsl(var(--status-monitor))'}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${(analysis.executiveSummary.healthScore / 100) * 144.5} 144.5`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold font-mono text-foreground">{analysis.executiveSummary.healthScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-4" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                    {[
                      { val: totalItems, label: 'Checked', cls: 'text-foreground' },
                      { val: counts.pass, label: 'Pass', cls: 'text-status-pass' },
                      { val: monitorItems.length, label: 'Monitor', cls: 'text-status-monitor' },
                      { val: failItems.length, label: 'Fail', cls: 'text-status-fail' },
                    ].map((s, i) => (
                      <div key={i} className="py-2.5 text-center">
                        <p className={`text-[17px] font-bold font-mono ${s.cls}`}>{s.val}</p>
                        <p className="ios-caption2 text-muted-foreground uppercase">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Immediate actions */}
                  {analysis.executiveSummary.immediateActions?.length > 0 && (
                    <div className="px-4 pb-4 pt-2 space-y-1.5">
                      {analysis.executiveSummary.immediateActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 bg-status-fail/8 rounded-lg p-2.5">
                          <AlertCircle className="w-3.5 h-3.5 text-status-fail shrink-0 mt-0.5" />
                          <p className="ios-caption text-foreground leading-relaxed">{action}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Machine Map (collapsible) ─── */}
            <button onClick={() => toggleExpand('map')} className="w-full mx-4 ios-card overflow-hidden text-left" style={{ width: 'calc(100% - 32px)' }}>
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="ios-body font-medium text-foreground">Machine Map</h3>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCards.has('map') ? 'rotate-180' : ''}`} />
              </div>
              {expandedCards.has('map') && (
                <div className="relative" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                  <img src={excavatorSchematic} alt="Machine Schematic" className="w-full opacity-30" />
                  {zones.map(zone => {
                    const status = worstStatus(zone.ids);
                    return (
                      <div key={zone.label}
                        className={`absolute w-4 h-4 rounded-full border-2 border-background ${dotColor[status] || 'bg-muted-foreground'}`}
                        style={{ top: zone.top, left: zone.left }}
                        title={`${zone.label} — ${status.toUpperCase()}`}
                      />
                    );
                  })}
                </div>
              )}
            </button>

            {/* AI Validation — sensor-backed disagreements */}
            {(() => {
              // Collect sensor-backed disagreements from inspection items
              const sensorDisagreements = sections.flatMap(s =>
                s.items.filter(item => {
                  const ai = item as any;
                  return ai.aiAgreement === 'disagree' && ai.sensorEvidence;
                }).map(item => {
                  const ai = item as any;
                  return {
                    itemId: item.id,
                    itemLabel: item.label,
                    inspectorStatus: item.status,
                    inspectorComment: item.comment,
                    aiVisualNote: ai.aiVisualNote,
                    sensorEvidence: ai.sensorEvidence as { sensorLabel: string; latestValue: number; unit: string; status: string; time: string },
                  };
                })
              );
              // Also include debrief-level disagreements
              const debriefDisagreements = analysis.aiValidationSummary?.disagreements || [];
              const totalDisagreements = sensorDisagreements.length + debriefDisagreements.length;

              if (totalDisagreements === 0) return null;

              return (
                <button onClick={() => toggleExpand('validation')} className="w-full mx-4 ios-card border border-status-monitor/20 overflow-hidden text-left" style={{ width: 'calc(100% - 32px)' }}>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-status-monitor" />
                      <span className="ios-body font-medium text-foreground">AI Flagged {totalDisagreements} Discrepanc{totalDisagreements === 1 ? 'y' : 'ies'}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCards.has('validation') ? 'rotate-180' : ''}`} />
                  </div>
                  {expandedCards.has('validation') && (
                    <div className="px-4 pb-4 space-y-2 pt-3" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                      {sensorDisagreements.map((d, i) => (
                        <div key={`sensor-${i}`} className="rounded-lg bg-surface-2 p-3 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono ios-caption text-muted-foreground">{d.itemId}</span>
                            <span className="ios-subhead font-semibold text-foreground">{d.itemLabel}</span>
                            <span className="ios-caption2 font-bold uppercase ml-auto text-status-fail bg-status-fail/10 px-1.5 py-0.5 rounded">SENSOR CONFLICT</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-surface-3 p-2.5">
                              <p className="ios-caption2 text-muted-foreground uppercase mb-1">Inspector Says</p>
                              <p className="ios-subhead text-foreground font-semibold uppercase">{d.inspectorStatus}</p>
                              {d.inspectorComment && <p className="ios-caption text-muted-foreground mt-1 leading-snug">{d.inspectorComment}</p>}
                            </div>
                            <div className="rounded-lg bg-status-fail/5 border border-status-fail/10 p-2.5">
                              <p className="ios-caption2 text-status-fail uppercase mb-1">Telemetry Shows</p>
                              <p className="text-[18px] font-bold font-mono text-status-fail leading-none">
                                {d.sensorEvidence.latestValue}<span className="ios-caption text-muted-foreground ml-1">{d.sensorEvidence.unit}</span>
                              </p>
                              <p className="ios-caption text-muted-foreground mt-1">{d.sensorEvidence.sensorLabel} · {d.sensorEvidence.status.toUpperCase()}</p>
                            </div>
                          </div>
                          {d.aiVisualNote && (
                            <p className="ios-caption text-status-monitor leading-snug">AI Note: {d.aiVisualNote}</p>
                          )}
                        </div>
                      ))}
                      {debriefDisagreements.map((d, i) => (
                        <div key={`debrief-${i}`} className="rounded-lg bg-surface-2 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono ios-caption text-muted-foreground">{d.itemId}</span>
                            <span className="ios-subhead font-semibold text-foreground">{d.itemLabel}</span>
                            <span className={`ios-caption2 font-bold uppercase ml-auto ${d.severity === 'high' ? 'text-status-fail' : 'text-status-monitor'}`}>{d.severity}</span>
                          </div>
                          <p className="ios-subhead text-muted-foreground">{d.concern}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })()}

            {/* ─── TABS ─── */}
            <div className="mx-4 mt-4 ios-segmented">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`ios-segmented-btn flex items-center justify-center gap-1.5 ${
                    activeTab === tab.id ? 'ios-segmented-btn-active' : ''
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── ACTIONS TAB ─── */}
            {activeTab === 'actions' && (
              <div className="mx-4 mt-4 space-y-3">
                {/* Root causes */}
                {analysis.rootCauseAnalysis.length > 0 && (
                  <div className="space-y-2">
                    <p className="ios-caption text-muted-foreground uppercase px-1">Root Causes</p>
                    {analysis.rootCauseAnalysis.map((rca, i) => (
                      <button key={i} onClick={() => toggleExpand(`rca-${i}`)} className="w-full text-left ios-card overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-3">
                          <StatusBadge status={rca.status as any} showLabel={false} />
                          <div className="flex-1 min-w-0">
                            <p className="ios-body font-medium text-foreground truncate">{rca.itemLabel}</p>
                            <p className="ios-caption text-muted-foreground truncate">{rca.rootCause}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expandedCards.has(`rca-${i}`) ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedCards.has(`rca-${i}`) && (
                          <div className="px-4 pb-3 pt-3" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                            <p className="ios-subhead text-muted-foreground leading-relaxed">{rca.rootCause}</p>
                            {rca.cascadeRisk && (
                              <p className="ios-subhead text-status-monitor mt-2 flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3" /> Cascade: {rca.cascadeRisk}
                              </p>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Work orders */}
                {analysis.workOrders.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="ios-caption text-muted-foreground uppercase">Work Orders</p>
                      <p className="ios-caption text-muted-foreground">{totalLabor}h total labor</p>
                    </div>
                    {analysis.workOrders.map((wo, i) => {
                      const isExpanded = expandedCards.has(`wo-${i}`);
                      const priorityCls =
                        wo.priority === 'CRITICAL' ? 'border-l-status-fail' :
                        wo.priority === 'HIGH' ? 'border-l-status-monitor' :
                        wo.priority === 'MEDIUM' ? 'border-l-primary/60' :
                        'border-l-muted-foreground';
                      return (
                        <button key={i} onClick={() => toggleExpand(`wo-${i}`)} className={`w-full text-left ios-card border-l-[3px] ${priorityCls} overflow-hidden`}>
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`ios-caption2 font-bold uppercase ${
                                  wo.priority === 'CRITICAL' ? 'text-status-fail' :
                                  wo.priority === 'HIGH' ? 'text-status-monitor' :
                                  'text-muted-foreground'
                                }`}>{wo.priority}</span>
                                {!wo.canOperate && (
                                  <span className="ios-caption2 font-bold text-status-fail bg-status-fail/10 px-1.5 py-0.5 rounded">MUST STOP</span>
                                )}
                              </div>
                              <p className="ios-body font-medium text-foreground">{wo.title}</p>
                            </div>
                            <span className="ios-subhead font-bold font-mono text-muted-foreground shrink-0">{wo.estimatedHours}h</span>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3 pt-3" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                              <p className="ios-subhead text-muted-foreground leading-relaxed">{wo.description}</p>
                              {wo.procedure && <p className="ios-subhead text-muted-foreground mt-2 italic">{wo.procedure}</p>}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── MAINTENANCE TAB ─── */}
            {activeTab === 'maintenance' && (
              <div className="mx-4 mt-4 space-y-4">
                {/* Cost summary bar */}
                {maintenanceItems.length > 0 && (
                  <div className="ios-card overflow-hidden">
                    <div className="grid grid-cols-3">
                      <div className="p-3 text-center" style={{ borderRight: '0.33px solid hsl(var(--ios-separator))' }}>
                        <p className="text-[18px] font-bold font-mono text-primary">${totalEstCost.toLocaleString()}</p>
                        <p className="ios-caption2 text-muted-foreground uppercase">Est. Parts</p>
                      </div>
                      <div className="p-3 text-center" style={{ borderRight: '0.33px solid hsl(var(--ios-separator))' }}>
                        <p className="text-[18px] font-bold font-mono text-foreground">{maintenanceItems.length}</p>
                        <p className="ios-caption2 text-muted-foreground uppercase">Items</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-[18px] font-bold font-mono text-foreground">{totalLabor}h</p>
                        <p className="ios-caption2 text-muted-foreground uppercase">Labor</p>
                      </div>
                    </div>
                  </div>
                )}

                {maintenanceItems.length === 0 ? (
                  <div className="ios-card p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-status-pass mx-auto mb-2" />
                    <p className="ios-body font-semibold text-status-pass">All clear</p>
                    <p className="ios-caption text-muted-foreground mt-1">No parts or maintenance actions needed</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {maintenanceItems.map((item, i) => {
                      const isExpanded = expandedCards.has(`maint-${i}`);
                      const urg = urgencyLabel[item.urgency] || urgencyLabel.monitor;
                      const partResult = partsResults.find(p => p.itemId === item.id);
                      return (
                        <button key={i} onClick={() => toggleExpand(`maint-${i}`)} className="w-full text-left ios-card overflow-hidden">
                          <div className="px-4 py-3 flex items-center gap-3">
                            <span className={`ios-caption2 font-bold px-2 py-0.5 rounded ${urg.cls}`}>{urg.text}</span>
                            <div className="flex-1 min-w-0">
                              <p className="ios-body font-medium text-foreground truncate">{item.partName || item.label}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.partNumber && <span className="ios-caption font-mono text-muted-foreground">{item.partNumber}</span>}
                                {item.hoursToFailure && (
                                  <span className="ios-caption text-status-monitor flex items-center gap-0.5">
                                    <Timer className="w-2.5 h-2.5" /> {item.hoursToFailure}h
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.cost && <span className="ios-subhead font-bold font-mono text-primary shrink-0">${item.cost}</span>}
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-3 space-y-3" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }} onClick={e => e.stopPropagation()}>
                              {item.prediction && (
                                <div className="rounded-lg bg-surface-2 p-3">
                                  <p className="ios-caption2 font-bold uppercase text-muted-foreground mb-1">AI Prediction</p>
                                  <p className="ios-subhead text-foreground leading-relaxed">{item.prediction}</p>
                                  {item.recommendation && (
                                    <p className="ios-subhead text-primary mt-1.5">{item.recommendation}</p>
                                  )}
                                </div>
                              )}

                              {(item.remainingLife || item.nextService || item.orderDate) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {item.remainingLife && (
                                    <div className="rounded-lg bg-surface-2 p-2.5">
                                      <p className="ios-caption2 text-muted-foreground uppercase">Remaining</p>
                                      <p className="ios-subhead font-bold font-mono text-foreground">{item.remainingLife}h</p>
                                    </div>
                                  )}
                                  {item.nextService && (
                                    <div className="rounded-lg bg-surface-2 p-2.5">
                                      <p className="ios-caption2 text-muted-foreground uppercase">Next Service</p>
                                      <p className="ios-subhead font-bold font-mono text-foreground">{item.nextService}h</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.orderDate && (
                                <div className="flex items-center gap-2 bg-primary/8 rounded-lg p-2.5">
                                  <Truck className="w-3.5 h-3.5 text-primary" />
                                  <span className="ios-subhead text-primary font-semibold">Order by {new Date(item.orderDate).toLocaleDateString()}</span>
                                </div>
                              )}

                              {isLoadingParts && !partResult && (
                                <div className="flex items-center gap-2 ios-caption text-muted-foreground">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Searching parts.cat.com...
                                </div>
                              )}

                              {partResult && partResult.results.length > 0 && (
                                <div className="space-y-1.5">
                                  {partResult.results.slice(0, 2).map((r, j) => (
                                    <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 active:bg-primary/10 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="ios-subhead font-semibold text-primary truncate">{r.title}</p>
                                      </div>
                                      <ArrowUpRight className="w-3 h-3 text-primary shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}

                              {item.type === 'order' && (
                                <a href={partResult?.directUrl || `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent((item.searchKeywords || item.label) + ' CAT 320')}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold ios-subhead active:scale-[0.98] transition-all"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" /> Order Part
                                </a>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── REVIEW TAB ─── */}
            {activeTab === 'coaching' && (
              <div className="mx-4 mt-4 space-y-4">
                {/* Inspector grade */}
                <div className="ios-card p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{analysis.inspectorCoaching.overallGrade}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="ios-body font-semibold text-foreground">Inspector Grade</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${analysis.inspectorCoaching.coverageScore}%` }} />
                        </div>
                        <span className="ios-caption font-mono font-semibold text-muted-foreground">{analysis.inspectorCoaching.coverageScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {analysis.inspectorCoaching.strengths.length > 0 && (
                  <div className="ios-card p-4">
                    <p className="ios-caption text-status-pass uppercase font-semibold mb-2">Strengths</p>
                    <div className="space-y-1.5">
                      {analysis.inspectorCoaching.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-pass shrink-0 mt-0.5" />
                          <p className="ios-subhead text-foreground">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {analysis.inspectorCoaching.improvements.length > 0 && (
                  <div className="ios-card p-4">
                    <p className="ios-caption text-status-monitor uppercase font-semibold mb-2">Improve</p>
                    <div className="space-y-1.5">
                      {analysis.inspectorCoaching.improvements.map((imp, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CircleDot className="w-3.5 h-3.5 text-status-monitor shrink-0 mt-0.5" />
                          <p className="ios-subhead text-foreground">{imp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI validation summary */}
                {analysis.aiValidationSummary && (
                  <div className="ios-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="ios-caption text-muted-foreground uppercase">AI Agreement</p>
                      <span className="ios-subhead font-mono font-bold text-foreground">{analysis.aiValidationSummary.agreementScore}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-status-pass rounded-full" style={{ width: `${analysis.aiValidationSummary.agreementScore}%` }} />
                    </div>
                    {analysis.aiValidationSummary.overallNote && (
                      <p className="ios-caption text-muted-foreground mt-2">{analysis.aiValidationSummary.overallNote}</p>
                    )}
                  </div>
                )}

                {/* AI Disagreements */}
                {(() => {
                  const disagreements = sections.flatMap(s => s.items.filter(i => (i as any).aiAgreement === 'disagree'));
                  if (disagreements.length === 0) return null;
                  return (
                    <div className="ios-card p-4 border border-status-fail/20 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-status-fail" />
                        <p className="ios-caption text-status-fail uppercase font-semibold">AI Disagreements ({disagreements.length})</p>
                      </div>
                      {disagreements.map((item) => {
                        const ai = item as any;
                        return (
                          <div key={item.id} className="rounded-lg bg-surface-2 p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="ios-caption font-mono text-muted-foreground">{item.id}</span>
                                <span className="ios-subhead font-semibold text-foreground">{item.label}</span>
                              </div>
                              <StatusBadge status={item.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="rounded-md bg-surface-3 p-2">
                                <p className="ios-caption2 font-bold uppercase text-muted-foreground mb-0.5">Inspector Says</p>
                                <p className="ios-caption text-foreground">{item.comment || `Marked as ${item.status}`}</p>
                              </div>
                              <div className="rounded-md bg-status-fail/8 p-2">
                                <p className="ios-caption2 font-bold uppercase text-status-fail mb-0.5">AI Says</p>
                                <p className="ios-caption text-foreground">{ai.aiVisualNote || 'Telemetry contradicts this rating.'}</p>
                              </div>
                            </div>
                            {ai.sensorEvidence && (
                              <div className="mt-2 rounded-md bg-primary/5 border border-primary/10 p-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Target className="w-3 h-3 text-primary" />
                                  <span className="ios-caption2 font-bold uppercase text-primary">Telemetry Evidence</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="ios-caption text-foreground">{ai.sensorEvidence.sensorLabel}</span>
                                  <span className={`ios-subhead font-bold font-mono ${
                                    ai.sensorEvidence.status === 'critical' ? 'text-status-fail' :
                                    ai.sensorEvidence.status === 'warning' ? 'text-status-monitor' :
                                    'text-foreground'
                                  }`}>{ai.sensorEvidence.latestValue} {ai.sensorEvidence.unit}</span>
                                </div>
                                <p className="ios-caption2 text-muted-foreground mt-0.5">at {ai.sensorEvidence.time}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Voice Agent */}
      <VoiceAgent formState={formState} setFormState={setFormState} speechTranscript="" />
    </div>
  );
}
