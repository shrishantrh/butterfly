import { Mic, Camera, MicOff, VideoOff } from 'lucide-react';

interface SectionProgress {
  id: string;
  title: string;
  covered: number;
  total: number;
}

interface InspectionHUDProps {
  pct: number;
  itemCount: number;
  totalFields: number;
  sectionProgress: SectionProgress[];
  isConnected: boolean;
  isCameraOn: boolean;
}

export function InspectionHUD({ pct, itemCount, totalFields, sectionProgress, isConnected, isCameraOn }: InspectionHUDProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      {/* Progress ring */}
      <div className="relative w-40 h-40 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.76} ${276 - pct * 2.76}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono text-foreground">{pct}%</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1 font-mono">
            {itemCount}/{totalFields}
          </span>
        </div>
      </div>

      {/* Section breakdown */}
      <div className="w-full max-w-xs space-y-2 mb-6">
        {sectionProgress.map(s => {
          const sp = s.total > 0 ? (s.covered / s.total) * 100 : 0;
          return (
            <div key={s.id}>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span className="text-muted-foreground truncate">{s.title}</span>
                <span className="font-mono text-muted-foreground">{s.covered}/{s.total}</span>
              </div>
              <div className="h-1 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${sp}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active indicators */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold ${
          isConnected
            ? 'bg-status-fail/10 text-status-fail border border-status-fail/20'
            : 'bg-surface-2 text-muted-foreground border border-border'
        }`}>
          {isConnected ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          Audio
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-semibold ${
          isCameraOn
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-surface-2 text-muted-foreground border border-border'
        }`}>
          {isCameraOn ? <Camera className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          Video
        </div>
      </div>
    </div>
  );
}
