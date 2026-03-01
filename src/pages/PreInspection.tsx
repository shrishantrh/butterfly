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
  ChevronDown, ChevronRight, ArrowLeft, Share2,
} from 'lucide-react';

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  yellow:      'hsl(var(--primary))',
  yellowFaint: 'hsl(var(--primary) / 0.08)',
  yellowDim:   'hsl(var(--primary) / 0.19)',
  black:       'hsl(var(--background))',
  card:        'hsl(var(--surface-1))',
  cardRaised:  'hsl(var(--surface-2))',
  border:      'hsl(var(--border))',
  borderMid:   'hsl(var(--border))',
  white:       'hsl(var(--foreground))',
  textPrimary: 'hsl(var(--foreground))',
  textMid:     'hsl(var(--muted-foreground))',
  textDim:     'hsl(var(--muted-foreground) / 0.6)',
  safe:        'hsl(var(--status-pass))',
  warning:     'hsl(var(--status-monitor))',
  critical:    'hsl(var(--status-fail))',
};

// ─── REPORT DATA ──────────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  FAIL:    C.critical,
  MONITOR: C.warning,
  PASS:    C.safe,
  NORMAL:  'hsl(var(--status-normal))',
};

type ReportItem  = { label: string; status: string; comment: string };
type ReportSection = { title: string; items: ReportItem[] };
type Report = {
  id: string; date: string; time: string; inspector: string;
  smu: number; workOrder: string; location: string;
  counts: Record<string,number>; sections: ReportSection[];
};

const REPORTS: Report[] = [
  {
    id: '22892110', date: '2025-06-28', time: '11:07 AM',
    inspector: 'John Doe', smu: 1027, workOrder: 'FW12076',
    location: '601 Richland St, East Peoria, IL 61611',
    counts: { FAIL: 2, MONITOR: 7, PASS: 31, NORMAL: 0 },
    sections: [
      { title: 'General Info & Comments', items: [{ label: 'General Info / Comments', status: 'MONITOR', comment: 'Scales screen freezes during operation' }] },
      { title: 'From the Ground', items: [
        { label: '1.1 Tires and Rims', status: 'NORMAL', comment: '' },
        { label: '1.2 Bucket Cutting Edge', status: 'MONITOR', comment: 'Inspect tips for wear.' },
        { label: '1.7 Transmission and Transfer Gears', status: 'FAIL', comment: 'Abnormal noise detected.' },
      ]},
      { title: 'Engine Compartment', items: [
        { label: '2.1 Engine Oil Level', status: 'PASS', comment: '' },
        { label: '2.3 Radiator Cores for Debris', status: 'FAIL', comment: 'Debris accumulation detected.' },
      ]},
    ],
  },
];

// ─── SENSOR DATA ──────────────────────────────────────────────────────────────
import { SENSORS, getData, getAlert } from '@/lib/sensor-data';
import type { DataPoint } from '@/lib/sensor-data';

// ─── SPARKLINE ────────────────────────────────────────────────────────────────
function Sparkline({ k, machineId }: { k: string; machineId?: string }) {
  const data = getData(k, machineId).filter(d => d.value !== null);
  if (!data.length) return null;
  const vs = data.map(d => d.value as number);
  const min = Math.min(...vs), range = Math.max(...vs) - min || 1;
  const W = 300, H = 80;
  const pts = data.map((d, i, a) =>
    `${((i/(a.length-1))*W).toFixed(2)},${(H - ((d.value! - min)/range) * (H - 8) - 4).toFixed(2)}`
  ).join(' ');
  const strokeCol = data.some(d => d.status === 'critical')
    ? C.critical : data.some(d => d.status === 'warning') ? C.warning : C.safe;
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
  const textCls = size === 'sm' ? 'text-[10px]' : 'text-[13px]';
  const entries: [string, string, string][] = [
    ['FAIL','text-status-fail','status-dot-fail'],
    ['MONITOR','text-status-monitor','status-dot-monitor'],
    ['PASS','text-status-pass','status-dot-pass'],
    ['NORMAL','text-muted-foreground','status-dot-normal'],
  ];
  return (
    <div className={`flex items-center ${size === 'sm' ? 'gap-2' : 'gap-2.5'}`}>
      {entries.map(([k, textColor, dotClass]) => (
        <span key={k} className={`flex items-center gap-1 ${textCls} font-mono font-bold ${textColor}`}>
          <span className={`${dotCls} rounded-full inline-block shrink-0 ${dotClass}`} />
          {counts[k] ?? 0}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, sensor }: any) {
  if (!active || !payload?.length || payload[0].payload.value === null) return null;
  const d = payload[0].payload;
  const bCol = d.status==='critical' ? C.critical : d.status==='warning' ? C.warning : C.yellow;
  return (
    <div style={{ background:C.card, border:`1px solid ${bCol}`, borderRadius:8, padding:'9px 13px',
      fontFamily:"'Courier New',monospace", fontSize:11, boxShadow:'0 4px 24px #00000080' }}>
      <div style={{ color:C.textDim, marginBottom:2 }}>{d.time}</div>
      <div style={{ fontSize:22, fontWeight:700, color:C.white }}>
        {d.value}<span style={{ fontSize:10, color:C.textDim, marginLeft:4 }}>{sensor.unit}</span>
      </div>
      <div style={{ marginTop:3, fontSize:10, fontWeight:700, letterSpacing:1, color:bCol }}>{d.status.toUpperCase()}</div>
    </div>
  );
}

// ─── SENSOR CHART DETAIL ──────────────────────────────────────────────────────
function SensorChart({ sensorKey, onBack, machineId }: { sensorKey: string; onBack: () => void; machineId?: string }) {
  const sensor = SENSORS[sensorKey];
  const data = getData(sensorKey, machineId);
  const vals = data.filter(d => d.value !== null).map(d => d.value as number);
  const curVal = vals[vals.length - 1];
  const maxVal = Math.max(...vals), minVal = Math.min(...vals);
  const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
  const events = data.filter(d => d.status !== 'normal' && d.value !== null);
  const curStatus = data[data.length - 1]?.status || 'normal';
  const yMin = Math.floor(minVal * 0.95);
  const yMax = Math.ceil(Math.max(maxVal, sensor.warn ?? 0, sensor.crit ?? 0) * 1.06);
  const xTicks = data.filter((_, i) => i % 24 === 0).map(d => d.time);
  const statusCol = curStatus === 'critical' ? C.critical : curStatus === 'warning' ? C.warning : C.yellow;

  return (
    <div style={{ padding:'14px 0 24px', fontFamily:"'Courier New',monospace" }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.yellow, fontSize:13,
        cursor:'pointer', padding:'0 0 14px', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
        ‹ Sensors
      </button>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:17, fontWeight:700, color:C.white }}>{sensor.label}</div>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:statusCol }}/>
          <span style={{ fontSize:10, fontWeight:700, color:statusCol }}>{curStatus.toUpperCase()}</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {([['NOW', curVal?.toFixed(1), curStatus!=='normal'],
           ['MAX', maxVal.toFixed(1), maxVal>=(sensor.warn??Infinity)],
           ['AVG', avgVal.toFixed(1), false],
           ['MIN', minVal.toFixed(1), false]] as [string,string,boolean][]).map(([l,v,hi])=>(
          <div key={l} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`,
            borderTop:`2px solid ${hi ? statusCol : C.yellow}`, borderRadius:8, padding:'9px 10px' }}>
            <div style={{ fontSize:8, color:C.textDim, letterSpacing:1, marginBottom:3 }}>{l}</div>
            <div style={{ fontSize:17, fontWeight:700, color: hi ? statusCol : C.white }}>{v}</div>
            <div style={{ fontSize:8, color:C.textDim }}>{sensor.unit}</div>
          </div>
        ))}
      </div>
      {(sensor.warn !== null || sensor.crit !== null) && (
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {sensor.warn !== null && (
            <div style={{ flex:1, background:`${C.warning}10`, border:`1px solid ${C.warning}30`, borderRadius:8, padding:'8px 11px' }}>
              <div style={{ fontSize:8, color:C.warning, letterSpacing:1 }}>⚠ WARNING</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.warning, marginTop:2 }}>
                {sensor.dir==='above'?'≥':'≤'} {sensor.warn} <span style={{ fontSize:9 }}>{sensor.unit}</span>
              </div>
            </div>
          )}
          {sensor.crit !== null && (
            <div style={{ flex:1, background:`${C.critical}10`, border:`1px solid ${C.critical}30`, borderRadius:8, padding:'8px 11px' }}>
              <div style={{ fontSize:8, color:C.critical, letterSpacing:1 }}>✕ CRITICAL</div>
              <div style={{ fontSize:14, fontWeight:700, color:C.critical, marginTop:2 }}>
                {sensor.dir==='above'?'≥':'≤'} {sensor.crit} <span style={{ fontSize:9 }}>{sensor.unit}</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 4px 10px 0', marginBottom:12 }}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top:8, right:14, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="#1C1C1C" vertical={false}/>
            <XAxis dataKey="time" ticks={xTicks} tick={{ fill:C.textDim, fontSize:9 }} axisLine={{ stroke:C.border }} tickLine={false}/>
            <YAxis domain={[yMin, yMax]} tick={{ fill:C.textDim, fontSize:9 }} axisLine={false} tickLine={false} width={46}/>
            <Tooltip content={<ChartTooltip sensor={sensor}/>}/>
            {sensor.warn!==null && sensor.crit!==null && (
              sensor.dir === 'above' ? <>
                <ReferenceArea y1={yMin} y2={sensor.warn} fill={C.safe} fillOpacity={0.04}/>
                <ReferenceArea y1={sensor.warn} y2={sensor.crit} fill={C.warning} fillOpacity={0.08}/>
                <ReferenceArea y1={sensor.crit} y2={yMax} fill={C.critical} fillOpacity={0.10}/>
              </> : <>
                <ReferenceArea y1={sensor.warn} y2={yMax} fill={C.safe} fillOpacity={0.04}/>
                <ReferenceArea y1={sensor.crit} y2={sensor.warn} fill={C.warning} fillOpacity={0.08}/>
                <ReferenceArea y1={yMin} y2={sensor.crit} fill={C.critical} fillOpacity={0.10}/>
              </>
            )}
            {sensor.warn!==null && <ReferenceLine y={sensor.warn} stroke={C.warning} strokeDasharray="5 3" strokeWidth={1.2}
              label={{ value:'WARN', position:'insideTopRight', fill:C.warning, fontSize:8 }}/>}
            {sensor.crit!==null && <ReferenceLine y={sensor.crit} stroke={C.critical} strokeDasharray="5 3" strokeWidth={1.2}
              label={{ value:'CRIT', position:'insideTopRight', fill:C.critical, fontSize:8 }}/>}
            <Line type="monotone" dataKey="value" stroke={C.yellow} strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                if (!payload?.value) return <g key={`d${index}`}/>;
                if (payload.status === 'critical') return <circle key={`d${index}`} cx={cx} cy={cy} r={4.5} fill={C.critical} stroke={C.black} strokeWidth={1.5}/>;
                if (payload.status === 'warning') return <circle key={`d${index}`} cx={cx} cy={cy} r={3.5} fill={C.warning} stroke={C.black} strokeWidth={1.5}/>;
                return <g key={`d${index}`}/>;
              }}
              activeDot={{ r:6, fill:C.yellow, stroke:C.black, strokeWidth:2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px' }}>
        <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:9 }}>THRESHOLD EVENTS · {events.length}</div>
        {events.length === 0 ? (
          <div style={{ color:C.yellow, fontSize:11, textAlign:'center', padding:'6px 0', opacity:0.7 }}>── No threshold events ──</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:190, overflowY:'auto' }}>
            {events.map((d, i) => {
              const col = d.status === 'critical' ? C.critical : C.warning;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, padding:'6px 10px',
                  background:`${col}0C`, borderRadius:7, borderLeft:`2px solid ${col}` }}>
                  <span style={{ color:C.textDim, width:40 }}>{d.time}</span>
                  <span style={{ color:col, fontWeight:700, width:62 }}>{d.status.toUpperCase()}</span>
                  <span style={{ color:C.textPrimary }}>{d.value} {sensor.unit}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TELEMETRY SECTION ────────────────────────────────────────────────────────
function TelemetrySection({ machineId }: { machineId?: string }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (activeKey) {
    return (
      <div style={{ background:C.black, borderRadius:12, padding:'0 14px', fontFamily:"'Courier New',monospace" }}>
        <SensorChart sensorKey={activeKey} onBack={() => setActiveKey(null)} machineId={machineId}/>
      </div>
    );
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, fontFamily:"'Courier New',monospace", paddingTop:12 }}>
      <div style={{ gridColumn:'1/-1', fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:2 }}>
        ALL SENSORS · {Object.keys(SENSORS).length}
      </div>
      {Object.entries(SENSORS).map(([k, s]) => {
        const d = getData(k, machineId);
        const v = d.filter(p => p.value !== null).map(p => p.value as number);
        const cur = v[v.length - 1];
        const alert = getAlert(k, machineId);
        const ac = alert === 'critical' ? C.critical : alert === 'warning' ? C.warning : C.safe;
        const cnt = d.filter(p => p.status !== 'normal' && p.value !== null).length;
        return (
          <button key={k} onClick={() => setActiveKey(k)} style={{
            background: C.card, borderRadius:10,
            border:`1px solid ${alert ? ac+'35' : C.border}`,
            borderTop:`2px solid ${ac}`,
            padding:'10px', cursor:'pointer',
            display:'flex', flexDirection:'row', alignItems:'center', gap:8,
            textAlign:'left', width:'100%', transition:'all 0.12s', height:80,
          }}>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0, width:58, height:'100%' }}>
              <div style={{ fontSize:9, fontWeight:600, color:C.white, lineHeight:1.3, wordBreak:'break-word' }}>{s.label}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:ac, lineHeight:1 }}>{cur?.toFixed(1)}</div>
                <div style={{ fontSize:8, color:C.textDim }}>{s.unit}</div>
                {cnt > 0 && <div style={{ fontSize:8, color:ac, fontWeight:700, marginTop:1 }}>{cnt} evt</div>}
              </div>
            </div>
            <div style={{ flex:1, height:60, minWidth:0 }}>
              <Sparkline k={k} machineId={machineId}/>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── REPORTS SECTION ──────────────────────────────────────────────────────────
function ReportsSection({ machineId }: { machineId?: string }) {
  const { getInspectionHistory, getInspectionDetail } = useInspectionStorage();
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

  const totalCount = REPORTS.length + dbInspections.length;

  return (
    <div className="space-y-2.5 pt-3" style={{ fontFamily: "'Courier New',monospace" }}>
      <div className="text-[9px] text-muted-foreground tracking-widest uppercase mb-1">
        INSPECTION HISTORY · {totalCount} REPORTS
      </div>
      {dbInspections.map(insp => (
        <div key={insp.id} className="card-elevated p-3.5">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="text-xs text-muted-foreground/60">{new Date(insp.created_at).toLocaleDateString()}</p>
              <p className="text-sm font-bold">{insp.asset_id}</p>
            </div>
            {insp.health_score != null && (
              <span className={`text-lg font-bold font-mono ${insp.health_score >= 80 ? 'text-status-pass' : insp.health_score >= 50 ? 'text-status-monitor' : 'text-status-fail'}`}>
                {insp.health_score}
              </span>
            )}
          </div>
          {insp.executive_summary && <p className="text-xs text-muted-foreground line-clamp-2">{insp.executive_summary}</p>}
        </div>
      ))}
      {loadingDb && <div className="text-xs text-muted-foreground text-center p-4">Loading...</div>}
      {REPORTS.map(r => (
        <div key={r.id} className="card-elevated p-3.5">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="text-xs text-muted-foreground/60">#{r.id} · {r.date}</p>
              <p className="text-sm font-bold">{r.inspector}</p>
            </div>
            <DotSummary counts={r.counts} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground">SMH {r.smu} · {r.workOrder}</p>
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

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Machine not found</div>;

  // Live sensor data
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
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-14 pb-3 sticky top-0 z-40 bg-background/90 backdrop-blur-2xl border-b border-border/20">
        <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-surface-2 border border-border/30 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-base font-bold">{machine.model.replace('Hydraulic Excavator', '').trim()}</h1>
          <p className="text-xs text-muted-foreground">{machine.assetId}</p>
        </div>
        <button className="w-9 h-9 rounded-xl bg-surface-2 border border-border/30 flex items-center justify-center">
          <Share2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      <div className="px-5 py-5 space-y-4 pb-40">
        {/* Machine hero image */}
        <div className="card-elevated overflow-hidden">
          <div className="relative h-52 bg-surface-2 overflow-hidden flex items-center justify-center">
            <img src={excavatorHero} alt={machine.model} className="w-full h-full object-cover" />
            {/* Health indicator */}
            <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-sm font-bold px-3 py-1.5 rounded-lg">
              {liveFuel.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Specification — reference style pill grid */}
        <div className="space-y-3">
          <h2 className="text-base font-bold px-1">Specification</h2>

          {/* Top row: Engine / Remaining / Oil Level */}
          <div className="grid grid-cols-3 gap-2">
            <div className="card-elevated p-3 flex items-center gap-2.5">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground">Engine</span>
                <span className="text-sm font-bold text-foreground mt-0.5">ON</span>
              </div>
              <span className="px-2 py-1 rounded-md bg-status-pass/15 text-status-pass text-[10px] font-bold">ON</span>
            </div>
            <div className="card-elevated p-3">
              <span className="text-[10px] text-muted-foreground">Remaining</span>
              <p className="text-sm font-bold text-foreground mt-0.5 font-mono">{liveSmu.toLocaleString()}h</p>
            </div>
            <div className="card-elevated p-3 flex items-center gap-2">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] text-muted-foreground">Fuel</span>
                <span className={`text-sm font-bold font-mono mt-0.5 ${liveFuel < 25 ? 'text-status-fail' : liveFuel < 40 ? 'text-status-monitor' : 'text-foreground'}`}>
                  {liveFuel.toFixed(0)}%
                </span>
              </div>
              {liveFuel < 25 && <AlertTriangle className="w-4 h-4 text-status-fail" />}
            </div>
          </div>

          {/* Bottom row: Speed / RPM / SMU */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Activity className="w-3.5 h-3.5 text-primary" />, label: 'Hydraulic', value: `${getData('hydraulic_pressure', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'} psi` },
              { icon: <Cpu className="w-3.5 h-3.5 text-primary" />, label: 'Engine RPM', value: `${getData('engine_rpm', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'}` },
              { icon: <Clock className="w-3.5 h-3.5 text-primary" />, label: 'SMU Hours', value: liveSmu.toLocaleString() },
            ].map((item, i) => (
              <div key={i} className="card-elevated p-3 flex items-start gap-2">
                {item.icon}
                <div>
                  <span className="text-[10px] text-muted-foreground block">{item.label}</span>
                  <span className="text-sm font-bold font-mono mt-0.5 block">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other metrics — list style */}
        <div className="space-y-1">
          <h2 className="text-base font-bold px-1 mb-2">Other metrics</h2>
          {[
            { label: 'Engine Coolant', value: `${getData('coolant_temp', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'}°`, alert: getAlert('coolant_temp', machineId) },
            { label: 'Hydraulic Temp', value: `${getData('hydraulic_temp', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'}°C`, alert: getAlert('hydraulic_temp', machineId) },
            { label: 'DEF Level', value: `${getData('def_level', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'}%`, alert: getAlert('def_level', machineId) },
            { label: 'Exhaust Temp', value: `${getData('exhaust_temp', machineId).filter(d=>d.value!==null).slice(-1)[0]?.value?.toFixed(0) || '—'}°C`, alert: getAlert('exhaust_temp', machineId) },
          ].map((m, i) => (
            <div key={i} className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-surface-2/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${m.alert === 'critical' ? 'bg-status-fail' : m.alert === 'warning' ? 'bg-status-monitor' : 'bg-status-pass'}`} />
                <span className="text-sm text-foreground">{m.label}</span>
              </div>
              <span className={`text-sm font-bold font-mono ${m.alert === 'critical' ? 'text-status-fail' : m.alert === 'warning' ? 'text-status-monitor' : 'text-foreground'}`}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {/* Location */}
        <div className="card-elevated p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{machine.location}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W
            </p>
          </div>
        </div>

        {/* Active Fault Codes */}
        {machine.activeFaultCodes.length > 0 && (
          <div className="card-elevated p-4 border-status-fail/20">
            <div className="flex items-center gap-2.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-status-fail" />
              <h3 className="text-sm font-bold text-status-fail flex-1">Active Fault Codes</h3>
              <span className="text-[10px] font-bold text-status-fail bg-status-fail/12 border border-status-fail/20 px-2 py-0.5 rounded-md">
                {machine.activeFaultCodes.length}
              </span>
            </div>
            <div className="space-y-2">
              {machine.activeFaultCodes.map((fc) => (
                <div key={fc.code} className="inset-surface rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                      fc.severity === 'critical' ? 'bg-status-fail/10 text-status-fail border-status-fail/15' : 'bg-status-monitor/10 text-status-monitor border-status-monitor/15'
                    }`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{fc.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VisionLink Telemetry — expandable */}
        <div className="card-elevated">
          <button
            onClick={() => setActiveSection(activeSection === 'telemetry' ? null : 'telemetry')}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold flex-1">VisionLink Telemetry</h3>
            <div className="flex items-center gap-1.5 mr-2">
              {criticalSensors.length > 0 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-status-fail" />
                  <span className="text-[10px] text-status-fail font-mono font-semibold">{criticalSensors.length} ALERT{criticalSensors.length !== 1 ? 'S' : ''}</span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-status-pass" style={{ boxShadow:'0 0 5px hsl(var(--status-pass))' }}/>
                  <span className="text-[10px] text-status-pass font-mono font-semibold tracking-widest">LIVE</span>
                </>
              )}
            </div>
            {activeSection === 'telemetry' ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {activeSection !== 'telemetry' && criticalSensors.length > 0 && (
            <div className="px-4 pb-3 space-y-1.5">
              {criticalSensors.map(s => {
                const isCrit = s.alert === 'critical';
                return (
                  <div key={s.key} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isCrit ? 'bg-status-fail/8 border border-status-fail/20' : 'bg-status-monitor/8 border border-status-monitor/20'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isCrit ? 'bg-status-fail' : 'bg-status-monitor'}`} />
                    <span className="text-xs font-semibold text-foreground flex-1">{s.label}</span>
                    <span className={`font-mono text-sm font-bold ${isCrit ? 'text-status-fail' : 'text-status-monitor'}`}>{s.value?.toFixed(1)}</span>
                    <span className="text-[10px] text-muted-foreground">{s.unit}</span>
                  </div>
                );
              })}
            </div>
          )}
          {activeSection === 'telemetry' && (
            <div className="px-4 pb-4 border-t border-border/20">
              <TelemetrySection machineId={machineId} />
            </div>
          )}
        </div>

        {/* S·O·S Fluid Analysis */}
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <Droplets className="w-5 h-5 text-sensor" />
            <h3 className="text-sm font-bold flex-1">S·O·S Fluid Analysis</h3>
            <span className="text-xs text-muted-foreground font-mono">02/15/2026</span>
          </div>
          {([
            ['Engine Oil', 'Normal', 'text-status-pass'],
            ['Hydraulic Fluid', 'Elevated Iron — 45 ppm', 'text-status-monitor'],
            ['Coolant', 'Normal', 'text-status-pass'],
            ['Final Drive Oil', 'Normal', 'text-status-pass'],
          ] as [string,string,string][]).map(([label, value, cls], i) => (
            <div key={label} className={`flex justify-between items-center py-3 ${i < 3 ? 'border-b border-border/20' : ''}`}>
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-xs font-bold ${cls}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Inspection Reports — expandable */}
        <div className="card-elevated">
          <button
            onClick={() => setActiveSection(activeSection === 'reports' ? null : 'reports')}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <History className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold flex-1">Inspection Reports</h3>
            {activeSection === 'reports' ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {activeSection === 'reports' && (
            <div className="px-4 pb-4 border-t border-border/20">
              <ReportsSection machineId={machineId} />
            </div>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent safe-bottom space-y-2.5">
        <button
          onClick={() => navigate(`/inspect/${machine.id}`)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5" />
          Start Inspection
          <ChevronRight className="w-5 h-5 opacity-60" />
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate(`/inspect/${machine.id}?mode=upload`)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/30 active:scale-[0.98] transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Video
          </button>
          <button
            onClick={() => navigate(`/history/${machine.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/30 active:scale-[0.98] transition-all"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
