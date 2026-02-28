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
    GO: { icon: <ShieldCheck className="w-6 h-6" />, bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'CLEAR TO OPERATE', border: 'border-emerald-500/20' },
    CONDITIONAL: { icon: <ShieldAlert className="w-6 h-6" />, bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'CONDITIONAL USE', border: 'border-amber-500/20' },
    NO_GO: { icon: <ShieldX className="w-6 h-6" />, bg: 'bg-red-500/10', text: 'text-red-400', label: 'DO NOT OPERATE', border: 'border-red-500/20' },
  };

  // Machine schematic zones
  const statusPriority: Record<string, number> = { fail: 3, monitor: 2, pass: 1, normal: 0, unconfirmed: -1 };
  const worstStatus = (ids: string[]) => {
    const allItems = sections.flatMap(s => s.items);
    const relevant = allItems.filter(i => ids.includes(i.id));
    if (relevant.length === 0) return 'normal';
    return relevant.reduce((worst, i) => statusPriority[i.status] > statusPriority[worst] ? i.status : worst, 'normal' as string);
  };
  const dotColor: Record<string, string> = { pass: 'bg-emerald-400', fail: 'bg-red-400', monitor: 'bg-amber-400', normal: 'bg-zinc-500' };
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
    immediate: { text: 'NOW', cls: 'bg-red-500/15 text-red-400' },
    'order-now': { text: 'NOW', cls: 'bg-red-500/15 text-red-400' },
    soon: { text: 'SOON', cls: 'bg-amber-500/15 text-amber-400' },
    'order-soon': { text: 'SOON', cls: 'bg-amber-500/15 text-amber-400' },
    scheduled: { text: 'PLANNED', cls: 'bg-zinc-500/15 text-zinc-400' },
    schedule: { text: 'PLANNED', cls: 'bg-zinc-500/15 text-zinc-400' },
    monitor: { text: 'WATCH', cls: 'bg-zinc-500/15 text-zinc-400' },
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Clean header */}
      <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <Home className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-zinc-100">Inspection Report</h1>
              <p className="text-[11px] text-zinc-500">{machine.assetId} • {machine.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPdf} disabled={isDownloadingPdf}
              className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" /> : <Download className="w-3.5 h-3.5 text-zinc-400" />}
            </button>
            <button onClick={() => navigate(`/history/${machineId}`)}
              className="w-8 h-8 rounded-lg bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 pb-28">
        {/* Loading */}
        {isAnalyzing && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-sm font-semibold text-zinc-300">Analyzing inspection...</p>
            <p className="text-xs text-zinc-600">Generating safety clearance & maintenance plan</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-500/5 border border-red-500/15 p-4">
            <p className="text-sm text-red-400 font-semibold">Analysis failed: {error}</p>
            <button onClick={() => runAnalysis(sections, machine, routerState?.transcript, elapsed)} className="mt-2 text-sm text-amber-400 font-semibold">Retry</button>
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
                      <p className={`text-base font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
                      {analysis.executiveSummary.safetyClearanceReason && (
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{analysis.executiveSummary.safetyClearanceReason}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r="23" fill="none" stroke="rgb(39 39 42)" strokeWidth="4" />
                          <circle cx="28" cy="28" r="23" fill="none"
                            stroke={clearance === 'GO' ? 'rgb(52 211 153)' : clearance === 'NO_GO' ? 'rgb(248 113 113)' : 'rgb(251 191 36)'}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${(analysis.executiveSummary.healthScore / 100) * 144.5} 144.5`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold font-mono text-zinc-100">{analysis.executiveSummary.healthScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-4 border-t border-white/5">
                    {[
                      { val: totalItems, label: 'Checked', cls: 'text-zinc-300' },
                      { val: counts.pass, label: 'Pass', cls: 'text-emerald-400' },
                      { val: monitorItems.length, label: 'Monitor', cls: 'text-amber-400' },
                      { val: failItems.length, label: 'Fail', cls: 'text-red-400' },
                    ].map((s, i) => (
                      <div key={i} className="py-2.5 text-center">
                        <p className={`text-base font-bold font-mono ${s.cls}`}>{s.val}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Immediate actions */}
                  {analysis.executiveSummary.immediateActions?.length > 0 && (
                    <div className="px-4 pb-4 pt-2 space-y-1.5">
                      {analysis.executiveSummary.immediateActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 bg-red-500/8 rounded-lg p-2.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-200 leading-relaxed">{action}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─── Machine Map (collapsible) ─── */}
            <button onClick={() => toggleExpand('map')} className="w-full rounded-2xl bg-zinc-900 border border-zinc-800/60 overflow-hidden text-left">
              <div className="px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300">Machine Map</h3>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedCards.has('map') ? 'rotate-180' : ''}`} />
              </div>
              {expandedCards.has('map') && (
                <div className="relative bg-zinc-950/50 border-t border-zinc-800/40">
                  <img src={excavatorSchematic} alt="Machine Schematic" className="w-full opacity-30" />
                  {zones.map(zone => {
                    const status = worstStatus(zone.ids);
                    return (
                      <div key={zone.label}
                        className={`absolute w-4 h-4 rounded-full border-2 border-zinc-950 ${dotColor[status] || 'bg-zinc-600'}`}
                        style={{ top: zone.top, left: zone.left }}
                        title={`${zone.label} — ${status.toUpperCase()}`}
                      />
                    );
                  })}
                </div>
              )}
            </button>

            {/* AI Validation (compact) */}
            {analysis.aiValidationSummary && analysis.aiValidationSummary.disagreements.length > 0 && (
              <button onClick={() => toggleExpand('validation')} className="w-full rounded-2xl bg-amber-500/5 border border-amber-500/15 overflow-hidden text-left">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-zinc-300">AI Flagged {analysis.aiValidationSummary.disagreements.length} Discrepanc{analysis.aiValidationSummary.disagreements.length === 1 ? 'y' : 'ies'}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedCards.has('validation') ? 'rotate-180' : ''}`} />
                </div>
                {expandedCards.has('validation') && (
                  <div className="px-4 pb-4 space-y-2 border-t border-amber-500/10 pt-3">
                    {analysis.aiValidationSummary.disagreements.map((d, i) => (
                      <div key={i} className="rounded-lg bg-zinc-900/60 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] text-zinc-500">{d.itemId}</span>
                          <span className="text-xs font-semibold text-zinc-300">{d.itemLabel}</span>
                          <span className={`text-[9px] font-bold uppercase ml-auto ${d.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`}>{d.severity}</span>
                        </div>
                        <p className="text-xs text-zinc-400">{d.concern}</p>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            )}

            {/* ─── TABS ─── */}
            <div className="flex gap-1 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── ACTIONS TAB ─── */}
            {activeTab === 'actions' && (
              <div className="space-y-3">
                {/* Root causes */}
                {analysis.rootCauseAnalysis.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 px-1">Root Causes</p>
                    {analysis.rootCauseAnalysis.map((rca, i) => (
                      <button key={i} onClick={() => toggleExpand(`rca-${i}`)} className="w-full text-left rounded-xl bg-zinc-900 border border-zinc-800/60 overflow-hidden">
                        <div className="px-4 py-3 flex items-center gap-3">
                          <StatusBadge status={rca.status as any} showLabel={false} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{rca.itemLabel}</p>
                            <p className="text-xs text-zinc-500 truncate">{rca.rootCause}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${expandedCards.has(`rca-${i}`) ? 'rotate-180' : ''}`} />
                        </div>
                        {expandedCards.has(`rca-${i}`) && (
                          <div className="px-4 pb-3 border-t border-zinc-800/40 pt-3">
                            <p className="text-xs text-zinc-400 leading-relaxed">{rca.rootCause}</p>
                            {rca.cascadeRisk && (
                              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Work Orders</p>
                      <p className="text-[10px] text-zinc-600">{totalLabor}h total labor</p>
                    </div>
                    {analysis.workOrders.map((wo, i) => {
                      const isExpanded = expandedCards.has(`wo-${i}`);
                      const priorityCls =
                        wo.priority === 'CRITICAL' ? 'border-l-red-500' :
                        wo.priority === 'HIGH' ? 'border-l-amber-500' :
                        wo.priority === 'MEDIUM' ? 'border-l-amber-600/60' :
                        'border-l-zinc-600';
                      return (
                        <button key={i} onClick={() => toggleExpand(`wo-${i}`)} className={`w-full text-left rounded-xl bg-zinc-900 border border-zinc-800/60 border-l-[3px] ${priorityCls} overflow-hidden`}>
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                  wo.priority === 'CRITICAL' ? 'text-red-400' :
                                  wo.priority === 'HIGH' ? 'text-amber-400' :
                                  'text-zinc-500'
                                }`}>{wo.priority}</span>
                                {!wo.canOperate && (
                                  <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">MUST STOP</span>
                                )}
                              </div>
                              <p className="text-sm font-semibold text-zinc-200">{wo.title}</p>
                            </div>
                            <span className="text-sm font-bold font-mono text-zinc-400 shrink-0">{wo.estimatedHours}h</span>
                            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                          {isExpanded && (
                            <div className="px-4 pb-3 border-t border-zinc-800/40 pt-3">
                              <p className="text-xs text-zinc-400 leading-relaxed">{wo.description}</p>
                              {wo.procedure && <p className="text-xs text-zinc-500 mt-2 italic">{wo.procedure}</p>}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── MAINTENANCE TAB (unified Order + Predict + Plan) ─── */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                {/* Cost summary bar */}
                {maintenanceItems.length > 0 && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 overflow-hidden">
                    <div className="grid grid-cols-3 divide-x divide-zinc-800/50">
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold font-mono text-amber-400">${totalEstCost.toLocaleString()}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Est. Parts</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold font-mono text-zinc-300">{maintenanceItems.length}</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Items</p>
                      </div>
                      <div className="p-3 text-center">
                        <p className="text-lg font-bold font-mono text-zinc-300">{totalLabor}h</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">Labor</p>
                      </div>
                    </div>
                  </div>
                )}

                {maintenanceItems.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-8 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-emerald-400">All clear</p>
                    <p className="text-xs text-zinc-600 mt-1">No parts or maintenance actions needed</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {maintenanceItems.map((item, i) => {
                      const isExpanded = expandedCards.has(`maint-${i}`);
                      const urg = urgencyLabel[item.urgency] || urgencyLabel.monitor;
                      const partResult = partsResults.find(p => p.itemId === item.id);
                      return (
                        <button key={i} onClick={() => toggleExpand(`maint-${i}`)} className="w-full text-left rounded-xl bg-zinc-900 border border-zinc-800/60 overflow-hidden">
                          <div className="px-4 py-3 flex items-center gap-3">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${urg.cls}`}>{urg.text}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 truncate">{item.partName || item.label}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.partNumber && <span className="text-[10px] font-mono text-zinc-500">{item.partNumber}</span>}
                                {item.hoursToFailure && (
                                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                                    <Timer className="w-2.5 h-2.5" /> {item.hoursToFailure}h
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.cost && <span className="text-sm font-bold font-mono text-amber-400 shrink-0">${item.cost}</span>}
                            <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-zinc-800/40 pt-3 space-y-3" onClick={e => e.stopPropagation()}>
                              {/* Prediction */}
                              {item.prediction && (
                                <div className="rounded-lg bg-zinc-800/40 p-3">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">AI Prediction</p>
                                  <p className="text-xs text-zinc-300 leading-relaxed">{item.prediction}</p>
                                  {item.recommendation && (
                                    <p className="text-xs text-amber-400 mt-1.5">{item.recommendation}</p>
                                  )}
                                </div>
                              )}

                              {/* Schedule info */}
                              {(item.remainingLife || item.nextService || item.orderDate) && (
                                <div className="grid grid-cols-2 gap-2">
                                  {item.remainingLife && (
                                    <div className="rounded-lg bg-zinc-800/40 p-2.5">
                                      <p className="text-[9px] text-zinc-500 uppercase">Remaining</p>
                                      <p className="text-sm font-bold font-mono text-zinc-200">{item.remainingLife}h</p>
                                    </div>
                                  )}
                                  {item.nextService && (
                                    <div className="rounded-lg bg-zinc-800/40 p-2.5">
                                      <p className="text-[9px] text-zinc-500 uppercase">Next Service</p>
                                      <p className="text-sm font-bold font-mono text-zinc-200">{item.nextService}h</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {item.orderDate && (
                                <div className="flex items-center gap-2 bg-amber-500/8 rounded-lg p-2.5">
                                  <Truck className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="text-xs text-amber-400 font-semibold">Order by {new Date(item.orderDate).toLocaleDateString()}</span>
                                </div>
                              )}

                              {/* Parts search results */}
                              {isLoadingParts && !partResult && (
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Searching parts.cat.com...
                                </div>
                              )}

                              {partResult && partResult.results.length > 0 && (
                                <div className="space-y-1.5">
                                  {partResult.results.slice(0, 2).map((r, j) => (
                                    <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-amber-400 truncate">{r.title}</p>
                                      </div>
                                      <ArrowUpRight className="w-3 h-3 text-amber-400 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}

                              {/* Order button */}
                              {item.type === 'order' && (
                                <a href={partResult?.directUrl || `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent((item.searchKeywords || item.label) + ' CAT 320')}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 text-zinc-950 font-bold text-xs active:scale-[0.98] transition-all"
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

            {/* ─── REVIEW TAB (coaching + validation) ─── */}
            {activeTab === 'coaching' && (
              <div className="space-y-4">
                {/* Inspector grade */}
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800/60 p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-amber-400">{analysis.inspectorCoaching.overallGrade}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-zinc-200">Inspector Grade</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${analysis.inspectorCoaching.coverageScore}%` }} />
                        </div>
                        <span className="text-xs font-mono font-semibold text-zinc-400">{analysis.inspectorCoaching.coverageScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strengths + Improvements */}
                {analysis.inspectorCoaching.strengths.length > 0 && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-2">Strengths</p>
                    <div className="space-y-1.5">
                      {analysis.inspectorCoaching.strengths.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-300">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.inspectorCoaching.improvements.length > 0 && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-2">Improve</p>
                    <div className="space-y-1.5">
                      {analysis.inspectorCoaching.improvements.map((imp, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CircleDot className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-zinc-300">{imp}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI validation summary */}
                {analysis.aiValidationSummary && (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">AI Agreement</p>
                      <span className="text-sm font-mono font-bold text-zinc-300">{analysis.aiValidationSummary.agreementScore}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${analysis.aiValidationSummary.agreementScore}%` }} />
                    </div>
                    {analysis.aiValidationSummary.overallNote && (
                      <p className="text-xs text-zinc-500 mt-2">{analysis.aiValidationSummary.overallNote}</p>
                    )}
                  </div>
                )}
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
