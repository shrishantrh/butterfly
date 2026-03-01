import { mockMachines } from '@/lib/mock-data';
import { FleetMap } from '@/components/FleetMap';
import {
  Search, History, ChevronRight, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import excavatorHero from '@/assets/cat-320-hero.jpg';
import appIcon from '/app-icon.png';

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
  const [selectedMachineId, setSelectedMachineId] = useState(mockMachines[0]?.id);
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

  const selectedMachine = mockMachines.find(m => m.id === selectedMachineId) || mockMachines[0];

  const statusColor = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'hsl(var(--status-fail))';
    if (m.activeFaultCodes.length > 0) return 'hsl(var(--status-monitor))';
    return 'hsl(var(--status-pass))';
  };

  const statusLabel = (m: typeof mockMachines[0]) => {
    if (m.activeFaultCodes.some(f => f.severity === 'critical')) return 'Critical';
    if (m.activeFaultCodes.length > 0) return 'Warning';
    return 'Online';
  };

  const sketchfabUrl = selectedMachine.sketchfabId
    ? `https://sketchfab.com/models/${selectedMachine.sketchfabId}/embed?autostart=1&ui_hint=0&ui_theme=dark&dnt=1&ui_infos=0&ui_watermark_link=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_inspector=0&ui_fullscreen=0&ui_annotations=0&ui_vr=0&ui_color=FFCD11&preload=1&transparent=1&camera=0&autospin=0.08`
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface">
        <div className="px-5 pt-14 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={appIcon}
              alt="Butterfly"
              className="w-[34px] h-[34px] rounded-[10px] shrink-0"
              style={{
                boxShadow: '0 2px 8px hsl(var(--background) / 0.4)',
                border: '0.5px solid hsl(var(--border) / 0.3)',
              }}
            />
            <h1 className="ios-large-title text-foreground">Fleet</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/history')}
              className="glass-icon-btn w-[38px] h-[38px]"
            >
              <History className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </div>
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
                {/* 3D Model Hero */}
                {sketchfabUrl && (
                  <div className="mx-5 mt-3 ios-card overflow-hidden">
                    <div className="relative" style={{ height: 300 }}>
                      <AnimatePresence mode="wait">
                        <motion.iframe
                          key={selectedMachine.sketchfabId}
                          title={`${selectedMachine.model} 3D Model`}
                          src={sketchfabUrl}
                          className="absolute inset-0 w-full h-full"
                          style={{ border: 'none', background: 'transparent' }}
                          allow="autoplay; fullscreen; xr-spatial-tracking"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                        />
                      </AnimatePresence>

                      {/* Gradient overlays */}
                      <div className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(180deg, hsl(var(--background) / 0.25) 0%, transparent 15%, transparent 85%, hsl(var(--background) / 0.4) 100%)',
                        }}
                      />

                      {/* Title badge */}
                      <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl"
                        style={{
                          background: 'hsl(var(--card) / 0.8)',
                          backdropFilter: 'blur(20px)',
                          border: '0.5px solid hsl(var(--border) / 0.3)',
                        }}
                      >
                        <p className="text-[10px] font-semibold text-foreground tracking-wide uppercase">
                          {selectedMachine.assetId} · 3D
                        </p>
                      </div>

                      {/* Status badge */}
                      <div className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
                        style={{
                          background: 'hsl(var(--card) / 0.8)',
                          backdropFilter: 'blur(20px)',
                          border: `0.5px solid ${statusColor(selectedMachine)}30`,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: statusColor(selectedMachine) }} />
                        <span className="text-[10px] font-semibold" style={{ color: statusColor(selectedMachine) }}>
                          {statusLabel(selectedMachine)}
                        </span>
                      </div>
                    </div>

                    {/* Machine info + inspect button */}
                    <div className="px-4 py-3.5 flex items-center justify-between"
                      style={{ borderTop: '0.33px solid hsl(var(--border) / 0.3)' }}
                    >
                      <div>
                        <p className="ios-body font-semibold text-foreground">
                          {selectedMachine.model.replace('Hydraulic Excavator', '').trim()}
                        </p>
                        <p className="ios-caption text-muted-foreground mt-0.5">
                          {selectedMachine.smuHours.toLocaleString()} hrs · {selectedMachine.location}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/pre-inspection/${selectedMachine.id}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-95"
                        style={{
                          background: 'hsl(var(--primary))',
                          color: 'hsl(var(--primary-foreground))',
                          boxShadow: '0 4px 14px hsl(var(--primary) / 0.3)',
                        }}
                      >
                        Inspect
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Machine list */}
                <div className="ios-section-header mt-3">Machines · {filteredMachines.length}</div>
                <div className="mx-5 ios-card">
                  {filteredMachines.map((machine, i) => {
                    const isSelected = machine.id === selectedMachineId;
                    const color = statusColor(machine);
                    return (
                      <motion.button
                        key={machine.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.04, duration: 0.3 }}
                        onClick={() => setSelectedMachineId(machine.id)}
                        className="w-full text-left flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-foreground/[0.03]"
                        style={{
                          ...(i < filteredMachines.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}),
                          ...(isSelected ? { background: 'hsl(var(--primary) / 0.06)' } : {}),
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="w-[52px] h-[52px] rounded-[14px] overflow-hidden shrink-0 relative"
                          style={{
                            background: 'linear-gradient(145deg, hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.3))',
                            border: isSelected ? `1.5px solid ${color}40` : '0.5px solid hsl(var(--border) / 0.2)',
                            boxShadow: '0 2px 8px -2px hsl(var(--background) / 0.4)',
                          }}
                        >
                          <img src={excavatorHero} alt={machine.model} className="w-full h-full object-cover" />
                          {isSelected && (
                            <motion.div
                              layoutId="machine-select-ring"
                              className="absolute inset-0 rounded-[14px]"
                              style={{ border: `2px solid ${color}60` }}
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="ios-body font-semibold text-foreground truncate">
                            {machine.model.replace('Hydraulic Excavator', '').trim()}
                          </p>
                          <p className="ios-subhead text-muted-foreground truncate mt-0.5">
                            {machine.assetId} · {machine.smuHours.toLocaleString()} hrs
                          </p>
                          <div className="flex items-center gap-2.5 mt-1">
                            <span className="ios-caption font-medium" style={{ color }}>
                              {machine.activeFaultCodes.length > 0 ? 'Needs Attention' : 'Ready'}
                            </span>
                            {machine.activeFaultCodes.length > 0 && (
                              <span className="ios-caption font-medium text-status-fail flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {machine.activeFaultCodes.length} Fault{machine.activeFaultCodes.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/20 shrink-0" />
                      </motion.button>
                    );
                  })}
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
                        className="w-full text-left px-4 py-4 active:bg-foreground/[0.03] transition-colors"
                        style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
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
