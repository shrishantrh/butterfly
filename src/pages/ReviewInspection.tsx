import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockMachines, inspectionFormSections, completedInspection, getStatusCounts, InspectionSection, InspectionItem, InspectionStatus } from '@/lib/mock-data';
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
    if (!routerState?.analyzedItems || Object.keys(routerState.analyzedItems).length === 0) {
      return completedInspection;
    }
    const ai = routerState.analyzedItems;
    return inspectionFormSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        const result = ai[item.id];
        if (result) {
          return { ...item, status: result.status, comment: result.comment, evidence: result.evidence, faultCode: result.faultCode };
        }
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
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const quickResolve = useCallback((sectionId: string, itemId: string, status: InspectionStatus) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(i => {
          if (i.id !== itemId) return i;
          return { ...i, status, comment: i.comment || `Manually marked ${status} during review`, evidence: [...(i.evidence || []), 'audio' as const] };
        }),
      };
    }));
    setEditingItem(null);
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const handleSubmit = useCallback(() => {
    if (hasUnconfirmed) {
      toast({ title: 'Cannot submit', description: `${unconfirmedCount} fields still unconfirmed.`, variant: 'destructive' });
      return;
    }
    toast({ title: 'Report submitted', description: 'PDF generated and synced.' });
    navigate(`/debrief/${machineId}`, {
      state: { sections, transcript: routerState?.transcript, elapsed: routerState?.elapsed },
    });
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

      <div className="px-5 py-5 space-y-4 pb-32">
        {/* General info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 font-mono">General Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Inspector</p>
              <p className="font-semibold">Marcus Chen</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-mono font-semibold">{new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SMU Hours</p>
              <p className="font-mono font-semibold">{machine.smuHours.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-mono font-semibold">
                {routerState?.elapsed ? `${Math.floor(routerState.elapsed / 60)}m ${routerState.elapsed % 60}s` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Unconfirmed warning */}
        {hasUnconfirmed && (
          <div className="flex items-center gap-3 bg-status-monitor/10 border border-status-monitor/20 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-status-monitor shrink-0" />
            <p className="text-sm text-status-monitor">
              <span className="font-semibold">{unconfirmedCount} field{unconfirmedCount !== 1 ? 's' : ''} unconfirmed.</span> Tap to resolve.
            </p>
          </div>
        )}

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-5 py-3.5 bg-surface-2 border-b border-border flex items-center justify-between touch-target"
            >
              <h3 className="text-sm font-bold">{section.title}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {section.items.filter(i => i.status !== 'unconfirmed').length}/{section.items.length}
                </span>
                {expandedSections.has(section.id)
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
              </div>
            </button>
            {expandedSections.has(section.id) && (
              <div className="divide-y divide-border">
                {section.items.map((item) => (
                  <div key={item.id} className={`px-5 py-3.5 ${item.status === 'unconfirmed' ? 'bg-surface-2/30' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground shrink-0 w-7">{item.id}</span>
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      {item.status === 'unconfirmed' ? (
                        <button
                          onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                          className="shrink-0"
                        >
                          <StatusBadge status={item.status} />
                        </button>
                      ) : (
                        <StatusBadge status={item.status} className="shrink-0" />
                      )}
                    </div>

                    {/* Quick resolve buttons */}
                    {editingItem === item.id && item.status === 'unconfirmed' && (
                      <div className="flex gap-2 mt-3 pl-9">
                        {(['pass', 'monitor', 'fail', 'normal'] as InspectionStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => quickResolve(section.id, item.id, s)}
                            className="touch-target"
                          >
                            <StatusBadge status={s} />
                          </button>
                        ))}
                      </div>
                    )}

                    {item.comment && (
                      <p className="text-xs text-muted-foreground mt-1.5 pl-9 leading-relaxed">{item.comment}</p>
                    )}
                    {item.evidence && item.evidence.length > 0 && (
                      <div className="flex items-center gap-2.5 mt-1.5 pl-9">
                        {item.evidence.includes('video') && <Video className="w-3.5 h-3.5 text-primary" />}
                        {item.evidence.includes('audio') && <Mic2 className="w-3.5 h-3.5 text-status-monitor" />}
                        {item.evidence.includes('sensor') && (
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5 text-sensor" />
                            {item.faultCode && <span className="text-xs font-mono text-sensor">{item.faultCode}</span>}
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

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent flex gap-3 safe-bottom">
        <button
          onClick={() => {
            toast({ title: 'Edit mode', description: 'Tap any field status to change it.' });
          }}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm border border-border active:scale-[0.98] transition-all"
        >
          <PenLine className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={handleSubmit}
          disabled={hasUnconfirmed}
          className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          Submit Report
        </button>
      </div>
    </div>
  );
}
