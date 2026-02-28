import { InspectionSection, InspectionStatus } from '@/lib/mock-data';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface AnalysisResult {
  id: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal';
  comment: string;
  evidence: ('audio' | 'video' | 'sensor')[];
  faultCode?: string;
}

interface LiveFormChecklistProps {
  sections: InspectionSection[];
  analyzedItems: Map<string, AnalysisResult>;
  isAnalyzing: boolean;
}

export function LiveFormChecklist({ sections, analyzedItems, isAnalyzing }: LiveFormChecklistProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalFields = sections.reduce((acc, s) => acc + s.items.length, 0);
  const coveredFields = analyzedItems.size;

  return (
    <div className="space-y-2">
      {/* Coverage bar */}
      <div className="flex items-center gap-3 px-1 mb-1">
        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${totalFields > 0 ? (coveredFields / totalFields) * 100 : 0}%` }}
          />
        </div>
        <span className="text-sm font-mono text-muted-foreground shrink-0">
          {coveredFields}/{totalFields}
        </span>
        {isAnalyzing && (
          <div className="w-2 h-2 rounded-full bg-sensor animate-pulse-glow shrink-0" />
        )}
      </div>

      {sections.map(section => {
        const isCollapsed = collapsed.has(section.id);
        const sectionCovered = section.items.filter(i => analyzedItems.has(i.id)).length;

        return (
          <div key={section.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between touch-target"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">{section.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">
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

                  return (
                    <div
                      key={item.id}
                      className={`px-4 py-3 flex items-center justify-between gap-2 transition-colors duration-500 ${
                        result ? 'bg-card' : 'bg-surface-2/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-mono text-muted-foreground shrink-0 w-8">{item.id}</span>
                        <span className={`text-base ${result ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.label}
                        </span>
                      </div>
                      <StatusBadge status={status} showLabel={false} className="shrink-0" />
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
