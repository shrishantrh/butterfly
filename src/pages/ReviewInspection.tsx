import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockMachines, inspectionFormSections, completedInspection, getStatusCounts, InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { StatusBadge, StatusSummary } from '@/components/StatusBadge';
import { Send, ChevronDown, ChevronUp, X, Check, AlertCircle } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';

interface AIResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
  photoUrl?: string;
  annotation?: string;
  aiAgreement?: 'agree' | 'disagree' | 'uncertain';
  aiVisualNote?: string;
  sensorEvidence?: {
    sensorKey: string;
    sensorLabel: string;
    latestValue: number;
    unit: string;
    status: string;
    time: string;
  };
}

const STATUS_OPTIONS: { status: InspectionStatus; label: string }[] = [
  { status: 'pass', label: 'Pass' },
  { status: 'monitor', label: 'Monitor' },
  { status: 'fail', label: 'Fail' },
  { status: 'normal', label: 'N/A' },
];

export default function ReviewInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);
  const { saveInspection } = useInspectionStorage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routerState = location.state as { analyzedItems?: Record<string, AIResult>; transcript?: string; elapsed?: number } | null;

  const initialSections: InspectionSection[] = useMemo(() => {
    if (!routerState?.analyzedItems || Object.keys(routerState.analyzedItems).length === 0) return completedInspection;
    const ai = routerState.analyzedItems;
    return inspectionFormSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        const result = ai[item.id];
        if (result) return {
          ...item,
          status: result.status,
          comment: result.comment,
          evidence: result.evidence,
          faultCode: result.faultCode,
          photoUrl: result.photoUrl,
          annotation: result.annotation,
          aiAgreement: result.aiAgreement,
          aiVisualNote: result.aiVisualNote,
          sensorEvidence: result.sensorEvidence,
        } as any;
        return item;
      }),
    }));
  }, [routerState]);

  const [sections, setSections] = useState(initialSections);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(initialSections.map(s => s.id)));
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const counts = getStatusCounts(sections);
  const unconfirmedCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === 'unconfirmed').length, 0);
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const confirmedItems = totalItems - unconfirmedCount;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const setItemStatus = useCallback((sectionId: string, itemId: string, status: InspectionStatus) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(i => i.id !== itemId ? i : {
          ...i,
          status,
          comment: i.comment || `Set to ${status}`,
          evidence: [...(i.evidence || []), 'audio' as const],
        }),
      };
    }));
    setEditingItem(null);
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (unconfirmedCount > 0) {
      toast({ title: 'Items need review', description: `${unconfirmedCount} item${unconfirmedCount !== 1 ? 's' : ''} still unconfirmed. Tap to set status.`, variant: 'destructive' });
      return;
    }
    if (!machine) return;

    setIsSubmitting(true);
    toast({ title: 'Saving inspection...', description: 'Uploading data.' });

    try {
      const inspectionId = await saveInspection({
        machine,
        sections,
        transcript: routerState?.transcript,
        elapsed: routerState?.elapsed,
        analyzedItems: routerState?.analyzedItems,
      });

      toast({ title: 'Inspection saved', description: 'Report saved with all evidence.' });

      navigate(`/debrief/${machineId}`, {
        state: {
          sections,
          transcript: routerState?.transcript,
          elapsed: routerState?.elapsed,
          inspectionId,
        },
      });
    } catch (err) {
      console.error('Submit error:', err);
      toast({ title: 'Error saving', description: 'Proceeding to debrief.', variant: 'destructive' });
      navigate(`/debrief/${machineId}`, { state: { sections, transcript: routerState?.transcript, elapsed: routerState?.elapsed } });
    } finally {
      setIsSubmitting(false);
    }
  }, [unconfirmedCount, toast, navigate, machineId, sections, routerState, machine, saveInspection]);

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 py-3 pt-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/inspect/${machine.id}`)}
              className="w-9 h-9 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-base font-bold">Review & Confirm</h1>
              <p className="text-[11px] text-muted-foreground font-mono">{machine.assetId}</p>
            </div>
          </div>
          <StatusSummary {...counts} />
        </div>
      </header>

      <div className="px-4 py-4 space-y-3 pb-28">
        {/* Progress */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Confirmation Progress</span>
            <span className="text-xs font-mono font-bold text-foreground">{confirmedItems}/{totalItems}</span>
          </div>
          <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(confirmedItems / totalItems) * 100}%`,
                background: unconfirmedCount === 0 ? 'hsl(var(--status-pass))' : 'hsl(var(--primary))',
              }}
            />
          </div>
          {unconfirmedCount > 0 && (
            <p className="text-[11px] text-status-monitor mt-2">
              {unconfirmedCount} item{unconfirmedCount !== 1 ? 's' : ''} need review — tap to set status
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="card-elevated p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inspector</p>
              <p className="font-semibold text-sm mt-0.5">Marcus Chen</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
              <p className="font-mono font-semibold text-sm mt-0.5">{new Date().toISOString().split('T')[0]}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Duration</p>
              <p className="font-mono font-semibold text-sm mt-0.5">
                {routerState?.elapsed ? `${Math.floor(routerState.elapsed / 60)}m ${routerState.elapsed % 60}s` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => {
          const sectionConfirmed = section.items.filter(i => i.status !== 'unconfirmed').length;
          const hasFails = section.items.some(i => i.status === 'fail');
          const hasMonitors = section.items.some(i => i.status === 'monitor');

          return (
            <div key={section.id} className={`card-elevated overflow-hidden ${
              hasFails ? 'border-status-fail/20' : hasMonitors ? 'border-status-monitor/15' : ''
            }`}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {sectionConfirmed === section.items.length ? (
                    <Check className="w-4 h-4 text-status-pass" />
                  ) : hasFails ? (
                    <AlertCircle className="w-4 h-4 text-status-fail" />
                  ) : null}
                  <h3 className="text-sm font-semibold">{section.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {sectionConfirmed}/{section.items.length}
                  </span>
                  {expandedSections.has(section.id)
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground/50" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                  }
                </div>
              </button>

              {expandedSections.has(section.id) && (
                <div className="border-t border-border/20">
                  {section.items.map((item, idx) => {
                    const isEditing = editingItem === item.id;

                    return (
                      <div key={item.id} className={`${idx > 0 ? 'border-t border-border/10' : ''}`}>
                        <button
                          onClick={() => setEditingItem(isEditing ? null : item.id)}
                          className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors ${
                            item.status === 'unconfirmed' ? 'bg-surface-2/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-[11px] font-mono text-muted-foreground/40 shrink-0 w-7 pt-0.5">{item.id}</span>
                            <div className="min-w-0">
                              <span className="text-sm text-foreground">{item.label}</span>
                              {item.comment && item.status !== 'unconfirmed' && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{item.comment}</p>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={item.status} showLabel={false} className="shrink-0" />
                        </button>

                        {/* Inline editor - works for ALL items */}
                        {isEditing && (
                          <div className="px-4 py-3 bg-surface-2/40 border-t border-border/15">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Set Status</span>
                              <button onClick={() => setEditingItem(null)} className="p-1">
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {STATUS_OPTIONS.map(opt => (
                                <button
                                  key={opt.status}
                                  onClick={() => setItemStatus(section.id, item.id, opt.status)}
                                  className={`py-2 rounded-lg transition-all active:scale-95 ${
                                    item.status === opt.status
                                      ? 'ring-2 ring-primary/50'
                                      : ''
                                  }`}
                                >
                                  <StatusBadge status={opt.status} className="w-full justify-center text-[10px]" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent safe-bottom">
        <button
          onClick={handleSubmit}
          disabled={unconfirmedCount > 0 || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSubmitting ? 'Saving...' : unconfirmedCount > 0 ? `${unconfirmedCount} Items Need Review` : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
