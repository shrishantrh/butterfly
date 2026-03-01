import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import {
  AlertTriangle, HardHat, History,
  Activity, Package, TrendingUp, FileText, ChevronRight, Clock,
  Gauge, Calendar, Wrench, Loader2,
  Search,
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
  const [searchQuery, setSearchQuery] = useState('');

  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getInspectionHistory();
      setRecentInspections(data);
      setIsLoading(false);
    };
    load();
  }, [getInspectionHistory]);

  const filteredMachines = mockMachines.filter(m =>
    !searchQuery ||
    m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      }));
    });

  const predictions = recentInspections
    .filter(i => i.analysis_json)
    .flatMap(i => {
      const analysis = i.analysis_json as any;
      return (analysis?.predictiveInsights || []).map((p: any) => ({
        ...p,
        inspectionId: i.id,
        assetId: i.asset_id,
      }));
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-4 bg-background/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">InspectAI</h1>
              <p className="text-[11px] text-muted-foreground">Fleet Command Center</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center"
          >
            <History className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search machines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-2 border border-border/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 transition-all"
          />
        </div>
      </header>

      {/* Quick stats */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="card-elevated p-3 text-center">
            <p className="text-xl font-bold font-mono">{mockMachines.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Fleet</p>
          </div>
          <div className="card-elevated p-3 text-center">
            <p className="text-xl font-bold font-mono text-status-fail">{totalFaults}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Faults</p>
          </div>
          <div className="card-elevated p-3 text-center">
            <p className="text-xl font-bold font-mono text-status-pass">{completedInspections.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">Reports</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fleet" className="px-5 pb-24">
        <TabsList className="w-full bg-surface-2/60 border border-border/20 h-10 p-1 rounded-xl mb-4">
          <TabsTrigger value="fleet" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 h-full">
            <Activity className="w-3 h-3" />
            Fleet
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 h-full">
            <Package className="w-3 h-3" />
            Parts
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 rounded-lg text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1 h-full">
            <FileText className="w-3 h-3" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Fleet */}
        <TabsContent value="fleet" className="space-y-3 mt-0">
          {totalFaults > 0 && (
            <div className="flex items-center gap-2.5 bg-status-fail/6 border border-status-fail/12 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-status-fail shrink-0" />
              <p className="text-xs text-status-fail">
                <span className="font-bold">{totalFaults} active fault{totalFaults !== 1 ? 's' : ''}</span> · {totalFails} failed items
              </p>
            </div>
          )}

          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {filteredMachines.length} Machine{filteredMachines.length !== 1 ? 's' : ''}
          </p>

          {filteredMachines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}

          {filteredMachines.length === 0 && searchQuery && (
            <div className="card-elevated p-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No machines found</p>
            </div>
          )}
        </TabsContent>

        {/* Parts */}
        <TabsContent value="orders" className="space-y-3 mt-0">
          {activeOrders.length === 0 && !isLoading && (
            <div className="card-elevated p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No parts orders</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Complete an inspection to generate recommendations.</p>
            </div>
          )}

          {isLoading && (
            <div className="card-elevated p-8 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          )}

          {['immediate', 'soon', 'scheduled'].map(urgency => {
            const items = activeOrders.filter(o => o.urgency === urgency);
            if (items.length === 0) return null;
            const cfg: Record<string, { label: string; cls: string }> = {
              immediate: { label: 'Order Now', cls: 'text-status-fail' },
              soon: { label: 'Order Soon', cls: 'text-status-monitor' },
              scheduled: { label: 'Scheduled', cls: 'text-muted-foreground' },
            };
            return (
              <div key={urgency} className="card-elevated p-4">
                <h3 className={`text-sm font-bold ${cfg[urgency].cls} mb-3`}>{cfg[urgency].label}</h3>
                <div className="space-y-2">
                  {items.map((order, i) => (
                    <button key={i} onClick={() => navigate(`/inspection-detail/${order.inspectionId}`)}
                      className="w-full text-left inset-surface p-3 active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{order.partType}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.assetId}</p>
                        </div>
                        {order.estimatedPartCost && (
                          <span className="text-sm font-bold font-mono">${order.estimatedPartCost.toLocaleString()}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-3 mt-0">
          {completedInspections.length === 0 && !isLoading && (
            <div className="card-elevated p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No reports yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Completed inspections appear here.</p>
            </div>
          )}

          {isLoading && (
            <div className="card-elevated p-8 flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          )}

          {completedInspections.map((insp) => (
            <button
              key={insp.id}
              onClick={() => navigate(`/inspection-detail/${insp.id}`)}
              className="w-full card-elevated p-4 text-left active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{insp.status || 'Pending'}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{insp.asset_id} · {insp.machine_model}</p>
                  {insp.executive_summary && (
                    <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{insp.executive_summary}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/20 shrink-0" />
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(insp.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {insp.smu_hours?.toLocaleString()}h
                </span>
                {insp.health_score != null && (
                  <span className="font-mono font-semibold">{insp.health_score}/100</span>
                )}
              </div>
            </button>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
