import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary } from '@/components/StatusBadge';
import { AlertTriangle, Clock, Fuel, MapPin, Activity, Droplets, Play, Cpu, Upload } from 'lucide-react';

export default function PreInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Machine not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Pre-Inspection Brief" subtitle={machine.assetId} back="/" />

      <div className="px-5 py-5 space-y-3 pb-36">
        {/* Machine header */}
        <div className="card-elevated p-4 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{machine.model}</h2>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">S/N {machine.serial} • {machine.assetId}</p>
            </div>
            {machine.lastInspection && <StatusSummary {...machine.lastInspection.summary} />}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-3 inset-surface p-3.5 rounded-lg">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">SMU Hours</p>
                <p className="font-mono font-bold text-base text-foreground">{machine.smuHours.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 inset-surface p-3.5 rounded-lg">
              <Fuel className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Fuel Level</p>
                <p className="font-mono font-bold text-base text-foreground">{machine.fuelLevel}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 inset-surface p-3.5 rounded-lg col-span-2">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-sm text-foreground">{machine.location}</p>
                <p className="text-xs text-muted-foreground font-mono">{machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Fault Codes */}
        {machine.activeFaultCodes.length > 0 && (
          <div className="card-elevated p-4 border-status-fail/20 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-fail" />
              <h3 className="text-sm font-bold text-status-fail">Active Fault Codes</h3>
              <span className="ml-auto text-xs font-mono bg-status-fail/10 text-status-fail px-2 py-0.5 rounded-md border border-status-fail/15">{machine.activeFaultCodes.length}</span>
            </div>
            <div className="space-y-2">
              {machine.activeFaultCodes.map((fc) => (
                <div key={fc.code} className="inset-surface rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-sensor" />
                    <span className="font-mono text-sm text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${fc.severity === 'critical' ? 'bg-status-fail/10 text-status-fail border-status-fail/15' : 'bg-status-monitor/10 text-status-monitor border-status-monitor/15'}`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{fc.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">System: {fc.system}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry summary */}
        <div className="card-elevated p-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">VisionLink Telemetry</h3>
          </div>
          <div className="space-y-0">
            {[
              ['Engine Status', 'OFF', 'text-status-pass'],
              ['Idle Time (Yesterday)', '2.4 hrs (31%)', 'text-foreground'],
              ['Payload Cycles', '147 cycles • 882 tons', 'text-foreground'],
              ['Last Data Sync', '3 min ago', 'text-foreground'],
            ].map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between py-3 ${i < 3 ? 'divider' : ''}`}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`font-mono text-sm font-medium ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* S·O·S Fluid Analysis */}
        <div className="card-elevated p-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-sensor" />
            <h3 className="text-sm font-bold">S·O·S Fluid Analysis</h3>
            <span className="ml-auto text-xs text-muted-foreground font-mono">02/15/2026</span>
          </div>
          <div className="space-y-0">
            {[
              ['Engine Oil', 'Normal', 'text-status-pass'],
              ['Hydraulic Fluid', 'Elevated Iron — 45 ppm', 'text-status-monitor'],
              ['Coolant', 'Normal', 'text-status-pass'],
              ['Final Drive Oil', 'Normal', 'text-status-pass'],
            ].map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between py-3 ${i < 3 ? 'divider' : ''}`}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-medium ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Previous inspection unresolved */}
        {machine.lastInspection && (machine.lastInspection.summary.fail > 0 || machine.lastInspection.summary.monitor > 0) && (
          <div className="card-elevated p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-sm font-bold mb-1.5">Open Items from Last Inspection</h3>
            <p className="text-xs text-muted-foreground mb-3">
              {machine.lastInspection.date} — Inspector: {machine.lastInspection.inspector}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-status-fail/6 border border-status-fail/12 rounded-lg p-3.5">
                <span className="status-dot status-dot-fail" />
                <span className="text-sm">Right rear work light not functioning</span>
              </div>
              <div className="flex items-center gap-3 bg-status-monitor/6 border border-status-monitor/12 rounded-lg p-3.5">
                <span className="status-dot status-dot-monitor" />
                <span className="text-sm">Bucket teeth wearing — monitor for replacement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent safe-bottom space-y-2.5">
        <button
          onClick={() => navigate(`/inspect/${machine.id}`)}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5" />
          Start Live Inspection
        </button>
        <button
          onClick={() => navigate(`/inspect/${machine.id}?mode=upload`)}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/50 active:scale-[0.98] transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload Video for Analysis
        </button>
      </div>
    </div>
  );
}
