import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockMachines, inspectionFormSections, completedInspection, getStatusCounts, InspectionSection, InspectionItem } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, StatusSummary } from '@/components/StatusBadge';
import { Video, Mic2, Cpu, Send, PenLine, AlertCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

interface AIResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
}

export default function ReviewInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const machine = mockMachines.find(m => m.id === machineId);

  // Get AI-analyzed data from router state, or fall back to completed mock
  const routerState = location.state as { analyzedItems?: Record<string, AIResult>; transcript?: string; elapsed?: number } | null;

  const sections: InspectionSection[] = useMemo(() => {
    if (!routerState?.analyzedItems || Object.keys(routerState.analyzedItems).length === 0) {
      return completedInspection;
    }

    const ai = routerState.analyzedItems;
    return inspectionFormSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        const result = ai[item.id];
        if (result) {
          return {
            ...item,
            status: result.status,
            comment: result.comment,
            evidence: result.evidence,
            faultCode: result.faultCode,
          };
        }
        return item; // unconfirmed
      }),
    }));
  }, [routerState]);

  const counts = getStatusCounts(sections);
  const unconfirmedCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === 'unconfirmed').length, 0);
  const hasUnconfirmed = unconfirmedCount > 0;

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Review Inspection"
        subtitle={`${machine.assetId} • S/N ${machine.serial}`}
        back={`/inspect/${machine.id}`}
        right={<StatusSummary {...counts} />}
      />

      <div className="px-4 py-4 space-y-3 pb-28">
        {/* General info */}
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 font-mono">General Information</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground text-[10px]">Inspector</p>
              <p className="font-semibold">Marcus Chen</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Date</p>
              <p className="font-mono font-semibold">{new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">SMU Hours</p>
              <p className="font-mono font-semibold">{machine.smuHours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px]">Duration</p>
              <p className="font-mono font-semibold">
                {routerState?.elapsed ? `${Math.floor(routerState.elapsed / 60)}m ${routerState.elapsed % 60}s` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Unconfirmed warning */}
        {hasUnconfirmed && (
          <div className="flex items-center gap-2 bg-status-monitor/10 border border-status-monitor/20 rounded p-3">
            <AlertCircle className="w-4 h-4 text-status-monitor shrink-0" />
            <p className="text-xs text-status-monitor">
              <span className="font-semibold">{unconfirmedCount} field{unconfirmedCount !== 1 ? 's' : ''} unconfirmed.</span> Add a quick voice note or tap to resolve.
            </p>
          </div>
        )}

        {/* Sections */}
        {sections.map((section, si) => (
          <div key={section.id} className="bg-card border border-border rounded overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-2 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-bold">{section.title}</h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {section.items.filter(i => i.status !== 'unconfirmed').length}/{section.items.length}
              </span>
            </div>
            <div className="divide-y divide-border">
              {section.items.map((item) => (
                <div key={item.id} className={`px-4 py-2.5 ${item.status === 'unconfirmed' ? 'bg-surface-2/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-6">{item.id}</span>
                      <span className="text-[11px] font-medium text-foreground">{item.label}</span>
                    </div>
                    <StatusBadge status={item.status} className="shrink-0" />
                  </div>
                  {item.comment && (
                    <p className="text-[10px] text-muted-foreground mt-1 pl-8 leading-relaxed">{item.comment}</p>
                  )}
                  {item.evidence && item.evidence.length > 0 && (
                    <div className="flex items-center gap-2 mt-1 pl-8">
                      {item.evidence.includes('video') && <Video className="w-2.5 h-2.5 text-primary" />}
                      {item.evidence.includes('audio') && <Mic2 className="w-2.5 h-2.5 text-status-monitor" />}
                      {item.evidence.includes('sensor') && (
                        <span className="flex items-center gap-0.5">
                          <Cpu className="w-2.5 h-2.5 text-sensor" />
                          {item.faultCode && <span className="text-[9px] font-mono text-sensor">{item.faultCode}</span>}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded bg-secondary text-secondary-foreground font-semibold text-xs border border-border">
          <PenLine className="w-3.5 h-3.5" />
          Sign & Edit
        </button>
        <button
          onClick={() => navigate(`/debrief/${machineId}`, {
            state: { sections, transcript: routerState?.transcript, elapsed: routerState?.elapsed },
          })}
          disabled={hasUnconfirmed}
          className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded bg-primary text-primary-foreground font-bold text-xs glow-primary hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-3.5 h-3.5" />
          Submit Report
        </button>
      </div>
    </div>
  );
}
