import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Wrench, Fuel, DollarSign, Activity, Shield, Zap, Clock, BarChart3 } from 'lucide-react';
import { globalFleet, getFleetKPIs, getFleetCostSummary, activeWorkOrders, fleetAlerts } from '@/lib/fleet-data';

function SparklineChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KPICard({ kpi, delay }: { kpi: ReturnType<typeof getFleetKPIs>[0]; delay: number }) {
  const trendUp = kpi.trend > 0;
  const isNegativeMetric = kpi.label === 'Active Faults';
  const trendColor = isNegativeMetric
    ? (trendUp ? 'text-status-fail' : 'text-status-pass')
    : (trendUp ? 'text-status-pass' : 'text-status-fail');
  const sparkColor = isNegativeMetric
    ? (trendUp ? 'hsl(0, 76%, 58%)' : 'hsl(152, 60%, 46%)')
    : (trendUp ? 'hsl(152, 60%, 46%)' : 'hsl(0, 76%, 58%)');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="inset-surface p-3.5"
    >
      <p className="ios-caption text-muted-foreground mb-2">{kpi.label}</p>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[26px] font-bold font-mono text-foreground leading-none">{kpi.value}</span>
          <span className="text-[14px] font-medium text-muted-foreground ml-0.5">{kpi.unit}</span>
        </div>
        <SparklineChart data={kpi.sparkline} color={sparkColor} />
      </div>
      <div className="flex items-center gap-1 mt-2">
        {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className={`ios-caption2 font-medium ${trendColor}`}>
          {trendUp ? '+' : ''}{kpi.trend}{kpi.label === 'Active Faults' ? '' : '%'} {kpi.trendLabel}
        </span>
      </div>
    </motion.div>
  );
}

export function FleetAnalytics() {
  const kpis = getFleetKPIs();
  const costs = getFleetCostSummary();
  const criticalAlerts = fleetAlerts.filter(a => a.severity === 'critical' && !a.acknowledged);
  const urgentWOs = activeWorkOrders.filter(wo => wo.priority === 'urgent' || wo.priority === 'high');
  
  // Equipment type distribution
  const typeDistribution = globalFleet.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Regional distribution
  const regionDistribution = globalFleet.reduce((acc, m) => {
    acc[m.region] = (acc[m.region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Fuel consumption
  const totalFuelRate = globalFleet.reduce((s, m) => s + m.telemetry.fuelConsumptionRate, 0);
  const totalEmissions = globalFleet.reduce((s, m) => s + m.telemetry.co2Emissions, 0);
  
  // Machines needing inspection (>7 days)
  const needsInspection = globalFleet.filter(m => {
    if (!m.lastInspection) return true;
    const daysSince = Math.floor((Date.now() - new Date(m.lastInspection.date).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 5;
  });

  // Predicted failures
  const predictions = globalFleet.filter(m => m.predictedFailure).map(m => ({
    machine: m,
    prediction: m.predictedFailure!,
  })).sort((a, b) => a.prediction.estimatedHours - b.prediction.estimatedHours);

  return (
    <div className="space-y-4 pb-4">
      {/* KPI Grid */}
      <div className="mx-5 ios-card p-3">
        <div className="grid grid-cols-2 gap-2.5">
          {kpis.map((kpi, i) => (
            <KPICard key={kpi.label} kpi={kpi} delay={0.05 + i * 0.05} />
          ))}
        </div>
      </div>

      {/* Unacknowledged Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <>
          <div className="ios-section-header flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-status-fail" />
            Requires Immediate Action
          </div>
          <div className="mx-5 ios-card overflow-hidden">
            {criticalAlerts.map((alert, i) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="px-4 py-3.5"
                style={i < criticalAlerts.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'hsl(var(--status-fail) / 0.15)' }}>
                    <AlertTriangle className="w-4 h-4 text-status-fail" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="ios-subhead font-semibold text-foreground">{alert.title}</p>
                    <p className="ios-caption text-muted-foreground mt-0.5">{alert.assetId}</p>
                    <p className="ios-caption text-muted-foreground/70 mt-1 line-clamp-2">{alert.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Cost Overview */}
      <div className="ios-section-header flex items-center gap-2">
        <DollarSign className="w-3.5 h-3.5 text-primary" />
        Daily Cost Overview
      </div>
      <div className="mx-5 ios-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="inset-surface p-3 text-center">
            <p className="text-[20px] font-bold font-mono text-foreground">${(costs.totalDailyCost / 1000).toFixed(0)}K</p>
            <p className="ios-caption2 text-muted-foreground mt-1">Total OPEX/Day</p>
          </div>
          <div className="inset-surface p-3 text-center">
            <p className="text-[20px] font-bold font-mono text-status-monitor">${(costs.pendingRepairs / 1000).toFixed(0)}K</p>
            <p className="ios-caption2 text-muted-foreground mt-1">Pending Repairs</p>
          </div>
          <div className="inset-surface p-3 text-center">
            <p className="text-[20px] font-bold font-mono text-foreground">${(costs.fuelCostPerDay / 1000).toFixed(0)}K</p>
            <p className="ios-caption2 text-muted-foreground mt-1">Fuel/Day</p>
          </div>
          <div className="inset-surface p-3 text-center">
            <p className="text-[20px] font-bold font-mono text-foreground">{(totalEmissions / 1000).toFixed(1)}t</p>
            <p className="ios-caption2 text-muted-foreground mt-1">CO₂/Day</p>
          </div>
        </div>
      </div>

      {/* Predictive Maintenance */}
      {predictions.length > 0 && (
        <>
          <div className="ios-section-header flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-status-monitor" />
            AI Predictive Maintenance
          </div>
          <div className="mx-5 ios-card overflow-hidden">
            {predictions.map((p, i) => {
              const urgency = p.prediction.estimatedHours < 100 ? 'text-status-fail' : p.prediction.estimatedHours < 500 ? 'text-status-monitor' : 'text-status-pass';
              return (
                <motion.div
                  key={p.machine.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="px-4 py-3.5 flex items-center gap-3"
                  style={i < predictions.length - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
                >
                  <div className="flex-1 min-w-0">
                    <p className="ios-subhead font-medium text-foreground truncate">{p.prediction.component}</p>
                    <p className="ios-caption text-muted-foreground">{p.machine.assetId} · {p.machine.site}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[15px] font-bold font-mono ${urgency}`}>{p.prediction.estimatedHours}h</p>
                    <p className="ios-caption2 text-muted-foreground">{Math.round(p.prediction.confidence * 100)}% conf</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Work Orders */}
      <div className="ios-section-header flex items-center gap-2">
        <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
        Active Work Orders · {activeWorkOrders.length}
      </div>
      <div className="mx-5 ios-card overflow-hidden">
        {activeWorkOrders.slice(0, 5).map((wo, i) => {
          const prioColor = wo.priority === 'urgent' ? 'text-status-fail bg-status-fail/15' : wo.priority === 'high' ? 'text-status-monitor bg-status-monitor/15' : 'text-muted-foreground bg-muted/50';
          const statusLabel = wo.status.replace('_', ' ');
          return (
            <motion.div
              key={wo.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="px-4 py-3.5"
              style={i < Math.min(activeWorkOrders.length, 5) - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="ios-subhead font-medium text-foreground truncate">{wo.title}</p>
                  <p className="ios-caption text-muted-foreground">{wo.assetId} · {wo.assignedTo || 'Unassigned'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full ios-caption2 font-semibold capitalize shrink-0 ${prioColor}`}>
                  {wo.priority}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="ios-caption2 text-muted-foreground capitalize">{statusLabel}</span>
                <span className="ios-caption2 text-muted-foreground">·</span>
                <span className="ios-caption2 text-muted-foreground font-mono">${(wo.estimatedCost / 1000).toFixed(1)}K</span>
                <span className="ios-caption2 text-muted-foreground">·</span>
                <span className="ios-caption2 text-muted-foreground">Due {wo.dueDate}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Equipment Distribution */}
      <div className="ios-section-header flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
        Fleet Composition
      </div>
      <div className="mx-5 ios-card p-4">
        <div className="space-y-2.5">
          {Object.entries(typeDistribution).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
            const pct = Math.round((count / globalFleet.length) * 100);
            return (
              <div key={type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="ios-caption font-medium text-foreground capitalize">{type}s</span>
                  <span className="ios-caption2 font-mono text-muted-foreground">{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted) / 0.5)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: 'hsl(var(--primary))' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inspection Schedule */}
      {needsInspection.length > 0 && (
        <>
          <div className="ios-section-header flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-status-monitor" />
            Overdue Inspections · {needsInspection.length}
          </div>
          <div className="mx-5 ios-card overflow-hidden">
            {needsInspection.slice(0, 4).map((m, i) => {
              const daysSince = m.lastInspection
                ? Math.floor((Date.now() - new Date(m.lastInspection.date).getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              return (
                <div
                  key={m.id}
                  className="px-4 py-3 flex items-center gap-3"
                  style={i < Math.min(needsInspection.length, 4) - 1 ? { borderBottom: '0.33px solid hsl(var(--border) / 0.3)' } : {}}
                >
                  <Shield className="w-4 h-4 text-status-monitor shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="ios-subhead font-medium text-foreground truncate">{m.assetId}</p>
                    <p className="ios-caption text-muted-foreground">{m.site}</p>
                  </div>
                  <span className="ios-caption font-mono text-status-monitor">{daysSince}d ago</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Regional Summary */}
      <div className="ios-section-header flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        By Region
      </div>
      <div className="mx-5 ios-card p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(regionDistribution).map(([region, count]) => (
            <div key={region} className="inset-surface p-3 text-center">
              <p className="text-[18px] font-bold font-mono text-foreground">{count}</p>
              <p className="ios-caption2 text-muted-foreground mt-0.5">{region}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fuel & Emissions */}
      <div className="ios-section-header flex items-center gap-2">
        <Fuel className="w-3.5 h-3.5 text-muted-foreground" />
        Energy & Emissions
      </div>
      <div className="mx-5 ios-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="inset-surface p-3">
            <p className="text-[18px] font-bold font-mono text-foreground">{totalFuelRate.toFixed(0)}</p>
            <p className="ios-caption2 text-muted-foreground mt-0.5">L/hr Fleet Total</p>
          </div>
          <div className="inset-surface p-3">
            <p className="text-[18px] font-bold font-mono text-foreground">{(totalEmissions).toFixed(0)}</p>
            <p className="ios-caption2 text-muted-foreground mt-0.5">kg CO₂/hr</p>
          </div>
          <div className="inset-surface p-3">
            <p className="text-[18px] font-bold font-mono text-foreground">{(totalFuelRate * 10).toFixed(0)}</p>
            <p className="ios-caption2 text-muted-foreground mt-0.5">L/Day (10hr)</p>
          </div>
          <div className="inset-surface p-3">
            <p className="text-[18px] font-bold font-mono text-status-pass">A-</p>
            <p className="ios-caption2 text-muted-foreground mt-0.5">ESG Rating</p>
          </div>
        </div>
      </div>
    </div>
  );
}
