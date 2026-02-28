import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts, InspectionSection } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary, StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useDebriefAnalysis } from '@/hooks/useDebriefAnalysis';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import excavatorSchematic from '@/assets/excavator-schematic.png';
import {
  AlertTriangle, TrendingUp, Cpu, CheckCircle2, Clock, BarChart3,
  Home, FileText, ExternalLink, Wrench, ShieldAlert, Brain,
  Package, Star, ChevronRight, Loader2, Zap, Activity,
  ArrowUpRight, Shield, CircleDot, Target, GraduationCap,
} from 'lucide-react';

export default function Debrief() {
  const { machineId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const routerState = location.state as { sections?: InspectionSection[]; transcript?: string; elapsed?: number } | null;
  const sections = routerState?.sections ?? completedInspection;
  const counts = getStatusCounts(sections);
  const elapsed = routerState?.elapsed;

  const {
    analysis, partsResults, isAnalyzing, isLoadingParts, error,
    runAnalysis, lookupParts,
  } = useDebriefAnalysis();

  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (machine && !analysis && !isAnalyzing && !error) {
      runAnalysis(sections, machine, routerState?.transcript, elapsed).then(result => {
        if (result?.partsRecommendations?.length && machine) {
          lookupParts(result.partsRecommendations, machine);
        }
      });
    }
  }, [machine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!machine) return null;

  const failItems = sections.flatMap(s => s.items.filter(i => i.status === 'fail'));
  const monitorItems = sections.flatMap(s => s.items.filter(i => i.status === 'monitor'));
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const sensorItems = sections.flatMap(s => s.items.filter(i => i.evidence?.includes('sensor')));
  const videoCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.evidence?.includes('video')).length, 0);
  const audioCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.evidence?.includes('audio')).length, 0);

  const handleDealerService = (itemId: string, label: string) => {
    toast({ title: 'Service request sent', description: `Dealer notified about ${itemId} — ${label}.` });
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const priorityColor: Record<string, string> = {
    CRITICAL: 'text-status-fail bg-status-fail/8 border-status-fail/15',
    HIGH: 'text-accent bg-accent/8 border-accent/15',
    MEDIUM: 'text-status-monitor bg-status-monitor/8 border-status-monitor/15',
    LOW: 'text-muted-foreground bg-muted/50 border-border/30',
  };

  const urgencyColor: Record<string, string> = {
    immediate: 'text-status-fail',
    soon: 'text-status-monitor',
    scheduled: 'text-muted-foreground',
  };

  const statusColor: Record<string, string> = {
    READY: 'text-status-pass',
    CAUTION: 'text-status-monitor',
    DOWN: 'text-status-fail',
  };

  const confidenceBadge: Record<string, string> = {
    high: 'bg-status-fail/10 text-status-fail border-status-fail/20',
    medium: 'bg-status-monitor/10 text-status-monitor border-status-monitor/20',
    low: 'bg-muted/50 text-muted-foreground border-border/30',
  };

  // Machine schematic zones
  const statusPriority: Record<string, number> = { fail: 3, monitor: 2, pass: 1, normal: 0, unconfirmed: -1 };
  const worstStatus = (ids: string[]) => {
    const allItems = sections.flatMap(s => s.items);
    const relevant = allItems.filter(i => ids.includes(i.id));
    if (relevant.length === 0) return 'normal';
    return relevant.reduce((worst, i) => statusPriority[i.status] > statusPriority[worst] ? i.status : worst, 'normal' as string);
  };
  const dotColor: Record<string, string> = {
    pass: 'bg-status-pass', fail: 'bg-status-fail', monitor: 'bg-status-monitor', normal: 'bg-muted-foreground/40',
  };
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
        subtitle={`${machine.assetId} • Report #INS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`}
        back="/"
        right={<StatusSummary {...counts} />}
      />

      <div className="px-5 py-4 space-y-3 pb-32">
        {/* Submitted banner */}
        <div className="flex items-center gap-3 bg-status-pass/6 border border-status-pass/12 rounded-lg p-4">
          <CheckCircle2 className="w-6 h-6 text-status-pass shrink-0" />
          <div>
            <p className="text-base font-bold text-status-pass">Inspection Submitted</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF generated • Synced to VisionLink</p>
          </div>
        </div>

        {/* AI Health Score Hero */}
        {isAnalyzing && (
          <div className="card-elevated p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-muted-foreground">AI analyzing inspection data...</p>
            <p className="text-xs text-muted-foreground/60">Generating insights, work orders, and parts recommendations</p>
          </div>
        )}

        {error && (
          <div className="card-elevated p-4 border-status-fail/15">
            <p className="text-sm text-status-fail font-semibold">Analysis failed: {error}</p>
            <button
              onClick={() => runAnalysis(sections, machine, routerState?.transcript, elapsed)}
              className="mt-2 text-sm text-primary font-semibold"
            >
              Retry Analysis
            </button>
          </div>
        )}

        {analysis && (
          <div className="card-elevated overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="relative">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--surface-2))" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={analysis.executiveSummary.status === 'READY' ? 'hsl(var(--status-pass))' : analysis.executiveSummary.status === 'CAUTION' ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-fail))'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(analysis.executiveSummary.healthScore / 100) * 213.6} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono">{analysis.executiveSummary.healthScore}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${statusColor[analysis.executiveSummary.status]}`}>
                    {analysis.executiveSummary.status}
                  </span>
                  {analysis.executiveSummary.status === 'READY' && <Shield className="w-4 h-4 text-status-pass" />}
                  {analysis.executiveSummary.status === 'CAUTION' && <ShieldAlert className="w-4 h-4 text-status-monitor" />}
                  {analysis.executiveSummary.status === 'DOWN' && <AlertTriangle className="w-4 h-4 text-status-fail" />}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.executiveSummary.summary}</p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono">{totalItems}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Fields</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono">
                  {elapsed ? `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}` : '—'}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Duration</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-fail">{failItems.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Fails</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-monitor">{monitorItems.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monitor</p>
              </div>
            </div>
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
                <div
                  key={zone.label}
                  className={`absolute w-4 h-4 rounded-full border-2 border-background ${dotColor[status] || 'bg-muted-foreground/40'}`}
                  style={{ top: zone.top, left: zone.left }}
                  title={`${zone.label} — ${status.toUpperCase()}`}
                />
              );
            })}
          </div>
        </div>

        {/* Tabbed content */}
        {analysis && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-10 bg-surface-2">
              <TabsTrigger value="summary" className="text-xs gap-1 data-[state=active]:text-primary">
                <Zap className="w-3 h-3" /> Actions
              </TabsTrigger>
              <TabsTrigger value="parts" className="text-xs gap-1 data-[state=active]:text-primary">
                <Package className="w-3 h-3" /> Parts
              </TabsTrigger>
              <TabsTrigger value="predict" className="text-xs gap-1 data-[state=active]:text-primary">
                <Brain className="w-3 h-3" /> Predict
              </TabsTrigger>
              <TabsTrigger value="coaching" className="text-xs gap-1 data-[state=active]:text-primary">
                <GraduationCap className="w-3 h-3" /> Coach
              </TabsTrigger>
            </TabsList>

            {/* ACTION ITEMS / WORK ORDERS */}
            <TabsContent value="summary" className="space-y-3 mt-3">
              {/* Root cause chain */}
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
                            <TrendingUp className="w-3 h-3" />
                            <span className="font-medium">Cascade risk:</span> {rca.cascadeRisk}
                          </p>
                        )}
                        {rca.relatedItems && rca.relatedItems.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Related: {rca.relatedItems.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work orders */}
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
                          {wo.procedure && (
                            <p className="text-[11px] text-foreground/60 mt-1.5 italic">{wo.procedure}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono">{wo.estimatedHours}h</p>
                          <p className={`text-[10px] mt-0.5 ${wo.canOperate ? 'text-status-pass' : 'text-status-fail font-semibold'}`}>
                            {wo.canOperate ? 'Can operate' : 'MUST STOP'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDealerService(wo.itemId, wo.title)}
                        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-primary active:opacity-70"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Request Dealer Service
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sensor correlation */}
              {sensorItems.length > 0 && (
                <div className="card-elevated p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-sensor" />
                    <h3 className="text-sm font-bold text-sensor">Sensor-Correlated</h3>
                  </div>
                  <div className="space-y-2">
                    {sensorItems.map(item => (
                      <div key={item.id} className="flex items-start gap-2.5 inset-surface p-3.5 rounded-lg">
                        <StatusBadge status={item.status} showLabel={false} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.comment}</p>
                          <p className="text-[10px] font-mono text-sensor mt-1">{item.faultCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PARTS & REPAIRS */}
            <TabsContent value="parts" className="space-y-3 mt-3">
              {analysis.partsRecommendations.length === 0 ? (
                <div className="card-elevated p-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-status-pass mx-auto mb-2" />
                  <p className="text-sm font-semibold text-status-pass">No parts needed</p>
                  <p className="text-xs text-muted-foreground mt-1">All components within service limits.</p>
                </div>
              ) : (
                <>
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold">Recommended Parts</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.partsRecommendations.map((part, i) => {
                        const partResult = partsResults.find(p => p.itemId === part.itemId);
                        return (
                          <div key={i} className="inset-surface rounded-lg p-3.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-mono text-[11px] text-muted-foreground">{part.itemId}</span>
                              <span className={`text-[10px] font-bold uppercase ${urgencyColor[part.urgency]}`}>{part.urgency}</span>
                            </div>
                            <p className="text-sm font-semibold">{part.itemLabel}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Type: <span className="text-foreground/70">{part.partType}</span>
                            </p>

                            {/* Firecrawl results */}
                            {isLoadingParts && !partResult && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Searching parts.cat.com...
                              </div>
                            )}

                            {partResult && partResult.results.length > 0 && (
                              <div className="mt-2.5 space-y-1.5">
                                {partResult.results.slice(0, 2).map((r, j) => (
                                  <a
                                    key={j}
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-primary truncate">{r.title}</p>
                                      {r.description && (
                                        <p className="text-[10px] text-muted-foreground truncate">{r.description}</p>
                                      )}
                                    </div>
                                    <ArrowUpRight className="w-3 h-3 text-primary shrink-0" />
                                  </a>
                                ))}
                              </div>
                            )}

                            <a
                              href={partResult?.directUrl || `https://parts.cat.com/en/catcorp/search?q=${encodeURIComponent(part.searchKeywords + ' CAT 320')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-1.5 text-xs text-primary font-semibold"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Search parts.cat.com
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total estimated labor */}
                  <div className="card-elevated p-4">
                    <h3 className="text-sm font-bold mb-2">Repair Estimate</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Labor</p>
                        <p className="text-xl font-bold font-mono">
                          {analysis.workOrders.reduce((acc, wo) => acc + wo.estimatedHours, 0)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Parts Needed</p>
                        <p className="text-xl font-bold font-mono">{analysis.partsRecommendations.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Immediate</p>
                        <p className="text-lg font-bold font-mono text-status-fail">
                          {analysis.partsRecommendations.filter(p => p.urgency === 'immediate').length}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Can Schedule</p>
                        <p className="text-lg font-bold font-mono text-status-pass">
                          {analysis.partsRecommendations.filter(p => p.urgency !== 'immediate').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* PREDICTIVE INSIGHTS */}
            <TabsContent value="predict" className="space-y-3 mt-3">
              {analysis.predictiveInsights.length === 0 ? (
                <div className="card-elevated p-6 text-center">
                  <Activity className="w-8 h-8 text-status-pass mx-auto mb-2" />
                  <p className="text-sm font-semibold">No predictive concerns</p>
                  <p className="text-xs text-muted-foreground mt-1">All monitored components are within safe thresholds.</p>
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
                            {insight.confidence} confidence
                          </span>
                        </div>
                        <p className="text-sm font-semibold">{insight.itemLabel}</p>
                        <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{insight.prediction}</p>
                        {insight.estimatedHoursToFailure && (
                          <div className="mt-2 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-status-monitor" />
                            <span className="text-xs text-status-monitor font-semibold">
                              ~{insight.estimatedHoursToFailure} SMU hours to potential failure
                            </span>
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

              {/* Pattern detection (static demo data enriched by AI) */}
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-status-monitor" />
                  <h3 className="text-sm font-bold">Historical Patterns</h3>
                </div>
                <div className="space-y-2">
                  <div className="bg-status-monitor/5 border border-status-monitor/10 rounded-lg p-3.5">
                    <p className="font-semibold text-status-monitor text-sm">Recurring: Radiator debris buildup</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Flagged in 3 of last 4 inspections. Correlates with hydraulic oil temperature fault code 168:0110-15. 
                      Consider implementing a pre-shift cleaning protocol.
                    </p>
                  </div>
                  <div className="bg-status-monitor/5 border border-status-monitor/10 rounded-lg p-3.5">
                    <p className="font-semibold text-status-monitor text-sm">Trending: Left front idler wear</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Progressing from PASS → MONITOR over last 2 inspections. At current wear rate, estimated FAIL in ~400 hours.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* INSPECTOR COACHING */}
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

              {/* Evidence summary */}
              <div className="card-elevated p-4">
                <h3 className="text-sm font-bold mb-2.5">Evidence Summary</h3>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <p>✓ {totalItems} inspection fields — 100% coverage</p>
                  <p>✓ {videoCount} video, {audioCount} audio, {sensorItems.length} sensor evidence</p>
                  {elapsed && <p>⚡ Duration: {Math.floor(elapsed / 60)}m {elapsed % 60}s</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent flex gap-2.5 safe-bottom">
        <button
          onClick={() => toast({ title: 'PDF downloaded', description: 'Full debrief report with AI analysis saved to device.' })}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all"
        >
          <FileText className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Fleet
        </button>
      </div>
    </div>
  );
}
