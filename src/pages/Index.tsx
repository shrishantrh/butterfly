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
        <div className="px-5 pt-14 pb-2.5 flex items-center justify-between">
          <h1 className="ios-large-title text-foreground">Fleet</h1>
          <button
            onClick={() => navigate('/history')}
            className="w-[36px] h-[36px] rounded-full bg-white/[0.06] backdrop-blur-xl flex items-center justify-center ring-1 ring-white/[0.06]"
          >
            <History className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search fleet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl pl-10 pr-4 py-2.5 ios-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              style={{
                background: 'hsla(220, 10%, 12%, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '0.5px solid hsla(220, 10%, 24%, 0.2)',
              }}
            />
          </div>
        </div>

        {/* iOS Segmented Control */}
        <div className="px-5 pb-3.5">
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
            {/* Stats */}
            <div className="ios-section-header mt-3">Overview</div>
            <div className="mx-5 ios-card">
              <div className="grid grid-cols-2">
                <div className="ios-cell py-4 flex-col items-start !gap-0" style={{ borderRight: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
                  <span className="ios-caption text-muted-foreground">Failures</span>
                  <span className="text-[28px] font-bold font-mono text-status-fail leading-tight mt-0.5">{totalFails}</span>
                </div>
                <div className="ios-cell py-4 flex-col items-start !gap-0">
                  <span className="ios-caption text-muted-foreground">Monitor</span>
                  <span className="text-[28px] font-bold font-mono text-status-monitor leading-tight mt-0.5">{totalMonitor}</span>
                </div>
              </div>
              <div className="grid grid-cols-2" style={{ borderTop: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
                <div className="ios-cell py-4 flex-col items-start !gap-0" style={{ borderRight: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
                  <span className="ios-caption text-muted-foreground">Avg Fuel</span>
                  <span className="text-[28px] font-bold font-mono text-foreground leading-tight mt-0.5">{avgFuel.toFixed(0)}%</span>
                </div>
                <div className="ios-cell py-4 flex-col items-start !gap-0">
                  <span className="ios-caption text-muted-foreground">Active Alerts</span>
                  <span className="text-[28px] font-bold font-mono text-primary leading-tight mt-0.5">{totalAlerts}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="ios-section-header mt-6">Quick Actions</div>
            <div className="mx-5 ios-card">
              <button
                onClick={() => navigate('/history')}
                className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
              >
                <div className="w-[32px] h-[32px] rounded-[10px] bg-primary/12 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-[16px] h-[16px] text-primary" />
                </div>
                <span className="ios-body text-foreground flex-1">Inspection Analytics</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/25" />
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
              >
                <div className="w-[32px] h-[32px] rounded-[10px] bg-status-pass/12 flex items-center justify-center shrink-0">
                  <MapPin className="w-[16px] h-[16px] text-status-pass" />
                </div>
                <span className="ios-body text-foreground flex-1">Fleet Map</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/25" />
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
              >
                <div className="w-[32px] h-[32px] rounded-[10px] bg-status-monitor/12 flex items-center justify-center shrink-0">
                  <Clock className="w-[16px] h-[16px] text-status-monitor" />
                </div>
                <span className="ios-body text-foreground flex-1">Recent Reports</span>
                <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/25" />
              </button>
            </div>

            {/* Machines */}
            <div className="ios-section-header mt-6">
              All Machines · {filteredMachines.length}
            </div>
            <div className="mx-5 ios-card">
              {filteredMachines.map((machine, i) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  showSeparator={i < filteredMachines.length - 1}
                />
              ))}
              {filteredMachines.length === 0 && searchQuery && (
                <div className="p-10 text-center">
                  <Search className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="ios-subhead text-muted-foreground">No machines found</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'map' && (
          <>
            <div className="ios-section-header mt-3">Fleet Locations</div>
            <div className="mx-5 ios-card">
              {/* Placeholder map */}
              <div className="h-[200px] flex items-center justify-center relative" style={{ borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
                <div className="absolute inset-0 opacity-15" style={{
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
                  className="ios-cell py-3.5 w-full text-left active:bg-white/[0.03] transition-colors"
                  style={i < mockMachines.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}
                >
                  <div className="w-[32px] h-[32px] rounded-[10px] bg-primary/12 flex items-center justify-center shrink-0">
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
                  <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/25 shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="ios-section-header mt-3 flex items-center justify-between pr-5">
              <span>Recent Inspections</span>
              <button onClick={() => navigate('/history')} className="ios-footnote text-primary font-normal normal-case tracking-normal">
                View All
              </button>
            </div>
            <div className="mx-5 ios-card">
              {mockMachines.filter(m => m.lastInspection).map((m, i, arr) => {
                const insp = m.lastInspection!;
                const total = insp.summary.pass + insp.summary.monitor + insp.summary.fail + insp.summary.normal;
                const healthPct = Math.round(((insp.summary.pass + insp.summary.normal) / total) * 100);
                return (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/pre-inspection/${m.id}`)}
                    className="w-full text-left px-4 py-4 active:bg-white/[0.03] transition-colors"
                    style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="ios-body font-medium text-foreground">{m.assetId}</p>
                        <p className="ios-caption text-muted-foreground mt-0.5">{insp.date} · {insp.inspector}</p>
                      </div>
                      <span className={`text-[22px] font-bold font-mono ${healthPct >= 80 ? 'text-status-pass' : healthPct >= 60 ? 'text-status-monitor' : 'text-status-fail'}`}>
                        {healthPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 ios-caption font-mono mt-1.5">
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
