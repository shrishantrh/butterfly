/**
 * Shared sensor configuration and data generation.
 * Each machine gets unique, deterministic data via machineId-seeded RNG.
 */

export type SensorCfg = {
  label: string; unit: string; category: string;
  warn: number | null; crit: number | null; dir: string | null;
  base?: number; amp?: number; noise?: number;
  spikes?: Record<number, number>; type?: string;
};

export const SENSORS: Record<string, SensorCfg> = {
  engine_coolant_temp:   { label: 'Coolant Temp',         unit: '°C',  category: 'engine',      warn:103,  crit:107,  dir:'above', base:88,  amp:6,   noise:1.8, spikes:{95:106.2,96:108.5,97:110.1,98:107.4,99:104.2} },
  engine_oil_pressure:   { label: 'Oil Pressure',          unit: 'kPa', category: 'engine',      warn:270,  crit:240,  dir:'below', base:360, amp:35,  noise:8,   spikes:{72:255,73:248,74:261} },
  engine_rpm:            { label: 'Engine RPM',            unit: 'RPM', category: 'engine',      warn:2100, crit:2300, dir:'above', base:1650,amp:280, noise:45,  spikes:{} },
  engine_load:           { label: 'Engine Load',           unit: '%',   category: 'engine',      warn:90,   crit:97,   dir:'above', base:62,  amp:18,  noise:4,   spikes:{60:91.2,61:93.5} },
  boost_pressure:        { label: 'Boost Pressure',        unit: 'kPa', category: 'engine',      warn:220,  crit:235,  dir:'above', base:165, amp:38,  noise:7,   spikes:{55:228,56:232,78:235} },
  battery_voltage:       { label: 'Battery Voltage',       unit: 'V',   category: 'engine',      warn:11.8, crit:11.0, dir:'below', base:13.8,amp:0.5, noise:0.15,spikes:{} },
  hydraulic_oil_temp:    { label: 'Hydraulic Oil Temp',    unit: '°C',  category: 'hydraulics',  warn:88,   crit:95,   dir:'above', base:68,  amp:10,  noise:2.5, spikes:{88:92.1,89:95.4,90:97.8} },
  pump_pressure_front:   { label: 'Pump Pressure (Front)', unit: 'bar', category: 'hydraulics',  warn:340,  crit:360,  dir:'above', base:210, amp:65,  noise:12,  spikes:{} },
  pump_pressure_rear:    { label: 'Pump Pressure (Rear)',  unit: 'bar', category: 'hydraulics',  warn:340,  crit:360,  dir:'above', base:205, amp:60,  noise:11,  spikes:{} },
  fuel_level:            { label: 'Fuel Level',            unit: '%',   category: 'fuel',        warn:20,   crit:10,   dir:'below', type:'fuel' },
  def_level:             { label: 'DEF Level',             unit: '%',   category: 'fuel',        warn:20,   crit:10,   dir:'below', type:'def' },
  fuel_consumption_rate: { label: 'Fuel Burn Rate',        unit: 'L/hr',category: 'fuel',        warn:22,   crit:26,   dir:'above', base:13.5,amp:4.5, noise:0.8, spikes:{} },
  exhaust_gas_temp:      { label: 'Exhaust Gas Temp',      unit: '°C',  category: 'exhaust',     warn:550,  crit:620,  dir:'above', base:380, amp:80,  noise:15,  spikes:{} },
  dpf_soot_load:         { label: 'DPF Soot Load',         unit: '%',   category: 'exhaust',     warn:80,   crit:95,   dir:'above', type:'dpf' },
  swing_speed:           { label: 'Swing Speed',           unit: 'RPM', category: 'boom',        warn:13,   crit:15,   dir:'above', base:7.2, amp:3.5, noise:0.8, spikes:{} },
  idle_time:             { label: 'Idle Time (Cumul.)',    unit: '%',   category: 'utilization', warn:35,   crit:50,   dir:'above', type:'idle' },
  service_meter_hours:   { label: 'Service Meter Hours',   unit: 'hrs', category: 'utilization', warn:null, crit:null, dir:null,    type:'smu' },
};

// ─── PER-MACHINE OVERRIDES ──────────────────────────────────────────────────
// Different base values, amplitudes, and spike patterns per machine so each
// excavator has a unique telemetry personality. Thresholds are NOT changed.
type MachineOverrides = {
  sensorOverrides: Record<string, Partial<Pick<SensorCfg, 'base' | 'amp' | 'noise' | 'spikes'>>>;
  fuelStart: number; defStart: number; dpfStart: number; smuStart: number;
};

const MACHINE_PROFILES: Record<string, MachineOverrides> = {
  // Machine 001 — mid-life, hydraulic issues, coolant runs hot
  'cat-320-001': {
    fuelStart: 85, defStart: 78, dpfStart: 12, smuStart: 4821.4,
    sensorOverrides: {
      engine_coolant_temp:   { base: 88,  amp: 6,   noise: 1.8, spikes: {95:106.2, 96:108.5, 97:110.1, 98:107.4, 99:104.2} },
      engine_oil_pressure:   { base: 360, amp: 35,  noise: 8,   spikes: {72:255, 73:248, 74:261} },
      hydraulic_oil_temp:    { base: 68,  amp: 10,  noise: 2.5, spikes: {88:92.1, 89:95.4, 90:97.8} },
      engine_load:           { base: 62,  amp: 18,  noise: 4,   spikes: {60:91.2, 61:93.5} },
      boost_pressure:        { base: 165, amp: 38,  noise: 7,   spikes: {55:228, 56:232, 78:235} },
    },
  },
  // Machine 002 — newer unit (2104 SMU), mostly healthy, runs slightly lean
  'cat-320-002': {
    fuelStart: 45, defStart: 62, dpfStart: 8, smuStart: 2104.2,
    sensorOverrides: {
      engine_coolant_temp:   { base: 82,  amp: 4,   noise: 1.2, spikes: {} },
      engine_oil_pressure:   { base: 385, amp: 25,  noise: 6,   spikes: {} },
      engine_rpm:            { base: 1580,amp: 220, noise: 35,  spikes: {} },
      engine_load:           { base: 55,  amp: 14,  noise: 3,   spikes: {} },
      boost_pressure:        { base: 155, amp: 30,  noise: 5,   spikes: {} },
      battery_voltage:       { base: 14.1,amp: 0.3, noise: 0.1, spikes: {} },
      hydraulic_oil_temp:    { base: 62,  amp: 7,   noise: 1.8, spikes: {} },
      pump_pressure_front:   { base: 195, amp: 50,  noise: 9,   spikes: {} },
      pump_pressure_rear:    { base: 190, amp: 48,  noise: 8,   spikes: {} },
      fuel_consumption_rate: { base: 11.8,amp: 3.2, noise: 0.6, spikes: {} },
      exhaust_gas_temp:      { base: 350, amp: 60,  noise: 12,  spikes: {} },
      swing_speed:           { base: 6.8, amp: 2.8, noise: 0.6, spikes: {} },
    },
  },
  // Machine 003 — high-hour unit (6891 SMU), engine issues, runs hot & hard
  'cat-320-003': {
    fuelStart: 18, defStart: 35, dpfStart: 45, smuStart: 6891.0,
    sensorOverrides: {
      engine_coolant_temp:   { base: 94,  amp: 8,   noise: 2.5, spikes: {80:108.3, 81:111.7, 82:109.2} },
      engine_oil_pressure:   { base: 320, amp: 45,  noise: 12,  spikes: {65:258, 66:242, 67:265, 110:252} },
      engine_rpm:            { base: 1750,amp: 320, noise: 55,  spikes: {40:2150, 41:2320, 42:2180} },
      engine_load:           { base: 72,  amp: 20,  noise: 5,   spikes: {50:93.8, 51:96.1, 52:98.2} },
      boost_pressure:        { base: 178, amp: 42,  noise: 9,   spikes: {45:231, 46:237, 100:229} },
      battery_voltage:       { base: 13.2,amp: 0.8, noise: 0.25,spikes: {120:11.6, 121:11.2, 122:11.5} },
      hydraulic_oil_temp:    { base: 75,  amp: 12,  noise: 3.0, spikes: {70:93.8, 71:96.2, 72:94.5} },
      pump_pressure_front:   { base: 230, amp: 75,  noise: 15,  spikes: {35:348, 36:362, 37:355} },
      pump_pressure_rear:    { base: 225, amp: 70,  noise: 14,  spikes: {35:345, 36:358} },
      fuel_consumption_rate: { base: 16.2,amp: 5.8, noise: 1.2, spikes: {50:24.1, 51:25.8} },
      exhaust_gas_temp:      { base: 420, amp: 100, noise: 20,  spikes: {60:558, 61:595, 62:622, 63:580} },
      dpf_soot_load:         { spikes: {} },
      swing_speed:           { base: 7.8, amp: 4.0, noise: 1.0, spikes: {30:13.5, 31:14.8} },
    },
  },
};

function getMachineProfile(machineId?: string): MachineOverrides {
  if (machineId && MACHINE_PROFILES[machineId]) return MACHINE_PROFILES[machineId];
  return MACHINE_PROFILES['cat-320-001']; // default
}

function getSensorForMachine(key: string, machineId?: string): SensorCfg {
  const base = SENSORS[key];
  const profile = getMachineProfile(machineId);
  const overrides = profile.sensorOverrides[key];
  if (!overrides) return base;
  return { ...base, ...overrides };
}

// ─── DATA GENERATION ─────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function gauss(rng: () => number, mean: number, std: number) {
  const u1 = Math.max(1e-10, rng()), u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export type DataPoint = { time: string; value: number | null; status: string };

const CACHE: Record<string, DataPoint[]> = {};

export function getData(key: string, machineId?: string): DataPoint[] {
  const cacheKey = machineId ? `${machineId}:${key}` : key;
  if (CACHE[cacheKey]) return CACHE[cacheKey];

  const s = getSensorForMachine(key, machineId);
  const profile = getMachineProfile(machineId);
  const NUM = 144;
  const startMs = new Date('2026-02-28T06:00:00Z').getTime();

  // Seed includes machineId for unique per-machine data
  const baseSeed = key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const machineSeed = machineId ? machineId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7919 : 0;
  const rng = makeRng(baseSeed + machineSeed);

  let fuel = profile.fuelStart;
  let def = profile.defStart;
  let dpf = profile.dpfStart;
  let idle = 0;
  let smu = profile.smuStart;

  const pts: DataPoint[] = Array.from({ length: NUM }, (_, i) => {
    const label = new Date(startMs + i * 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let val: number | null = null;
    if (i < 6) { val = null; }
    else if (s.type === 'fuel')  { fuel = Math.max(0, fuel - gauss(rng,0.28,0.04)); val = +fuel.toFixed(1); }
    else if (s.type === 'def')   { def  = Math.max(0, def  - gauss(rng,0.06,0.01)); val = +def.toFixed(1);  }
    else if (s.type === 'dpf')   { if (i>=85&&i<=90) dpf=Math.max(5,dpf-gauss(rng,8,0.5)); else dpf=Math.min(100,dpf+gauss(rng,0.22,0.04)); val=+dpf.toFixed(1); }
    else if (s.type === 'idle')  { idle=Math.min(100,idle+((i>=42&&i<=48)||(i>=100&&i<=106)?gauss(rng,0.9,0.1):gauss(rng,0.18,0.05))); val=+idle.toFixed(1); }
    else if (s.type === 'smu')   { smu+=10/60; val=+smu.toFixed(2); }
    else {
      if (i < 10) { val = +(s.base! * 0.55 + ((i-6)/4)*s.base!*0.45 + gauss(rng,0,s.noise!*0.4)).toFixed(2); }
      else {
        const t = i / NUM;
        val = +(s.base! + s.amp!*Math.sin(2*Math.PI*t*1.5+0.5) + s.amp!*0.3*Math.sin(2*Math.PI*t*4) + gauss(rng,0,s.noise!)).toFixed(2);
        if (s.spikes?.[i] !== undefined) val = s.spikes[i];
      }
    }
    let status = 'normal';
    // Use original SENSORS thresholds (not overridden) to keep warn/crit levels unchanged
    const origSensor = SENSORS[key];
    if (val !== null && origSensor.warn !== null) {
      if (origSensor.dir === 'above') { if (val >= origSensor.crit!) status='critical'; else if (val >= origSensor.warn) status='warning'; }
      else                            { if (val <= origSensor.crit!) status='critical'; else if (val <= origSensor.warn) status='warning'; }
    }
    return { time: label, value: val, status };
  });
  CACHE[cacheKey] = pts; return pts;
}

export function getAlert(key: string, machineId?: string): string | null {
  const d = getData(key, machineId);
  if (d.some(p => p.status === 'critical')) return 'critical';
  if (d.some(p => p.status === 'warning'))  return 'warning';
  return null;
}

/**
 * Maps sensor keys to related inspection form item IDs.
 */
export const SENSOR_TO_FORM_ITEMS: Record<string, string[]> = {
  engine_coolant_temp:   ['2.2'],
  engine_oil_pressure:   ['2.1'],
  engine_rpm:            ['4.5'],
  engine_load:           ['4.5'],
  battery_voltage:       ['2.8'],
  hydraulic_oil_temp:    ['2.3'],
  pump_pressure_front:   ['1.8'],
  pump_pressure_rear:    ['1.9'],
  fuel_level:            ['3.5'],
  def_level:             ['2.7'],
  exhaust_gas_temp:      ['2.5'],
  dpf_soot_load:         ['2.5'],
  boost_pressure:        ['2.4'],
};

export interface SensorSnapshot {
  sensorKey: string;
  label: string;
  unit: string;
  latestValue: number;
  latestTime: string;
  status: 'normal' | 'warning' | 'critical';
  warnThreshold: number | null;
  critThreshold: number | null;
  direction: string | null;
  relatedFormItems: string[];
}

/**
 * Build a snapshot of all current sensor readings for AI cross-reference.
 */
export function buildSensorSnapshot(machineId?: string): SensorSnapshot[] {
  return Object.entries(SENSORS).map(([key, cfg]) => {
    const data = getData(key, machineId);
    const withValues = data.filter(d => d.value !== null);
    const latest = withValues[withValues.length - 1];
    return {
      sensorKey: key,
      label: cfg.label,
      unit: cfg.unit,
      latestValue: latest?.value ?? 0,
      latestTime: latest?.time ?? '',
      status: (latest?.status ?? 'normal') as SensorSnapshot['status'],
      warnThreshold: cfg.warn,
      critThreshold: cfg.crit,
      direction: cfg.dir,
      relatedFormItems: SENSOR_TO_FORM_ITEMS[key] || [],
    };
  });
}

/**
 * Build a compact text summary of sensor data for AI prompts.
 */
export function buildSensorContextForAI(machineId?: string): string {
  const snapshots = buildSensorSnapshot(machineId);
  const lines = snapshots.map(s => {
    const thresholdInfo = s.warnThreshold !== null
      ? ` [warn ${s.direction === 'above' ? '≥' : '≤'}${s.warnThreshold}, crit ${s.direction === 'above' ? '≥' : '≤'}${s.critThreshold}]`
      : '';
    const formItems = s.relatedFormItems.length > 0 ? ` → form items: ${s.relatedFormItems.join(', ')}` : '';
    return `${s.label}: ${s.latestValue} ${s.unit} (${s.status.toUpperCase()} at ${s.latestTime})${thresholdInfo}${formItems}`;
  });
  return lines.join('\n');
}
