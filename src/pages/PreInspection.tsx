import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary } from '@/components/StatusBadge';
import { AlertTriangle, Clock, Fuel, MapPin, Activity, Droplets, Play, Cpu, Upload } from 'lucide-react';

export default function PreInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);

  if (!machine) return <div className="p-8 text-center text-muted-foreground text-lg">Machine not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Pre-Inspection Brief"
        subtitle={machine.assetId}
        back="/"
      />

      <div className="px-5 py-5 space-y-4 pb-36">
        {/* Machine header */}
        <div className="glass-surface rounded-xl p-5 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{machine.model}</h2>
              <p className="text-base text-muted-foreground font-mono">S/N {machine.serial} • {machine.assetId}</p>
            </div>
            {machine.lastInspection && <StatusSummary {...machine.lastInspection.summary} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">SMU Hours</p>
                <p className="font-mono font-bold text-lg text-foreground">{machine.smuHours.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4">
              <Fuel className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Fuel Level</p>
                <p className="font-mono font-bold text-lg text-foreground">{machine.fuelLevel}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-surface-2 rounded-xl p-4 col-span-2">
              <MapPin className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold text-base text-foreground">{machine.location}</p>
                <p className="text-sm text-muted-foreground font-mono">{machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Fault Codes */}
        {machine.activeFaultCodes.length > 0 && (
          <div className="glass-surface rounded-xl p-5 border-status-fail/30 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-status-fail" />
              <h3 className="text-lg font-bold text-status-fail">Active Fault Codes</h3>
              <span className="ml-auto text-sm font-mono bg-status-fail/15 text-status-fail px-3 py-1 rounded-lg">{machine.activeFaultCodes.length}</span>
            </div>
            <div className="space-y-3">
              {machine.activeFaultCodes.map((fc) => (
                <div key={fc.code} className="bg-surface-2 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Cpu className="w-4 h-4 text-sensor" />
                    <span className="font-mono text-base text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto text-sm font-semibold uppercase px-2.5 py-0.5 rounded-lg ${fc.severity === 'critical' ? 'bg-status-fail/15 text-status-fail' : 'bg-status-monitor/15 text-status-monitor'}`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="text-base text-foreground">{fc.description}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 font-mono">System: {fc.system}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry summary */}
        <div className="glass-surface rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">VisionLink Telemetry</h3>
          </div>
          <div className="space-y-0">
            {[
              ['Engine Status', 'OFF', 'text-status-pass'],
              ['Idle Time (Yesterday)', '2.4 hrs (31%)', 'text-foreground'],
              ['Payload Cycles', '147 cycles • 882 tons', 'text-foreground'],
              ['Last Data Sync', '3 min ago', 'text-foreground'],
            ].map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between py-3.5 ${i < 3 ? 'border-b border-border' : ''}`}>
                <span className="text-base text-muted-foreground">{label}</span>
                <span className={`font-mono text-base font-semibold ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* S·O·S Fluid Analysis */}
        <div className="glass-surface rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-sensor" />
            <h3 className="text-lg font-bold">S·O·S Fluid Analysis</h3>
            <span className="ml-auto text-sm text-muted-foreground font-mono">02/15/2026</span>
          </div>
          <div className="space-y-0">
            {[
              ['Engine Oil', 'Normal', 'text-status-pass'],
              ['Hydraulic Fluid', 'Elevated Iron — 45 ppm', 'text-status-monitor'],
              ['Coolant', 'Normal', 'text-status-pass'],
              ['Final Drive Oil', 'Normal', 'text-status-pass'],
            ].map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between py-3.5 ${i < 3 ? 'border-b border-border' : ''}`}>
                <span className="text-base text-muted-foreground">{label}</span>
                <span className={`text-base font-semibold ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Previous inspection unresolved */}
        {machine.lastInspection && (machine.lastInspection.summary.fail > 0 || machine.lastInspection.summary.monitor > 0) && (
          <div className="glass-surface rounded-xl p-5 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-lg font-bold mb-2">Open Items from Last Inspection</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {machine.lastInspection.date} — Inspector: {machine.lastInspection.inspector}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-status-fail/10 rounded-xl p-4">
                <span className="status-dot status-dot-fail" />
                <span className="text-base">Right rear work light not functioning</span>
              </div>
              <div className="flex items-center gap-3 bg-status-monitor/10 rounded-xl p-4">
                <span className="status-dot status-dot-monitor" />
                <span className="text-base">Bucket teeth wearing — monitor for replacement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent safe-bottom space-y-3">
        <button
          onClick={() => navigate(`/inspect/${machine.id}`)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Play className="w-6 h-6" />
          Start Live Inspection
        </button>
        <button
          onClick={() => navigate(`/inspect/${machine.id}?mode=upload`)}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-base border border-border active:scale-[0.98] transition-all"
        >
          <Upload className="w-5 h-5" />
          Upload Video for Analysis
        </button>
      </div>
    </div>
  );
}
