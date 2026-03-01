import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { mockMachines } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import {
  Clock, FileText, ChevronRight, Shield, ShieldAlert, AlertTriangle,
  Calendar, User, Gauge, Loader2,
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={machine ? `${machine.assetId} History` : 'All Inspections'}
        subtitle={machine ? `${machine.model} · S/N ${machine.serial}` : 'Complete inspection archive'}
        back={machine ? `/pre-inspection/${machine.id}` : '/'}
      />

      <div className="pb-32">
        {/* Summary stats */}
        {inspections.length > 0 && (
          <>
            <div className="ios-section-header mt-2">Summary</div>
            <div className="mx-5 ios-card">
              <div className="grid grid-cols-3">
                <div className="py-3.5 text-center" style={{ borderRight: '0.33px solid hsl(var(--border) / 0.3)' }}>
                  <p className="text-[22px] font-bold font-mono text-foreground">{inspections.length}</p>
                  <p className="ios-caption text-muted-foreground">Total</p>
                </div>
                <div className="py-3.5 text-center" style={{ borderRight: '0.33px solid hsl(var(--border) / 0.3)' }}>
                  <p className="text-[22px] font-bold font-mono text-status-pass">{inspections.filter(i => i.status === 'READY').length}</p>
                  <p className="ios-caption text-muted-foreground">Ready</p>
                </div>
                <div className="py-3.5 text-center">
                  <p className="text-[22px] font-bold font-mono text-status-fail">{inspections.filter(i => i.status === 'DOWN').length}</p>
                  <p className="ios-caption text-muted-foreground">Down</p>
                </div>
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <div className="mx-5 mt-4 ios-card p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="ios-subhead text-muted-foreground">Loading inspection history...</p>
          </div>
        )}

        {!isLoading && inspections.length === 0 && (
          <div className="mx-5 mt-4 ios-card p-8 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="ios-body font-semibold text-muted-foreground">No inspections yet</p>
            <p className="ios-caption text-muted-foreground mt-1">Completed inspections will appear here.</p>
          </div>
        )}

        {inspections.length > 0 && (
          <>
            <div className="ios-section-header mt-6">Inspections</div>
            <div className="mx-5 ios-card">
              {inspections.map((insp, i) => {
                const analysis = insp.analysis_json as any;
                const safetyClearance = analysis?.executiveSummary?.safetyClearance;
                const clearanceConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                  GO: { label: 'Clear', cls: 'text-status-pass', icon: <Shield className="w-4 h-4 text-status-pass" /> },
                  CONDITIONAL: { label: 'Conditional', cls: 'text-status-monitor', icon: <ShieldAlert className="w-4 h-4 text-status-monitor" /> },
                  NO_GO: { label: 'Do Not Operate', cls: 'text-status-fail', icon: <AlertTriangle className="w-4 h-4 text-status-fail" /> },
                };
                const clearance = safetyClearance ? clearanceConfig[safetyClearance] : null;

                return (
                  <button
                    key={insp.id}
                    onClick={() => navigate(`/inspection-detail/${insp.id}`)}
                    className="w-full text-left px-4 py-4 active:bg-foreground/[0.03] transition-colors"
                    style={i < inspections.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {clearance && clearance.icon}
                          <p className="ios-body font-medium text-foreground truncate">{insp.asset_id} · {insp.machine_model}</p>
                        </div>
                        {insp.executive_summary && (
                          <p className="ios-subhead text-muted-foreground line-clamp-2 mt-0.5">{insp.executive_summary}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 ios-caption text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(insp.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {insp.inspector_name}
                          </span>
                          {insp.health_score != null && (
                            <span className="font-mono font-semibold">{insp.health_score}/100</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40 shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
