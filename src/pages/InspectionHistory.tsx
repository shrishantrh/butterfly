import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { mockMachines } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import {
  Clock, FileText, ChevronRight, Shield, ShieldAlert, AlertTriangle,
  Calendar, User, Gauge, Loader2, Image, Download,
} from 'lucide-react';

export default function InspectionHistory() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = machineId ? mockMachines.find(m => m.id === machineId) : null;
  const { getInspectionHistory } = useInspectionStorage();
  const [inspections, setInspections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getInspectionHistory(machineId);
      setInspections(data);
      setIsLoading(false);
    };
    load();
  }, [machineId, getInspectionHistory]);

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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={machine ? `${machine.assetId} History` : 'All Inspections'}
        subtitle={machine ? `${machine.model} • S/N ${machine.serial}` : 'Complete inspection archive'}
        back={machine ? `/pre-inspection/${machine.id}` : '/'}
      />

      <div className="px-5 py-4 space-y-3 pb-32">
        {/* Summary stats */}
        {inspections.length > 0 && (
          <div className="card-elevated overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-border/30">
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono">{inspections.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-pass">
                  {inspections.filter(i => i.status === 'READY').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ready</p>
              </div>
              <div className="bg-card p-3 text-center">
                <p className="text-lg font-bold font-mono text-status-fail">
                  {inspections.filter(i => i.status === 'DOWN').length}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Down</p>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="card-elevated p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading inspection history...</p>
          </div>
        )}

        {!isLoading && inspections.length === 0 && (
          <div className="card-elevated p-8 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No inspections yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Completed inspections will appear here.</p>
          </div>
        )}

        {inspections.map((insp) => {
          const analysis = insp.analysis_json as any;
          const safetyClearance = analysis?.executiveSummary?.safetyClearance;
          const immediateActions = analysis?.executiveSummary?.immediateActions || [];
          const clearanceConfig: Record<string, { label: string; desc: string; cls: string; bgCls: string; icon: React.ReactNode }> = {
            GO: { label: 'CLEAR TO OPERATE', desc: 'Machine passed inspection — safe for normal operation.', cls: 'text-status-pass', bgCls: 'bg-status-pass/8 border-status-pass/20', icon: <Shield className="w-5 h-5 text-status-pass" /> },
            CONDITIONAL: { label: 'CONDITIONAL USE', desc: 'Operable with restrictions — issues need attention.', cls: 'text-status-monitor', bgCls: 'bg-status-monitor/8 border-status-monitor/20', icon: <ShieldAlert className="w-5 h-5 text-status-monitor" /> },
            NO_GO: { label: 'DO NOT OPERATE', desc: 'Critical issues found — machine must be serviced first.', cls: 'text-status-fail', bgCls: 'bg-status-fail/8 border-status-fail/20', icon: <AlertTriangle className="w-5 h-5 text-status-fail" /> },
          };
          const clearance = safetyClearance ? clearanceConfig[safetyClearance] : null;

          return (
            <button
              key={insp.id}
              onClick={() => navigate(`/inspection-detail/${insp.id}`)}
              className="w-full card-elevated text-left active:scale-[0.99] transition-transform overflow-hidden"
            >
              {/* Safety clearance banner */}
              {clearance ? (
                <div className={`px-4 py-3 flex items-center gap-3 border-b ${clearance.bgCls}`}>
                  {clearance.icon}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-wider ${clearance.cls}`}>{clearance.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{clearance.desc}</p>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 flex items-center gap-3 border-b bg-muted/30 border-border/30">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">PENDING REVIEW</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Analysis not yet available.</p>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{insp.asset_id} • {insp.machine_model}</p>
                    {insp.executive_summary && (
                      <p className="text-xs text-foreground/60 mt-1.5 line-clamp-2 leading-relaxed">{insp.executive_summary}</p>
                    )}
                    {immediateActions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {immediateActions.slice(0, 2).map((action: string, i: number) => (
                          <p key={i} className="text-[11px] text-status-monitor flex items-start gap-1.5">
                            <span className="shrink-0 mt-0.5">⚠</span>
                            <span className="line-clamp-1">{action}</span>
                          </p>
                        ))}
                      </div>
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
                    <User className="w-3 h-3" />
                    {insp.inspector_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {insp.smu_hours?.toLocaleString()} hrs
                  </span>
                  {insp.health_score != null && (
                    <span className="flex items-center gap-1 font-mono">
                      {insp.health_score}/100
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
