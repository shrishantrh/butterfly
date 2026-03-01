import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import {
  Search, SlidersHorizontal, Plus, History, BarChart3,
  MapPin, Package, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getAlert, getData } from '@/lib/sensor-data';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'fleet' | 'map' | 'history'>('fleet');

  const filteredMachines = mockMachines.filter(m =>
    !searchQuery ||
    m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fleet-wide stats
  const totalAlerts = mockMachines.reduce((sum, m) => sum + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((sum, m) => sum + (m.lastInspection?.summary.fail ?? 0), 0);
  const totalMonitor = mockMachines.reduce((sum, m) => sum + (m.lastInspection?.summary.monitor ?? 0), 0);
  const avgFuel = mockMachines.reduce((sum, m) => {
    const fuelData = getData('fuel_level', m.id).filter(d => d.value !== null);
    return sum + (fuelData.length > 0 ? fuelData[fuelData.length - 1].value! : m.fuelLevel);
  }, 0) / mockMachines.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-4 bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Fleet Command</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{mockMachines.length} machines · {totalAlerts} active alerts</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="w-11 h-11 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center"
          >
            <History className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search by Asset ID, Serial, Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-2 border border-border/30 rounded-xl pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <button className="w-12 h-12 rounded-xl bg-surface-2 border border-border/30 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-2 rounded-xl p-1 border border-border/20">
          {(['fleet', 'map', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {tab === 'fleet' ? 'Fleet' : tab === 'map' ? 'Map' : 'History'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-5 pb-24">
        {activeTab === 'fleet' && (
          <div className="space-y-4">
            {/* Fleet stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-fail/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-status-fail" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-status-fail">{totalFails}</p>
                  <p className="text-xs text-muted-foreground">Failures</p>
                </div>
              </div>
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-monitor/15 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-status-monitor" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-status-monitor">{totalMonitor}</p>
                  <p className="text-xs text-muted-foreground">Monitor</p>
                </div>
              </div>
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono">{avgFuel.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Avg Fuel</p>
                </div>
              </div>
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-status-pass/15 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-status-pass" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono text-status-pass">{totalAlerts}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </div>
            </div>

            {/* Add new */}
            <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-2/50 border border-dashed border-border/40">
              <div>
                <p className="text-sm font-bold text-foreground">Add new vehicle</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add a vehicle to the list</p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground/50" />
            </button>

            {/* Machine list */}
            <div className="space-y-3">
              <h2 className="text-lg font-bold">All Machines</h2>
              {filteredMachines.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>

            {filteredMachines.length === 0 && searchQuery && (
              <div className="p-12 text-center">
                <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No machines found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-4 pt-4">
            <div className="card-elevated overflow-hidden">
              <div className="h-64 bg-surface-2 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--status-fail) / 0.2) 0%, transparent 40%)',
                }} />
                <div className="text-center z-10">
                  <MapPin className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="text-lg font-bold">Fleet Location Map</p>
                  <p className="text-sm text-muted-foreground mt-1">GPS tracking for all assets</p>
                </div>
              </div>
            </div>

            {/* Machine locations list */}
            <h2 className="text-lg font-bold">Machine Locations</h2>
            {mockMachines.map(m => (
              <button
                key={m.id}
                onClick={() => navigate(`/pre-inspection/${m.id}`)}
                className="w-full card-elevated p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{m.assetId}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-muted-foreground">{m.gpsCoords.lat.toFixed(3)}°N</p>
                  <p className="text-xs font-mono text-muted-foreground">{m.gpsCoords.lng.toFixed(3)}°W</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Inspections</h2>
              <button
                onClick={() => navigate('/history')}
                className="text-sm text-primary font-semibold"
              >
                View All
              </button>
            </div>

            {mockMachines.filter(m => m.lastInspection).map(m => {
              const insp = m.lastInspection!;
              const total = insp.summary.pass + insp.summary.monitor + insp.summary.fail + insp.summary.normal;
              const healthPct = Math.round(((insp.summary.pass + insp.summary.normal) / total) * 100);
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/pre-inspection/${m.id}`)}
                  className="w-full card-elevated p-4 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold">{m.assetId}</p>
                      <p className="text-xs text-muted-foreground">{insp.date} · {insp.inspector}</p>
                    </div>
                    <span className={`text-xl font-bold font-mono ${healthPct >= 80 ? 'text-status-pass' : healthPct >= 60 ? 'text-status-monitor' : 'text-status-fail'}`}>
                      {healthPct}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-pass" /> {insp.summary.pass}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-monitor" /> {insp.summary.monitor}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-status-fail" /> {insp.summary.fail}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
