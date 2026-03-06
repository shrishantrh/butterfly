import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle, Fuel, Activity, MapPin, Search, Filter } from 'lucide-react';
import { globalFleet, type FleetMachine } from '@/lib/fleet-data';

const typeEmoji: Record<string, string> = {
  excavator: '🏗️', dozer: '🚜', loader: '⛏️', telehandler: '🏗️',
  truck: '🚛', crane: '🏗️', grader: '🛤️', compactor: '🔨',
  drill: '⛏️', generator: '⚡',
};

const statusStyle = (s: FleetMachine['status']) => {
  switch (s) {
    case 'online': return { label: 'Online', color: 'text-status-pass', dot: 'bg-status-pass' };
    case 'transit': return { label: 'In Transit', color: 'text-sensor', dot: 'bg-sensor' };
    case 'idle': return { label: 'Idle', color: 'text-status-monitor', dot: 'bg-status-monitor' };
    case 'maintenance': return { label: 'Maintenance', color: 'text-status-monitor', dot: 'bg-status-monitor' };
    case 'critical': return { label: 'Critical', color: 'text-status-fail', dot: 'bg-status-fail' };
    case 'offline': return { label: 'Offline', color: 'text-muted-foreground', dot: 'bg-muted-foreground' };
    default: return { label: s, color: 'text-muted-foreground', dot: 'bg-muted-foreground' };
  }
};

export function GlobalFleetList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const types = ['all', ...Array.from(new Set(globalFleet.map(m => m.type)))];
  const statuses = ['all', ...Array.from(new Set(globalFleet.map(m => m.status)))];

  const filtered = globalFleet.filter(m => {
    if (search && !m.assetId.toLowerCase().includes(search.toLowerCase()) && !m.model.toLowerCase().includes(search.toLowerCase()) && !m.site.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="pb-4">
      {/* Search */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search by asset, model, or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl pl-10 pr-4 py-2.5 ios-subhead text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 glass-input"
          />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="px-5 mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-2.5 py-1 rounded-full ios-caption2 font-semibold capitalize whitespace-nowrap transition-all ${
              typeFilter === t ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
            style={{
              background: typeFilter === t ? 'hsl(var(--primary))' : 'hsl(var(--muted) / 0.5)',
              border: typeFilter === t ? 'none' : '0.5px solid hsl(var(--border) / 0.3)',
            }}
          >
            {t === 'all' ? `All (${globalFleet.length})` : `${t}s`}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="px-5 mb-3 flex gap-1.5 overflow-x-auto pb-1">
        {statuses.map(s => {
          const count = s === 'all' ? globalFleet.length : globalFleet.filter(m => m.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full ios-caption2 font-semibold capitalize whitespace-nowrap transition-all ${
                statusFilter === s ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
              style={{
                background: statusFilter === s ? 'hsl(var(--primary))' : 'hsl(var(--muted) / 0.5)',
                border: statusFilter === s ? 'none' : '0.5px solid hsl(var(--border) / 0.3)',
              }}
            >
              {s === 'all' ? 'All' : s} ({count})
            </button>
          );
        })}
      </div>

      {/* Fleet count */}
      <div className="ios-section-header">
        Showing {filtered.length} of {globalFleet.length} Machines
      </div>

      {/* Machine list */}
      <div className="mx-5 ios-card overflow-hidden">
        {filtered.map((machine, i) => {
          const st = statusStyle(machine.status);
          const healthScore = machine.lastInspection?.healthScore;
          const healthColor = healthScore ? (healthScore >= 80 ? 'text-status-pass' : healthScore >= 60 ? 'text-status-monitor' : 'text-status-fail') : 'text-muted-foreground';

          return (
            <motion.button
              key={machine.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.05 + i * 0.02, 0.5), duration: 0.25 }}
              onClick={() => {
                // Navigate to the appropriate page based on machine type
                const navId = machine.sketchfabId ? machine.id : 'cat-320-001';
                navigate(`/pre-inspection/${navId}`);
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3.5 active:bg-foreground/[0.03] transition-colors"
              style={i < filtered.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
            >
              {/* Type icon */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                {typeEmoji[machine.type] || '🏗️'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="ios-subhead font-semibold text-foreground truncate">
                    {machine.assetId}
                  </p>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot} shrink-0 ${machine.status === 'critical' ? 'animate-pulse' : ''}`} />
                </div>
                <p className="ios-caption text-muted-foreground truncate mt-0.5">
                  {machine.model.replace('Hydraulic Excavator', 'Exc.').replace('Mining Truck', 'Truck').replace('Wheel Loader', 'Loader')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="ios-caption2 text-muted-foreground/70 flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {machine.site}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="text-right shrink-0 space-y-0.5">
                {healthScore && (
                  <p className={`text-[15px] font-bold font-mono ${healthColor}`}>{healthScore}%</p>
                )}
                <div className="flex items-center gap-1 justify-end">
                  <Fuel className="w-2.5 h-2.5 text-muted-foreground/50" />
                  <span className="ios-caption2 font-mono text-muted-foreground">{machine.fuelLevel}%</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Activity className="w-2.5 h-2.5 text-muted-foreground/50" />
                  <span className="ios-caption2 font-mono text-muted-foreground">{machine.utilizationToday}%</span>
                </div>
              </div>

              {machine.activeFaultCodes.length > 0 && (
                <div className="flex items-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-fail" />
                </div>
              )}

              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 shrink-0" />
            </motion.button>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-10 text-center">
            <Search className="w-6 h-6 text-muted-foreground/15 mx-auto mb-2" />
            <p className="ios-subhead text-muted-foreground">No machines match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
