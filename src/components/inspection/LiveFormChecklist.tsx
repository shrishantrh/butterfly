import { InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, ChevronUp, Camera, MessageSquare, X } from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult } from '@/hooks/useInspectionAI';

interface LiveFormChecklistProps {
  sections: InspectionSection[];
  analyzedItems: Map<string, AnalysisResult>;
  isAnalyzing: boolean;
  onManualEdit?: (id: string, result: AnalysisResult) => void;
}

const STATUS_OPTIONS: { status: InspectionStatus; label: string }[] = [
  { status: 'pass', label: 'Pass' },
  { status: 'monitor', label: 'Monitor' },
  { status: 'fail', label: 'Fail' },
  { status: 'normal', label: 'Normal' },
];

export function LiveFormChecklist({ sections, analyzedItems, isAnalyzing, onManualEdit }: LiveFormChecklistProps) {
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
    <div className="space-y-2">
      {sections.map(section => {
        const isCollapsed = collapsed.has(section.id);
        const sectionCovered = section.items.filter(i => analyzedItems.has(i.id)).length;
        const hasFails = section.items.some(i => analyzedItems.get(i.id)?.status === 'fail');
        const hasMonitors = section.items.some(i => analyzedItems.get(i.id)?.status === 'monitor');

        return (
          <div key={section.id} className={`bg-card border rounded-xl overflow-hidden ${
            hasFails ? 'border-status-fail/30' : hasMonitors ? 'border-status-monitor/20' : 'border-border'
          }`}>
            <button
              onClick={() => toggle(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between touch-target"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{section.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {hasFails && <span className="w-2.5 h-2.5 rounded-full bg-status-fail" />}
                {hasMonitors && !hasFails && <span className="w-2.5 h-2.5 rounded-full bg-status-monitor" />}
                <span className="text-base font-mono text-muted-foreground">
                  {sectionCovered}/{section.items.length}
                </span>
                {isCollapsed
                  ? <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  : <ChevronUp className="w-5 h-5 text-muted-foreground" />
                }
              </div>
            </button>

            {!isCollapsed && (
              <div className="border-t border-border divide-y divide-border/50">
                {section.items.map(item => {
                  const result = analyzedItems.get(item.id);
                  const status: InspectionStatus = result ? result.status : 'unconfirmed';
                  const isEditing = editingItem === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingItem(null);
                          } else {
                            setEditingItem(item.id);
                            setEditComment(result?.comment || '');
                          }
                        }}
                        className={`w-full px-4 py-3 flex items-center justify-between gap-2 transition-colors duration-300 text-left ${
                          result 
                            ? result.status === 'fail' ? 'bg-status-fail/5' 
                            : result.status === 'monitor' ? 'bg-status-monitor/5'
                            : 'bg-card' 
                            : 'bg-surface-2/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base font-mono text-muted-foreground shrink-0 w-9">{item.id}</span>
                          <div className="min-w-0">
                            <span className={`text-base leading-tight ${result ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {item.label}
                            </span>
                            {result?.comment && (
                              <p className="text-sm text-muted-foreground mt-0.5 leading-snug truncate">{result.comment}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {result?.photoUrl && <Camera className="w-4 h-4 text-primary" />}
                          <StatusBadge status={status} showLabel={false} />
                        </div>
                      </button>

                      {/* Manual edit panel */}
                      {isEditing && (
                        <div className="px-4 py-3 bg-surface-2 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-muted-foreground">Set Status</span>
                            <button onClick={() => setEditingItem(null)} className="p-1">
                              <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                          <div className="flex gap-2 mb-3">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.status}
                                onClick={() => handleManualStatus(item.id, opt.status, item.label)}
                                className="touch-target flex-1"
                              >
                                <StatusBadge status={opt.status} />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              placeholder="Add comment..."
                              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Show captured photo if exists */}
                          {result?.photoUrl && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-border">
                              <img src={result.photoUrl} alt="Captured evidence" className="w-full h-24 object-cover" />
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
