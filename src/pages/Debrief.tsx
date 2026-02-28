import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts, InspectionSection } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary, StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useDebriefAnalysis } from '@/hooks/useDebriefAnalysis';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import excavatorSchematic from '@/assets/excavator-schematic.png';
import { VoiceAgent, FormState } from '@/components/inspection/VoiceAgent';
import {
  AlertTriangle, TrendingUp, Cpu, CheckCircle2, Clock, BarChart3,
  Home, FileText, ExternalLink, Wrench, ShieldAlert, Brain,
  Package, Star, ChevronRight, Loader2, Zap, Activity,
  ArrowUpRight, Shield, CircleDot, Target, GraduationCap,
  Download, History, ShieldCheck, ShieldX, Eye, EyeOff,
  Calendar, DollarSign, ShoppingCart, Truck, Timer,
  AlertCircle, CheckCircle, XCircle, HelpCircle,
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

  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  // Voice agent form state (read-only for debrief context)
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

  const setFormState = useCallback(() => {}, []); // read-only on debrief

  if (!machine) return null;

  const failItems = sections.flatMap(s => s.items.filter(i => i.status === 'fail'));
  const monitorItems = sections.flatMap(s => s.items.filter(i => i.status === 'monitor'));
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const sensorItems = sections.flatMap(s => s.items.filter(i => i.evidence?.includes('sensor')));

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

  const priorityColor: Record<string, string> = {
    CRITICAL: 'text-status-fail bg-status-fail/8 border-status-fail/15',
    HIGH: 'text-accent bg-accent/8 border-accent/15',
    MEDIUM: 'text-status-monitor bg-status-monitor/8 border-status-monitor/15',
    LOW: 'text-muted-foreground bg-muted/50 border-border/30',
  };

  const urgencyBadge: Record<string, string> = {
    'order-now': 'bg-status-fail/10 text-status-fail border-status-fail/20',
    'order-soon': 'bg-status-monitor/10 text-status-monitor border-status-monitor/20',
    'schedule': 'bg-primary/10 text-primary border-primary/20',
    'monitor': 'bg-muted/50 text-muted-foreground border-border/30',
    'immediate': 'bg-status-fail/10 text-status-fail border-status-fail/20',
    'soon': 'bg-status-monitor/10 text-status-monitor border-status-monitor/20',
    'scheduled': 'bg-muted/50 text-muted-foreground border-border/30',
  };

  const confidenceBadge: Record<string, string> = {
    high: 'bg-status-fail/10 text-status-fail border-status-fail/20',
    medium: 'bg-status-monitor/10 text-status-monitor border-status-monitor/20',
    low: 'bg-muted/50 text-muted-foreground border-border/30',
  };

  const clearanceConfig: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
    GO: { icon: <ShieldCheck className="w-7 h-7" />, bg: 'bg-status-pass/10 border-status-pass/20', text: 'text-status-pass', label: 'CLEARED TO OPERATE' },
    CONDITIONAL: { icon: <ShieldAlert className="w-7 h-7" />, bg: 'bg-status-monitor/10 border-status-monitor/20', text: 'text-status-monitor', label: 'CONDITIONAL — FIX BEFORE GO' },
    NO_GO: { icon: <ShieldX className="w-7 h-7" />, bg: 'bg-status-fail/10 border-status-fail/20', text: 'text-status-fail', label: 'DO NOT OPERATE' },
  };

  // Machine schematic zones
  const statusPriority: Record<string, number> = { fail: 3, monitor: 2, pass: 1, normal: 0, unconfirmed: -1 };
  const worstStatus = (ids: string[]) => {
    const allItems = sections.flatMap(s => s.items);
    const relevant = allItems.filter(i => ids.includes(i.id));
    if (relevant.length === 0) return 'normal';
    return relevant.reduce((worst, i) => statusPriority[i.status] > statusPriority[worst] ? i.status : worst, 'normal' as string);
  };
  const dotColor: Record<string, string> = { pass: 'bg-status-pass', fail: 'bg-status-fail', monitor: 'bg-status-monitor', normal: 'bg-muted-foreground/40' };
  const zones = [
    { label: 'Bucket', ids: ['1.7'], top: '63%', left: '69%' },
    { label: 'Boom', ids: ['1.5', '1.8'], top: '35%', left: '54%' },
    { label: 'Cab', ids: ['4.1','4.2','4.3','4.4','4.5','4.6','4.7','4.8','4.9','3.2','3.3','3.4'], top: '59%', left: '38%' },
    { label: 'Engine', ids: ['2.1','2.2','2.4','2.5','2.6','2.7','2.8'], top: '65%', left: '21%' },
    { label: 'Hydraulics', ids: ['2.3','1.11'], top: '32%', left: '66%' },
    { label: 'Tracks', ids: ['1.1','1.2','1.3','1.4','1.12','1.13','1.16'], top: '78%', left: '25%' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Inspection Debrief"
        subtitle={`${machine.assetId} • S/N ${machine.serial}`}
        back="/"
        right={<StatusSummary {...counts} />}
      />

      <div className="px-5 py-4 space-y-3 pb-36">
        {/* Loading state */}
        {isAnalyzing && (
          <div className="card-elevated p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">AI analyzing inspection data...</p>
            <p className="text-xs text-muted-foreground/60">Generating safety clearance, work orders, and predictions</p>
          </div>
        )}

        {error && (
          <div className="card-elevated p-4 border-status-fail/15">
            <p className="text-sm text-status-fail font-semibold">Analysis failed: {error}</p>
            <button onClick={() => runAnalysis(sections, machine, routerState?.transcript, elapsed)} className="mt-2 text-sm text-primary font-semibold">Retry Analysis</button>
          </div>
        )}

        {analysis && (
          <>
            {/* SAFETY CLEARANCE HERO */}
            {analysis.executiveSummary && (() => {
              const clearance = analysis.executiveSummary.safetyClearance || 'CONDITIONAL';
              const cfg = clearanceConfig[clearance] || clearanceConfig.CONDITIONAL;
              return (
                <div className={`card-elevated overflow-hidden border-2 ${cfg.bg}`}>
                  <div className="p-5 flex items-center gap-4">
                    <div className={cfg.text}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-lg font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{analysis.executiveSummary.safetyClearanceReason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="relative">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--surface-2))" strokeWidth="5" />
                          <circle cx="40" cy="40" r="34" fill="none"
                            stroke={clearance === 'GO' ? 'hsl(var(--status-pass))' : clearance === 'NO_GO' ? 'hsl(var(--status-fail))' : 'hsl(var(--status-monitor))'}
                            strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${(analysis.executiveSummary.healthScore / 100) * 213.6} 213.6`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold font-mono">{analysis.executiveSummary.healthScore}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Actions */}
                  {analysis.executiveSummary.immediateActions?.length > 0 && (
                    <div className="px-5 pb-4">
                      <p className="label-caps text-status-fail mb-2">⚠️ Fix Before Operating</p>
                      <div className="space-y-1.5">
                        {analysis.executiveSummary.immediateActions.map((action, i) => (
                          <div key={i} className="flex items-start gap-2 bg-status-fail/5 border border-status-fail/10 rounded-lg p-2.5">
                            <AlertCircle className="w-3.5 h-3.5 text-status-fail shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground leading-relaxed">{action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-px bg-border/30">
                    <div className="bg-card p-2.5 text-center">
                      <p className="text-base font-bold font-mono">{totalItems}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Checked</p>
                    </div>
                    <div className="bg-card p-2.5 text-center">
                      <p className="text-base font-bold font-mono text-status-pass">{counts.pass}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Pass</p>
                    </div>
                    <div className="bg-card p-2.5 text-center">
                      <p className="text-base font-bold font-mono text-status-monitor">{monitorItems.length}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Monitor</p>
                    </div>
                    <div className="bg-card p-2.5 text-center">
                      <p className="text-base font-bold font-mono text-status-fail">{failItems.length}</p>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Fail</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* AI Validation Banner */}
            {analysis.aiValidationSummary && (
              <div className="card-elevated p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-sensor" />
                    <h3 className="text-sm font-bold">AI Visual Validation</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-sensor">{analysis.aiValidationSummary.agreementScore}% agreement</span>
                </div>
                <Progress value={analysis.aiValidationSummary.agreementScore} className="h-1.5 mb-2" />
                {analysis.aiValidationSummary.disagreements.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    <p className="label-caps text-status-monitor">⚠️ AI Flagged Discrepancies</p>
                    {analysis.aiValidationSummary.disagreements.map((d, i) => (
                      <div key={i} className={`rounded-lg p-3 border ${d.severity === 'high' ? 'bg-status-fail/5 border-status-fail/15' : d.severity === 'medium' ? 'bg-status-monitor/5 border-status-monitor/15' : 'bg-muted/30 border-border/30'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] text-muted-foreground">{d.itemId}</span>
                          <span className="text-xs font-semibold">{d.itemLabel}</span>
                          <span className={`text-[9px] font-bold uppercase ml-auto ${d.severity === 'high' ? 'text-status-fail' : d.severity === 'medium' ? 'text-status-monitor' : 'text-muted-foreground'}`}>{d.severity}</span>
                        </div>
                        <p className="text-xs text-foreground/70 leading-relaxed">
                          Inspector: <span className="font-semibold uppercase">{d.inspectorRating}</span> → AI sees: <span className="font-semibold">{d.aiAssessment}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 italic">{d.concern}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-status-pass flex items-center gap-1.5 mt-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    All items validated — AI agrees with inspector assessments
                  </p>
                )}
              </div>
            )}

            {/* Machine Map */}
            <div className="card-elevated overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Machine Map</h3>
                <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-pass" />Pass</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-monitor" />Monitor</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-fail" />Fail</span>
                </div>
              </div>
              <div className="relative bg-background/50">
                <img src={excavatorSchematic} alt="Machine Schematic" className="w-full opacity-40" />
                {zones.map(zone => {
                  const status = worstStatus(zone.ids);
                  return (
                    <div key={zone.label}
                      className={`absolute w-4 h-4 rounded-full border-2 border-background ${dotColor[status] || 'bg-muted-foreground/40'}`}
                      style={{ top: zone.top, left: zone.left }}
                      title={`${zone.label} — ${status.toUpperCase()}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-5 h-10 bg-surface-2">
                <TabsTrigger value="overview" className="text-[10px] gap-0.5 data-[state=active]:text-primary px-1">
                  <Zap className="w-3 h-3" /> Actions
                </TabsTrigger>
                <TabsTrigger value="parts" className="text-[10px] gap-0.5 data-[state=active]:text-primary px-1">
                  <ShoppingCart className="w-3 h-3" /> Order
                </TabsTrigger>
                <TabsTrigger value="predict" className="text-[10px] gap-0.5 data-[state=active]:text-primary px-1">
                  <Brain className="w-3 h-3" /> Predict
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-[10px] gap-0.5 data-[state=active]:text-primary px-1">
                  <Calendar className="w-3 h-3" /> Plan
                </TabsTrigger>
                <TabsTrigger value="coaching" className="text-[10px] gap-0.5 data-[state=active]:text-primary px-1">
                  <GraduationCap className="w-3 h-3" /> Coach
                </TabsTrigger>
              </TabsList>

              {/* ACTIONS TAB */}
              <TabsContent value="overview" className="space-y-3 mt-3">
                {/* Root Cause Analysis */}
                {analysis.rootCauseAnalysis.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-bold">Root Cause Analysis</h3>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.rootCauseAnalysis.map((rca, i) => (
                        <div key={i} className="inset-surface p-3.5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] text-muted-foreground">{rca.itemId}</span>
                            <StatusBadge status={rca.status as any} showLabel={false} />
                            <span className="text-sm font-semibold">{rca.itemLabel}</span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed">{rca.rootCause}</p>
                          {rca.cascadeRisk && (
                            <p className="text-[11px] text-status-monitor mt-1.5 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> <span className="font-medium">Cascade risk:</span> {rca.cascadeRisk}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Orders */}
                <div className="card-elevated p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold">Work Orders</h3>
                    <span className="text-xs text-muted-foreground ml-auto">{analysis.workOrders.length} items</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.workOrders.map((wo, i) => (
                      <div key={i} className={`rounded-lg p-3.5 border ${priorityColor[wo.priority]}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider">{wo.priority}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{wo.itemId}</span>
                            </div>
                            <p className="text-sm font-semibold">{wo.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{wo.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold font-mono">{wo.estimatedHours}h</p>
                            <p className={`text-[10px] mt-0.5 ${wo.canOperate ? 'text-status-pass' : 'text-status-fail font-semibold'}`}>
                              {wo.canOperate ? 'Can operate' : 'MUST STOP'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ORDERING TAB */}
              <TabsContent value="parts" className="space-y-3 mt-3">
                {analysis.partsRecommendations.length === 0 ? (
                  <div className="card-elevated p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-status-pass mx-auto mb-2" />
                    <p className="text-sm font-semibold text-status-pass">No parts needed</p>
                  </div>
                ) : (
                  <>
                    <div className="card-elevated p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold">Ready to Order</h3>
                      </div>
                      <div className="space-y-3">
                        {analysis.partsRecommendations.map((part, i) => {
                          const partResult = partsResults.find(p => p.itemId === part.itemId);
                          return (
                            <div key={i} className="card-elevated p-4 bg-surface-2/50">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${urgencyBadge[part.urgency]}`}>{part.urgency}</span>
                                    <span className="font-mono text-[11px] text-muted-foreground">{part.itemId}</span>
                                  </div>
                                  <p className="text-sm font-bold">{part.itemLabel}</p>
                                  <p className="text-xs text-muted-foreground">{part.partType}</p>
                                </div>
                                {part.estimatedPartCost && (
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">Est. cost</p>
                                    <p className="text-lg font-bold font-mono text-primary">${part.estimatedPartCost}</p>
                                  </div>
                                )}
                              </div>

                              {part.catPartNumber && (
                                <div className="flex items-center gap-2 mb-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                                  <Package className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-mono font-bold text-primary">{part.catPartNumber}</span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">CAT Part #</span>
                                </div>
                              )}

                              {isLoadingParts && !partResult && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Finding on parts.cat.com...
                                </div>
                              )}

                              {partResult && partResult.results.length > 0 && (
                                <div className="space-y-1.5 mb-3">
                                  {partResult.results.slice(0, 2).map((r, j) => (
                                    <a key={j} href={r.url} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-primary truncate">{r.title}</p>
                                        {r.description && <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>}
                                      </div>
                                      <ArrowUpRight className="w-3 h-3 text-primary shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              )}

                              <div className="flex gap-2">
                                <a href={partResult?.directUrl || `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent(part.searchKeywords + ' CAT 320')}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs active:scale-[0.98] transition-all"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" /> Order Part
                                </a>
                                <button className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-surface-2 border border-border/40 text-xs font-semibold text-muted-foreground">
                                  <ExternalLink className="w-3 h-3" /> Swap
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Repair Estimate Summary */}
                    <div className="card-elevated overflow-hidden">
                      <div className="grid grid-cols-3 gap-px bg-border/30">
                        <div className="bg-card p-3 text-center">
                          <p className="text-lg font-bold font-mono">{analysis.workOrders.reduce((acc, wo) => acc + wo.estimatedHours, 0)}h</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Labor</p>
                        </div>
                        <div className="bg-card p-3 text-center">
                          <p className="text-lg font-bold font-mono">{analysis.partsRecommendations.length}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Parts</p>
                        </div>
                        <div className="bg-card p-3 text-center">
                          <p className="text-lg font-bold font-mono text-primary">
                            ${analysis.partsRecommendations.reduce((acc, p) => acc + (p.estimatedPartCost || 0), 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Est. Total</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* PREDICT TAB */}
              <TabsContent value="predict" className="space-y-3 mt-3">
                {analysis.predictiveInsights.length === 0 ? (
                  <div className="card-elevated p-6 text-center">
                    <Activity className="w-8 h-8 text-status-pass mx-auto mb-2" />
                    <p className="text-sm font-semibold">No predictive concerns</p>
                  </div>
                ) : (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-bold">Failure Predictions</h3>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.predictiveInsights.map((insight, i) => (
                        <div key={i} className="inset-surface rounded-lg p-3.5">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-mono text-[11px] text-muted-foreground">{insight.itemId}</span>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${confidenceBadge[insight.confidence]}`}>
                              {insight.confidence}
                            </span>
                          </div>
                          <p className="text-sm font-semibold">{insight.itemLabel}</p>
                          <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{insight.prediction}</p>
                          {insight.estimatedHoursToFailure && (
                            <div className="mt-2 flex items-center gap-2">
                              <Timer className="w-3 h-3 text-status-monitor" />
                              <span className="text-xs text-status-monitor font-semibold">~{insight.estimatedHoursToFailure} SMU hrs to failure</span>
                            </div>
                          )}
                          <div className="mt-2 p-2 rounded bg-primary/5 border border-primary/10">
                            <p className="text-[11px] text-primary font-medium">{insight.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* MAINTENANCE SCHEDULE TAB */}
              <TabsContent value="schedule" className="space-y-3 mt-3">
                {(!analysis.predictiveMaintenanceSchedule || analysis.predictiveMaintenanceSchedule.length === 0) ? (
                  <div className="card-elevated p-6 text-center">
                    <Calendar className="w-8 h-8 text-status-pass mx-auto mb-2" />
                    <p className="text-sm font-semibold">All components on track</p>
                    <p className="text-xs text-muted-foreground mt-1">No upcoming maintenance items flagged.</p>
                  </div>
                ) : (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold">Predictive Maintenance Schedule</h3>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.predictiveMaintenanceSchedule.map((item, i) => (
                        <div key={i} className="card-elevated p-3.5 bg-surface-2/50">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${urgencyBadge[item.urgency]}`}>{item.urgency.replace('-', ' ')}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">{item.itemId}</span>
                              </div>
                              <p className="text-sm font-bold">{item.partName}</p>
                              <p className="text-xs text-muted-foreground">{item.itemLabel}</p>
                            </div>
                            {item.estimatedCost && (
                              <div className="text-right shrink-0">
                                <p className="text-xs text-muted-foreground">Est.</p>
                                <p className="text-base font-bold font-mono text-primary">${item.estimatedCost}</p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-background/60 rounded-lg p-2">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Remaining Life</p>
                              <p className="text-sm font-bold font-mono">{item.estimatedRemainingLife} hrs</p>
                            </div>
                            {item.nextServiceInterval && (
                              <div className="bg-background/60 rounded-lg p-2">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Next Service</p>
                                <p className="text-sm font-bold font-mono">{item.nextServiceInterval} hrs</p>
                              </div>
                            )}
                          </div>

                          {item.recommendedOrderDate && (
                            <div className="mt-2 flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg p-2">
                              <Truck className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs text-primary font-semibold">Order by {new Date(item.recommendedOrderDate).toLocaleDateString()}</span>
                            </div>
                          )}

                          {item.partNumber && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-1.5">Part #: {item.partNumber}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* COACHING TAB */}
              <TabsContent value="coaching" className="space-y-3 mt-3">
                <div className="card-elevated p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-primary">{analysis.inspectorCoaching.overallGrade}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Inspector Performance</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Coverage Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={analysis.inspectorCoaching.coverageScore} className="h-2 w-24" />
                        <span className="text-xs font-mono font-semibold">{analysis.inspectorCoaching.coverageScore}%</span>
                      </div>
                    </div>
                  </div>

                  {analysis.inspectorCoaching.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="label-caps mb-2 text-status-pass">Strengths</p>
                      <div className="space-y-1.5">
                        {analysis.inspectorCoaching.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-status-pass shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/80 leading-relaxed">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.inspectorCoaching.improvements.length > 0 && (
                    <div>
                      <p className="label-caps mb-2 text-status-monitor">Areas to Improve</p>
                      <div className="space-y-1.5">
                        {analysis.inspectorCoaching.improvements.map((imp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CircleDot className="w-3.5 h-3.5 text-status-monitor shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/80 leading-relaxed">{imp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Voice Agent — available on debrief page */}
      <VoiceAgent
        formState={formState}
        setFormState={setFormState}
        speechTranscript=""
      />

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent flex gap-2.5 safe-bottom z-40">
        <button onClick={handleDownloadPdf} disabled={isDownloadingPdf}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
        <button onClick={() => navigate(`/history/${machineId}`)}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all"
        >
          <History className="w-4 h-4" />
        </button>
        <button onClick={() => navigate('/')}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all"
        >
          <Home className="w-4 h-4" /> Back to Fleet
        </button>
      </div>
    </div>
  );
}
