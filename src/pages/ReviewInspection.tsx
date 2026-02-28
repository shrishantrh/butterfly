import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, StatusSummary } from '@/components/StatusBadge';
import { Video, Mic2, Cpu, Send, PenLine } from 'lucide-react';

export default function ReviewInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);
  const counts = getStatusCounts(completedInspection);

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Review Inspection"
        subtitle={`${machine.assetId} • ${machine.serial}`}
        back={`/inspect/${machine.id}`}
        right={<StatusSummary {...counts} />}
      />

      <div className="px-4 py-4 space-y-4 pb-28">
        {/* General info */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">General Information</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Inspector</p>
              <p className="font-semibold">Marcus Chen</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-mono font-semibold">2026-02-28</p>
            </div>
            <div>
              <p className="text-muted-foreground">SMU Hours</p>
              <p className="font-mono font-semibold">{machine.smuHours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Form Type</p>
              <p className="font-semibold">Wheel Loader: Safety & Maintenance</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {completedInspection.map((section, si) => (
          <div key={section.id} className="glass-surface rounded-lg overflow-hidden animate-slide-up" style={{ animationDelay: `${(si + 1) * 0.05}s` }}>
            <div className="px-4 py-3 bg-surface-2 border-b border-border">
              <h3 className="text-sm font-bold">{section.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{item.id}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{item.label}</span>
                    </div>
                    <StatusBadge status={item.status} className="shrink-0" />
                  </div>
                  {item.comment && (
                    <p className="text-xs text-muted-foreground mt-1 pl-8">{item.comment}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 pl-8">
                    {item.evidence?.includes('video') && <Video className="w-3 h-3 text-primary" />}
                    {item.evidence?.includes('audio') && <Mic2 className="w-3 h-3 text-status-monitor" />}
                    {item.evidence?.includes('sensor') && (
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-sensor" />
                        {item.faultCode && <span className="text-[10px] font-mono text-sensor">{item.faultCode}</span>}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm">
          <PenLine className="w-4 h-4" />
          Sign & Edit
        </button>
        <button
          onClick={() => navigate(`/debrief/${machineId}`)}
          className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-sm glow-primary hover:brightness-110 transition-all"
        >
          <Send className="w-4 h-4" />
          Submit Report
        </button>
      </div>
    </div>
  );
}
