import { globalFleet, fleetAlerts, fleetSites } from '@/lib/fleet-data';
import { Globe3D } from '@/components/Globe3D';
import { FleetAnalytics } from '@/components/FleetAnalytics';
import { FleetAIChat } from '@/components/FleetAIChat';
import { GlobalFleetList } from '@/components/GlobalFleetList';
import { LiveAlertsFeed } from '@/components/LiveAlertsFeed';
import {
  Search, History, ChevronRight, AlertTriangle, ArrowRight, Globe, BarChart3, MessageSquare, Bell, List,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '@/components/ThemeToggle';
import appIcon from '/app-icon.png';

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

type Tab = 'globe' | 'analytics' | 'fleet' | 'alerts' | 'ai';

const tabs: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: 'globe', label: 'Globe', icon: Globe },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'fleet', label: 'Fleet', icon: List },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'ai', label: 'AI', icon: MessageSquare },
];

const Index = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('globe');
  const [direction, setDirection] = useState(0);
  const tabOrder = tabs.map(t => t.id);

  const switchTab = (tab: Tab) => {
    const oldIdx = tabOrder.indexOf(activeTab);
    const newIdx = tabOrder.indexOf(tab);
    setDirection(newIdx > oldIdx ? 1 : -1);
    setActiveTab(tab);
  };

  const criticalCount = fleetAlerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const onlineCount = globalFleet.filter(m => m.status === 'online' || m.status === 'transit' || m.status === 'idle').length;

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
            <div>
              <h1 className="text-[22px] font-bold text-foreground leading-tight">Butterfly</h1>
              <p className="ios-caption2 text-muted-foreground">
                {onlineCount}/{globalFleet.length} online · {fleetSites.length} sites
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => navigate('/history')}
              className="glass-icon-btn w-[38px] h-[38px] relative"
            >
              <History className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-3 pb-2.5">
          <div className="flex gap-0.5 p-[3px] rounded-2xl" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border) / 0.3)' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const showBadge = tab.id === 'alerts' && criticalCount > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-[7px] rounded-xl transition-all duration-300 relative ${
                    isActive ? 'ios-segmented-btn-active' : ''
                  }`}
                  style={!isActive ? { color: 'hsl(var(--muted-foreground))' } : {}}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-semibold">{tab.label}</span>
                  {showBadge && (
                    <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-status-fail flex items-center justify-center text-[9px] font-bold text-white">
                      {criticalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="pb-8 overflow-hidden">
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
            {activeTab === 'globe' && (
              <>
                <div className="ios-section-header mt-3">Global Operations</div>
                <Globe3D onSiteSelect={(site) => console.log('Navigate to site:', site.name)} />

                {/* Quick stats below globe */}
                <div className="mx-5 mt-4 grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Sites', value: fleetSites.length, color: 'text-foreground' },
                    { label: 'Machines', value: globalFleet.length, color: 'text-foreground' },
                    { label: 'Alerts', value: fleetAlerts.filter(a => a.severity === 'critical').length, color: 'text-status-fail' },
                  ].map(s => (
                    <div key={s.label} className="ios-card p-3 text-center">
                      <p className={`text-[22px] font-bold font-mono ${s.color}`}>{s.value}</p>
                      <p className="ios-caption2 text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Site list */}
                <div className="ios-section-header mt-4">Active Sites</div>
                <div className="mx-5 ios-card overflow-hidden">
                  {fleetSites.map((site, i) => {
                    const sColor = site.status === 'critical' ? 'bg-status-fail' : site.status === 'warning' ? 'bg-status-monitor' : 'bg-status-pass';
                    return (
                      <motion.div
                        key={site.name}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.04 }}
                        className="px-4 py-3.5 flex items-center gap-3 active:bg-foreground/[0.03] transition-colors"
                        style={i < fleetSites.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${sColor} shrink-0 ${site.status === 'critical' ? 'animate-pulse' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <p className="ios-subhead font-semibold text-foreground truncate">{site.name}</p>
                          <p className="ios-caption text-muted-foreground">{site.country} · {site.machineCount} machines</p>
                        </div>
                        {site.production && (
                          <span className="ios-caption font-mono text-muted-foreground shrink-0">
                            {Math.round(site.production.actual / site.production.target * 100)}%
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'analytics' && (
              <>
                <div className="ios-section-header mt-3">Fleet Intelligence</div>
                <FleetAnalytics />
              </>
            )}

            {activeTab === 'fleet' && (
              <>
                <div className="ios-section-header mt-3">Global Fleet</div>
                <GlobalFleetList />
              </>
            )}

            {activeTab === 'alerts' && (
              <>
                <div className="ios-section-header mt-3">Live Alerts</div>
                <LiveAlertsFeed />
              </>
            )}

            {activeTab === 'ai' && (
              <FleetAIChat />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Index;
