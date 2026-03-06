import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Wrench, Shield, MapPin, Cloud, BarChart3, ChevronDown, ChevronUp, Clock, CheckCircle2 } from 'lucide-react';
import { fleetAlerts, type FleetAlert } from '@/lib/fleet-data';
import { formatDistanceToNow } from 'date-fns';

const typeIcon = (type: FleetAlert['type']) => {
  switch (type) {
    case 'fault': return AlertTriangle;
    case 'maintenance': return Wrench;
    case 'safety': return Shield;
    case 'geofence': return MapPin;
    case 'weather': return Cloud;
    case 'production': return BarChart3;
    case 'compliance': return Shield;
    default: return AlertTriangle;
  }
};

const severityStyle = (s: FleetAlert['severity']) => {
  switch (s) {
    case 'critical': return { bg: 'hsl(var(--status-fail) / 0.12)', color: 'text-status-fail', dot: 'bg-status-fail' };
    case 'warning': return { bg: 'hsl(var(--status-monitor) / 0.12)', color: 'text-status-monitor', dot: 'bg-status-monitor' };
    default: return { bg: 'hsl(var(--muted) / 0.5)', color: 'text-muted-foreground', dot: 'bg-muted-foreground' };
  }
};

export function LiveAlertsFeed() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const filtered = fleetAlerts.filter(a => filter === 'all' || a.severity === filter);

  return (
    <div className="pb-4">
      {/* Filter chips */}
      <div className="px-5 mb-3 flex gap-2 overflow-x-auto">
        {(['all', 'critical', 'warning', 'info'] as const).map(f => {
          const count = f === 'all' ? fleetAlerts.length : fleetAlerts.filter(a => a.severity === f).length;
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full ios-caption font-semibold capitalize whitespace-nowrap transition-all ${
                isActive ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
              style={{
                background: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted) / 0.5)',
                border: isActive ? 'none' : '0.5px solid hsl(var(--border) / 0.3)',
              }}
            >
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      <div className="mx-5 ios-card overflow-hidden">
        <AnimatePresence>
          {filtered.map((alert, i) => {
            const Icon = typeIcon(alert.type);
            const style = severityStyle(alert.severity);
            const isExpanded = expandedId === alert.id;
            const timeAgo = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true });

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="transition-colors active:bg-foreground/[0.02]"
                style={i < filtered.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: style.bg }}
                  >
                    <Icon className={`w-4 h-4 ${style.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${alert.severity === 'critical' && !alert.acknowledged ? 'animate-pulse' : ''}`} />
                      <p className="ios-subhead font-semibold text-foreground truncate">{alert.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="ios-caption text-muted-foreground">{alert.assetId}</span>
                      <span className="ios-caption text-muted-foreground/50">·</span>
                      <span className="ios-caption text-muted-foreground/70">{timeAgo}</span>
                    </div>
                  </div>
                  <div className="shrink-0 mt-1">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/30" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pl-[60px]">
                        <p className="ios-caption text-muted-foreground mb-3">{alert.message}</p>
                        <div className="flex items-center gap-3">
                          {alert.acknowledged ? (
                            <span className="flex items-center gap-1 ios-caption2 text-status-pass">
                              <CheckCircle2 className="w-3 h-3" /> Acknowledged
                            </span>
                          ) : (
                            <button className="px-3 py-1.5 rounded-lg ios-caption font-semibold text-primary-foreground"
                              style={{ background: 'hsl(var(--primary))' }}>
                              Acknowledge
                            </button>
                          )}
                          {alert.actionRequired && (
                            <button className="px-3 py-1.5 rounded-lg ios-caption font-semibold text-foreground glass-btn-secondary">
                              Create Work Order
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
