import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines } from '@/lib/mock-data';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary } from '@/components/StatusBadge';
import { AlertTriangle, Clock, Fuel, MapPin, Activity, Droplets, Play, Cpu } from 'lucide-react';

export default function PreInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Machine not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Pre-Inspection Brief"
        subtitle={machine.assetId}
        back="/"
      />

      <div className="px-4 py-4 space-y-4 pb-28">
        {/* Machine header */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-bold text-foreground">{machine.model}</h2>
              <p className="text-xs text-muted-foreground font-mono">S/N {machine.serial} • {machine.assetId}</p>
            </div>
            {machine.lastInspection && <StatusSummary {...machine.lastInspection.summary} />}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 bg-surface-2 rounded-md p-2.5">
              <Clock className="w-4 h-4 text-primary" />
              <div>
                <p className="text-muted-foreground">SMU Hours</p>
                <p className="font-mono font-bold text-foreground">{machine.smuHours.toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-2 rounded-md p-2.5">
              <Fuel className="w-4 h-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Fuel Level</p>
                <p className="font-mono font-bold text-foreground">{machine.fuelLevel}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-surface-2 rounded-md p-2.5 col-span-2">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-bold text-foreground">{machine.location}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Fault Codes */}
        {machine.activeFaultCodes.length > 0 && (
          <div className="glass-surface rounded-lg p-4 border-status-fail/30 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-fail" />
              <h3 className="text-sm font-bold text-status-fail">Active Fault Codes</h3>
              <span className="ml-auto text-xs font-mono bg-status-fail/15 text-status-fail px-2 py-0.5 rounded">{machine.activeFaultCodes.length}</span>
            </div>
            <div className="space-y-2">
              {machine.activeFaultCodes.map((fc) => (
                <div key={fc.code} className="bg-surface-2 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-sensor" />
                    <span className="font-mono text-xs text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${fc.severity === 'critical' ? 'bg-status-fail/15 text-status-fail' : 'bg-status-monitor/15 text-status-monitor'}`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="text-xs text-foreground">{fc.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">System: {fc.system} • {new Date(fc.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry summary */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">VisionLink Telemetry</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Engine Status</span>
              <span className="font-mono text-status-pass font-semibold">OFF</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Idle Time (Yesterday)</span>
              <span className="font-mono text-foreground">2.4 hrs (31%)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Payload Cycles (Yesterday)</span>
              <span className="font-mono text-foreground">147 cycles • 882 tons</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Last Data Sync</span>
              <span className="font-mono text-foreground">3 min ago</span>
            </div>
          </div>
        </div>

        {/* S·O·S Fluid Analysis */}
        <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-sensor" />
            <h3 className="text-sm font-bold">S·O·S Fluid Analysis</h3>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">Sampled 02/15/2026</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Engine Oil</span>
              <span className="text-status-pass font-semibold">Normal</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Hydraulic Fluid</span>
              <span className="text-status-monitor font-semibold">Elevated Iron — 45 ppm</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Coolant</span>
              <span className="text-status-pass font-semibold">Normal</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Final Drive Oil</span>
              <span className="text-status-pass font-semibold">Normal</span>
            </div>
          </div>
        </div>

        {/* Previous inspection unresolved */}
        {machine.lastInspection && (machine.lastInspection.summary.fail > 0 || machine.lastInspection.summary.monitor > 0) && (
          <div className="glass-surface rounded-lg p-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <h3 className="text-sm font-bold mb-2">Open Items from Last Inspection</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {machine.lastInspection.date} — Inspector: {machine.lastInspection.inspector}
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 bg-status-fail/10 rounded p-2">
                <span className="status-dot status-dot-fail" />
                <span>Right rear work light not functioning</span>
              </div>
              <div className="flex items-center gap-2 bg-status-monitor/10 rounded p-2">
                <span className="status-dot status-dot-monitor" />
                <span>Bucket teeth wearing — monitor for replacement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={() => navigate(`/inspect/${machine.id}`)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-base glow-primary hover:brightness-110 transition-all"
        >
          <Play className="w-5 h-5" />
          Start Inspection
        </button>
      </div>
    </div>
  );
}
