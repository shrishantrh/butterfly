import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { FleetMap } from '@/components/FleetMap';
import {
  Search, History, BarChart3, MapPin, Clock, ChevronRight, Fuel, AlertTriangle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { getData } from '@/lib/sensor-data';
import { motion, AnimatePresence } from 'framer-motion';

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'fleet' | 'map' | 'history'>('fleet');
  const [direction, setDirection] = useState(0);
  const tabOrder = ['fleet', 'map', 'history'] as const;

  const switchTab = (tab: typeof activeTab) => {
    const oldIdx = tabOrder.indexOf(activeTab);
    const newIdx = tabOrder.indexOf(tab);
    setDirection(newIdx > oldIdx ? 1 : -1);
    setActiveTab(tab);
  };

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
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface">
        <div className="px-5 pt-14 pb-2.5 flex items-center justify-between">
          <h1 className="ios-large-title text-foreground">Fleet</h1>
          <button
            onClick={() => navigate('/history')}
            className="glass-icon-btn w-[38px] h-[38px]"
          >
            <History className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Search fleet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl pl-10 pr-4 py-2.5 ios-body text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all glass-input"
            />
          </div>
        </div>

        {/* Segmented Control */}
        <div className="px-5 pb-3.5">
          <div className="ios-segmented">
            {tabOrder.map(tab => (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`ios-segmented-btn capitalize ${activeTab === tab ? 'ios-segmented-btn-active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="pb-24 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {activeTab === 'fleet' && (
              <>
                {/* Fleet Status Bar */}
                <div className="mx-5 mt-3 ios-card">
                  <div className="flex items-stretch">
                    {/* Health ring */}
                    <div className="flex items-center justify-center px-5 py-4" style={{ borderRight: '1px solid hsla(210, 20%, 50%, 0.06)' }}>
                      <div className="relative w-[64px] h-[64px]">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsla(210, 20%, 40%, 0.08)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--status-pass))" strokeWidth="3"
                            strokeDasharray={`${((mockMachines.length - totalFails) / mockMachines.length) * 97.4} 97.4`}
                            strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[18px] font-bold font-mono text-foreground leading-none">
                            {mockMachines.length - totalFails}
                          </span>
                          <span className="ios-caption2 text-muted-foreground">/{mockMachines.length}</span>
                        </div>
                      </div>
                    </div>
                    {/* Metrics */}
                    <div className="flex-1 flex flex-col justify-center py-3 px-4 gap-2.5">
                      {[
                        { label: 'Failures', value: totalFails, color: 'hsl(var(--status-fail))', dot: 'bg-status-fail' },
                        { label: 'Monitor', value: totalMonitor, color: 'hsl(var(--status-monitor))', dot: 'bg-status-monitor' },
                        { label: 'Alerts', value: totalAlerts, color: 'hsl(var(--sensor))', dot: 'bg-sensor' },
                      ].map(row => (
                        <div key={row.label} className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${row.dot}`} />
                          <span className="ios-subhead text-muted-foreground flex-1">{row.label}</span>
                          <span className="ios-body font-mono font-bold" style={{ color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Fuel */}
                    <div className="flex flex-col items-center justify-center px-5 py-4" style={{ borderLeft: '1px solid hsla(210, 20%, 50%, 0.06)' }}>
                      <Fuel className="w-4 h-4 text-primary mb-1" />
                      <span className="text-[20px] font-bold font-mono text-primary leading-none">{avgFuel.toFixed(0)}</span>
                      <span className="ios-caption2 text-muted-foreground">% avg</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="ios-section-header mt-6">Quick Actions</div>
                <div className="mx-5 ios-card">
                  {[
                    { icon: <BarChart3 className="w-[16px] h-[16px] text-primary" />, label: 'Inspection Analytics', bg: 'bg-primary/10', onClick: () => navigate('/history') },
                    { icon: <MapPin className="w-[16px] h-[16px] text-status-pass" />, label: 'Fleet Map', bg: 'bg-status-pass/10', onClick: () => switchTab('map') },
                    { icon: <Clock className="w-[16px] h-[16px] text-status-monitor" />, label: 'Recent Reports', bg: 'bg-status-monitor/10', onClick: () => switchTab('history') },
                  ].map((action, i, arr) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
                      style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(210, 20%, 40%, 0.08)' } : {}}
                    >
                      <div className={`w-[32px] h-[32px] rounded-[10px] ${action.bg} flex items-center justify-center shrink-0`}>
                        {action.icon}
                      </div>
                      <span className="ios-body text-foreground flex-1 text-left">{action.label}</span>
                      <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/20" />
                    </button>
                  ))}
                </div>

                {/* Machines */}
                <div className="ios-section-header mt-6">All Machines · {filteredMachines.length}</div>
                <div className="mx-5 ios-card">
                  {filteredMachines.map((machine, i) => (
                    <motion.div
                      key={machine.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                    >
                      <MachineCard machine={machine} showSeparator={i < filteredMachines.length - 1} />
                    </motion.div>
                  ))}
                  {filteredMachines.length === 0 && searchQuery && (
                    <div className="p-10 text-center">
                      <Search className="w-6 h-6 text-muted-foreground/15 mx-auto mb-2" />
                      <p className="ios-subhead text-muted-foreground">No machines found</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'map' && (
              <>
                <div className="ios-section-header mt-3">Fleet Locations</div>
                <FleetMap />
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
                      <motion.button
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
                        onClick={() => navigate(`/pre-inspection/${m.id}`)}
                        className="w-full text-left px-4 py-4 active:bg-white/[0.03] transition-colors"
                        style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(210, 20%, 40%, 0.08)' } : {}}
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
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
