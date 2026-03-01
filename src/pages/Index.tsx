import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import {
  Search, History, AlertTriangle, CheckCircle,
  Clock, BarChart3, MapPin, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { getData } from '@/lib/sensor-data';

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

  const totalAlerts = mockMachines.reduce((sum, m) => sum + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((sum, m) => sum + (m.lastInspection?.summary.fail ?? 0), 0);
  const totalMonitor = mockMachines.reduce((sum, m) => sum + (m.lastInspection?.summary.monitor ?? 0), 0);
  const avgFuel = mockMachines.reduce((sum, m) => {
    const fuelData = getData('fuel_level', m.id).filter(d => d.value !== null);
    return sum + (fuelData.length > 0 ? fuelData[fuelData.length - 1].value! : m.fuelLevel);
  }, 0) / mockMachines.length;

  return (
    <div className="min-h-screen bg-background">
      {/* iOS-style large title header */}
      <header className="sticky top-0 z-40 glass-surface">
        <div className="px-4 pt-14 pb-2 flex items-center justify-between">
          <h1 className="ios-large-title text-foreground">Fleet</h1>
          <button
            onClick={() => navigate('/history')}
            className="w-[34px] h-[34px] rounded-full bg-surface-2 flex items-center justify-center"
          >
            <History className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>

        {/* Search bar — iOS style */}
        <div className="px-4 pb-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search fleet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-2 rounded-lg pl-9 pr-4 py-2 ios-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* iOS Segmented Control */}
        <div className="px-4 pb-3">
          <div className="ios-segmented">
            {(['fleet', 'map', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`ios-segmented-btn capitalize ${activeTab === tab ? 'ios-segmented-btn-active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="pb-24">
        {activeTab === 'fleet' && (
          <>
            {/* Stats — iOS grouped inset cards */}
            <div className="ios-section-header mt-2">Overview</div>
            <div className="mx-4 ios-card">
              <div className="grid grid-cols-2">
                <div className="ios-cell py-3 flex-col items-start !gap-0" style={{ borderRight: '0.33px solid hsl(var(--ios-separator))' }}>
                  <span className="ios-caption text-muted-foreground">Failures</span>
                  <span className="text-[28px] font-bold font-mono text-status-fail leading-tight">{totalFails}</span>
                </div>
                <div className="ios-cell py-3 flex-col items-start !gap-0">
                  <span className="ios-caption text-muted-foreground">Monitor</span>
                  <span className="text-[28px] font-bold font-mono text-status-monitor leading-tight">{totalMonitor}</span>
                </div>
              </div>
              <div className="grid grid-cols-2" style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}>
                <div className="ios-cell py-3 flex-col items-start !gap-0" style={{ borderRight: '0.33px solid hsl(var(--ios-separator))' }}>
                  <span className="ios-caption text-muted-foreground">Avg Fuel</span>
                  <span className="text-[28px] font-bold font-mono text-foreground leading-tight">{avgFuel.toFixed(0)}%</span>
                </div>
                <div className="ios-cell py-3 flex-col items-start !gap-0">
                  <span className="ios-caption text-muted-foreground">Active Alerts</span>
                  <span className="text-[28px] font-bold font-mono text-primary leading-tight">{totalAlerts}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="ios-section-header mt-5">Quick Actions</div>
            <div className="mx-4 ios-card">
              <button
                onClick={() => navigate('/history')}
                className="ios-cell py-3.5 w-full active:bg-surface-2 transition-colors"
              >
                <div className="w-[30px] h-[30px] rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-[16px] h-[16px] text-primary" />
                </div>
                <span className="ios-body text-foreground flex-1">Inspection Analytics</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40" />
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className="ios-cell py-3.5 w-full active:bg-surface-2 transition-colors"
                style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}
              >
                <div className="w-[30px] h-[30px] rounded-lg bg-status-pass/15 flex items-center justify-center shrink-0">
                  <MapPin className="w-[16px] h-[16px] text-status-pass" />
                </div>
                <span className="ios-body text-foreground flex-1">Fleet Map</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40" />
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="ios-cell py-3.5 w-full active:bg-surface-2 transition-colors"
                style={{ borderTop: '0.33px solid hsl(var(--ios-separator))' }}
              >
                <div className="w-[30px] h-[30px] rounded-lg bg-status-monitor/15 flex items-center justify-center shrink-0">
                  <Clock className="w-[16px] h-[16px] text-status-monitor" />
                </div>
                <span className="ios-body text-foreground flex-1">Recent Reports</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40" />
              </button>
            </div>

            {/* Machines */}
            <div className="ios-section-header mt-5">
              All Machines · {filteredMachines.length}
            </div>
            <div className="mx-4 ios-card">
              {filteredMachines.map((machine, i) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  showSeparator={i < filteredMachines.length - 1}
                />
              ))}
              {filteredMachines.length === 0 && searchQuery && (
                <div className="p-8 text-center">
                  <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="ios-subhead text-muted-foreground">No machines found</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'map' && (
          <>
            <div className="ios-section-header mt-2">Fleet Locations</div>
            <div className="mx-4 ios-card">
              {/* Placeholder map */}
              <div className="h-[200px] bg-surface-2 flex items-center justify-center relative border-b" style={{ borderBottom: '0.33px solid hsl(var(--ios-separator))' }}>
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--status-fail) / 0.2) 0%, transparent 40%)',
                }} />
                <div className="text-center z-10">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="ios-headline text-foreground">Fleet Location Map</p>
                  <p className="ios-caption text-muted-foreground mt-1">GPS tracking for all assets</p>
                </div>
              </div>
              {mockMachines.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/pre-inspection/${m.id}`)}
                  className="ios-cell py-3 w-full text-left active:bg-surface-2 transition-colors"
                  style={i < mockMachines.length - 1 ? { borderBottom: '0.33px solid hsl(var(--ios-separator))' } : {}}
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                    <MapPin className="w-[16px] h-[16px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="ios-body font-medium text-foreground truncate">{m.assetId}</p>
                    <p className="ios-caption text-muted-foreground truncate">{m.location}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="ios-caption font-mono text-muted-foreground">{m.gpsCoords.lat.toFixed(3)}°N</p>
                    <p className="ios-caption font-mono text-muted-foreground">{m.gpsCoords.lng.toFixed(3)}°W</p>
                  </div>
                  <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="ios-section-header mt-2 flex items-center justify-between pr-4">
              <span>Recent Inspections</span>
              <button onClick={() => navigate('/history')} className="ios-footnote text-primary font-normal normal-case tracking-normal">
                View All
              </button>
            </div>
            <div className="mx-4 ios-card">
              {mockMachines.filter(m => m.lastInspection).map((m, i, arr) => {
                const insp = m.lastInspection!;
                const total = insp.summary.pass + insp.summary.monitor + insp.summary.fail + insp.summary.normal;
                const healthPct = Math.round(((insp.summary.pass + insp.summary.normal) / total) * 100);
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/pre-inspection/${m.id}`)}
                    className="w-full text-left px-4 py-3.5 active:bg-surface-2 transition-colors"
                    style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsl(var(--ios-separator))' } : {}}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="ios-body font-medium text-foreground">{m.assetId}</p>
                        <p className="ios-caption text-muted-foreground">{insp.date} · {insp.inspector}</p>
                      </div>
                      <span className={`text-[22px] font-bold font-mono ${healthPct >= 80 ? 'text-status-pass' : healthPct >= 60 ? 'text-status-monitor' : 'text-status-fail'}`}>
                        {healthPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 ios-caption font-mono mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-pass" /> {insp.summary.pass}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-monitor" /> {insp.summary.monitor}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-status-fail" /> {insp.summary.fail}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
