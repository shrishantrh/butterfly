import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { mockMachines } from '@/lib/mock-data';
import excavatorHero from '@/assets/cat-320-hero.jpg';
import {
  AlertTriangle, Clock, Fuel, MapPin, Activity,
  Droplets, Play, Cpu, Upload, History,
  ChevronRight, ChevronLeft, Share2,
} from 'lucide-react';
import { SlideToInspect } from '@/components/SlideToInspect';
import { SENSORS, getData, getAlert } from '@/lib/sensor-data';
import type { DataPoint } from '@/lib/sensor-data';
import { useLiveSensorData, useLiveTick } from '@/hooks/useLiveSensorData';

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ k, machineId, tick }: { k: string; machineId?: string; tick?: number }) {
  const allData = getData(k, machineId);
  const data = allData.filter(d => d.value !== null);
  if (!data.length) return null;
  const vs = data.map(d => d.value as number);
  const min = Math.min(...vs), range = Math.max(...vs) - min || 1;
  const W = 300, H = 80;
  const pts = data.map((d, i, a) =>
    `${((i/(a.length-1))*W).toFixed(2)},${(H - ((d.value! - min)/range) * (H - 8) - 4).toFixed(2)}`
  ).join(' ');
  const strokeCol = data.some(d => d.status === 'critical')
    ? 'hsl(var(--status-fail))' : data.some(d => d.status === 'warning') ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-pass))';
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display:'block' }}>
      <defs>
        <linearGradient id={`sg-${k}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeCol} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={strokeCol} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#sg-${k})`} />
      <polyline points={pts} fill="none" stroke={strokeCol} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function DotSummary({ counts, size = 'md' }: { counts: Record<string,number>; size?: 'sm'|'md' }) {
  const dotCls = size === 'sm' ? 'w-[7px] h-[7px]' : 'w-[9px] h-[9px]';
  const entries: [string, string, string][] = [
    ['FAIL','text-status-fail','bg-status-fail'],
    ['MONITOR','text-status-monitor','bg-status-monitor'],
    ['PASS','text-status-pass','bg-status-pass'],
    ['NORMAL','text-muted-foreground','bg-muted-foreground'],
  ];
  return (
    <div className="flex items-center gap-2.5">
      {entries.map(([k, textColor, dotBg]) => (
        <span key={k} className={`flex items-center gap-1 ios-caption font-mono font-bold ${textColor}`}>
          <span className={`${dotCls} rounded-full inline-block shrink-0 ${dotBg}`} />
          {counts[k] ?? 0}
        </span>
      ))}
    </div>
  );
}

// ─── SENSOR CHART DETAIL ──────────────────────────────────────────────────────
function SensorChart({ sensorKey, onBack, machineId }: { sensorKey: string; onBack: () => void; machineId?: string }) {
  const sensor = SENSORS[sensorKey];
  const data = useLiveSensorData(sensorKey, machineId, 4000);
  const vals = data.filter(d => d.value !== null).map(d => d.value as number);
  const curVal = vals[vals.length - 1];
  const maxVal = Math.max(...vals), minVal = Math.min(...vals);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const events = data.filter(d => d.status !== 'normal' && d.value !== null);
  const curStatus = data[data.length - 1]?.status || 'normal';
  const yMin = Math.floor(minVal * 0.95);
  const yMax = Math.ceil(Math.max(maxVal, sensor.warn ?? 0, sensor.crit ?? 0) * 1.06);
  const xTicks = data.filter((_, i) => i % 24 === 0).map(d => d.time);
  const statusCol = curStatus === 'critical' ? 'hsl(var(--status-fail))' : curStatus === 'warning' ? 'hsl(var(--status-monitor))' : 'hsl(var(--primary))';

  return (
    <div className="py-3">
      <button onClick={onBack} className="flex items-center gap-0.5 text-primary ios-body mb-3 active:opacity-50 transition-opacity">
        <ChevronLeft className="w-5 h-5" /> Sensors
      </button>
      <div className="mb-3">
        <p className="ios-headline text-foreground">{sensor.label}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full" style={{ background: statusCol }} />
          <span className="ios-caption font-semibold" style={{ color: statusCol }}>{curStatus.toUpperCase()}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {([['NOW', curVal?.toFixed(1), curStatus !== 'normal'],
           ['MAX', maxVal.toFixed(1), maxVal >= (sensor.warn ?? Infinity)],
           ['AVG', avgVal.toFixed(1), false],
           ['MIN', minVal.toFixed(1), false]] as [string,string,boolean][]).map(([l, v, hi]) => (
          <div key={l} className="ios-card p-2.5" style={{ borderTop: `2px solid ${hi ? statusCol : 'hsl(var(--primary))'}` }}>
            <p className="ios-caption2 text-muted-foreground uppercase">{l}</p>
            <p className="text-[18px] font-bold font-mono" style={{ color: hi ? statusCol : 'hsl(var(--foreground))' }}>{v}</p>
            <p className="ios-caption2 text-muted-foreground">{sensor.unit}</p>
          </div>
        ))}
      </div>

      {/* Thresholds */}
      {(sensor.warn !== null || sensor.crit !== null) && (
        <div className="flex gap-2 mb-3">
          {sensor.warn !== null && (
            <div className="flex-1 ios-card p-2.5 border border-status-monitor/20">
              <p className="ios-caption2 text-status-monitor uppercase font-semibold">⚠ Warning</p>
              <p className="ios-subhead font-bold text-status-monitor mt-0.5">
                {sensor.dir === 'above' ? '≥' : '≤'} {sensor.warn} {sensor.unit}
              </p>
            </div>
          )}
          {sensor.crit !== null && (
            <div className="flex-1 ios-card p-2.5 border border-status-fail/20">
              <p className="ios-caption2 text-status-fail uppercase font-semibold">✕ Critical</p>
              <p className="ios-subhead font-bold text-status-fail mt-0.5">
                {sensor.dir === 'above' ? '≥' : '≤'} {sensor.crit} {sensor.unit}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="ios-card p-3 mb-3">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="time" ticks={xTicks} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
            <YAxis domain={[yMin, yMax]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
            <Tooltip content={<ChartTooltip sensor={sensor} />} />
            {sensor.warn !== null && sensor.crit !== null && (
              sensor.dir === 'above' ? <>
                <ReferenceArea y1={yMin} y2={sensor.warn} fill="hsl(var(--status-pass))" fillOpacity={0.04} />
                <ReferenceArea y1={sensor.warn} y2={sensor.crit} fill="hsl(var(--status-monitor))" fillOpacity={0.06} />
                <ReferenceArea y1={sensor.crit} y2={yMax} fill="hsl(var(--status-fail))" fillOpacity={0.08} />
              </> : <>
                <ReferenceArea y1={sensor.warn} y2={yMax} fill="hsl(var(--status-pass))" fillOpacity={0.04} />
                <ReferenceArea y1={sensor.crit} y2={sensor.warn} fill="hsl(var(--status-monitor))" fillOpacity={0.06} />
                <ReferenceArea y1={yMin} y2={sensor.crit} fill="hsl(var(--status-fail))" fillOpacity={0.08} />
              </>
            )}
            {sensor.warn !== null && <ReferenceLine y={sensor.warn} stroke="hsl(var(--status-monitor))" strokeDasharray="5 3" strokeWidth={1.2} />}
            {sensor.crit !== null && <ReferenceLine y={sensor.crit} stroke="hsl(var(--status-fail))" strokeDasharray="5 3" strokeWidth={1.2} />}
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (!payload?.value) return <g key={`d${index}`} />;
                if (payload.status === 'critical') return <circle key={`d${index}`} cx={cx} cy={cy} r={4} fill="hsl(var(--status-fail))" stroke="hsl(var(--background))" strokeWidth={1.5} />;
                if (payload.status === 'warning') return <circle key={`d${index}`} cx={cx} cy={cy} r={3} fill="hsl(var(--status-monitor))" stroke="hsl(var(--background))" strokeWidth={1.5} />;
                return <g key={`d${index}`} />;
              }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Events */}
      <div className="ios-card p-3">
        <p className="ios-caption text-muted-foreground uppercase mb-2">Threshold Events · {events.length}</p>
        {events.length === 0 ? (
          <p className="ios-subhead text-muted-foreground text-center py-3">No threshold events</p>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {events.map((d, i) => {
              const col = d.status === 'critical' ? 'hsl(var(--status-fail))' : 'hsl(var(--status-monitor))';
              return (
                <div key={i} className="flex items-center gap-2.5 ios-caption px-2.5 py-2 rounded-lg"
                  style={{ background: `${col}10`, borderLeft: `2px solid ${col}` }}>
                  <span className="text-muted-foreground w-[40px]">{d.time}</span>
                  <span className="font-bold w-[60px]" style={{ color: col }}>{d.status.toUpperCase()}</span>
                  <span className="text-foreground">{d.value} {sensor.unit}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, sensor }: any) {
  if (!active || !payload?.length || payload[0].payload.value === null) return null;
  const d = payload[0].payload;
  const col = d.status === 'critical' ? 'hsl(var(--status-fail))' : d.status === 'warning' ? 'hsl(var(--status-monitor))' : 'hsl(var(--primary))';
  return (
    <div className="ios-card p-2.5" style={{ border: `1px solid ${col}`, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
      <p className="ios-caption2 text-muted-foreground">{d.time}</p>
      <p className="text-[20px] font-bold text-foreground">{d.value}<span className="ios-caption2 text-muted-foreground ml-1">{sensor.unit}</span></p>
      <p className="ios-caption2 font-bold mt-0.5" style={{ color: col }}>{d.status.toUpperCase()}</p>
    </div>
  );
}

// ─── TELEMETRY SECTION ────────────────────────────────────────────────────────
function TelemetrySection({ machineId }: { machineId?: string }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const tick = useLiveTick(machineId, 5000);

  if (activeKey) {
    return <SensorChart sensorKey={activeKey} onBack={() => setActiveKey(null)} machineId={machineId} />;
  }

  return (
    <div className="pt-3 space-y-2">
      <p className="ios-caption text-muted-foreground uppercase">All Sensors · {Object.keys(SENSORS).length}</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(SENSORS).map(([k, s]) => {
          const d = getData(k, machineId);
          const v = d.filter(p => p.value !== null).map(p => p.value as number);
          const cur = v[v.length - 1];
          const alert = getAlert(k, machineId);
          const ac = alert === 'critical' ? 'hsl(var(--status-fail))' : alert === 'warning' ? 'hsl(var(--status-monitor))' : 'hsl(var(--status-pass))';
          const cnt = d.filter(p => p.status !== 'normal' && p.value !== null).length;
          return (
            <button key={k} onClick={() => setActiveKey(k)}
              className="ios-card p-2.5 text-left active:opacity-70 transition-opacity flex flex-col justify-between"
              style={{ borderTop: `2px solid ${ac}`, minHeight: 80 }}>
              <p className="ios-caption2 text-foreground font-medium leading-tight">{s.label}</p>
              <div className="mt-auto">
                <p className="text-[18px] font-bold font-mono leading-none" style={{ color: ac }}>{cur?.toFixed(1)}</p>
                <p className="ios-caption2 text-muted-foreground">{s.unit}</p>
                {cnt > 0 && <p className="ios-caption2 font-bold mt-0.5" style={{ color: ac }}>{cnt} evt</p>}
              </div>
              <div className="h-[40px] mt-1">
                <Sparkline k={k} machineId={machineId} tick={tick} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── REPORTS SECTION ──────────────────────────────────────────────────────────
const REPORTS = [
  {
    id: '22892110', date: '2025-06-28', time: '11:07 AM',
    inspector: 'John Doe', smu: 1027, workOrder: 'FW12076',
    location: '601 Richland St, East Peoria, IL 61611',
    counts: { FAIL: 2, MONITOR: 7, PASS: 31, NORMAL: 0 },
    sections: [],
  },
];

function ReportsSection({ machineId }: { machineId?: string }) {
  const { getInspectionHistory } = useInspectionStorage();
  const [dbInspections, setDbInspections] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingDb(true);
      const data = await getInspectionHistory(machineId);
      setDbInspections(data);
      setLoadingDb(false);
    })();
  }, [machineId, getInspectionHistory]);

  return (
    <div className="pt-3 space-y-2">
      <p className="ios-caption text-muted-foreground uppercase">
        Inspection History · {REPORTS.length + dbInspections.length} reports
      </p>
      {dbInspections.map(insp => (
        <div key={insp.id} className="ios-card p-3.5">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="ios-caption text-muted-foreground">{new Date(insp.created_at).toLocaleDateString()}</p>
              <p className="ios-body font-medium text-foreground">{insp.asset_id}</p>
            </div>
            {insp.health_score != null && (
              <span className={`text-[20px] font-bold font-mono ${insp.health_score >= 80 ? 'text-status-pass' : insp.health_score >= 50 ? 'text-status-monitor' : 'text-status-fail'}`}>
                {insp.health_score}
              </span>
            )}
          </div>
          {insp.executive_summary && <p className="ios-caption text-muted-foreground line-clamp-2">{insp.executive_summary}</p>}
        </div>
      ))}
      {loadingDb && <p className="ios-subhead text-muted-foreground text-center p-4">Loading...</p>}
      {REPORTS.map(r => (
        <div key={r.id} className="ios-card p-3.5">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="ios-caption text-muted-foreground">#{r.id} · {r.date}</p>
              <p className="ios-body font-medium text-foreground">{r.inspector}</p>
            </div>
            <DotSummary counts={r.counts} size="sm" />
          </div>
          <p className="ios-caption text-muted-foreground">SMH {r.smu} · {r.workOrder}</p>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PreInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);
  const [activeSection, setActiveSection] = useState<'telemetry' | 'reports' | null>(null);

  const tick = useLiveTick(machineId, 5000);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Machine not found</div>;

  const fuelData = getData('fuel_level', machineId);
  const fuelVals = fuelData.filter(d => d.value !== null);
  const liveFuel = fuelVals.length > 0 ? fuelVals[fuelVals.length - 1].value! : machine.fuelLevel;

  const smuData = getData('service_meter_hours', machineId);
  const smuVals = smuData.filter(d => d.value !== null);
  const liveSmu = smuVals.length > 0 ? Math.round(smuVals[smuVals.length - 1].value!) : machine.smuHours;

  const criticalSensors = Object.entries(SENSORS).filter(([k]) => {
    const alert = getAlert(k, machineId);
    return alert === 'critical' || alert === 'warning';
  }).map(([k, s]) => {
    const d = getData(k, machineId);
    const v = d.filter(p => p.value !== null).map(p => p.value as number);
    const cur = v[v.length - 1];
    const alert = getAlert(k, machineId);
    return { key: k, label: s.label, unit: s.unit, value: cur, alert };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* iOS Nav Bar */}
      <header className="sticky top-0 z-40 glass-surface">
        <div className="flex items-center justify-between px-5 pt-14 pb-2.5">
          <button onClick={() => navigate('/')} className="flex items-center gap-0.5 text-primary active:opacity-50 transition-opacity touch-target">
            <ChevronLeft className="w-[22px] h-[22px]" />
            <span className="ios-body">Fleet</span>
          </button>
          <div className="text-center absolute left-1/2 -translate-x-1/2">
            <p className="ios-title text-foreground">{machine.model.replace('Hydraulic Excavator', '').trim()}</p>
          </div>
          <button className="glass-icon-btn w-[38px] h-[38px]">
            <Share2 className="w-[16px] h-[16px] text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="pb-44">
        {/* Hero image */}
        <div className="relative">
          <div className="h-[240px] bg-surface-2 overflow-hidden">
            <img src={excavatorHero} alt={machine.model} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>
          <div className="absolute bottom-4 right-4 ios-footnote font-bold px-3.5 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg">
            {liveFuel.toFixed(0)}% Fuel
          </div>
        </div>

        {/* Machine Info */}
        <div className="ios-section-header mt-4">Specification</div>
        <div className="mx-5 ios-card">
          {[
            { label: 'Asset ID', value: machine.assetId },
            { label: 'Serial Number', value: machine.serial },
            { label: 'SMU Hours', value: liveSmu.toLocaleString() },
            { label: 'Fuel Level', value: `${liveFuel.toFixed(0)}%`, alert: liveFuel < 25 },
            { label: 'Engine', value: 'ON', good: true },
          ].map((row, i, arr) => (
            <div key={row.label} className="ios-cell py-3.5"
              style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}>
              <span className="ios-body text-foreground flex-1">{row.label}</span>
              <span className={`ios-body font-mono ${row.alert ? 'text-status-fail font-semibold' : row.good ? 'text-status-pass font-semibold' : 'text-muted-foreground'}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Live Metrics */}
        <div className="ios-section-header mt-6">Live Metrics</div>
        <div className="mx-5 ios-card">
          {[
            { label: 'Hydraulic Pressure', key: 'pump_pressure_front', unit: 'bar' },
            { label: 'Engine RPM', key: 'engine_rpm', unit: 'rpm' },
            { label: 'Coolant Temp', key: 'engine_coolant_temp', unit: '°C' },
            { label: 'Hydraulic Temp', key: 'hydraulic_oil_temp', unit: '°C' },
            { label: 'DEF Level', key: 'def_level', unit: '%' },
            { label: 'Exhaust Temp', key: 'exhaust_gas_temp', unit: '°C' },
          ].map((m, i, arr) => {
            const val = getData(m.key, machineId).filter(d => d.value !== null).slice(-1)[0]?.value;
            const alert = getAlert(m.key, machineId);
            return (
              <div key={m.key} className="ios-cell py-3.5"
                style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${alert === 'critical' ? 'bg-status-fail' : alert === 'warning' ? 'bg-status-monitor' : 'bg-status-pass'}`} />
                <span className="ios-body text-foreground flex-1">{m.label}</span>
                <span className={`ios-body font-mono ${alert === 'critical' ? 'text-status-fail font-semibold' : alert === 'warning' ? 'text-status-monitor font-semibold' : 'text-muted-foreground'}`}>
                  {val?.toFixed(0) ?? '—'} {m.unit}
                </span>
              </div>
            );
          })}
        </div>

        {/* Location */}
        <div className="ios-section-header mt-6">Location</div>
        <div className="mx-5 ios-card">
          <div className="ios-cell py-3.5">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="ios-body text-foreground truncate">{machine.location}</p>
              <p className="ios-caption font-mono text-muted-foreground">
                {machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W
              </p>
            </div>
          </div>
        </div>

        {/* Active Faults */}
        {machine.activeFaultCodes.length > 0 && (
          <>
            <div className="ios-section-header mt-6 text-status-fail">
              Active Fault Codes · {machine.activeFaultCodes.length}
            </div>
            <div className="mx-5 ios-card" style={{ border: '0.5px solid hsla(0, 76%, 58%, 0.15)' }}>
              {machine.activeFaultCodes.map((fc, i) => (
                <div key={fc.code} className="px-4 py-3.5"
                  style={i < machine.activeFaultCodes.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-status-fail shrink-0" />
                    <span className="font-mono ios-subhead text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto ios-caption2 font-semibold uppercase px-2 py-0.5 rounded ${
                      fc.severity === 'critical' ? 'bg-status-fail/15 text-status-fail' : 'bg-status-monitor/15 text-status-monitor'
                    }`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="ios-subhead text-muted-foreground">{fc.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Telemetry — expandable */}
        <div className="ios-section-header mt-6">VisionLink Telemetry</div>
        <div className="mx-5 ios-card">
          <button
            onClick={() => setActiveSection(activeSection === 'telemetry' ? null : 'telemetry')}
            className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
          >
            <Activity className="w-5 h-5 text-primary shrink-0" />
            <span className="ios-body text-foreground flex-1">Sensor Dashboard</span>
            <div className="flex items-center gap-1.5 mr-1">
              {criticalSensors.length > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-status-fail" />
                  <span className="ios-caption2 text-status-fail font-mono font-semibold">{criticalSensors.length}</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-pass" style={{ boxShadow: '0 0 5px hsl(var(--status-pass))' }} />
                  <span className="ios-caption2 text-status-pass font-mono font-semibold">LIVE</span>
                </>
              )}
            </div>
            <ChevronRight className={`w-[14px] h-[14px] text-muted-foreground/40 transition-transform ${activeSection === 'telemetry' ? 'rotate-90' : ''}`} />
          </button>
          {activeSection !== 'telemetry' && criticalSensors.length > 0 && (
            <div className="px-4 pb-3 space-y-1.5">
              {criticalSensors.map(s => {
                const isCrit = s.alert === 'critical';
                return (
                  <div key={s.key} className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${isCrit ? 'bg-status-fail/8 border border-status-fail/20' : 'bg-status-monitor/8 border border-status-monitor/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isCrit ? 'bg-status-fail' : 'bg-status-monitor'}`} />
                    <span className="ios-subhead text-foreground flex-1">{s.label}</span>
                    <span className={`font-mono ios-body font-bold ${isCrit ? 'text-status-fail' : 'text-status-monitor'}`}>{s.value?.toFixed(1)}</span>
                    <span className="ios-caption2 text-muted-foreground">{s.unit}</span>
                  </div>
                );
              })}
            </div>
          )}
          {activeSection === 'telemetry' && (
            <div className="px-4 pb-4" style={{ borderTop: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
              <TelemetrySection machineId={machineId} />
            </div>
          )}
        </div>

        {/* S·O·S Fluid Analysis */}
        <div className="ios-section-header mt-6">S·O·S Fluid Analysis</div>
        <div className="mx-5 ios-card">
          <div className="ios-cell py-3.5" style={{ borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
            <Droplets className="w-5 h-5 text-sensor shrink-0" />
            <span className="ios-body text-foreground flex-1">Last Sample</span>
            <span className="ios-subhead font-mono text-muted-foreground">02/15/2026</span>
          </div>
          {([
            ['Engine Oil', 'Normal', 'text-status-pass'],
            ['Hydraulic Fluid', 'Elevated Iron — 45 ppm', 'text-status-monitor'],
            ['Coolant', 'Normal', 'text-status-pass'],
            ['Final Drive Oil', 'Normal', 'text-status-pass'],
          ] as [string, string, string][]).map(([label, value, cls], i, arr) => (
            <div key={label} className="ios-cell py-3.5"
              style={i < arr.length - 1 ? { borderBottom: '0.33px solid hsla(220, 10%, 24%, 0.3)' } : {}}>
              <span className="ios-body text-foreground flex-1">{label}</span>
              <span className={`ios-subhead font-semibold ${cls}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Inspection Reports — expandable */}
        <div className="ios-section-header mt-6">Inspection Reports</div>
        <div className="mx-5 ios-card">
          <button
            onClick={() => setActiveSection(activeSection === 'reports' ? null : 'reports')}
            className="ios-cell py-4 w-full active:bg-white/[0.03] transition-colors"
          >
            <History className="w-5 h-5 text-primary shrink-0" />
            <span className="ios-body text-foreground flex-1">View Reports</span>
            <ChevronRight className={`w-[14px] h-[14px] text-muted-foreground/40 transition-transform ${activeSection === 'reports' ? 'rotate-90' : ''}`} />
          </button>
          {activeSection === 'reports' && (
            <div className="px-4 pb-4" style={{ borderTop: '0.33px solid hsla(220, 10%, 24%, 0.3)' }}>
              <ReportsSection machineId={machineId} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 glass-surface-elevated safe-bottom space-y-2.5">
        <SlideToInspect onSlideComplete={() => navigate(`/inspect/${machine.id}`)} />
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate(`/inspect/${machine.id}?mode=upload`)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl ios-subhead font-medium text-foreground glass-btn-secondary active:scale-[0.98] transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </button>
          <button
            onClick={() => navigate(`/history/${machine.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl ios-subhead font-medium text-foreground glass-btn-secondary active:scale-[0.98] transition-all"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
