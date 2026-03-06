// Massively expanded global fleet data with diverse equipment types

export interface FleetMachine {
  id: string;
  model: string;
  type: 'excavator' | 'dozer' | 'loader' | 'telehandler' | 'truck' | 'crane' | 'grader' | 'compactor' | 'drill' | 'generator';
  serial: string;
  assetId: string;
  smuHours: number;
  fuelLevel: number;
  location: string;
  site: string;
  region: string;
  country: string;
  gpsCoords: { lat: number; lng: number };
  status: 'online' | 'idle' | 'maintenance' | 'critical' | 'offline' | 'transit';
  operator?: string;
  utilizationToday: number; // 0-100
  utilizationWeek: number;
  costPerHour: number;
  lastInspection?: {
    date: string;
    inspector: string;
    healthScore: number;
    summary: { pass: number; monitor: number; fail: number; normal: number };
  };
  activeFaultCodes: {
    code: string;
    description: string;
    severity: 'warning' | 'critical';
    timestamp: string;
    system: string;
  }[];
  predictedFailure?: {
    component: string;
    estimatedHours: number;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  };
  telemetry: {
    engineTemp: number;
    hydraulicPressure: number;
    batteryVoltage: number;
    oilPressure: number;
    coolantTemp: number;
    fuelConsumptionRate: number; // L/hr
    co2Emissions: number; // kg/hr
    vibrationLevel: number; // mm/s
  };
  dailyProduction?: {
    target: number;
    actual: number;
    unit: string;
  };
  sketchfabId?: string;
}

export interface FleetAlert {
  id: string;
  machineId: string;
  assetId: string;
  type: 'fault' | 'maintenance' | 'safety' | 'geofence' | 'production' | 'weather' | 'compliance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  actionRequired: boolean;
}

export interface WorkOrder {
  id: string;
  machineId: string;
  assetId: string;
  type: 'corrective' | 'preventive' | 'predictive' | 'emergency';
  status: 'open' | 'in_progress' | 'parts_ordered' | 'scheduled' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  estimatedCost: number;
  estimatedHours: number;
  createdAt: string;
  dueDate: string;
  assignedTo?: string;
}

export interface FleetKPI {
  label: string;
  value: number;
  unit: string;
  trend: number; // percentage change
  trendLabel: string;
  sparkline: number[];
}

// 20 global machines across different sites
export const globalFleet: FleetMachine[] = [
  {
    id: 'cat-320-001', model: 'CAT 320 Hydraulic Excavator', type: 'excavator',
    serial: 'ZAR00512', assetId: 'HEX-320-047', smuHours: 4287, fuelLevel: 72,
    location: 'Pit 3, Bench 7', site: 'Cerro Verde Mine', region: 'South America', country: 'Peru',
    gpsCoords: { lat: -16.54, lng: -71.59 }, status: 'online', operator: 'Marcus Chen',
    utilizationToday: 78, utilizationWeek: 82, costPerHour: 145,
    sketchfabId: '5f195244108c46e495a1e78040f02f7e',
    lastInspection: { date: '2026-02-27', inspector: 'Marcus Chen', healthScore: 76, summary: { pass: 24, monitor: 7, fail: 2, normal: 7 } },
    activeFaultCodes: [
      { code: '299:1968-3', description: 'Boom cylinder rod-end pressure sensor — voltage above normal', severity: 'warning', timestamp: '2026-02-28T04:12:00Z', system: 'Hydraulic' },
      { code: '168:0110-15', description: 'Hydraulic oil temperature — high warning', severity: 'warning', timestamp: '2026-02-27T16:45:00Z', system: 'Hydraulic' },
    ],
    predictedFailure: { component: 'Boom Cylinder Seal', estimatedHours: 320, confidence: 0.87, severity: 'medium' },
    telemetry: { engineTemp: 91, hydraulicPressure: 3200, batteryVoltage: 24.1, oilPressure: 420, coolantTemp: 88, fuelConsumptionRate: 22.4, co2Emissions: 58.2, vibrationLevel: 3.2 },
    dailyProduction: { target: 2400, actual: 2180, unit: 'tonnes' },
  },
  {
    id: 'cat-320-002', model: 'CAT 320 Hydraulic Excavator', type: 'excavator',
    serial: 'ZAR00891', assetId: 'HEX-320-052', smuHours: 2104, fuelLevel: 45,
    location: 'Loading Bay North', site: 'Cerro Verde Mine', region: 'South America', country: 'Peru',
    gpsCoords: { lat: -16.53, lng: -71.60 }, status: 'online', operator: 'Sarah Okonkwo',
    utilizationToday: 91, utilizationWeek: 88, costPerHour: 145,
    sketchfabId: '5f195244108c46e495a1e78040f02f7e',
    lastInspection: { date: '2026-02-27', inspector: 'Sarah Okonkwo', healthScore: 94, summary: { pass: 31, monitor: 3, fail: 0, normal: 6 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 88, hydraulicPressure: 3400, batteryVoltage: 24.8, oilPressure: 445, coolantTemp: 85, fuelConsumptionRate: 24.1, co2Emissions: 62.6, vibrationLevel: 2.1 },
    dailyProduction: { target: 2400, actual: 2520, unit: 'tonnes' },
  },
  {
    id: 'cat-320-003', model: 'CAT 320 Hydraulic Excavator', type: 'excavator',
    serial: 'ZAR01204', assetId: 'HEX-320-061', smuHours: 6891, fuelLevel: 18,
    location: 'Waste Dump Road', site: 'Cerro Verde Mine', region: 'South America', country: 'Peru',
    gpsCoords: { lat: -16.55, lng: -71.58 }, status: 'critical', operator: 'Carlos Rivera',
    utilizationToday: 12, utilizationWeek: 45, costPerHour: 145,
    sketchfabId: '5f195244108c46e495a1e78040f02f7e',
    lastInspection: { date: '2026-02-26', inspector: 'Marcus Chen', healthScore: 52, summary: { pass: 20, monitor: 9, fail: 4, normal: 7 } },
    activeFaultCodes: [
      { code: '190:0100-1', description: 'Engine speed sensor — signal erratic', severity: 'critical', timestamp: '2026-02-28T02:30:00Z', system: 'Engine' },
    ],
    predictedFailure: { component: 'Engine Speed Sensor', estimatedHours: 48, confidence: 0.94, severity: 'high' },
    telemetry: { engineTemp: 102, hydraulicPressure: 2800, batteryVoltage: 23.2, oilPressure: 380, coolantTemp: 98, fuelConsumptionRate: 28.7, co2Emissions: 74.6, vibrationLevel: 5.8 },
    dailyProduction: { target: 2400, actual: 340, unit: 'tonnes' },
  },
  {
    id: 'telehandler-001', model: 'CAT TH255C Telehandler', type: 'telehandler',
    serial: 'TLH00337', assetId: 'TLH-255-012', smuHours: 1842, fuelLevel: 63,
    location: 'Laydown Yard', site: 'Cerro Verde Mine', region: 'South America', country: 'Peru',
    gpsCoords: { lat: -16.52, lng: -71.61 }, status: 'idle', operator: 'Ana Martinez',
    utilizationToday: 34, utilizationWeek: 56, costPerHour: 85,
    sketchfabId: '70e7ca3efb21410b8c21db4b8db5abb1',
    lastInspection: { date: '2026-02-28', inspector: 'Sarah Okonkwo', healthScore: 82, summary: { pass: 28, monitor: 4, fail: 1, normal: 5 } },
    activeFaultCodes: [
      { code: '523:0168-4', description: 'Transmission oil pressure — below normal', severity: 'warning', timestamp: '2026-02-28T07:15:00Z', system: 'Transmission' },
    ],
    telemetry: { engineTemp: 74, hydraulicPressure: 2100, batteryVoltage: 12.6, oilPressure: 320, coolantTemp: 72, fuelConsumptionRate: 8.2, co2Emissions: 21.3, vibrationLevel: 1.4 },
  },
  {
    id: 'dozer-001', model: 'CAT D10T2 Dozer', type: 'dozer',
    serial: 'D10-44891', assetId: 'DOZ-D10-003', smuHours: 8420, fuelLevel: 55,
    location: 'Pit 1, Ramp Access', site: 'Pilbara Iron', region: 'Oceania', country: 'Australia',
    gpsCoords: { lat: -22.31, lng: 118.35 }, status: 'online', operator: 'James Mitchell',
    utilizationToday: 85, utilizationWeek: 79, costPerHour: 280,
    lastInspection: { date: '2026-02-25', inspector: 'James Mitchell', healthScore: 68, summary: { pass: 18, monitor: 11, fail: 3, normal: 6 } },
    activeFaultCodes: [
      { code: '110:0190-5', description: 'Engine coolant temp — critical high', severity: 'critical', timestamp: '2026-03-05T14:22:00Z', system: 'Engine' },
    ],
    predictedFailure: { component: 'Undercarriage Track Links', estimatedHours: 180, confidence: 0.91, severity: 'high' },
    telemetry: { engineTemp: 108, hydraulicPressure: 4100, batteryVoltage: 24.3, oilPressure: 510, coolantTemp: 106, fuelConsumptionRate: 68.5, co2Emissions: 178.1, vibrationLevel: 4.7 },
    dailyProduction: { target: 18000, actual: 16200, unit: 'BCM' },
  },
  {
    id: 'truck-001', model: 'CAT 797F Mining Truck', type: 'truck',
    serial: 'MT-77201', assetId: 'TRK-797-014', smuHours: 12450, fuelLevel: 38,
    location: 'Haul Road Segment 4', site: 'Pilbara Iron', region: 'Oceania', country: 'Australia',
    gpsCoords: { lat: -22.29, lng: 118.37 }, status: 'transit', operator: 'David Park',
    utilizationToday: 92, utilizationWeek: 88, costPerHour: 420,
    lastInspection: { date: '2026-02-24', inspector: 'David Park', healthScore: 88, summary: { pass: 30, monitor: 5, fail: 0, normal: 3 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 94, hydraulicPressure: 3800, batteryVoltage: 24.6, oilPressure: 480, coolantTemp: 91, fuelConsumptionRate: 185.0, co2Emissions: 481.0, vibrationLevel: 3.9 },
    dailyProduction: { target: 32, actual: 29, unit: 'loads' },
  },
  {
    id: 'truck-002', model: 'CAT 797F Mining Truck', type: 'truck',
    serial: 'MT-77215', assetId: 'TRK-797-028', smuHours: 9870, fuelLevel: 61,
    location: 'Crusher Feed', site: 'Pilbara Iron', region: 'Oceania', country: 'Australia',
    gpsCoords: { lat: -22.30, lng: 118.36 }, status: 'online', operator: 'Wei Zhang',
    utilizationToday: 88, utilizationWeek: 85, costPerHour: 420,
    lastInspection: { date: '2026-02-26', inspector: 'Wei Zhang', healthScore: 91, summary: { pass: 32, monitor: 3, fail: 0, normal: 3 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 89, hydraulicPressure: 3600, batteryVoltage: 24.7, oilPressure: 460, coolantTemp: 86, fuelConsumptionRate: 178.0, co2Emissions: 462.8, vibrationLevel: 3.1 },
    dailyProduction: { target: 32, actual: 31, unit: 'loads' },
  },
  {
    id: 'crane-001', model: 'Liebherr LTM 1300-6.3', type: 'crane',
    serial: 'LTM-9921', assetId: 'CRN-300-001', smuHours: 3200, fuelLevel: 82,
    location: 'Module Assembly Area', site: 'Jamnagar Refinery', region: 'Asia', country: 'India',
    gpsCoords: { lat: 22.47, lng: 70.07 }, status: 'online', operator: 'Raj Patel',
    utilizationToday: 67, utilizationWeek: 72, costPerHour: 350,
    lastInspection: { date: '2026-02-28', inspector: 'Raj Patel', healthScore: 95, summary: { pass: 34, monitor: 2, fail: 0, normal: 2 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 78, hydraulicPressure: 2800, batteryVoltage: 24.5, oilPressure: 410, coolantTemp: 76, fuelConsumptionRate: 35.0, co2Emissions: 91.0, vibrationLevel: 1.2 },
  },
  {
    id: 'loader-001', model: 'CAT 994K Wheel Loader', type: 'loader',
    serial: 'WL-55401', assetId: 'LDR-994-007', smuHours: 7650, fuelLevel: 44,
    location: 'Stockpile Alpha', site: 'Escondida Mine', region: 'South America', country: 'Chile',
    gpsCoords: { lat: -24.27, lng: -69.07 }, status: 'online', operator: 'Luis Fuentes',
    utilizationToday: 81, utilizationWeek: 76, costPerHour: 310,
    lastInspection: { date: '2026-02-27', inspector: 'Luis Fuentes', healthScore: 72, summary: { pass: 22, monitor: 9, fail: 2, normal: 5 } },
    activeFaultCodes: [
      { code: '445:0232-3', description: 'Brake oil temperature — elevated', severity: 'warning', timestamp: '2026-03-04T08:30:00Z', system: 'Brakes' },
    ],
    predictedFailure: { component: 'Brake Disc Assembly', estimatedHours: 450, confidence: 0.78, severity: 'medium' },
    telemetry: { engineTemp: 95, hydraulicPressure: 3900, batteryVoltage: 24.2, oilPressure: 440, coolantTemp: 92, fuelConsumptionRate: 95.0, co2Emissions: 247.0, vibrationLevel: 3.8 },
    dailyProduction: { target: 45000, actual: 42100, unit: 'tonnes' },
  },
  {
    id: 'grader-001', model: 'CAT 24 Motor Grader', type: 'grader',
    serial: 'MG-11204', assetId: 'GRD-024-002', smuHours: 5120, fuelLevel: 71,
    location: 'Haul Road Maintenance', site: 'Escondida Mine', region: 'South America', country: 'Chile',
    gpsCoords: { lat: -24.26, lng: -69.06 }, status: 'online', operator: 'Maria Gonzalez',
    utilizationToday: 74, utilizationWeek: 70, costPerHour: 175,
    lastInspection: { date: '2026-03-01', inspector: 'Maria Gonzalez', healthScore: 89, summary: { pass: 29, monitor: 4, fail: 0, normal: 5 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 84, hydraulicPressure: 2600, batteryVoltage: 24.4, oilPressure: 390, coolantTemp: 82, fuelConsumptionRate: 28.0, co2Emissions: 72.8, vibrationLevel: 2.5 },
  },
  {
    id: 'excavator-004', model: 'CAT 6060 Mining Shovel', type: 'excavator',
    serial: 'MS-60122', assetId: 'SHV-606-001', smuHours: 18920, fuelLevel: 52,
    location: 'Pit 2, Face 12', site: 'Escondida Mine', region: 'South America', country: 'Chile',
    gpsCoords: { lat: -24.28, lng: -69.08 }, status: 'maintenance',
    utilizationToday: 0, utilizationWeek: 32, costPerHour: 850,
    lastInspection: { date: '2026-03-03', inspector: 'Luis Fuentes', healthScore: 45, summary: { pass: 14, monitor: 12, fail: 6, normal: 6 } },
    activeFaultCodes: [
      { code: '191:0100-1', description: 'Swing motor — excessive vibration detected', severity: 'critical', timestamp: '2026-03-04T11:00:00Z', system: 'Swing' },
      { code: '522:0340-3', description: 'Main hydraulic pump — pressure differential high', severity: 'critical', timestamp: '2026-03-04T11:05:00Z', system: 'Hydraulic' },
    ],
    predictedFailure: { component: 'Main Hydraulic Pump', estimatedHours: 24, confidence: 0.96, severity: 'high' },
    telemetry: { engineTemp: 65, hydraulicPressure: 0, batteryVoltage: 23.8, oilPressure: 0, coolantTemp: 62, fuelConsumptionRate: 0, co2Emissions: 0, vibrationLevel: 0 },
  },
  {
    id: 'drill-001', model: 'CAT MD6310 Rotary Drill', type: 'drill',
    serial: 'RD-31088', assetId: 'DRL-631-004', smuHours: 4580, fuelLevel: 67,
    location: 'Blast Pattern 47', site: 'Boddington Gold', region: 'Oceania', country: 'Australia',
    gpsCoords: { lat: -32.75, lng: 116.38 }, status: 'online', operator: 'Tom Bradley',
    utilizationToday: 89, utilizationWeek: 84, costPerHour: 220,
    lastInspection: { date: '2026-03-02', inspector: 'Tom Bradley', healthScore: 91, summary: { pass: 30, monitor: 4, fail: 0, normal: 4 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 87, hydraulicPressure: 3100, batteryVoltage: 24.6, oilPressure: 430, coolantTemp: 84, fuelConsumptionRate: 42.0, co2Emissions: 109.2, vibrationLevel: 6.2 },
    dailyProduction: { target: 24, actual: 22, unit: 'holes' },
  },
  {
    id: 'compactor-001', model: 'CAT CS78B Vibratory Compactor', type: 'compactor',
    serial: 'VC-78445', assetId: 'CMP-078-003', smuHours: 2890, fuelLevel: 58,
    location: 'Tailings Dam Lift 5', site: 'Boddington Gold', region: 'Oceania', country: 'Australia',
    gpsCoords: { lat: -32.76, lng: 116.37 }, status: 'online', operator: 'Sarah Williams',
    utilizationToday: 76, utilizationWeek: 71, costPerHour: 95,
    lastInspection: { date: '2026-03-04', inspector: 'Sarah Williams', healthScore: 87, summary: { pass: 28, monitor: 5, fail: 0, normal: 5 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 82, hydraulicPressure: 1800, batteryVoltage: 12.4, oilPressure: 350, coolantTemp: 80, fuelConsumptionRate: 12.5, co2Emissions: 32.5, vibrationLevel: 8.4 },
  },
  {
    id: 'excavator-005', model: 'Komatsu PC8000-11 Shovel', type: 'excavator',
    serial: 'KPC-80092', assetId: 'SHV-800-002', smuHours: 22100, fuelLevel: 41,
    location: 'Main Pit, Bench 15', site: 'Grasberg Mine', region: 'Asia', country: 'Indonesia',
    gpsCoords: { lat: -4.05, lng: 137.11 }, status: 'online', operator: 'Budi Santoso',
    utilizationToday: 82, utilizationWeek: 78, costPerHour: 920,
    lastInspection: { date: '2026-03-01', inspector: 'Budi Santoso', healthScore: 71, summary: { pass: 21, monitor: 10, fail: 3, normal: 4 } },
    activeFaultCodes: [
      { code: '334:0890-2', description: 'Crowd cylinder — seal leak detected', severity: 'warning', timestamp: '2026-03-05T06:00:00Z', system: 'Hydraulic' },
    ],
    predictedFailure: { component: 'Crowd Cylinder Seal Kit', estimatedHours: 240, confidence: 0.82, severity: 'medium' },
    telemetry: { engineTemp: 96, hydraulicPressure: 4200, batteryVoltage: 24.0, oilPressure: 520, coolantTemp: 93, fuelConsumptionRate: 210.0, co2Emissions: 546.0, vibrationLevel: 4.1 },
    dailyProduction: { target: 55000, actual: 48200, unit: 'tonnes' },
  },
  {
    id: 'truck-003', model: 'Komatsu 980E-5 Dump Truck', type: 'truck',
    serial: 'KDT-98034', assetId: 'TRK-980-011', smuHours: 14200, fuelLevel: 29,
    location: 'In-pit Ramp 3', site: 'Grasberg Mine', region: 'Asia', country: 'Indonesia',
    gpsCoords: { lat: -4.06, lng: 137.12 }, status: 'transit', operator: 'Eko Prasetyo',
    utilizationToday: 94, utilizationWeek: 90, costPerHour: 390,
    lastInspection: { date: '2026-02-28', inspector: 'Eko Prasetyo', healthScore: 85, summary: { pass: 27, monitor: 6, fail: 1, normal: 4 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 92, hydraulicPressure: 3500, batteryVoltage: 24.5, oilPressure: 450, coolantTemp: 89, fuelConsumptionRate: 165.0, co2Emissions: 429.0, vibrationLevel: 3.4 },
    dailyProduction: { target: 28, actual: 27, unit: 'loads' },
  },
  {
    id: 'generator-001', model: 'CAT C175-20 Generator Set', type: 'generator',
    serial: 'GS-17522', assetId: 'GEN-175-001', smuHours: 9800, fuelLevel: 75,
    location: 'Power Station', site: 'Grasberg Mine', region: 'Asia', country: 'Indonesia',
    gpsCoords: { lat: -4.04, lng: 137.10 }, status: 'online',
    utilizationToday: 100, utilizationWeek: 99, costPerHour: 180,
    lastInspection: { date: '2026-03-05', inspector: 'Budi Santoso', healthScore: 93, summary: { pass: 33, monitor: 2, fail: 0, normal: 3 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 86, hydraulicPressure: 0, batteryVoltage: 24.8, oilPressure: 440, coolantTemp: 83, fuelConsumptionRate: 340.0, co2Emissions: 884.0, vibrationLevel: 1.8 },
  },
  {
    id: 'dozer-002', model: 'CAT D11T Dozer', type: 'dozer',
    serial: 'D11-55672', assetId: 'DOZ-D11-008', smuHours: 11200, fuelLevel: 33,
    location: 'Overburden Push', site: 'Kansanshi Mine', region: 'Africa', country: 'Zambia',
    gpsCoords: { lat: -12.10, lng: 26.42 }, status: 'online', operator: 'Joseph Banda',
    utilizationToday: 88, utilizationWeek: 82, costPerHour: 320,
    lastInspection: { date: '2026-03-03', inspector: 'Joseph Banda', healthScore: 74, summary: { pass: 23, monitor: 8, fail: 2, normal: 5 } },
    activeFaultCodes: [
      { code: '111:0350-3', description: 'Final drive oil temp — elevated', severity: 'warning', timestamp: '2026-03-05T09:20:00Z', system: 'Drivetrain' },
    ],
    predictedFailure: { component: 'Final Drive Bearings', estimatedHours: 600, confidence: 0.72, severity: 'low' },
    telemetry: { engineTemp: 97, hydraulicPressure: 4000, batteryVoltage: 24.1, oilPressure: 490, coolantTemp: 94, fuelConsumptionRate: 78.0, co2Emissions: 202.8, vibrationLevel: 4.3 },
    dailyProduction: { target: 22000, actual: 20500, unit: 'BCM' },
  },
  {
    id: 'loader-002', model: 'CAT 992K Wheel Loader', type: 'loader',
    serial: 'WL-99288', assetId: 'LDR-992-004', smuHours: 6340, fuelLevel: 56,
    location: 'ROM Pad', site: 'Kansanshi Mine', region: 'Africa', country: 'Zambia',
    gpsCoords: { lat: -12.09, lng: 26.43 }, status: 'online', operator: 'Grace Mwanza',
    utilizationToday: 79, utilizationWeek: 75, costPerHour: 260,
    lastInspection: { date: '2026-03-04', inspector: 'Grace Mwanza', healthScore: 86, summary: { pass: 28, monitor: 5, fail: 1, normal: 4 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 90, hydraulicPressure: 3700, batteryVoltage: 24.4, oilPressure: 430, coolantTemp: 87, fuelConsumptionRate: 72.0, co2Emissions: 187.2, vibrationLevel: 2.9 },
    dailyProduction: { target: 35000, actual: 33800, unit: 'tonnes' },
  },
  {
    id: 'excavator-006', model: 'CAT 390F Hydraulic Excavator', type: 'excavator',
    serial: 'HEX-39044', assetId: 'HEX-390-006', smuHours: 3450, fuelLevel: 68,
    location: 'Trench Section C', site: 'Nord Stream Repair', region: 'Europe', country: 'Germany',
    gpsCoords: { lat: 54.35, lng: 13.10 }, status: 'offline',
    utilizationToday: 0, utilizationWeek: 15, costPerHour: 195,
    lastInspection: { date: '2026-02-20', inspector: 'Hans Mueller', healthScore: 62, summary: { pass: 19, monitor: 10, fail: 4, normal: 5 } },
    activeFaultCodes: [
      { code: '116:0190-1', description: 'Engine control module — communication lost', severity: 'critical', timestamp: '2026-03-01T18:00:00Z', system: 'Engine' },
    ],
    telemetry: { engineTemp: 22, hydraulicPressure: 0, batteryVoltage: 21.2, oilPressure: 0, coolantTemp: 20, fuelConsumptionRate: 0, co2Emissions: 0, vibrationLevel: 0 },
  },
  {
    id: 'crane-002', model: 'Manitowoc 18000 Crawler Crane', type: 'crane',
    serial: 'MCC-18044', assetId: 'CRN-180-002', smuHours: 5670, fuelLevel: 77,
    location: 'Reactor Building', site: 'Al Dhafra Nuclear', region: 'Middle East', country: 'UAE',
    gpsCoords: { lat: 23.96, lng: 52.24 }, status: 'online', operator: 'Ahmed Al-Rashid',
    utilizationToday: 55, utilizationWeek: 62, costPerHour: 580,
    lastInspection: { date: '2026-03-05', inspector: 'Ahmed Al-Rashid', healthScore: 97, summary: { pass: 35, monitor: 1, fail: 0, normal: 2 } },
    activeFaultCodes: [],
    telemetry: { engineTemp: 91, hydraulicPressure: 3200, batteryVoltage: 24.7, oilPressure: 440, coolantTemp: 88, fuelConsumptionRate: 52.0, co2Emissions: 135.2, vibrationLevel: 0.8 },
  },
];

// Fleet sites for globe visualization
export interface FleetSite {
  name: string;
  region: string;
  country: string;
  coords: { lat: number; lng: number };
  machineCount: number;
  activeAlerts: number;
  status: 'normal' | 'warning' | 'critical';
  production?: { actual: number; target: number; unit: string };
}

export const fleetSites: FleetSite[] = [
  { name: 'Cerro Verde Mine', region: 'South America', country: 'Peru', coords: { lat: -16.54, lng: -71.59 }, machineCount: 4, activeAlerts: 3, status: 'warning', production: { actual: 5040, target: 7200, unit: 'tonnes' } },
  { name: 'Pilbara Iron', region: 'Oceania', country: 'Australia', coords: { lat: -22.31, lng: 118.35 }, machineCount: 3, activeAlerts: 1, status: 'critical', production: { actual: 47400, target: 50000, unit: 'tonnes' } },
  { name: 'Escondida Mine', region: 'South America', country: 'Chile', coords: { lat: -24.27, lng: -69.07 }, machineCount: 3, activeAlerts: 3, status: 'critical', production: { actual: 42100, target: 45000, unit: 'tonnes' } },
  { name: 'Boddington Gold', region: 'Oceania', country: 'Australia', coords: { lat: -32.75, lng: 116.38 }, machineCount: 2, activeAlerts: 0, status: 'normal', production: { actual: 22, target: 24, unit: 'holes' } },
  { name: 'Grasberg Mine', region: 'Asia', country: 'Indonesia', coords: { lat: -4.05, lng: 137.11 }, machineCount: 3, activeAlerts: 1, status: 'warning', production: { actual: 48200, target: 55000, unit: 'tonnes' } },
  { name: 'Kansanshi Mine', region: 'Africa', country: 'Zambia', coords: { lat: -12.10, lng: 26.42 }, machineCount: 2, activeAlerts: 1, status: 'warning', production: { actual: 54300, target: 57000, unit: 'tonnes' } },
  { name: 'Nord Stream Repair', region: 'Europe', country: 'Germany', coords: { lat: 54.35, lng: 13.10 }, machineCount: 1, activeAlerts: 1, status: 'critical' },
  { name: 'Jamnagar Refinery', region: 'Asia', country: 'India', coords: { lat: 22.47, lng: 70.07 }, machineCount: 1, activeAlerts: 0, status: 'normal' },
  { name: 'Al Dhafra Nuclear', region: 'Middle East', country: 'UAE', coords: { lat: 23.96, lng: 52.24 }, machineCount: 1, activeAlerts: 0, status: 'normal' },
];

// Live alerts feed
export const fleetAlerts: FleetAlert[] = [
  { id: 'a1', machineId: 'cat-320-003', assetId: 'HEX-320-061', type: 'fault', severity: 'critical', title: 'Engine Speed Sensor Failure', message: 'Erratic signal on engine speed sensor. Machine operating at reduced power. Predicted complete failure within 48 SMU hours.', timestamp: '2026-03-06T08:12:00Z', acknowledged: false, actionRequired: true },
  { id: 'a2', machineId: 'dozer-001', assetId: 'DOZ-D10-003', type: 'fault', severity: 'critical', title: 'Engine Coolant Critical', message: 'Coolant temperature exceeding 106°C. Automatic derating active. Immediate shutdown recommended if temp exceeds 110°C.', timestamp: '2026-03-06T07:45:00Z', acknowledged: false, actionRequired: true },
  { id: 'a3', machineId: 'excavator-004', assetId: 'SHV-606-001', type: 'maintenance', severity: 'critical', title: 'Main Hydraulic Pump — Imminent Failure', message: 'AI predicts main pump failure within 24 hours at 96% confidence. Machine down for emergency repair. Parts ETA: 18 hours.', timestamp: '2026-03-06T07:30:00Z', acknowledged: true, actionRequired: true },
  { id: 'a4', machineId: 'excavator-006', assetId: 'HEX-390-006', type: 'fault', severity: 'critical', title: 'ECM Communication Lost', message: 'Engine control module communication lost. Machine offline since March 1. Diagnostic team dispatched.', timestamp: '2026-03-06T06:00:00Z', acknowledged: true, actionRequired: true },
  { id: 'a5', machineId: 'cat-320-001', assetId: 'HEX-320-047', type: 'maintenance', severity: 'warning', title: 'Boom Cylinder Seal — Predictive Alert', message: 'Seal degradation detected. Estimated 320 hours remaining. Parts ordered, scheduled replacement during next planned downtime.', timestamp: '2026-03-06T05:30:00Z', acknowledged: true, actionRequired: false },
  { id: 'a6', machineId: 'loader-001', assetId: 'LDR-994-007', type: 'safety', severity: 'warning', title: 'Brake Oil Temperature Elevated', message: 'Brake oil temp trending upward on descending haul ramp. Operator advised to reduce speed and use engine retarder.', timestamp: '2026-03-06T04:15:00Z', acknowledged: true, actionRequired: false },
  { id: 'a7', machineId: 'truck-001', assetId: 'TRK-797-014', type: 'production', severity: 'info', title: 'Production Target 91%', message: 'Pilbara haul fleet at 91% of daily target. On track to meet shift-end goal if current cycle times maintained.', timestamp: '2026-03-06T03:00:00Z', acknowledged: true, actionRequired: false },
  { id: 'a8', machineId: 'excavator-005', assetId: 'SHV-800-002', type: 'maintenance', severity: 'warning', title: 'Crowd Cylinder Seal Leak', message: 'Slow hydraulic leak detected on crowd cylinder. Monitoring rate — if leak increases >5% in next shift, schedule repair.', timestamp: '2026-03-06T02:00:00Z', acknowledged: false, actionRequired: false },
  { id: 'a9', machineId: 'dozer-002', assetId: 'DOZ-D11-008', type: 'geofence', severity: 'info', title: 'Entering Blast Exclusion Zone', message: 'D11T approaching blast pattern perimeter. Operator notified. Auto-stop engaged at 200m boundary.', timestamp: '2026-03-06T01:30:00Z', acknowledged: true, actionRequired: false },
  { id: 'a10', machineId: 'crane-002', assetId: 'CRN-180-002', type: 'weather', severity: 'info', title: 'Wind Advisory — Al Dhafra', message: 'Wind speeds expected to exceed 40 km/h at 14:00 local. Crane operations may need to pause per safety protocol WP-204.', timestamp: '2026-03-06T00:45:00Z', acknowledged: true, actionRequired: false },
];

// Work orders
export const activeWorkOrders: WorkOrder[] = [
  { id: 'wo-001', machineId: 'excavator-004', assetId: 'SHV-606-001', type: 'emergency', status: 'parts_ordered', priority: 'urgent', title: 'Replace Main Hydraulic Pump', description: 'Complete pump assembly replacement. Swing motor bearing inspection.', estimatedCost: 185000, estimatedHours: 48, createdAt: '2026-03-04', dueDate: '2026-03-07', assignedTo: 'Luis Fuentes' },
  { id: 'wo-002', machineId: 'cat-320-003', assetId: 'HEX-320-061', type: 'corrective', status: 'scheduled', priority: 'high', title: 'Replace Engine Speed Sensor', description: 'Replace sensor and harness. Verify ECM calibration.', estimatedCost: 4200, estimatedHours: 6, createdAt: '2026-03-05', dueDate: '2026-03-07', assignedTo: 'Marcus Chen' },
  { id: 'wo-003', machineId: 'cat-320-001', assetId: 'HEX-320-047', type: 'predictive', status: 'parts_ordered', priority: 'medium', title: 'Boom Cylinder Seal Replacement', description: 'Proactive seal replacement based on AI prediction. 320 hours remaining.', estimatedCost: 8500, estimatedHours: 12, createdAt: '2026-03-02', dueDate: '2026-03-15', assignedTo: 'Sarah Okonkwo' },
  { id: 'wo-004', machineId: 'dozer-001', assetId: 'DOZ-D10-003', type: 'corrective', status: 'in_progress', priority: 'high', title: 'Radiator Flush & Thermostat Replacement', description: 'Address critical coolant temp. Full cooling system service.', estimatedCost: 12400, estimatedHours: 16, createdAt: '2026-03-05', dueDate: '2026-03-06', assignedTo: 'James Mitchell' },
  { id: 'wo-005', machineId: 'excavator-006', assetId: 'HEX-390-006', type: 'corrective', status: 'open', priority: 'urgent', title: 'ECM Diagnostic & Replacement', description: 'Diagnose ECM communication failure. May require full module replacement.', estimatedCost: 22000, estimatedHours: 24, createdAt: '2026-03-01', dueDate: '2026-03-08', assignedTo: 'Hans Mueller' },
  { id: 'wo-006', machineId: 'dozer-002', assetId: 'DOZ-D11-008', type: 'preventive', status: 'scheduled', priority: 'medium', title: 'Final Drive Service — 10,000 SMU', description: 'Scheduled oil change, bearing inspection, seal check.', estimatedCost: 28000, estimatedHours: 32, createdAt: '2026-02-28', dueDate: '2026-03-12', assignedTo: 'Joseph Banda' },
];

// Fleet KPIs
export function getFleetKPIs(): FleetKPI[] {
  const fleet = globalFleet;
  const online = fleet.filter(m => m.status === 'online' || m.status === 'transit' || m.status === 'idle').length;
  const avgUtil = Math.round(fleet.reduce((s, m) => s + m.utilizationToday, 0) / fleet.length);
  const totalFaults = fleet.reduce((s, m) => s + m.activeFaultCodes.length, 0);
  const avgHealth = Math.round(fleet.filter(m => m.lastInspection).reduce((s, m) => s + (m.lastInspection?.healthScore || 0), 0) / fleet.filter(m => m.lastInspection).length);

  return [
    { label: 'Fleet Availability', value: Math.round((online / fleet.length) * 100), unit: '%', trend: 2.4, trendLabel: 'vs last week', sparkline: [88, 85, 90, 87, 92, 89, 95] },
    { label: 'Avg Utilization', value: avgUtil, unit: '%', trend: -1.8, trendLabel: 'vs yesterday', sparkline: [72, 78, 74, 80, 76, 73, avgUtil] },
    { label: 'Active Faults', value: totalFaults, unit: '', trend: 12, trendLabel: 'new today', sparkline: [5, 8, 6, 9, 7, 10, totalFaults] },
    { label: 'Fleet Health', value: avgHealth, unit: '%', trend: -3.2, trendLabel: 'vs last month', sparkline: [84, 82, 80, 83, 79, 81, avgHealth] },
  ];
}

// Get machines by site
export function getMachinesBySite(siteName: string): FleetMachine[] {
  return globalFleet.filter(m => m.site === siteName);
}

// Get fleet cost summary
export function getFleetCostSummary() {
  const dailyOpex = globalFleet.reduce((s, m) => s + (m.costPerHour * m.utilizationToday / 100 * 10), 0); // 10hr shift
  const pendingRepairs = activeWorkOrders.filter(wo => wo.status !== 'completed').reduce((s, wo) => s + wo.estimatedCost, 0);
  const fuelCostPerDay = globalFleet.reduce((s, m) => s + (m.telemetry.fuelConsumptionRate * 10 * 1.15), 0); // $1.15/L
  return {
    dailyOpex: Math.round(dailyOpex),
    pendingRepairs: Math.round(pendingRepairs),
    fuelCostPerDay: Math.round(fuelCostPerDay),
    totalDailyCost: Math.round(dailyOpex + fuelCostPerDay),
  };
}
