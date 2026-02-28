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

  const handleManualStatus = (itemId: string, status: InspectionStatus) => {
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
    <div className="space-y-2">
      {sections.map(section => {
        const isCollapsed = collapsed.has(section.id);
        const sectionCovered = section.items.filter(i => analyzedItems.has(i.id)).length;
        const hasFails = section.items.some(i => analyzedItems.get(i.id)?.status === 'fail');
        const hasMonitors = section.items.some(i => analyzedItems.get(i.id)?.status === 'monitor');
        const sectionPct = Math.round((sectionCovered / section.items.length) * 100);

        return (
          <div key={section.id} className={`card-elevated overflow-hidden transition-colors ${
            hasFails ? 'border-status-fail/20' : hasMonitors ? 'border-status-monitor/15' : ''
          }`}>
            <button
              onClick={() => toggle(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between touch-target"
            >
              <div className="flex items-center gap-2 min-w-0">
                {hasFails ? (
                  <span className="w-2 h-2 rounded-full bg-status-fail shrink-0" />
                ) : hasMonitors ? (
                  <span className="w-2 h-2 rounded-full bg-status-monitor shrink-0" />
                ) : sectionCovered === section.items.length ? (
                  <Check className="w-3.5 h-3.5 text-status-pass shrink-0" />
                ) : null}
                <h3 className="text-sm font-semibold text-foreground truncate">{section.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">
                  {sectionCovered}/{section.items.length}
                </span>
                <div className="w-8 h-1 bg-border/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sectionPct}%`,
                      backgroundColor: hasFails ? 'hsl(var(--status-fail))' : hasMonitors ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-pass))',
                    }}
                  />
                </div>
                {isCollapsed
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                  : <ChevronUp className="w-4 h-4 text-muted-foreground/60" />
                }
              </div>
            </button>

            {!isCollapsed && (
              <div className="divider">
                {section.items.map((item, idx) => {
                  const result = analyzedItems.get(item.id);
                  const status: InspectionStatus = result ? result.status : 'unconfirmed';
                  const isEditing = editingItem === item.id;

                  return (
                    <div key={item.id} className={idx > 0 ? 'border-t border-border/20' : ''}>
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
                        className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 transition-colors duration-150 text-left ${!allEvaluated ? 'cursor-not-allowed opacity-50' : 'hover:bg-surface-2/40'} ${
                          result 
                            ? result.status === 'fail' ? 'bg-status-fail/4' 
                            : result.status === 'monitor' ? 'bg-status-monitor/4'
                            : '' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0 w-7 pt-0.5">{item.id}</span>
                          <div className="min-w-0">
                            <span className={`text-sm leading-tight ${result ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                              {item.label}
                            </span>
                            {result?.comment && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5 leading-snug line-clamp-2">{result.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {result?.photoUrl && <Camera className="w-3 h-3 text-primary" />}
                          <StatusBadge status={status} showLabel={false} className="scale-90" />
                        </div>
                      </button>

                      {isEditing && (
                        <div className="px-4 py-3 bg-surface-2/60 border-t border-border/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="label-caps">Set Status</span>
                            <button onClick={() => setEditingItem(null)} className="p-0.5 rounded hover:bg-border/40">
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.status}
                                onClick={() => handleManualStatus(item.id, opt.status)}
                                className="touch-target py-1.5"
                              >
                                <StatusBadge status={opt.status} className="w-full justify-center text-[10px]" />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              placeholder="Add note..."
                              className="flex-1 bg-background/80 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
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
                            <div className="mt-2 rounded-lg overflow-hidden border border-border/20">
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
