import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import {
  AlertTriangle, Cpu, HardHat, History, Shield, ShieldAlert,
  Activity, Package, TrendingUp, FileText, ChevronRight, Clock,
  Gauge, Calendar, Wrench, ShoppingCart, BarChart3, Loader2,
  Search, QrCode,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Index = () => {
  const navigate = useNavigate();
  const { getInspectionHistory } = useInspectionStorage();
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);
  const totalMonitors = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.monitor ?? 0), 0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getInspectionHistory();
      setRecentInspections(data);
      setIsLoading(false);
    };
    load();
  }, [getInspectionHistory]);

  // Derive aggregated data from inspections
  const completedInspections = recentInspections.filter(i => i.status);
  const activeOrders = recentInspections
    .filter(i => i.analysis_json)
    .flatMap(i => {
      const analysis = i.analysis_json as any;
      return (analysis?.partsRecommendations || []).map((p: any) => ({
        ...p,
        inspectionId: i.id,
        machineModel: i.machine_model,
        assetId: i.asset_id,
        date: i.created_at,
      }));
    });

  const predictions = recentInspections
    .filter(i => i.analysis_json)
    .flatMap(i => {
      const analysis = i.analysis_json as any;
      return (analysis?.predictiveInsights || []).map((p: any) => ({
        ...p,
        inspectionId: i.id,
        machineModel: i.machine_model,
        assetId: i.asset_id,
      }));
    });

  const workOrders = recentInspections
    .filter(i => i.analysis_json)
    .flatMap(i => {
      const analysis = i.analysis_json as any;
      return (analysis?.workOrders || []).map((w: any) => ({
        ...w,
        inspectionId: i.id,
        machineModel: i.machine_model,
        assetId: i.asset_id,
        date: i.created_at,
      }));
    });

  const statusIcon: Record<string, React.ReactNode> = {
    READY: <Shield className="w-4 h-4 text-status-pass" />,
    CAUTION: <ShieldAlert className="w-4 h-4 text-status-monitor" />,
    DOWN: <AlertTriangle className="w-4 h-4 text-status-fail" />,
  };

  const statusColor: Record<string, string> = {
    READY: 'text-status-pass',
    CAUTION: 'text-status-monitor',
    DOWN: 'text-status-fail',
  };

  const priorityColor: Record<string, string> = {
    CRITICAL: 'bg-status-fail/12 text-status-fail border-status-fail/20',
    HIGH: 'bg-accent/12 text-accent border-accent/20',
    MEDIUM: 'bg-status-monitor/12 text-status-monitor border-status-monitor/20',
    LOW: 'bg-muted/50 text-muted-foreground border-border/40',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-4 border-b border-border/40 bg-background/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">InspectAI</h1>
              <p className="label-caps mt-0.5">Fleet Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/history')}
              className="w-9 h-9 rounded-full bg-surface-2 border border-border/50 flex items-center justify-center active:scale-95 transition-transform"
              title="Inspection History"
            >
              <History className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="w-9 h-9 rounded-full bg-surface-2 border border-border/50 flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">MC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Greeting + Quick Stats */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-sm text-muted-foreground">{greeting}, Marcus</p>
        <h2 className="text-xl font-bold mt-0.5 text-foreground">Fleet Command</h2>
      </div>

      {/* Fleet Health Overview */}
      <div className="px-5 pb-3">
        <div className="card-elevated overflow-hidden">
          <div className="grid grid-cols-4 gap-px bg-border/30">
            <div className="bg-card p-3 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{mockMachines.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Fleet</p>
            </div>
            <div className="bg-card p-3 text-center">
              <p className="text-xl font-bold font-mono text-status-fail">{totalFaults}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Faults</p>
            </div>
            <div className="bg-card p-3 text-center">
              <p className="text-xl font-bold font-mono text-status-monitor">{totalMonitors}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Monitor</p>
            </div>
            <div className="bg-card p-3 text-center">
              <p className="text-xl font-bold font-mono text-status-pass">
                {completedInspections.filter(i => i.status === 'READY').length}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Dashboard */}
      <Tabs defaultValue="fleet" className="px-5 pb-32">
        <TabsList className="w-full bg-surface-2/80 border border-border/40 h-11 p-1 rounded-xl mb-4">
          <TabsTrigger value="fleet" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Fleet
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="predict" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Predict
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* ───── FLEET TAB ───── */}
        <TabsContent value="fleet" className="space-y-3 mt-0">
          {/* Active alerts banner */}
          {(totalFaults > 0 || totalFails > 0) && (
            <div className="flex items-center gap-3 bg-status-fail/6 border border-status-fail/15 rounded-xl p-3.5">
              <AlertTriangle className="w-5 h-5 text-status-fail shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-status-fail">Attention Required</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalFaults} active fault{totalFaults !== 1 ? 's' : ''} • {totalFails} failed item{totalFails !== 1 ? 's' : ''} across fleet
                </p>
              </div>
            </div>
          )}

          {/* Critical work orders */}
          {workOrders.filter(w => w.priority === 'CRITICAL').length > 0 && (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-status-fail" />
                <h3 className="text-sm font-bold text-foreground">Critical Work Orders</h3>
                <span className="ml-auto text-xs font-mono bg-status-fail/10 text-status-fail px-2 py-0.5 rounded-md border border-status-fail/15">
                  {workOrders.filter(w => w.priority === 'CRITICAL').length}
                </span>
              </div>
              <div className="space-y-2">
                {workOrders.filter(w => w.priority === 'CRITICAL').slice(0, 3).map((wo, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/inspection-detail/${wo.inspectionId}`)}
                    className="w-full text-left inset-surface rounded-lg p-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{wo.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{wo.assetId}</p>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border shrink-0 ${priorityColor.CRITICAL}`}>
                        Critical
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="label-caps pt-1">Select machine to inspect</p>
          {mockMachines.map((machine, i) => (
            <div key={machine.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <MachineCard machine={machine} />
            </div>
          ))}
        </TabsContent>

        {/* ───── ORDERS TAB ───── */}
        <TabsContent value="orders" className="space-y-3 mt-0">
          <div className="card-elevated overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-foreground">{activeOrders.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Total Parts</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-fail">
                  {activeOrders.filter(o => o.urgency === 'immediate').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Immediate</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-monitor">
                  {activeOrders.filter(o => o.urgency === 'soon').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Soon</p>
              </div>
            </div>
          </div>

          {activeOrders.length === 0 && !isLoading && (
            <div className="card-elevated p-8 text-center">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No parts orders yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Complete an inspection to generate parts recommendations.</p>
            </div>
          )}

          {isLoading && (
            <div className="card-elevated p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading orders data...</p>
            </div>
          )}

          {['immediate', 'soon', 'scheduled'].map(urgency => {
            const items = activeOrders.filter(o => o.urgency === urgency);
            if (items.length === 0) return null;
            const urgencyConfig: Record<string, { label: string; cls: string }> = {
              immediate: { label: 'Order Now', cls: 'text-status-fail' },
              soon: { label: 'Order Soon', cls: 'text-status-monitor' },
              scheduled: { label: 'Scheduled', cls: 'text-muted-foreground' },
            };
            const cfg = urgencyConfig[urgency];
            return (
              <div key={urgency} className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className={`w-4 h-4 ${cfg.cls}`} />
                  <h3 className={`text-sm font-bold ${cfg.cls}`}>{cfg.label}</h3>
                  <span className="ml-auto text-xs font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((order, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/inspection-detail/${order.inspectionId}`)}
                      className="w-full text-left inset-surface rounded-lg p-3 active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{order.partType}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{order.assetId}</p>
                          {order.catPartNumber && (
                            <p className="text-xs text-sensor font-mono mt-1">CAT# {order.catPartNumber}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {order.estimatedPartCost && (
                            <p className="text-sm font-bold font-mono text-foreground">
                              ${order.estimatedPartCost.toLocaleString()}
                            </p>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto mt-1" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ───── PREDICT TAB ───── */}
        <TabsContent value="predict" className="space-y-3 mt-0">
          <div className="card-elevated overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-foreground">{predictions.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Predictions</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-fail">
                  {predictions.filter(p => p.confidence === 'high').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">High Risk</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-monitor">
                  {predictions.filter(p => p.confidence === 'medium').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Medium</p>
              </div>
            </div>
          </div>

          {predictions.length === 0 && !isLoading && (
            <div className="card-elevated p-8 text-center">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No predictions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Complete an inspection to generate failure predictions.</p>
            </div>
          )}

          {isLoading && (
            <div className="card-elevated p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading predictions...</p>
            </div>
          )}

          {['high', 'medium', 'low'].map(confidence => {
            const items = predictions.filter(p => p.confidence === confidence);
            if (items.length === 0) return null;
            const confConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
              high: { label: 'High Confidence', cls: 'text-status-fail', icon: <AlertTriangle className="w-4 h-4 text-status-fail" /> },
              medium: { label: 'Medium Confidence', cls: 'text-status-monitor', icon: <BarChart3 className="w-4 h-4 text-status-monitor" /> },
              low: { label: 'Low Confidence', cls: 'text-muted-foreground', icon: <TrendingUp className="w-4 h-4 text-muted-foreground" /> },
            };
            const cfg = confConfig[confidence];
            return (
              <div key={confidence} className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-3">
                  {cfg.icon}
                  <h3 className={`text-sm font-bold ${cfg.cls}`}>{cfg.label}</h3>
                </div>
                <div className="space-y-2">
                  {items.map((pred, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/inspection-detail/${pred.inspectionId}`)}
                      className="w-full text-left inset-surface rounded-lg p-3 active:scale-[0.99] transition-transform"
                    >
                      <p className="text-sm font-semibold text-foreground">{pred.itemLabel}</p>
                      <p className="text-xs text-muted-foreground mt-1">{pred.prediction}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-mono text-muted-foreground">{pred.assetId}</span>
                        {pred.estimatedHoursToFailure && (
                          <span className="text-xs font-mono text-status-monitor">
                            ~{pred.estimatedHoursToFailure}h remaining
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ───── REPORTS TAB ───── */}
        <TabsContent value="reports" className="space-y-3 mt-0">
          <div className="card-elevated overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-foreground">{completedInspections.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Reports</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-pass">
                  {completedInspections.filter(i => i.status === 'READY').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Ready</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-xl font-bold font-mono text-status-fail">
                  {completedInspections.filter(i => i.status === 'DOWN').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Down</p>
              </div>
            </div>
          </div>

          {completedInspections.length === 0 && !isLoading && (
            <div className="card-elevated p-8 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No inspection reports yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Completed inspections will appear here.</p>
            </div>
          )}

          {isLoading && (
            <div className="card-elevated p-8 flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            </div>
          )}

          {completedInspections.map((insp) => (
            <button
              key={insp.id}
              onClick={() => navigate(`/inspection-detail/${insp.id}`)}
              className="w-full card-elevated p-4 text-left active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {insp.status && statusIcon[insp.status]}
                    <span className={`text-sm font-bold ${insp.status ? statusColor[insp.status] : 'text-foreground'}`}>
                      {insp.status || 'Pending'}
                    </span>
                    {insp.health_score != null && (
                      <span className="text-xs font-mono text-muted-foreground bg-surface-2 px-1.5 py-0.5 rounded">
                        {insp.health_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {insp.asset_id} • {insp.machine_model}
                  </p>
                  {insp.executive_summary && (
                    <p className="text-xs text-foreground/60 mt-1.5 line-clamp-2 leading-relaxed">{insp.executive_summary}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-1" />
              </div>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(insp.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {insp.smu_hours?.toLocaleString()} hrs
                </span>
                {insp.duration_seconds && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(insp.duration_seconds / 60)}m
                  </span>
                )}
              </div>
            </button>
          ))}

          {completedInspections.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="w-full card-elevated p-3.5 text-center text-sm font-semibold text-primary active:scale-[0.99] transition-transform"
            >
              View All Inspection History →
            </button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
