import { InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, ChevronUp, Camera, MessageSquare, X, Check } from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult } from '@/hooks/useInspectionAI';

interface LiveFormChecklistProps {
  sections: InspectionSection[];
  analyzedItems: Map<string, AnalysisResult>;
  isAnalyzing: boolean;
  onManualEdit?: (id: string, result: AnalysisResult) => void;
  allEvaluated?: boolean;
}

const STATUS_OPTIONS: { status: InspectionStatus; label: string }[] = [
  { status: 'pass', label: 'Pass' },
  { status: 'monitor', label: 'Monitor' },
  { status: 'fail', label: 'Fail' },
  { status: 'normal', label: 'N/A' },
];

export function LiveFormChecklist({ sections, analyzedItems, isAnalyzing, onManualEdit, allEvaluated = false }: LiveFormChecklistProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editComment, setEditComment] = useState('');

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleManualStatus = (itemId: string, status: InspectionStatus, label: string) => {
    if (!onManualEdit) return;
    const existing = analyzedItems.get(itemId);
    onManualEdit(itemId, {
      id: itemId,
      status: status as AnalysisResult['status'],
      comment: editComment || existing?.comment || `Manually set to ${status}`,
      evidence: [...(existing?.evidence || []), 'audio' as const],
      faultCode: existing?.faultCode,
      photoUrl: existing?.photoUrl,
    });
    setEditingItem(null);
    setEditComment('');
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div className="space-y-2.5">
      {sections.map(section => {
        const isCollapsed = collapsed.has(section.id);
        const sectionCovered = section.items.filter(i => analyzedItems.has(i.id)).length;
        const hasFails = section.items.some(i => analyzedItems.get(i.id)?.status === 'fail');
        const hasMonitors = section.items.some(i => analyzedItems.get(i.id)?.status === 'monitor');
        const sectionPct = Math.round((sectionCovered / section.items.length) * 100);

        return (
          <div key={section.id} className={`bg-card border rounded-xl overflow-hidden transition-colors ${
            hasFails ? 'border-status-fail/25' : hasMonitors ? 'border-status-monitor/20' : 'border-border/60'
          }`}>
            <button
              onClick={() => toggle(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between touch-target"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {hasFails ? (
                  <span className="w-2 h-2 rounded-full bg-status-fail shrink-0" />
                ) : hasMonitors ? (
                  <span className="w-2 h-2 rounded-full bg-status-monitor shrink-0" />
                ) : sectionCovered === section.items.length ? (
                  <Check className="w-4 h-4 text-status-pass shrink-0" />
                ) : null}
                <h3 className="text-sm font-bold text-foreground truncate">{section.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">
                  {sectionCovered}/{section.items.length}
                </span>
                {/* Mini progress */}
                <div className="w-8 h-1 bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sectionPct}%`,
                      backgroundColor: hasFails ? 'hsl(var(--status-fail))' : hasMonitors ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-pass))',
                    }}
                  />
                </div>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground" />
                }
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {section.items.map(item => {
                  const result = analyzedItems.get(item.id);
                  const status: InspectionStatus = result ? result.status : 'unconfirmed';
                  const isEditing = editingItem === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (!allEvaluated) return;
                          if (isEditing) {
                            setEditingItem(null);
                          } else {
                            setEditingItem(item.id);
                            setEditComment(result?.comment || '');
                          }
                        }}
                        disabled={!allEvaluated}
                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 transition-colors duration-200 text-left ${!allEvaluated ? 'cursor-not-allowed opacity-60' : ''} ${
                          result 
                            ? result.status === 'fail' ? 'bg-status-fail/5' 
                            : result.status === 'monitor' ? 'bg-status-monitor/5'
                            : 'bg-card' 
                            : 'bg-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground/70 shrink-0 w-7 pt-0.5">{item.id}</span>
                          <div className="min-w-0">
                            <span className={`text-sm leading-tight ${result ? 'text-foreground' : 'text-muted-foreground/80'}`}>
                              {item.label}
                            </span>
                            {result?.comment && (
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{result.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {result?.photoUrl && <Camera className="w-3.5 h-3.5 text-primary" />}
                          <StatusBadge status={status} showLabel={false} className="scale-90" />
                        </div>
                      </button>

                      {/* Manual edit panel */}
                      {isEditing && (
                        <div className="px-4 py-3 bg-surface-2/80 border-t border-border/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-muted-foreground tracking-wider">SET STATUS</span>
                            <button onClick={() => setEditingItem(null)} className="p-0.5 rounded hover:bg-border/50">
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.status}
                                onClick={() => handleManualStatus(item.id, opt.status, item.label)}
                                className="touch-target py-1.5"
                              >
                                <StatusBadge status={opt.status} className="w-full justify-center text-xs" />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              placeholder="Add note..."
                              className="flex-1 bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                            <button
                              onClick={() => {
                                if (editComment && onManualEdit) {
                                  const existing = analyzedItems.get(item.id);
                                  onManualEdit(item.id, {
                                    id: item.id,
                                    status: (existing?.status || 'normal') as AnalysisResult['status'],
                                    comment: editComment,
                                    evidence: existing?.evidence || ['audio'],
                                    faultCode: existing?.faultCode,
                                    photoUrl: existing?.photoUrl,
                                  });
                                  setEditingItem(null);
                                  setEditComment('');
                                }
                              }}
                              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>

                          {result?.photoUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-border/30">
                              <img src={result.photoUrl} alt="Evidence" className="w-full h-20 object-cover" />
                            </div>
                          )}
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
  );
}
