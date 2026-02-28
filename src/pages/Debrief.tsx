import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { mockMachines, completedInspection, getStatusCounts, InspectionSection } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary, StatusBadge } from '@/components/StatusBadge';
import { AlertTriangle, TrendingUp, Cpu, CheckCircle2, Clock, BarChart3, Home, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import excavatorSchematic from '@/assets/excavator-schematic.png';

export default function Debrief() {
  const { machineId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const machine = mockMachines.find(m => m.id === machineId);

  const routerState = location.state as { sections?: InspectionSection[]; transcript?: string; elapsed?: number } | null;
  const sections = routerState?.sections ?? completedInspection;
  const counts = getStatusCounts(sections);
  const elapsed = routerState?.elapsed;

  if (!machine) return null;

  const failItems = sections.flatMap(s => s.items.filter(i => i.status === 'fail'));
  const monitorItems = sections.flatMap(s => s.items.filter(i => i.status === 'monitor'));
  const sensorItems = sections.flatMap(s => s.items.filter(i => i.evidence?.includes('sensor')));
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const videoCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.evidence?.includes('video')).length, 0);
  const audioCount = sections.reduce((acc, s) => acc + s.items.filter(i => i.evidence?.includes('audio')).length, 0);

  const handleDealerService = (itemId: string, label: string) => {
    toast({
      title: 'Service request sent',
      description: `Dealer notified about ${itemId} — ${label}. A service order will be created.`,
    });
    if (navigator.vibrate) navigator.vibrate(50);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Inspection Debrief"
        subtitle={`${machine.assetId} • Report #INS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`}
        back="/"
        right={<StatusSummary {...counts} />}
      />

      <div className="px-5 py-5 space-y-4 pb-28">
        {/* Submitted */}
        <div className="flex items-center gap-3 bg-status-pass/8 border border-status-pass/15 rounded-xl p-4">
          <CheckCircle2 className="w-6 h-6 text-status-pass shrink-0" />
          <div>
            <p className="text-base font-bold text-status-pass">Inspection Submitted</p>
            <p className="text-xs text-muted-foreground mt-0.5">PDF generated • Synced to VisionLink</p>
          </div>
        </div>

        {/* Machine schematic */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold">Machine Map</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-pass" />Pass</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-monitor" />Monitor</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-fail" />Fail</span>
              <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3 text-sensor" />Sensor</span>
            </div>
          </div>
          <div className="relative bg-background p-3">
            <img src={excavatorSchematic} alt="CAT 320 Schematic" className="w-full opacity-50" />
            <div className="absolute top-[30%] left-[55%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background" title="1.8 — Boom Cylinder" />
            <div className="absolute top-[75%] right-[15%] w-4 h-4 rounded-full bg-status-fail border-2 border-background" title="1.14 — Right Rear Light" />
            <div className="absolute top-[45%] left-[25%] w-4 h-4 rounded-full bg-status-fail border-2 border-background" title="2.6 — Radiator" />
            <div className="absolute top-[65%] left-[45%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background" title="1.3 — Left Front Idler" />
            <div className="absolute top-[25%] right-[25%] w-4 h-4 rounded-full bg-status-monitor border-2 border-background" title="1.7 — Bucket Teeth" />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto text-primary mb-1.5" />
            <p className="text-2xl font-bold font-mono">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Fields</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-primary mb-1.5" />
            <p className="text-2xl font-bold font-mono">
              {elapsed ? `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <Cpu className="w-5 h-5 mx-auto text-sensor mb-1.5" />
            <p className="text-2xl font-bold font-mono">{sensorItems.length}</p>
            <p className="text-xs text-muted-foreground">Sensor</p>
          </div>
        </div>

        {/* FAIL items */}
        {failItems.length > 0 && (
          <div className="bg-card border border-status-fail/15 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-status-fail" />
              <h3 className="text-sm font-bold text-status-fail">FAIL — Immediate Action</h3>
            </div>
            <div className="space-y-3">
              {failItems.map(item => (
                <div key={item.id} className="bg-status-fail/5 border border-status-fail/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.comment}</p>
                  {item.faultCode && (
                    <p className="text-xs font-mono text-sensor mt-1.5 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> {item.faultCode}
                    </p>
                  )}
                  <button
                    onClick={() => handleDealerService(item.id, item.label)}
                    className="mt-3 flex items-center gap-1.5 text-xs text-primary font-semibold active:opacity-70 transition-opacity touch-target"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Request Dealer Service
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensor-correlated */}
        {sensorItems.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-sensor" />
              <h3 className="text-sm font-bold text-sensor">Sensor-Correlated Findings</h3>
            </div>
            <div className="space-y-3">
              {sensorItems.map(item => (
                <div key={item.id} className="flex items-start gap-3 bg-surface-2 rounded-lg p-3.5">
                  <StatusBadge status={item.status} showLabel={false} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.comment}</p>
                    <p className="text-xs font-mono text-sensor mt-1">{item.faultCode}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pattern detection */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-status-monitor" />
            <h3 className="text-sm font-bold">Pattern Detection</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-status-monitor/8 border border-status-monitor/12 rounded-lg p-4">
              <p className="font-semibold text-status-monitor text-sm">Recurring: Radiator debris buildup</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Flagged MONITOR or FAIL in 3 of last 4 inspections. Correlates with hydraulic oil temperature fault code 168:0110-15.</p>
            </div>
            <div className="bg-status-monitor/8 border border-status-monitor/12 rounded-lg p-4">
              <p className="font-semibold text-status-monitor text-sm">Trending: Left front idler wear</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Progressing from PASS to MONITOR over last 2 inspections. Approaching threshold.</p>
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold mb-3">Coverage & Coaching</h3>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>✓ {totalItems} inspection fields — 100% coverage</p>
            <p>✓ {videoCount} with video, {audioCount} with audio, {sensorItems.length} with sensor data</p>
            {elapsed && <p>⚡ Duration: {Math.floor(elapsed / 60)}m {elapsed % 60}s</p>}
            <p className="text-primary font-semibold mt-3">Excellent coverage. All zones thoroughly inspected.</p>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent flex gap-3 safe-bottom">
        <button
          onClick={() => {
            toast({ title: 'PDF downloaded', description: 'Inspection report saved to device.' });
          }}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm border border-border active:scale-[0.98] transition-all"
        >
          <FileText className="w-4 h-4" />
          Download PDF
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Home className="w-4 h-4" />
          Back to Fleet
        </button>
      </div>
    </div>
  );
}
