import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Shield, ShieldAlert, AlertTriangle, Loader2, ChevronDown, ChevronUp,
  Image, X, Wrench, Brain, Target, Package, GraduationCap, CheckCircle2,
  Clock, TrendingUp, ExternalLink, ArrowUpRight, Zap, Activity, CircleDot,
  FileText, Download,
} from 'lucide-react';

export default function InspectionDetail() {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const { getInspectionDetail } = useInspectionStorage();
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('findings');

  useEffect(() => {
    const load = async () => {
      if (!inspectionId) return;
      setIsLoading(true);
      const data = await getInspectionDetail(inspectionId);
      if (data) {
        setDetail(data);
        // Expand all sections by default
        const sectionIds = new Set(data.items.map((i: any) => i.section_id));
        setExpandedSections(sectionIds);
      }
      setIsLoading(false);
    };
    load();
  }, [inspectionId, getInspectionDetail]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Inspection not found</p>
      </div>
    );
  }

  const { inspection: insp, items } = detail;
  const analysis = insp.analysis_json;

  // Group items by section
  const sections = items.reduce((acc: any, item: any) => {
    if (!acc[item.section_id]) {
      acc[item.section_id] = { id: item.section_id, title: item.section_title, items: [] };
    }
    acc[item.section_id].items.push(item);
    return acc;
  }, {} as Record<string, any>);
  const sectionList = Object.values(sections) as any[];

  const statusColor: Record<string, string> = {
    READY: 'text-status-pass',
    CAUTION: 'text-status-monitor',
    DOWN: 'text-status-fail',
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const failCount = items.filter((i: any) => i.status === 'fail').length;
  const monitorCount = items.filter((i: any) => i.status === 'monitor').length;
  const passCount = items.filter((i: any) => i.status === 'pass').length;
  const photoCount = items.filter((i: any) => i.photo_url).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Photo lightbox */}
      {viewingPhoto && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-lg w-full">
            <img src={viewingPhoto} alt="Evidence" className="w-full rounded-xl border border-border/30 shadow-2xl" />
            <button onClick={() => setViewingPhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
      )}

      <PageHeader
        title="Inspection Report"
        subtitle={`${insp.asset_id} • ${new Date(insp.created_at).toLocaleDateString()}`}
        back={`/history/${insp.machine_id}`}
      />

      <div className="px-5 py-4 space-y-3 pb-32">
        {/* Health Score Hero */}
        {insp.health_score != null && (
          <div className="card-elevated overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              <div className="relative">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--surface-2))" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="34" fill="none"
                    stroke={insp.status === 'READY' ? 'hsl(var(--status-pass))' : insp.status === 'CAUTION' ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-fail))'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(insp.health_score / 100) * 213.6} 213.6`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold font-mono">{insp.health_score}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${statusColor[insp.status] || 'text-foreground'}`}>
                    {insp.status || 'ANALYZED'}
                  </span>
                  {insp.status === 'READY' && <Shield className="w-4 h-4 text-status-pass" />}
                  {insp.status === 'CAUTION' && <ShieldAlert className="w-4 h-4 text-status-monitor" />}
                  {insp.status === 'DOWN' && <AlertTriangle className="w-4 h-4 text-status-fail" />}
                </div>
                {insp.executive_summary && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{insp.executive_summary}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono">{items.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Fields</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-pass">{passCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pass</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-monitor">{monitorCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monitor</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-fail">{failCount}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Fail</p>
              </div>
            </div>
          </div>
        )}

        {/* Machine & Inspector Info */}
        <div className="card-elevated p-4">
          <p className="label-caps mb-3">Inspection Details</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Model</p><p className="font-medium">{insp.machine_model}</p></div>
            <div><p className="text-xs text-muted-foreground">Serial</p><p className="font-mono font-medium">{insp.machine_serial}</p></div>
            <div><p className="text-xs text-muted-foreground">Inspector</p><p className="font-medium">{insp.inspector_name}</p></div>
            <div><p className="text-xs text-muted-foreground">SMU Hours</p><p className="font-mono font-medium">{insp.smu_hours?.toLocaleString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Date</p><p className="font-mono font-medium">{new Date(insp.created_at).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-muted-foreground">Duration</p><p className="font-mono font-medium">{insp.duration_seconds ? `${Math.floor(insp.duration_seconds / 60)}m ${insp.duration_seconds % 60}s` : '—'}</p></div>
            {insp.location && (
              <div className="col-span-2"><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{insp.location}</p></div>
            )}
          </div>
          {photoCount > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
              <Image className="w-3.5 h-3.5" />
              <span className="font-semibold">{photoCount} evidence photo{photoCount !== 1 ? 's' : ''} captured</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-10 bg-surface-2">
            <TabsTrigger value="findings" className="text-xs gap-1 data-[state=active]:text-primary">
              <FileText className="w-3 h-3" /> Findings
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs gap-1 data-[state=active]:text-primary">
              <Brain className="w-3 h-3" /> Analysis
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs gap-1 data-[state=active]:text-primary">
              <Image className="w-3 h-3" /> Photos
            </TabsTrigger>
          </TabsList>

          {/* FINDINGS */}
          <TabsContent value="findings" className="space-y-2 mt-3">
            {sectionList.map((section: any) => (
              <div key={section.id} className="card-elevated overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between touch-target"
                >
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{section.items.length} items</span>
                    {expandedSections.has(section.id)
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                    }
                  </div>
                </button>
                {expandedSections.has(section.id) && (
                  <div>
                    {section.items.map((item: any, idx: number) => (
                      <div key={item.id} className={`px-4 py-3 ${idx > 0 ? 'border-t border-border/20' : 'border-t border-border/20'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0 w-7 pt-0.5">{item.item_id}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{item.label}</p>
                              {item.comment && <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">{item.comment}</p>}
                              {item.annotation && <p className="text-[10px] text-sensor mt-1 italic">🔍 {item.annotation}</p>}
                              {item.fault_code && <p className="text-[10px] font-mono text-sensor mt-1">{item.fault_code}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.photo_url && (
                              <button onClick={() => setViewingPhoto(item.photo_url)} className="p-0.5">
                                <Image className="w-3.5 h-3.5 text-primary" />
                              </button>
                            )}
                            <StatusBadge status={item.status} showLabel={false} className="scale-90" />
                          </div>
                        </div>
                        {item.photo_url && (
                          <div className="mt-2 ml-9 rounded-lg overflow-hidden border border-border/20 max-w-[200px] cursor-pointer" onClick={() => setViewingPhoto(item.photo_url)}>
                            <img src={item.photo_url} alt="Evidence" className="w-full h-16 object-cover" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* ANALYSIS */}
          <TabsContent value="analysis" className="space-y-3 mt-3">
            {!analysis ? (
              <div className="card-elevated p-6 text-center">
                <Brain className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No AI analysis available for this inspection.</p>
              </div>
            ) : (
              <>
                {/* Root Cause Analysis */}
                {analysis.rootCauseAnalysis?.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-bold">Root Cause Analysis</h3>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.rootCauseAnalysis.map((rca: any, i: number) => (
                        <div key={i} className="inset-surface p-3.5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[11px] text-muted-foreground">{rca.itemId}</span>
                            <span className="text-sm font-semibold">{rca.itemLabel}</span>
                          </div>
                          <p className="text-xs text-foreground/80 leading-relaxed">{rca.rootCause}</p>
                          {rca.cascadeRisk && (
                            <p className="text-[11px] text-status-monitor mt-1.5 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              <span className="font-medium">Cascade:</span> {rca.cascadeRisk}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Work Orders */}
                {analysis.workOrders?.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold">Work Orders</h3>
                    </div>
                    <div className="space-y-2">
                      {analysis.workOrders.map((wo: any, i: number) => (
                        <div key={i} className="inset-surface p-3.5 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">{wo.priority}</span>
                            <span className="text-sm font-semibold">{wo.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{wo.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span className="font-mono font-bold">{wo.estimatedHours}h labor</span>
                            <span className={wo.canOperate ? 'text-status-pass' : 'text-status-fail font-semibold'}>
                              {wo.canOperate ? 'Can operate' : 'MUST STOP'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Predictive Insights */}
                {analysis.predictiveInsights?.length > 0 && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-accent" />
                      <h3 className="text-sm font-bold">Predictive Insights</h3>
                    </div>
                    <div className="space-y-2.5">
                      {analysis.predictiveInsights.map((insight: any, i: number) => (
                        <div key={i} className="inset-surface p-3.5 rounded-lg">
                          <p className="text-sm font-semibold">{insight.itemLabel}</p>
                          <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{insight.prediction}</p>
                          {insight.estimatedHoursToFailure && (
                            <p className="text-xs text-status-monitor mt-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              ~{insight.estimatedHoursToFailure} SMU hrs to failure
                            </p>
                          )}
                          <p className="text-[11px] text-primary mt-1.5 font-medium">{insight.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspector Coaching */}
                {analysis.inspectorCoaching && (
                  <div className="card-elevated p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">{analysis.inspectorCoaching.overallGrade}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">Inspector Performance</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={analysis.inspectorCoaching.coverageScore} className="h-2 w-24" />
                          <span className="text-xs font-mono font-semibold">{analysis.inspectorCoaching.coverageScore}%</span>
                        </div>
                      </div>
                    </div>
                    {analysis.inspectorCoaching.strengths?.length > 0 && (
                      <div className="mb-2">
                        <p className="label-caps mb-1 text-status-pass">Strengths</p>
                        {analysis.inspectorCoaching.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 mb-1">
                            <CheckCircle2 className="w-3 h-3 text-status-pass shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/80">{s}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {analysis.inspectorCoaching.improvements?.length > 0 && (
                      <div>
                        <p className="label-caps mb-1 text-status-monitor">Improve</p>
                        {analysis.inspectorCoaching.improvements.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 mb-1">
                            <CircleDot className="w-3 h-3 text-status-monitor shrink-0 mt-0.5" />
                            <p className="text-xs text-foreground/80">{s}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* PHOTOS */}
          <TabsContent value="photos" className="space-y-3 mt-3">
            {items.filter((i: any) => i.photo_url).length === 0 ? (
              <div className="card-elevated p-6 text-center">
                <Image className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No evidence photos captured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {items.filter((i: any) => i.photo_url).map((item: any) => (
                  <div key={item.id} className="card-elevated overflow-hidden cursor-pointer" onClick={() => setViewingPhoto(item.photo_url)}>
                    <img src={item.photo_url} alt={item.label} className="w-full h-28 object-cover" />
                    <div className="p-2">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={item.status} showLabel={false} className="scale-75" />
                        <p className="text-[10px] font-semibold truncate">{item.item_id} {item.label}</p>
                      </div>
                      {item.annotation && (
                        <p className="text-[9px] text-sensor mt-0.5 truncate">🔍 {item.annotation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
