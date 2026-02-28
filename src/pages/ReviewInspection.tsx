import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockMachines, inspectionFormSections, completedInspection, getStatusCounts, InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, StatusSummary } from '@/components/StatusBadge';
import { Video, Mic2, Cpu, Send, PenLine, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const routerState = location.state as { analyzedItems?: Record<string, AIResult>; transcript?: string; elapsed?: number } | null;

  const initialSections: InspectionSection[] = useMemo(() => {
    if (!routerState?.analyzedItems || Object.keys(routerState.analyzedItems).length === 0) return completedInspection;
    const ai = routerState.analyzedItems;
    return inspectionFormSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        const result = ai[item.id];
        if (result) return { ...item, status: result.status, comment: result.comment, evidence: result.evidence, faultCode: result.faultCode };
        return item;
      }),
    }));
  }, [routerState]);

  const [sections, setSections] = useState(initialSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(initialSections.map(s => s.id)));
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const counts = getStatusCounts(sections);
  const unconfirmedCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === 'unconfirmed').length, 0);
  const hasUnconfirmed = unconfirmedCount > 0;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const quickResolve = useCallback((sectionId: string, itemId: string, status: InspectionStatus) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, items: s.items.map(i => i.id !== itemId ? i : { ...i, status, comment: i.comment || `Manually marked ${status}`, evidence: [...(i.evidence || []), 'audio' as const] }) };
    }));
    setEditingItem(null);
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const handleSubmit = useCallback(() => {
    if (hasUnconfirmed) {
      toast({ title: 'Cannot submit', description: `${unconfirmedCount} fields still unconfirmed.`, variant: 'destructive' });
      return;
    }
    toast({ title: 'Report submitted', description: 'PDF generated and synced to VisionLink.' });
    navigate(`/debrief/${machineId}`, { state: { sections, transcript: routerState?.transcript, elapsed: routerState?.elapsed } });
  }, [hasUnconfirmed, unconfirmedCount, toast, navigate, machineId, sections, routerState]);

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Review Inspection"
        subtitle={`${machine.assetId} • S/N ${machine.serial}`}
        back={`/inspect/${machine.id}`}
        right={<StatusSummary {...counts} />}
      />

      <div className="px-5 py-4 space-y-3 pb-32">
        {/* General info */}
        <div className="card-elevated p-4">
          <p className="label-caps mb-3">General Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Inspector</p>
              <p className="font-medium text-sm">Marcus Chen</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-mono font-medium text-sm">{new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SMU Hours</p>
              <p className="font-mono font-medium text-sm">{machine.smuHours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-mono font-medium text-sm">
                {routerState?.elapsed ? `${Math.floor(routerState.elapsed / 60)}m ${routerState.elapsed % 60}s` : '—'}
              </p>
            </div>
          </div>
        </div>

        {hasUnconfirmed && (
          <div className="flex items-center gap-2.5 bg-status-monitor/6 border border-status-monitor/15 rounded-lg p-3.5">
            <AlertCircle className="w-5 h-5 text-status-monitor shrink-0" />
            <p className="text-sm text-status-monitor">
              <span className="font-semibold">{unconfirmedCount} field{unconfirmedCount !== 1 ? 's' : ''} unconfirmed.</span> Tap to resolve.
            </p>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.id} className="card-elevated overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 bg-surface-2/40 border-b border-border/30 flex items-center justify-between touch-target"
            >
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {section.items.filter(i => i.status !== 'unconfirmed').length}/{section.items.length}
                </span>
                {expandedSections.has(section.id) ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />}
              </div>
            </button>
            {expandedSections.has(section.id) && (
              <div>
                {section.items.map((item, idx) => (
                  <div key={item.id} className={`px-4 py-3 ${idx > 0 ? 'border-t border-border/20' : ''} ${item.status === 'unconfirmed' ? 'bg-surface-2/20' : ''}`}>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0 w-7">{item.id}</span>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      {item.status === 'unconfirmed' ? (
                        <button onClick={() => setEditingItem(editingItem === item.id ? null : item.id)} className="shrink-0">
                          <StatusBadge status={item.status} />
                        </button>
                      ) : (
                        <StatusBadge status={item.status} className="shrink-0" />
                      )}
                    </div>

                    {editingItem === item.id && item.status === 'unconfirmed' && (
                      <div className="flex gap-1.5 mt-2.5 pl-9 flex-wrap">
                        {(['pass', 'monitor', 'fail', 'normal'] as InspectionStatus[]).map(s => (
                          <button key={s} onClick={() => quickResolve(section.id, item.id, s)} className="touch-target">
                            <StatusBadge status={s} />
                          </button>
                        ))}
                      </div>
                    )}

                    {item.comment && (
                      <p className="text-xs text-muted-foreground/70 mt-1.5 pl-9 leading-relaxed">{item.comment}</p>
                    )}
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="flex items-center gap-2.5 mt-1.5 pl-9">
                        {item.evidence.includes('video') && <Video className="w-3.5 h-3.5 text-primary/60" />}
                        {item.evidence.includes('audio') && <Mic2 className="w-3.5 h-3.5 text-status-monitor/60" />}
                        {item.evidence.includes('sensor') && (
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-sensor/60" />
                            {item.faultCode && <span className="text-[10px] font-mono text-sensor/60">{item.faultCode}</span>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent flex gap-2.5 safe-bottom">
        <button
          onClick={() => {
            const firstUnconfirmed = sections.flatMap(s => s.items).find(i => i.status === 'unconfirmed');
            if (firstUnconfirmed) { setEditingItem(firstUnconfirmed.id); toast({ title: 'Edit mode', description: 'Tap unconfirmed badges to set status.' }); }
          }}
          className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all"
        >
          <PenLine className="w-4 h-4" />
        </button>
        <button
          onClick={handleSubmit}
          disabled={hasUnconfirmed}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Submit Report
        </button>
      </div>
    </div>
  );
}
