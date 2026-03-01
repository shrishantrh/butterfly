import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStorage } from '@/hooks/useInspectionStorage';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import { mockMachines } from '@/lib/mock-data';
import excavatorHero from '@/assets/cat-320-hero.jpg';
import { PageHeader } from '@/components/PageHeader';
import { StatusSummary } from '@/components/StatusBadge';
import {
  AlertTriangle, Clock, Fuel, MapPin, Activity,
  Droplets, Play, Cpu, Upload, History,
  ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── PALETTE (uses CSS variables from design system) ──────────────────────────
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
        { label: '1.1 Tires and Rims',                                               status: 'NORMAL',  comment: '' },
        { label: '1.2 Bucket Cutting Edge, Tips, or Moldboard',                      status: 'MONITOR', comment: 'Inspect tips for wear.' },
        { label: '1.3 Bucket Tilt Cylinders and Hoses',                              status: 'NORMAL',  comment: '' },
        { label: '1.4 Bucket, Lift Cylinders and Hoses',                             status: 'PASS',    comment: 'Functioning correctly.' },
        { label: '1.5 Lift Arm Attachment to Frame',                                 status: 'MONITOR', comment: 'Attachment points showing minor wear.' },
        { label: '1.6 Underneath of Machine',                                        status: 'NORMAL',  comment: '' },
        { label: '1.7 Transmission and Transfer Gears',                              status: 'FAIL',    comment: 'Abnormal noise detected during operation.' },
        { label: '1.8 Differential and Final Drive Oil',                             status: 'MONITOR', comment: 'Oil level slightly below recommended level.' },
        { label: '1.9 Steps and Handrails',                                          status: 'PASS',    comment: 'Secure and undamaged.' },
        { label: '1.10 Brake Air Tank',                                              status: 'NORMAL',  comment: '' },
        { label: '1.11 Fuel Tank',                                                   status: 'PASS',    comment: 'No leaks or visible damage.' },
        { label: '1.12 Axles, Final Drives, Differentials, Brakes, Duo-cone Seals', status: 'MONITOR', comment: 'Duo-cone seals have minor seepage.' },
        { label: '1.13 Hydraulic Fluid Tank',                                        status: 'NORMAL',  comment: '' },
        { label: '1.14 Transmission Oil',                                            status: 'PASS',    comment: 'Correct level and condition.' },
        { label: '1.15 Work Lights',                                                 status: 'PASS',    comment: 'All lights operational.' },
        { label: '1.16 Battery & Cables',                                            status: 'NORMAL',  comment: '' },
      ]},
      { title: 'Engine Compartment', items: [
        { label: '2.1 Engine Oil Level',                     status: 'PASS',    comment: 'Confirmed within recommended range.' },
        { label: '2.2 Engine Coolant Level',                 status: 'MONITOR', comment: 'Slight decrease noted; periodic checks recommended.' },
        { label: '2.3 Radiator Cores for Debris',            status: 'FAIL',    comment: 'Debris accumulation detected; cleaning required.' },
        { label: '2.4 Hoses for Cracks or Leaks',            status: 'NORMAL',  comment: 'No visible cracks or leaks detected.' },
        { label: '2.5 Primary / Secondary Fuel Filters',     status: 'NORMAL',  comment: 'Functional; no replacement needed currently.' },
        { label: '2.6 All Belts',                            status: 'PASS',    comment: 'All belts in good condition.' },
        { label: '2.7 Air Cleaner and Air Filter Indicator', status: 'MONITOR', comment: 'Slight wear noted; continue monitoring.' },
        { label: '2.8 Overall Engine Compartment',           status: 'MONITOR', comment: 'Satisfactory; minor improvements suggested.' },
      ]},
      { title: 'On the Machine, Outside the Cab', items: [
        { label: '3.1 Steps & Handrails', status: 'PASS', comment: '' },
        { label: '3.2 ROPS / FOPS',       status: 'PASS', comment: '' },
        { label: '3.3 Fire Extinguisher',  status: 'PASS', comment: '' },
        { label: '3.4 Windshield Wipers',  status: 'PASS', comment: '' },
        { label: '3.5 Side Doors',         status: 'PASS', comment: '' },
      ]},
      { title: 'Inside the Cab', items: [
        { label: '4.1 Seat',                 status: 'PASS', comment: '' },
        { label: '4.2 Seat Belt & Mounting', status: 'PASS', comment: '' },
        { label: '4.3 Horn',                 status: 'PASS', comment: '' },
        { label: '4.4 Backup Alarm',         status: 'PASS', comment: '' },
        { label: '4.5 Windows & Mirrors',    status: 'PASS', comment: '' },
        { label: '4.6 Cab Air Filter',       status: 'PASS', comment: '' },
        { label: '4.7 Indicators & Gauges',  status: 'PASS', comment: '' },
        { label: '4.8 Switch Functionality', status: 'PASS', comment: '' },
        { label: '4.9 Overall Cab Interior', status: 'PASS', comment: '' },
      ]},
    ],
  },
  {
    id: '22841055', date: '2025-06-21', time: '08:32 AM',
    inspector: 'Maria Santos', smu: 1014, workOrder: 'FW11988',
    location: '601 Richland St, East Peoria, IL 61611',
    counts: { FAIL: 0, MONITOR: 3, PASS: 35, NORMAL: 2 },
    sections: [
      { title: 'General Info & Comments', items: [{ label: 'General Info / Comments', status: 'PASS', comment: '' }] },
      { title: 'From the Ground', items: [
        { label: '1.1 Tires and Rims',                                               status: 'PASS',    comment: '' },
        { label: '1.2 Bucket Cutting Edge, Tips, or Moldboard',                      status: 'MONITOR', comment: 'Tips showing early wear, schedule inspection at 1050 SMH.' },
        { label: '1.3 Bucket Tilt Cylinders and Hoses',                              status: 'PASS',    comment: '' },
        { label: '1.4 Bucket, Lift Cylinders and Hoses',                             status: 'PASS',    comment: '' },
        { label: '1.5 Lift Arm Attachment to Frame',                                 status: 'PASS',    comment: '' },
        { label: '1.6 Underneath of Machine',                                        status: 'NORMAL',  comment: '' },
        { label: '1.7 Transmission and Transfer Gears',                              status: 'PASS',    comment: 'No abnormal noise this shift.' },
        { label: '1.8 Differential and Final Drive Oil',                             status: 'PASS',    comment: 'Level within spec.' },
        { label: '1.9 Steps and Handrails',                                          status: 'PASS',    comment: '' },
        { label: '1.10 Brake Air Tank',                                              status: 'NORMAL',  comment: '' },
        { label: '1.11 Fuel Tank',                                                   status: 'PASS',    comment: '' },
        { label: '1.12 Axles, Final Drives, Differentials, Brakes, Duo-cone Seals', status: 'MONITOR', comment: 'Monitoring left side duo-cone seal for seepage progression.' },
        { label: '1.13 Hydraulic Fluid Tank',                                        status: 'PASS',    comment: '' },
        { label: '1.14 Transmission Oil',                                            status: 'PASS',    comment: '' },
        { label: '1.15 Work Lights',                                                 status: 'PASS',    comment: '' },
        { label: '1.16 Battery & Cables',                                            status: 'PASS',    comment: '' },
      ]},
      { title: 'Engine Compartment', items: [
        { label: '2.1 Engine Oil Level',                     status: 'PASS',    comment: '' },
        { label: '2.2 Engine Coolant Level',                 status: 'PASS',    comment: '' },
        { label: '2.3 Radiator Cores for Debris',            status: 'MONITOR', comment: 'Light debris accumulation, monitor for next inspection.' },
        { label: '2.4 Hoses for Cracks or Leaks',            status: 'PASS',    comment: '' },
        { label: '2.5 Primary / Secondary Fuel Filters',     status: 'PASS',    comment: '' },
        { label: '2.6 All Belts',                            status: 'PASS',    comment: '' },
        { label: '2.7 Air Cleaner and Air Filter Indicator', status: 'PASS',    comment: '' },
        { label: '2.8 Overall Engine Compartment',           status: 'PASS',    comment: '' },
      ]},
      { title: 'On the Machine, Outside the Cab', items: [
        { label: '3.1 Steps & Handrails', status: 'PASS', comment: '' },
        { label: '3.2 ROPS / FOPS',       status: 'PASS', comment: '' },
        { label: '3.3 Fire Extinguisher',  status: 'PASS', comment: '' },
        { label: '3.4 Windshield Wipers',  status: 'PASS', comment: '' },
        { label: '3.5 Side Doors',         status: 'PASS', comment: '' },
      ]},
      { title: 'Inside the Cab', items: [
        { label: '4.1 Seat',                 status: 'PASS', comment: '' },
        { label: '4.2 Seat Belt & Mounting', status: 'PASS', comment: '' },
        { label: '4.3 Horn',                 status: 'PASS', comment: '' },
        { label: '4.4 Backup Alarm',         status: 'PASS', comment: '' },
        { label: '4.5 Windows & Mirrors',    status: 'PASS', comment: '' },
        { label: '4.6 Cab Air Filter',       status: 'PASS', comment: '' },
        { label: '4.7 Indicators & Gauges',  status: 'PASS', comment: '' },
        { label: '4.8 Switch Functionality', status: 'PASS', comment: '' },
        { label: '4.9 Overall Cab Interior', status: 'PASS', comment: '' },
      ]},
    ],
  },
  {
    id: '22789301', date: '2025-06-14', time: '07:55 AM',
    inspector: 'John Doe', smu: 1001, workOrder: 'FW11801',
    location: '601 Richland St, East Peoria, IL 61611',
    counts: { FAIL: 1, MONITOR: 4, PASS: 33, NORMAL: 2 },
    sections: [
      { title: 'General Info & Comments', items: [{ label: 'General Info / Comments', status: 'NORMAL', comment: '' }] },
      { title: 'From the Ground', items: [
        { label: '1.1 Tires and Rims',                                               status: 'MONITOR', comment: 'Left rear tire pressure slightly low — 88 PSI, spec 95 PSI.' },
        { label: '1.2 Bucket Cutting Edge, Tips, or Moldboard',                      status: 'PASS',    comment: '' },
        { label: '1.3 Bucket Tilt Cylinders and Hoses',                              status: 'NORMAL',  comment: '' },
        { label: '1.4 Bucket, Lift Cylinders and Hoses',                             status: 'PASS',    comment: '' },
        { label: '1.5 Lift Arm Attachment to Frame',                                 status: 'MONITOR', comment: 'Same wear pattern on attachment points. Flagged for shop review.' },
        { label: '1.6 Underneath of Machine',                                        status: 'NORMAL',  comment: '' },
        { label: '1.7 Transmission and Transfer Gears',                              status: 'FAIL',    comment: 'Grinding noise on downshift. Recommend immediate dealer evaluation.' },
        { label: '1.8 Differential and Final Drive Oil',                             status: 'PASS',    comment: '' },
        { label: '1.9 Steps and Handrails',                                          status: 'PASS',    comment: '' },
        { label: '1.10 Brake Air Tank',                                              status: 'PASS',    comment: '' },
        { label: '1.11 Fuel Tank',                                                   status: 'PASS',    comment: '' },
        { label: '1.12 Axles, Final Drives, Differentials, Brakes, Duo-cone Seals', status: 'PASS',    comment: '' },
        { label: '1.13 Hydraulic Fluid Tank',                                        status: 'PASS',    comment: '' },
        { label: '1.14 Transmission Oil',                                            status: 'MONITOR', comment: 'Slight discoloration, possible contamination. Sample sent to S·O·S.' },
        { label: '1.15 Work Lights',                                                 status: 'PASS',    comment: '' },
        { label: '1.16 Battery & Cables',                                            status: 'PASS',    comment: '' },
      ]},
      { title: 'Engine Compartment', items: [
        { label: '2.1 Engine Oil Level',                     status: 'PASS',    comment: '' },
        { label: '2.2 Engine Coolant Level',                 status: 'MONITOR', comment: 'Marginal decrease noted. Same pattern as previous two inspections.' },
        { label: '2.3 Radiator Cores for Debris',            status: 'PASS',    comment: '' },
        { label: '2.4 Hoses for Cracks or Leaks',            status: 'PASS',    comment: '' },
        { label: '2.5 Primary / Secondary Fuel Filters',     status: 'PASS',    comment: '' },
        { label: '2.6 All Belts',                            status: 'PASS',    comment: '' },
        { label: '2.7 Air Cleaner and Air Filter Indicator', status: 'PASS',    comment: '' },
        { label: '2.8 Overall Engine Compartment',           status: 'PASS',    comment: '' },
      ]},
      { title: 'On the Machine, Outside the Cab', items: [
        { label: '3.1 Steps & Handrails', status: 'PASS', comment: '' },
        { label: '3.2 ROPS / FOPS',       status: 'PASS', comment: '' },
        { label: '3.3 Fire Extinguisher',  status: 'PASS', comment: '' },
        { label: '3.4 Windshield Wipers',  status: 'PASS', comment: '' },
        { label: '3.5 Side Doors',         status: 'PASS', comment: '' },
      ]},
      { title: 'Inside the Cab', items: [
        { label: '4.1 Seat',                 status: 'PASS', comment: '' },
        { label: '4.2 Seat Belt & Mounting', status: 'PASS', comment: '' },
        { label: '4.3 Horn',                 status: 'PASS', comment: '' },
        { label: '4.4 Backup Alarm',         status: 'PASS', comment: '' },
        { label: '4.5 Windows & Mirrors',    status: 'PASS', comment: '' },
        { label: '4.6 Cab Air Filter',       status: 'PASS', comment: '' },
        { label: '4.7 Indicators & Gauges',  status: 'PASS', comment: '' },
        { label: '4.8 Switch Functionality', status: 'PASS', comment: '' },
        { label: '4.9 Overall Cab Interior', status: 'PASS', comment: '' },
      ]},
    ],
  },
  {
    id: '22731450', date: '2025-06-07', time: '09:14 AM',
    inspector: 'Maria Santos', smu: 988, workOrder: 'FW11622',
    location: '601 Richland St, East Peoria, IL 61611',
    counts: { FAIL: 0, MONITOR: 2, PASS: 36, NORMAL: 2 },
    sections: [
      { title: 'General Info & Comments', items: [{ label: 'General Info / Comments', status: 'NORMAL', comment: '' }] },
      { title: 'From the Ground', items: [
        { label: '1.1 Tires and Rims',                                               status: 'PASS',    comment: '' },
        { label: '1.2 Bucket Cutting Edge, Tips, or Moldboard',                      status: 'PASS',    comment: '' },
        { label: '1.3 Bucket Tilt Cylinders and Hoses',                              status: 'NORMAL',  comment: '' },
        { label: '1.4 Bucket, Lift Cylinders and Hoses',                             status: 'PASS',    comment: '' },
        { label: '1.5 Lift Arm Attachment to Frame',                                 status: 'MONITOR', comment: 'Attachment points beginning to show wear. Flag for next PM.' },
        { label: '1.6 Underneath of Machine',                                        status: 'NORMAL',  comment: '' },
        { label: '1.7 Transmission and Transfer Gears',                              status: 'PASS',    comment: '' },
        { label: '1.8 Differential and Final Drive Oil',                             status: 'PASS',    comment: '' },
        { label: '1.9 Steps and Handrails',                                          status: 'PASS',    comment: '' },
        { label: '1.10 Brake Air Tank',                                              status: 'PASS',    comment: '' },
        { label: '1.11 Fuel Tank',                                                   status: 'PASS',    comment: '' },
        { label: '1.12 Axles, Final Drives, Differentials, Brakes, Duo-cone Seals', status: 'PASS',    comment: '' },
        { label: '1.13 Hydraulic Fluid Tank',                                        status: 'PASS',    comment: '' },
        { label: '1.14 Transmission Oil',                                            status: 'PASS',    comment: '' },
        { label: '1.15 Work Lights',                                                 status: 'PASS',    comment: '' },
        { label: '1.16 Battery & Cables',                                            status: 'PASS',    comment: '' },
      ]},
      { title: 'Engine Compartment', items: [
        { label: '2.1 Engine Oil Level',                     status: 'PASS',    comment: '' },
        { label: '2.2 Engine Coolant Level',                 status: 'MONITOR', comment: 'Slightly below full mark. Added 0.5L, recheck next inspection.' },
        { label: '2.3 Radiator Cores for Debris',            status: 'PASS',    comment: '' },
        { label: '2.4 Hoses for Cracks or Leaks',            status: 'PASS',    comment: '' },
        { label: '2.5 Primary / Secondary Fuel Filters',     status: 'PASS',    comment: '' },
        { label: '2.6 All Belts',                            status: 'PASS',    comment: '' },
        { label: '2.7 Air Cleaner and Air Filter Indicator', status: 'PASS',    comment: '' },
        { label: '2.8 Overall Engine Compartment',           status: 'PASS',    comment: '' },
      ]},
      { title: 'On the Machine, Outside the Cab', items: [
        { label: '3.1 Steps & Handrails', status: 'PASS', comment: '' },
        { label: '3.2 ROPS / FOPS',       status: 'PASS', comment: '' },
        { label: '3.3 Fire Extinguisher',  status: 'PASS', comment: '' },
        { label: '3.4 Windshield Wipers',  status: 'PASS', comment: '' },
        { label: '3.5 Side Doors',         status: 'PASS', comment: '' },
      ]},
      { title: 'Inside the Cab', items: [
        { label: '4.1 Seat',                 status: 'PASS', comment: '' },
        { label: '4.2 Seat Belt & Mounting', status: 'PASS', comment: '' },
        { label: '4.3 Horn',                 status: 'PASS', comment: '' },
        { label: '4.4 Backup Alarm',         status: 'PASS', comment: '' },
        { label: '4.5 Windows & Mirrors',    status: 'PASS', comment: '' },
        { label: '4.6 Cab Air Filter',       status: 'PASS', comment: '' },
        { label: '4.7 Indicators & Gauges',  status: 'PASS', comment: '' },
        { label: '4.8 Switch Functionality', status: 'PASS', comment: '' },
        { label: '4.9 Overall Cab Interior', status: 'PASS', comment: '' },
      ]},
    ],
  },
];

// ─── SENSOR CONFIG ────────────────────────────────────────────────────────────
type SensorCfg = {
  label: string; unit: string; category: string;
  warn: number | null; crit: number | null; dir: string | null;
  base?: number; amp?: number; noise?: number;
  spikes?: Record<number,number>; type?: string;
};

const SENSORS: Record<string, SensorCfg> = {
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

// ─── DATA GENERATION ─────────────────────────────────────────────────────────
function makeRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function gauss(rng: ()=>number, mean: number, std: number) {
  const u1 = Math.max(1e-10, rng()), u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
type DataPoint = { time: string; value: number | null; status: string };
const CACHE: Record<string, DataPoint[]> = {};
function getData(key: string): DataPoint[] {
  if (CACHE[key]) return CACHE[key];
  const s = SENSORS[key]; const NUM = 144;
  const startMs = new Date('2026-02-28T06:00:00Z').getTime();
  const rng = makeRng(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  let fuel = 85, def = 78, dpf = 12, idle = 0, smu = 4821.4;
  const pts: DataPoint[] = Array.from({ length: NUM }, (_, i) => {
    const label = new Date(startMs + i * 600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let val: number | null = null;
    if (i < 6) { val = null; }
    else if (s.type === 'fuel')  { fuel = Math.max(0, fuel - gauss(rng,0.28,0.04)); val = +fuel.toFixed(1); }
    else if (s.type === 'def')   { def  = Math.max(0, def  - gauss(rng,0.06,0.01)); val = +def.toFixed(1);  }
    else if (s.type === 'dpf')   { if (i>=85&&i<=90) dpf=Math.max(5,dpf-gauss(rng,8,0.5)); else dpf=Math.min(100,dpf+gauss(rng,0.22,0.04)); val=+dpf.toFixed(1); }
    else if (s.type === 'idle')  { idle=Math.min(100,idle+((i>=42&&i<=48)||(i>=100&&i<=106)?gauss(rng,0.9,0.1):gauss(rng,0.18,0.05))); val=+idle.toFixed(1); }
    else if (s.type === 'smu')   { smu+=10/60; val=+smu.toFixed(2); }
    else if (s.type === 'payload'){ val=(i>10&&i<138&&i%7===0)?+(gauss(rng,18.5,1.8)).toFixed(1):0; }
    else {
      if (i < 10) { val = +(s.base! * 0.55 + ((i-6)/4)*s.base!*0.45 + gauss(rng,0,s.noise!*0.4)).toFixed(2); }
      else {
        const t = i / NUM;
        val = +(s.base! + s.amp!*Math.sin(2*Math.PI*t*1.5+0.5) + s.amp!*0.3*Math.sin(2*Math.PI*t*4) + gauss(rng,0,s.noise!)).toFixed(2);
        if (s.spikes?.[i] !== undefined) val = s.spikes[i];
      }
    }
    let status = 'normal';
    if (val !== null && s.warn !== null) {
      if (s.dir === 'above') { if (val >= s.crit!) status='critical'; else if (val >= s.warn) status='warning'; }
      else                   { if (val <= s.crit!) status='critical'; else if (val <= s.warn) status='warning'; }
    }
    return { time: label, value: val, status };
  });
  CACHE[key] = pts; return pts;
}
function getAlert(key: string): string | null {
  const d = getData(key);
  if (d.some(p => p.status === 'critical')) return 'critical';
  if (d.some(p => p.status === 'warning'))  return 'warning';
  return null;
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function Sparkline({ k }: { k: string }) {
  const data = getData(k).filter(d => d.value !== null);
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
      <polygon
        points={`0,${H} ${pts} ${W},${H}`}
        fill={`url(#sg-${k})`}
      />
      <polyline points={pts} fill="none" stroke={strokeCol} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function DotSummary({ counts, size = 'md' }: { counts: Record<string,number>; size?: 'sm'|'md' }) {
  const dotCls = size === 'sm' ? 'w-[7px] h-[7px]' : 'w-[9px] h-[9px]';
  const textCls = size === 'sm' ? 'text-[10px]' : 'text-[13px]';
  const entries: [string, string, string][] = [
    ['FAIL',    'text-status-fail',    'status-dot-fail'],
    ['MONITOR', 'text-status-monitor', 'status-dot-monitor'],
    ['PASS',    'text-status-pass',    'status-dot-pass'],
    ['NORMAL',  'text-muted-foreground','status-dot-normal'],
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
function SensorChart({ sensorKey, onBack }: { sensorKey: string; onBack: () => void }) {
  const sensor = SENSORS[sensorKey];
  const data   = getData(sensorKey);
  const vals   = data.filter(d => d.value !== null).map(d => d.value as number);
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
          <span style={{ fontSize:10, color:C.textDim }}>· 24-hr shift</span>
        </div>
      </div>
      {/* Stats row */}
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
      {/* Threshold badges */}
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
      {/* Chart */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 4px 10px 0', marginBottom:12 }}>
        <div style={{ display:'flex', gap:14, paddingLeft:16, marginBottom:10, fontSize:9, color:C.textDim }}>
          <span><span style={{ color:C.safe }}>●</span> NORMAL</span>
          <span><span style={{ color:C.warning }}>●</span> WARNING</span>
          <span><span style={{ color:C.critical }}>●</span> CRITICAL</span>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top:8, right:14, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="#1C1C1C" vertical={false}/>
            <XAxis dataKey="time" ticks={xTicks} tick={{ fill:C.textDim, fontSize:9 }}
              axisLine={{ stroke:C.border }} tickLine={false}/>
            <YAxis domain={[yMin, yMax]} tick={{ fill:C.textDim, fontSize:9 }} axisLine={false} tickLine={false} width={46}/>
            <Tooltip content={<ChartTooltip sensor={sensor}/>}/>
            {sensor.warn!==null && sensor.crit!==null && (
              sensor.dir === 'above' ? <>
                <ReferenceArea y1={yMin}       y2={sensor.warn} fill={C.safe}     fillOpacity={0.04}/>
                <ReferenceArea y1={sensor.warn} y2={sensor.crit} fill={C.warning} fillOpacity={0.08}/>
                <ReferenceArea y1={sensor.crit} y2={yMax}        fill={C.critical} fillOpacity={0.10}/>
              </> : <>
                <ReferenceArea y1={sensor.warn} y2={yMax}        fill={C.safe}     fillOpacity={0.04}/>
                <ReferenceArea y1={sensor.crit} y2={sensor.warn} fill={C.warning} fillOpacity={0.08}/>
                <ReferenceArea y1={yMin}        y2={sensor.crit} fill={C.critical} fillOpacity={0.10}/>
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
                if (payload.status === 'warning')  return <circle key={`d${index}`} cx={cx} cy={cy} r={3.5} fill={C.warning}  stroke={C.black} strokeWidth={1.5}/>;
                return <g key={`d${index}`}/>;
              }}
              activeDot={{ r:6, fill:C.yellow, stroke:C.black, strokeWidth:2 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Events */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'13px' }}>
        <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:9 }}>THRESHOLD EVENTS · {events.length}</div>
        {events.length === 0 ? (
          <div style={{ color:C.yellow, fontSize:11, textAlign:'center', padding:'6px 0', opacity:0.7 }}>── No threshold events this session ──</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:190, overflowY:'auto' }}>
            {events.map((d, i) => {
              const col = d.status === 'critical' ? C.critical : C.warning;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:11, padding:'6px 10px',
                  background:`${col}0C`, borderRadius:7, borderLeft:`2px solid ${col}` }}>
                  <span style={{ color:C.textDim, width:40, flexShrink:0 }}>{d.time}</span>
                  <span style={{ color:col, fontWeight:700, width:62, flexShrink:0 }}>{d.status.toUpperCase()}</span>
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

// ─── SENSOR LIST (no category tabs) ──────────────────────────────────────────
function TelemetrySection() {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  if (activeKey) {
    return (
      <div style={{ background:C.black, borderRadius:12, padding:'0 14px', fontFamily:"'Courier New',monospace" }}>
        <SensorChart sensorKey={activeKey} onBack={() => setActiveKey(null)}/>
      </div>
    );
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, fontFamily:"'Courier New',monospace", paddingTop:12 }}>
      <div style={{ gridColumn:'1/-1', fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:2 }}>
        ALL SENSORS · {Object.keys(SENSORS).length}
      </div>
      {Object.entries(SENSORS).map(([k, s]) => {
        const d = getData(k);
        const v = d.filter(p => p.value !== null).map(p => p.value as number);
        const cur = v[v.length - 1];
        const alert = getAlert(k);
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
            {/* Left: text info */}
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0, width:58, height:'100%' }}>
              <div style={{ fontSize:9, fontWeight:600, color:C.white, lineHeight:1.3, wordBreak:'break-word' }}>{s.label}</div>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color:ac, lineHeight:1 }}>{cur?.toFixed(1)}</div>
                <div style={{ fontSize:8, color:C.textDim }}>{s.unit}</div>
                {cnt > 0 && <div style={{ fontSize:8, color:ac, fontWeight:700, marginTop:1 }}>{cnt} evt</div>}
              </div>
            </div>
            {/* Right: sparkline — fixed height, natural aspect ratio */}
            <div style={{ flex:1, height:60, minWidth:0 }}>
              <Sparkline k={k}/>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── REPORT DETAIL ────────────────────────────────────────────────────────────
function ReportDetail({ report, onBack }: { report: Report; onBack: () => void }) {
  const [openSections, setOpenSections] = useState<Record<string,boolean>>(
    Object.fromEntries(report.sections.map(s => [s.title, true]))
  );
  const toggle = (title: string) => setOpenSections(p => ({ ...p, [title]: !p[title] }));
  const issues = report.sections.flatMap(s => s.items).filter(i => i.status === 'FAIL' || i.status === 'MONITOR');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, fontFamily:"'Courier New',monospace" }}>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.yellow, fontSize:13,
        cursor:'pointer', padding:'0 0 2px', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
        ‹ Reports
      </button>
      {/* Report header */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderTop:`2px solid ${C.yellow}`, borderRadius:12, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, color:C.textDim, letterSpacing:1, marginBottom:3 }}>INSPECTION REPORT</div>
            <div style={{ fontSize:18, fontWeight:700, color:C.white }}>#{report.id}</div>
          </div>
          <DotSummary counts={report.counts}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px', fontSize:11 }}>
          {([
            ['Date',      `${report.date} · ${report.time}`],
            ['Inspector', report.inspector],
            ['SMU',       `${report.smu} hrs`],
            ['Work Order',report.workOrder],
          ] as [string,string][]).map(([l,v])=>(
            <div key={l}>
              <div style={{ fontSize:9, color:C.textDim, letterSpacing:1, marginBottom:1 }}>{l}</div>
              <div style={{ color:C.textPrimary, fontWeight:600 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:10, color:C.textDim }}>
          {report.location}
        </div>
      </div>
      {/* Open items */}
      {issues.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:14 }}>
          <div style={{ fontSize:9, color:C.textDim, letterSpacing:2, marginBottom:10 }}>OPEN ITEMS · {issues.length}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {issues.map((item, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 10px',
                background:`${STATUS_DOT[item.status]}0C`, borderRadius:8, borderLeft:`2px solid ${STATUS_DOT[item.status]}` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:STATUS_DOT[item.status], flexShrink:0, marginTop:2 }}/>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:C.textPrimary }}>{item.label}</div>
                  {item.comment && <div style={{ fontSize:11, color:C.textMid, marginTop:2 }}>{item.comment}</div>}
                </div>
                <div style={{ marginLeft:'auto', flexShrink:0, fontSize:10, fontWeight:700, color:STATUS_DOT[item.status] }}>{item.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Sections */}
      {report.sections.map(sec => (
        <div key={sec.title} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
          <button onClick={() => toggle(sec.title)} style={{
            width:'100%', background:'transparent', border:'none',
            borderBottom: openSections[sec.title] ? `1px solid ${C.border}` : 'none',
            padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', fontFamily:'inherit',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:C.yellow, letterSpacing:0.5 }}>{sec.title.toUpperCase()}</span>
              <span style={{ fontSize:10, color:C.textDim }}>{sec.items.length} items</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <DotSummary counts={{
                FAIL:    sec.items.filter(i => i.status==='FAIL').length,
                MONITOR: sec.items.filter(i => i.status==='MONITOR').length,
                PASS:    sec.items.filter(i => i.status==='PASS').length,
                NORMAL:  sec.items.filter(i => i.status==='NORMAL').length,
              }} size="sm"/>
              <span style={{ color:C.textDim, fontSize:14 }}>{openSections[sec.title] ? '▾' : '▸'}</span>
            </div>
          </button>
          {openSections[sec.title] && (
            <div>
              {sec.items.map((item, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px',
                  borderBottom: i < sec.items.length-1 ? `1px solid ${C.border}` : 'none',
                  background: item.status==='FAIL'?`${C.critical}07`:item.status==='MONITOR'?`${C.warning}06`:'transparent',
                }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:STATUS_DOT[item.status], flexShrink:0, marginTop:3 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, color:C.textPrimary, lineHeight:1.4 }}>{item.label}</div>
                    {item.comment && <div style={{ fontSize:11, color:C.textMid, marginTop:3, lineHeight:1.4 }}>{item.comment}</div>}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:STATUS_DOT[item.status], flexShrink:0 }}>{item.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── REPORTS SECTION ──────────────────────────────────────────────────────────
function DbReportDetail({ inspectionId, onBack }: { inspectionId: string; onBack: () => void }) {
  const { getInspectionDetail } = useInspectionStorage();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const d = await getInspectionDetail(inspectionId);
      setDetail(d);
      setLoading(false);
    })();
  }, [inspectionId, getInspectionDetail]);

  if (loading) return (
    <div style={{ padding: 24, textAlign: 'center', fontFamily: "'Courier New',monospace" }}>
      <div style={{ color: C.textDim, fontSize: 12 }}>Loading report...</div>
    </div>
  );
  if (!detail) return null;

  const { inspection: insp, items } = detail;
  const sections: Record<string, any[]> = {};
  items.forEach((item: any) => {
    if (!sections[item.section_title]) sections[item.section_title] = [];
    sections[item.section_title].push(item);
  });

  const counts = {
    FAIL: items.filter((i: any) => i.status?.toUpperCase() === 'FAIL').length,
    MONITOR: items.filter((i: any) => i.status?.toUpperCase() === 'MONITOR').length,
    PASS: items.filter((i: any) => i.status?.toUpperCase() === 'PASS').length,
    NORMAL: items.filter((i: any) => i.status?.toUpperCase() === 'NORMAL').length,
  };
  const issues = items.filter((i: any) => ['FAIL', 'MONITOR'].includes(i.status?.toUpperCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Courier New',monospace" }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.yellow, fontSize: 13, cursor: 'pointer', padding: '0 0 2px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>‹ Reports</button>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.yellow}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 3 }}>INSPECTION REPORT</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>{insp.asset_id}</div>
          </div>
          <DotSummary counts={counts} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 11 }}>
          {([['Date', new Date(insp.created_at).toLocaleDateString()], ['Inspector', insp.inspector_name], ['SMU', `${insp.smu_hours} hrs`], ['Location', insp.location || '—']] as [string, string][]).map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 1 }}>{l}</div><div style={{ color: C.textPrimary, fontWeight: 600 }}>{v}</div></div>
          ))}
        </div>
        {insp.executive_summary && <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMid }}>{insp.executive_summary}</div>}
      </div>
      {issues.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 10 }}>OPEN ITEMS · {issues.length}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {issues.map((item: any) => {
              const col = STATUS_DOT[item.status?.toUpperCase()] || C.textDim;
              return (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: `${col}0C`, borderRadius: 8, borderLeft: `2px solid ${col}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 2 }} />
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary }}>{item.label}</div>{item.comment && <div style={{ fontSize: 11, color: C.textMid, marginTop: 2 }}>{item.comment}</div>}</div>
                  <div style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 10, fontWeight: 700, color: col }}>{item.status?.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {Object.entries(sections).map(([title, sectionItems]) => (
        <div key={title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.yellow, letterSpacing: 0.5 }}>{title.toUpperCase()}</span>
            <span style={{ fontSize: 10, color: C.textDim }}>{sectionItems.length} items</span>
          </div>
          <div>
            {sectionItems.map((item: any, i: number) => {
              const col = STATUS_DOT[item.status?.toUpperCase()] || C.textDim;
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: i < sectionItems.length - 1 ? `1px solid ${C.border}` : 'none', background: item.status?.toUpperCase() === 'FAIL' ? `${C.critical}07` : item.status?.toUpperCase() === 'MONITOR' ? `${C.warning}06` : 'transparent' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: col, flexShrink: 0, marginTop: 3 }} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, color: C.textPrimary, lineHeight: 1.4 }}>{item.label}</div>{item.comment && <div style={{ fontSize: 11, color: C.textMid, marginTop: 3, lineHeight: 1.4 }}>{item.comment}</div>}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: col, flexShrink: 0 }}>{item.status?.toUpperCase()}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsSection({ machineId }: { machineId?: string }) {
  const [selected, setSelected] = useState<Report | null>(null);
  const [selectedDbId, setSelectedDbId] = useState<string | null>(null);
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

  if (selected) return <ReportDetail report={selected} onBack={() => setSelected(null)} />;
  if (selectedDbId) return <DbReportDetail inspectionId={selectedDbId} onBack={() => setSelectedDbId(null)} />;

  const totalCount = REPORTS.length + dbInspections.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: "'Courier New',monospace" }}>
      <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 4 }}>
        INSPECTION HISTORY · {totalCount} REPORTS
      </div>

      {/* DB inspections first (most recent) */}
      {dbInspections.map(insp => {
        const analysis = insp.analysis_json as any;
        const safetyClearance = analysis?.executiveSummary?.safetyClearance;
        const clearanceColors: Record<string, string> = { GO: C.safe, CONDITIONAL: C.warning, NO_GO: C.critical };
        const borderCol = safetyClearance ? (clearanceColors[safetyClearance] || C.yellow) : C.yellow;
        return (
          <button key={insp.id} onClick={() => setSelectedDbId(insp.id)} style={{
            background: C.card, border: `1px solid ${borderCol}30`, borderLeft: `3px solid ${borderCol}`,
            borderRadius: 10, padding: '14px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.12s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 2 }}>
                  {safetyClearance ? (safetyClearance === 'GO' ? '✓ CLEAR' : safetyClearance === 'CONDITIONAL' ? '⚠ CONDITIONAL' : '✕ NO-GO') : 'AI INSPECTION'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{new Date(insp.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{new Date(insp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {insp.inspector_name}</div>
              </div>
              {insp.health_score != null && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: insp.health_score >= 80 ? C.safe : insp.health_score >= 50 ? C.warning : C.critical }}>{insp.health_score}</div>
                  <div style={{ fontSize: 8, color: C.textDim }}>/100</div>
                </div>
              )}
            </div>
            {insp.executive_summary && <div style={{ fontSize: 11, color: C.textMid, marginBottom: 8, lineHeight: 1.4 }} className="line-clamp-2">{insp.executive_summary}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: C.textDim }}>SMH {insp.smu_hours?.toLocaleString()}</div>
              <span style={{ color: C.textDim, fontSize: 16 }}>›</span>
            </div>
          </button>
        );
      })}

      {loadingDb && <div style={{ fontSize: 11, color: C.textDim, textAlign: 'center', padding: 8 }}>Loading saved inspections...</div>}

      {/* Mock historical reports */}
      {REPORTS.map(r => {
        const hasFailures = r.counts.FAIL > 0;
        const borderCol = hasFailures ? C.critical : r.counts.MONITOR > 0 ? C.warning : C.border;
        return (
          <button key={r.id} onClick={() => setSelected(r)} style={{
            background: C.card, border: `1px solid ${borderCol}30`, borderLeft: `3px solid ${hasFailures ? C.critical : r.counts.MONITOR > 0 ? C.warning : C.yellow}`,
            borderRadius: 10, padding: '14px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.12s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1, marginBottom: 2 }}>#{r.id}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{r.date}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>{r.time} · {r.inspector}</div>
              </div>
              <DotSummary counts={r.counts} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, color: C.textDim }}>SMH {r.smu} · {r.workOrder}</div>
              <span style={{ color: C.textDim, fontSize: 16 }}>›</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PreInspection() {
  const { machineId } = useParams();
  const navigate      = useNavigate();
  const machine       = mockMachines.find(m => m.id === machineId);
  const [activeSection, setActiveSection] = useState<'telemetry' | 'reports' | null>(null);

  if (!machine) return <div className="p-8 text-center text-muted-foreground">Machine not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Pre-Inspection Brief" subtitle={machine.assetId} back="/" />

      <div className="px-5 py-5 space-y-4 pb-36">
        {/* ── Machine Hero ───────────────────────────────────────────── */}
        <div className="card-elevated overflow-hidden animate-slide-up">
          <div className="relative h-48 bg-gradient-to-br from-surface-2 to-surface-3 overflow-hidden">
            <img
              src={excavatorHero}
              alt={machine.model}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold text-foreground">{machine.model}</h2>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{machine.assetId} · S/N {machine.serial}</p>
            </div>
            {machine.lastInspection && (
              <div className="absolute top-3 right-3">
                <StatusSummary {...machine.lastInspection.summary}/>
              </div>
            )}
          </div>

          {/* Specification Grid */}
          <div className="p-4">
            <p className="label-caps mb-3">Specification</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="inset-surface p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-primary"/>
                  <span className="text-[10px] text-muted-foreground">SMU</span>
                </div>
                <p className="font-mono font-bold text-base text-foreground">{machine.smuHours.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">hours</p>
              </div>
              <div className="inset-surface p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Fuel className="w-3.5 h-3.5 text-primary"/>
                  <span className="text-[10px] text-muted-foreground">Fuel</span>
                </div>
                <p className={`font-mono font-bold text-base ${machine.fuelLevel < 25 ? 'text-status-fail' : 'text-foreground'}`}>{machine.fuelLevel}%</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">level</p>
              </div>
              <div className="inset-surface p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-status-pass"/>
                  <span className="text-[10px] text-muted-foreground">Status</span>
                </div>
                <p className="font-mono font-bold text-sm text-status-pass">ON</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">online</p>
              </div>
            </div>
            <div className="inset-surface p-3 rounded-2xl flex items-center gap-3">
              <MapPin className="w-4 h-4 text-primary shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{machine.location}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {machine.gpsCoords.lat.toFixed(3)}°N, {machine.gpsCoords.lng.toFixed(3)}°W
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Fault Codes ───────────────────────────────────────── */}
        {machine.activeFaultCodes.length > 0 && (
          <div className="card-elevated p-4 border-status-fail/20 animate-slide-up" style={{ animationDelay:'0.05s' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-status-fail/12 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-status-fail"/>
              </div>
              <h3 className="text-sm font-bold text-status-fail">Active Fault Codes</h3>
              <span className="ml-auto metric-pill-status bg-status-fail/12 text-status-fail border border-status-fail/20 text-[10px]">
                {machine.activeFaultCodes.length}
              </span>
            </div>
            <div className="space-y-2">
              {machine.activeFaultCodes.map((fc) => (
                <div key={fc.code} className="inset-surface rounded-2xl p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className="w-3.5 h-3.5 text-sensor"/>
                    <span className="font-mono text-sm text-sensor font-bold">{fc.code}</span>
                    <span className={`ml-auto text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full border ${fc.severity === 'critical' ? 'bg-status-fail/10 text-status-fail border-status-fail/15' : 'bg-status-monitor/10 text-status-monitor border-status-monitor/15'}`}>
                      {fc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{fc.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">System: {fc.system}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VisionLink Telemetry — expandable sensor list + charts ─── */}
        {(() => {
          const criticalSensors = Object.entries(SENSORS).filter(([k]) => {
            const alert = getAlert(k);
            return alert === 'critical' || alert === 'warning';
          }).map(([k, s]) => {
            const d = getData(k);
            const v = d.filter(p => p.value !== null).map(p => p.value as number);
            const cur = v[v.length - 1];
            const alert = getAlert(k);
            return { key: k, label: s.label, unit: s.unit, value: cur, alert };
          });
          return (
            <div className="card-elevated animate-slide-up" style={{ animationDelay:'0.1s' }}>
              <button
                onClick={() => setActiveSection(activeSection === 'telemetry' ? null : 'telemetry')}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/12 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary"/>
                </div>
                <h3 className="text-sm font-bold flex-1">VisionLink Telemetry</h3>
                <div className="flex items-center gap-1.5 mr-2">
                  {criticalSensors.length > 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-status-fail"/>
                      <span className="text-[10px] text-status-fail font-mono font-semibold">{criticalSensors.length} ALERT{criticalSensors.length !== 1 ? 'S' : ''}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-status-pass" style={{ boxShadow:'0 0 5px hsl(var(--status-pass))' }}/>
                      <span className="text-[10px] text-status-pass font-mono font-semibold tracking-widest">LIVE</span>
                    </>
                  )}
                </div>
                {activeSection === 'telemetry'
                  ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/>
                  : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0"/>}
              </button>
              {/* Critical warnings shown even when collapsed */}
              {activeSection !== 'telemetry' && criticalSensors.length > 0 && (
                <div className="px-4 pb-3 space-y-1.5">
                  {criticalSensors.map(s => {
                    const isCrit = s.alert === 'critical';
                    return (
                      <div key={s.key} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isCrit ? 'bg-status-fail/8 border border-status-fail/20' : 'bg-status-monitor/8 border border-status-monitor/20'}`}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isCrit ? 'bg-status-fail' : 'bg-status-monitor'}`} style={{ boxShadow: `0 0 6px ${isCrit ? 'hsl(var(--status-fail))' : 'hsl(var(--status-monitor))'}` }}/>
                        <span className="text-xs font-semibold text-foreground flex-1">{s.label}</span>
                        <span className={`font-mono text-sm font-bold ${isCrit ? 'text-status-fail' : 'text-status-monitor'}`}>{s.value?.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">{s.unit}</span>
                        <span className={`text-[9px] font-bold uppercase ${isCrit ? 'text-status-fail' : 'text-status-monitor'}`}>{s.alert}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {activeSection === 'telemetry' && (
                <div className="px-4 pb-4 border-t border-border/30">
                  <TelemetrySection/>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── S·O·S Fluid Analysis ─────────────────────────────────────── */}
        <div className="card-elevated p-4 animate-slide-up" style={{ animationDelay:'0.15s' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sensor/12 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-sensor"/>
            </div>
            <h3 className="text-sm font-bold">S·O·S Fluid Analysis</h3>
            <span className="ml-auto text-xs text-muted-foreground font-mono">02/15/2026</span>
          </div>
          <div className="space-y-0">
            {([
              ['Engine Oil',       'Normal',                'text-status-pass'],
              ['Hydraulic Fluid',  'Elevated Iron — 45 ppm','text-status-monitor'],
              ['Coolant',          'Normal',                'text-status-pass'],
              ['Final Drive Oil',  'Normal',                'text-status-pass'],
            ] as [string,string,string][]).map(([label, value, cls], i) => (
              <div key={label} className={`flex justify-between items-center py-3 ${i < 3 ? 'divider' : ''}`}>
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`metric-pill-status text-[11px] ${cls === 'text-status-pass' ? 'bg-status-pass/10 border border-status-pass/20' : 'bg-status-monitor/10 border border-status-monitor/20'} ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Inspection Reports — expandable ──────────────────────────── */}
        <div className="card-elevated animate-slide-up" style={{ animationDelay:'0.2s' }}>
          <button
            onClick={() => setActiveSection(activeSection === 'reports' ? null : 'reports')}
            className="w-full flex items-center gap-3 p-4 text-left"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/12 flex items-center justify-center">
              <History className="w-4 h-4 text-primary"/>
            </div>
            <h3 className="text-sm font-bold flex-1">Inspection Reports</h3>
            <span className="text-xs text-muted-foreground font-mono mr-2">Reports</span>
            {activeSection === 'reports'
              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0"/>
              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0"/>}
          </button>
          {activeSection === 'reports' && (
            <div className="px-4 pb-4 border-t border-border/30">
              <div className="pt-4">
                <ReportsSection machineId={machineId}/>
              </div>
            </div>
          )}
        </div>

        {/* ── Open Items from Last Inspection ──────────────────────────── */}
        {machine.lastInspection && (machine.lastInspection.summary.fail > 0 || machine.lastInspection.summary.monitor > 0) && (
          <div className="card-elevated p-4 animate-slide-up" style={{ animationDelay:'0.25s' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-status-monitor/12 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-status-monitor"/>
              </div>
              <div>
                <h3 className="text-sm font-bold">Open Items</h3>
                <p className="text-[10px] text-muted-foreground">
                  {machine.lastInspection.date} — {machine.lastInspection.inspector}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-status-fail/6 border border-status-fail/12 rounded-2xl p-3.5">
                <span className="status-dot status-dot-fail"/>
                <span className="text-sm">Right rear work light not functioning</span>
              </div>
              <div className="flex items-center gap-3 bg-status-monitor/6 border border-status-monitor/12 rounded-2xl p-3.5">
                <span className="status-dot status-dot-monitor"/>
                <span className="text-sm">Bucket teeth wearing — monitor for replacement</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky CTA ───────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent safe-bottom space-y-2.5">
        <button
          onClick={() => navigate(`/inspect/${machine.id}`)}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base glow-primary active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5"/>
          Start Inspection
          <ChevronRight className="w-5 h-5 opacity-60" />
        </button>
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate(`/inspect/${machine.id}?mode=upload`)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all"
          >
            <Upload className="w-4 h-4"/>
            Upload Video
          </button>
          <button
            onClick={() => navigate(`/history/${machine.id}`)}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-surface-2 text-secondary-foreground font-semibold text-sm border border-border/40 active:scale-[0.98] transition-all"
          >
            <History className="w-4 h-4"/>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { display: none }
      `}</style>
    </div>
  );
}