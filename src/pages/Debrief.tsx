import { useParams } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary, StatusBadge } from '@/components/StatusBadge';
import { AlertTriangle, TrendingUp, MapPin, Cpu, CheckCircle2 } from 'lucide-react';
import excavatorSchematic from '@/assets/excavator-schematic.png';

export default function Debrief() {
  const { machineId } = useParams();
  const machine = mockMachines.find(m => m.id === machineId);
  const counts = getStatusCounts(completedInspection);

  if (!machine) return null;

  const failItems = completedInspection.flatMap(s => s.items.filter(i => i.status === 'fail'));
  const monitorItems = completedInspection.flatMap(s => s.items.filter(i => i.status === 'monitor'));
  const sensorItems = completedInspection.flatMap(s => s.items.filter(i => i.evidence?.includes('sensor')));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Inspection Debrief"
        subtitle={`${machine.assetId} • Report #INS-2026-0228-001`}
        back="/"
        right={<StatusSummary {...counts} />}
      />

      <div className="px-4 py-4 space-y-4 pb-8">
        {/* Submitted banner */}
        <div className="flex items-center gap-3 bg-status-pass/10 border border-status-pass/20 rounded-lg p-4 animate-slide-up">
          <CheckCircle2 className="w-6 h-6 text-status-pass shrink-0" />
          <div>
            <p className="text-sm font-bold text-status-pass">Inspection Submitted</p>
            <p className="text-xs text-muted-foreground">PDF generated and sent to notification group • Synced to VisionLink</p>
          </div>
        </div>

        {/* Machine schematic */}
        <div className="glass-surface rounded-lg overflow-hidden animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold">Machine Map</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-pass" />Pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-monitor" />Monitor</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-fail" />Fail</span>
              <span className="flex items-center gap-1"><Cpu className="w-2.5 h-2.5 text-sensor" />Sensor</span>
            </div>
          </div>
          <div className="relative bg-background p-2">
            <img src={excavatorSchematic} alt="CAT 320 Schematic" className="w-full opacity-60" />
            {/* Overlay pins */}
            <div className="absolute top-[30%] left-[55%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background shadow-lg cursor-pointer hover:scale-150 transition-transform" title="1.8 — Boom Cylinder" />
            <div className="absolute top-[75%] right-[15%] w-4 h-4 rounded-full bg-status-fail border-2 border-background shadow-lg cursor-pointer hover:scale-150 transition-transform" title="1.14 — Right Rear Light" />
            <div className="absolute top-[45%] left-[25%] w-4 h-4 rounded-full bg-status-fail border-2 border-background shadow-lg cursor-pointer hover:scale-150 transition-transform" title="2.6 — Radiator" />
            <div className="absolute top-[65%] left-[45%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background shadow-lg cursor-pointer hover:scale-150 transition-transform" title="1.3 — Left Front Idler" />
            <div className="absolute top-[25%] right-[25%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background shadow-lg cursor-pointer hover:scale-150 transition-transform" title="1.7 — Bucket Teeth" />
            {/* Sensor icon pins */}
            <div className="absolute top-[28%] left-[56%] glow-sensor">
              <Cpu className="w-3 h-3 text-sensor" />
            </div>
          </div>
        </div>

        {/* FAIL items */}
        {failItems.length > 0 && (
          <div className="glass-surface rounded-lg p-4 border-status-fail/20 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-fail" />
              <h3 className="text-sm font-bold text-status-fail">FAIL Items — Immediate Action Required</h3>
            </div>
            <div className="space-y-3">
              {failItems.map(item => (
                <div key={item.id} className="bg-status-fail/5 border border-status-fail/10 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                    <span className="text-xs font-bold text-foreground">{item.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.comment}</p>
                  {item.faultCode && (
                    <p className="text-[10px] font-mono text-sensor mt-1 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Correlated: {item.faultCode}
                    </p>
                  )}
                  <button className="mt-2 text-xs text-primary font-semibold hover:underline">
                    Request Dealer Service →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensor findings */}
        {sensorItems.length > 0 && (
          <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-sensor" />
              <h3 className="text-sm font-bold text-sensor">Sensor-Correlated Findings</h3>
            </div>
            <div className="space-y-2">
              {sensorItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 bg-surface-2 rounded-md p-3">
                  <StatusBadge status={item.status} showLabel={false} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.comment}</p>
                    <p className="text-[10px] font-mono text-sensor mt-0.5">{item.faultCode}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern detection */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-status-monitor" />
            <h3 className="text-sm font-bold">Pattern Detection</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="bg-status-monitor/10 border border-status-monitor/15 rounded-md p-3">
              <p className="font-semibold text-status-monitor">Recurring: Radiator debris buildup</p>
              <p className="text-muted-foreground mt-0.5">Flagged MONITOR or FAIL in 3 of last 4 inspections. Correlates with hydraulic oil temperature fault code 168:0110-15. Recommend scheduled cleaning interval.</p>
            </div>
            <div className="bg-status-monitor/10 border border-status-monitor/15 rounded-md p-3">
              <p className="font-semibold text-status-monitor">Trending: Left front idler wear</p>
              <p className="text-muted-foreground mt-0.5">Progressing from PASS to MONITOR over last 2 inspections. Within service limits but approaching threshold.</p>
            </div>
          </div>
        </div>

        {/* Inspector coaching */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Coverage & Coaching</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>✓ All 40 inspection fields captured — 100% coverage</p>
            <p>✓ 34 fields with video evidence, 8 with audio, 4 with sensor correlation</p>
            <p>⚡ Inspection duration: 12 minutes 34 seconds — 18% faster than average</p>
            <p className="text-primary font-semibold mt-2">Excellent coverage. All zones thoroughly inspected.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
