import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mockMachines, inspectionFormSections, completedInspection, getStatusCounts, InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { StatusBadge, StatusSummary } from '@/components/StatusBadge';
import { Send, ChevronDown, ChevronUp, X, Check, AlertCircle, Camera, Eye, Brain, AlertTriangle } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';

interface AIResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal' | 'conflicted';
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
          status: result.status === 'conflicted' ? 'conflicted' : result.status,
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const counts = getStatusCounts(sections);
  const unconfirmedCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.status === 'unconfirmed').length, 0);
  const conflictedCount = sections.reduce((acc, s) => acc + s.items.filter(i => (i as any).aiAgreement === 'disagree' && i.status === 'conflicted').length, 0);
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const confirmedItems = totalItems - unconfirmedCount;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
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
    if (conflictedCount > 0) {
      toast({ title: 'Resolve conflicts first', description: `${conflictedCount} item${conflictedCount !== 1 ? 's' : ''} have AI disagreements. Tap to resolve.`, variant: 'destructive' });
      return;
    }
    if (unconfirmedCount > 0) {
      toast({ title: 'Items need review', description: `${unconfirmedCount} item${unconfirmedCount !== 1 ? 's' : ''} still unconfirmed.`, variant: 'destructive' });
      return;
    }
    if (!machine) return;

    setIsSubmitting(true);
    toast({ title: 'Saving inspection...', description: 'Uploading data and photos.' });

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
  }, [conflictedCount, unconfirmedCount, toast, navigate, machineId, sections, routerState, machine, saveInspection]);

  if (!machine) return null;

  const agreementBadge = (agreement?: string) => {
    if (!agreement) return null;
    const config: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      agree: { bg: 'bg-status-pass/10', text: 'text-status-pass', label: 'AI Agrees', icon: <Check className="w-3 h-3" /> },
      disagree: { bg: 'bg-status-fail/10', text: 'text-status-fail', label: 'AI Disagrees', icon: <AlertTriangle className="w-3 h-3" /> },
      uncertain: { bg: 'bg-status-monitor/10', text: 'text-status-monitor', label: 'AI Uncertain', icon: <Eye className="w-3 h-3" /> },
    };
    const c = config[agreement];
    if (!c) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
        {c.icon} {c.label}
      </span>
    );
  };

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
          {conflictedCount > 0 && (
            <p className="text-[11px] text-status-fail mt-2 font-semibold">
              ⚠ {conflictedCount} item{conflictedCount !== 1 ? 's' : ''} have AI disagreements — resolve before submitting
            </p>
          )}
          {unconfirmedCount > 0 && conflictedCount === 0 && (
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
          const hasConflicts = section.items.some(i => (i as any).aiAgreement === 'disagree');

          return (
            <div key={section.id} className={`card-elevated overflow-hidden ${
              hasConflicts ? 'border-purple-500/30' : hasFails ? 'border-status-fail/20' : hasMonitors ? 'border-status-monitor/15' : ''
            }`}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {sectionConfirmed === section.items.length ? (
                    <Check className="w-4 h-4 text-status-pass" />
                  ) : hasConflicts ? (
                    <AlertTriangle className="w-4 h-4 text-purple-500" />
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
                    const isExpanded = expandedItems.has(item.id);
                    const aiItem = item as any;
                    const hasAIData = aiItem.photoUrl || aiItem.aiAgreement || aiItem.aiVisualNote || aiItem.comment || aiItem.annotation;
                    const isConflicted = aiItem.aiAgreement === 'disagree';

                    return (
                      <div key={item.id} className={`${idx > 0 ? 'border-t border-border/10' : ''} ${isConflicted ? 'bg-purple-500/5' : ''}`}>
                        {/* Item header row */}
                        <button
                          onClick={() => hasAIData ? toggleItemExpand(item.id) : setEditingItem(isEditing ? null : item.id)}
                          className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition-colors ${
                            item.status === 'unconfirmed' ? 'bg-surface-2/30' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-[11px] font-mono text-muted-foreground/40 shrink-0 w-7 pt-0.5">{item.id}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground">{item.label}</span>
                                {hasAIData && (
                                  <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                              </div>
                              {item.comment && item.status !== 'unconfirmed' && !isExpanded && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{item.comment}</p>
                              )}
                              {/* AI agreement badge inline */}
                              {aiItem.aiAgreement && !isExpanded && (
                                <div className="mt-1">{agreementBadge(aiItem.aiAgreement)}</div>
                              )}
                            </div>
                          </div>
                          <StatusBadge status={item.status === 'conflicted' ? 'fail' : item.status} showLabel={false} className={`shrink-0 ${isConflicted ? 'ring-2 ring-purple-500/50' : ''}`} />
                        </button>

                        {/* Expanded AI evidence panel */}
                        {isExpanded && hasAIData && (
                          <div className="px-4 pb-3 space-y-2">
                            {/* Photo frame grab */}
                            {aiItem.photoUrl && (
                              <div className="rounded-xl overflow-hidden border border-border/20">
                                <img 
                                  src={aiItem.photoUrl} 
                                  alt={`Evidence: ${item.label}`}
                                  className="w-full h-40 object-cover"
                                />
                                {aiItem.annotation && (
                                  <div className="px-3 py-2 bg-surface-2/60 border-t border-border/10">
                                    <p className="text-[11px] text-muted-foreground italic">
                                      <Camera className="w-3 h-3 inline mr-1" />
                                      {aiItem.annotation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* AI comment */}
                            {item.comment && (
                              <div className="bg-surface-2/40 rounded-lg p-2.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  <Brain className="w-3 h-3 inline mr-1" />AI Analysis
                                </p>
                                <p className="text-xs text-foreground leading-relaxed">{item.comment}</p>
                              </div>
                            )}

                            {/* AI agreement + visual note */}
                            {(aiItem.aiAgreement || aiItem.aiVisualNote) && (
                              <div className={`rounded-lg p-2.5 ${isConflicted ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-surface-2/40'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    <Eye className="w-3 h-3 inline mr-1" />AI Cross-Validation
                                  </p>
                                  {agreementBadge(aiItem.aiAgreement)}
                                </div>
                                {aiItem.aiVisualNote && (
                                  <p className="text-xs text-foreground/80 leading-relaxed mt-1">{aiItem.aiVisualNote}</p>
                                )}
                              </div>
                            )}

                            {/* Sensor evidence */}
                            {aiItem.sensorEvidence && (
                              <div className="bg-surface-2/40 rounded-lg p-2.5">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                  📡 Sensor Data
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-foreground">{aiItem.sensorEvidence.sensorLabel}</span>
                                  <span className={`text-xs font-mono font-bold ${
                                    aiItem.sensorEvidence.status === 'critical' ? 'text-status-fail' : 
                                    aiItem.sensorEvidence.status === 'warning' ? 'text-status-monitor' : 'text-status-pass'
                                  }`}>
                                    {aiItem.sensorEvidence.latestValue} {aiItem.sensorEvidence.unit}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Fault code */}
                            {item.faultCode && (
                              <div className="bg-status-fail/8 rounded-lg px-2.5 py-1.5 inline-block">
                                <span className="text-[10px] font-mono font-bold text-status-fail">⚠ {item.faultCode}</span>
                              </div>
                            )}

                            {/* Quick-resolve for conflicted items */}
                            {isConflicted && (
                              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                <p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-2">Resolve Conflict</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[
                                    { status: 'pass' as InspectionStatus, label: 'Pass' },
                                    { status: 'monitor' as InspectionStatus, label: 'Monitor' },
                                    { status: 'fail' as InspectionStatus, label: 'Fail' },
                                  ].map(opt => (
                                    <button
                                      key={opt.status}
                                      onClick={() => setItemStatus(section.id, item.id, opt.status)}
                                      className="py-2 rounded-lg transition-all active:scale-95"
                                    >
                                      <StatusBadge status={opt.status} className="w-full justify-center text-[10px]" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Edit button for non-conflicted */}
                            {!isConflicted && (
                              <button 
                                onClick={() => setEditingItem(isEditing ? null : item.id)}
                                className="text-[11px] text-primary font-medium"
                              >
                                Change status
                              </button>
                            )}
                          </div>
                        )}

                        {/* Inline status editor */}
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
                                    item.status === opt.status ? 'ring-2 ring-primary/50' : ''
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
          disabled={unconfirmedCount > 0 || conflictedCount > 0 || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed glow-primary"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSubmitting ? 'Saving...' : conflictedCount > 0 ? `${conflictedCount} Conflicts to Resolve` : unconfirmedCount > 0 ? `${unconfirmedCount} Items Need Review` : 'Submit Report'}
        </button>
      </div>
    </div>
  );
}
