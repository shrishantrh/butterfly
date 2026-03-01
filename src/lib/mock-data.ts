export type InspectionStatus = 'pass' | 'monitor' | 'fail' | 'normal' | 'unconfirmed' | 'conflicted';

export interface FaultCode {
  code: string;
  description: string;
  severity: 'warning' | 'critical';
  timestamp: string;
  system: string;
}

export interface InspectionItem {
  id: string;
  label: string;
  status: InspectionStatus;
  comment?: string;
  evidence?: ('video' | 'audio' | 'sensor')[];
  faultCode?: string;
}

export interface InspectionSection {
  id: string;
  title: string;
  items: InspectionItem[];
}

export interface Machine {
  id: string;
  model: string;
  serial: string;
  assetId: string;
  smuHours: number;
  fuelLevel: number;
  location: string;
  gpsCoords: { lat: number; lng: number };
  lastInspection?: {
    date: string;
    inspector: string;
    summary: { pass: number; monitor: number; fail: number; normal: number };
  };
  activeFaultCodes: FaultCode[];
  imageUrl?: string;
}

export const mockMachines: Machine[] = [
  {
    id: 'cat-320-001',
    model: 'CAT 320 Hydraulic Excavator',
    serial: 'ZAR00512',
    assetId: 'HEX-320-047',
    smuHours: 4287,
    fuelLevel: 72,
    location: 'Site Alpha — Sector 3',
    gpsCoords: { lat: 33.749, lng: -84.388 },
    lastInspection: {
      date: '2026-02-27',
      inspector: 'Marcus Chen',
      summary: { pass: 24, monitor: 7, fail: 2, normal: 7 },
    },
    activeFaultCodes: [
      {
        code: '299:1968-3',
        description: 'Boom cylinder rod-end pressure sensor — voltage above normal',
        severity: 'warning',
        timestamp: '2026-02-28T04:12:00Z',
        system: 'Hydraulic',
      },
      {
        code: '168:0110-15',
        description: 'Hydraulic oil temperature — high warning',
        severity: 'warning',
        timestamp: '2026-02-27T16:45:00Z',
        system: 'Hydraulic',
      },
    ],
  },
  {
    id: 'cat-320-002',
    model: 'CAT 320 Hydraulic Excavator',
    serial: 'ZAR00891',
    assetId: 'HEX-320-052',
    smuHours: 2104,
    fuelLevel: 45,
    location: 'Site Beta — North Pad',
    gpsCoords: { lat: 33.755, lng: -84.395 },
    lastInspection: {
      date: '2026-02-27',
      inspector: 'Sarah Okonkwo',
      summary: { pass: 31, monitor: 3, fail: 0, normal: 6 },
    },
    activeFaultCodes: [],
  },
  {
    id: 'cat-320-003',
    model: 'CAT 320 Hydraulic Excavator',
    serial: 'ZAR01204',
    assetId: 'HEX-320-061',
    smuHours: 6891,
    fuelLevel: 18,
    location: 'Site Gamma — Haul Road',
    gpsCoords: { lat: 33.741, lng: -84.401 },
    lastInspection: {
      date: '2026-02-26',
      inspector: 'Marcus Chen',
      summary: { pass: 20, monitor: 9, fail: 4, normal: 7 },
    },
    activeFaultCodes: [
      {
        code: '190:0100-1',
        description: 'Engine speed sensor — signal erratic',
        severity: 'critical',
        timestamp: '2026-02-28T02:30:00Z',
        system: 'Engine',
      },
    ],
  },
];

export const inspectionFormSections: InspectionSection[] = [
  {
    id: 'ground',
    title: '1. From the Ground',
    items: [
      { id: '1.1', label: 'Machine Parked Level & Chocked', status: 'unconfirmed' },
      { id: '1.2', label: 'Undercarriage — Track Condition & Tension', status: 'unconfirmed' },
      { id: '1.3', label: 'Undercarriage — Rollers, Idlers & Sprockets', status: 'unconfirmed' },
      { id: '1.4', label: 'Track Frames & Guards', status: 'unconfirmed' },
      { id: '1.5', label: 'Boom — Structural & Welds', status: 'unconfirmed' },
      { id: '1.6', label: 'Stick — Structural & Welds', status: 'unconfirmed' },
      { id: '1.7', label: 'Bucket — Teeth, Cutting Edge & Structural', status: 'unconfirmed' },
      { id: '1.8', label: 'Hydraulic Cylinders — Boom', status: 'unconfirmed' },
      { id: '1.9', label: 'Hydraulic Cylinders — Stick', status: 'unconfirmed' },
      { id: '1.10', label: 'Hydraulic Cylinders — Bucket', status: 'unconfirmed' },
      { id: '1.11', label: 'Hydraulic Hoses & Fittings', status: 'unconfirmed' },
      { id: '1.12', label: 'Swing Bearing & Drive', status: 'unconfirmed' },
      { id: '1.13', label: 'Counterweight & Mounting', status: 'unconfirmed' },
      { id: '1.14', label: 'External Lights & Reflectors', status: 'unconfirmed' },
      { id: '1.15', label: 'Decals, Placards & Safety Labels', status: 'unconfirmed' },
      { id: '1.16', label: 'Ground-Level Fluid Leaks', status: 'unconfirmed' },
    ],
  },
  {
    id: 'engine',
    title: '2. Engine Compartment',
    items: [
      { id: '2.1', label: 'Engine Oil Level & Condition', status: 'unconfirmed' },
      { id: '2.2', label: 'Engine Coolant Level', status: 'unconfirmed' },
      { id: '2.3', label: 'Hydraulic Oil Level & Condition', status: 'unconfirmed' },
      { id: '2.4', label: 'Air Filter Indicator', status: 'unconfirmed' },
      { id: '2.5', label: 'Belts & Hoses', status: 'unconfirmed' },
      { id: '2.6', label: 'Radiator & Cooler Fins', status: 'unconfirmed' },
      { id: '2.7', label: 'DEF Level', status: 'unconfirmed' },
      { id: '2.8', label: 'Battery & Cables', status: 'unconfirmed' },
    ],
  },
  {
    id: 'outside',
    title: '3. On the Machine — Outside Cab',
    items: [
      { id: '3.1', label: 'Steps & Handrails', status: 'unconfirmed' },
      { id: '3.2', label: 'Cab Exterior — Glass & Seals', status: 'unconfirmed' },
      { id: '3.3', label: 'Mirrors & Camera System', status: 'unconfirmed' },
      { id: '3.4', label: 'Cab Mounting & ROPS/FOPS', status: 'unconfirmed' },
      { id: '3.5', label: 'Fuel Cap & Fill Area', status: 'unconfirmed' },
    ],
  },
  {
    id: 'cab',
    title: '4. Inside the Cab',
    items: [
      { id: '4.1', label: 'Seat & Seatbelt', status: 'unconfirmed' },
      { id: '4.2', label: 'Controls — Joysticks & Pedals', status: 'unconfirmed' },
      { id: '4.3', label: 'Horn', status: 'unconfirmed' },
      { id: '4.4', label: 'Backup Alarm', status: 'unconfirmed' },
      { id: '4.5', label: 'Gauges & Warning Lights', status: 'unconfirmed' },
      { id: '4.6', label: 'HVAC System', status: 'unconfirmed' },
      { id: '4.7', label: 'Fire Extinguisher', status: 'unconfirmed' },
      { id: '4.8', label: 'Windshield Wipers & Washer', status: 'unconfirmed' },
      { id: '4.9', label: 'Monitor Display & Cat Grade System', status: 'unconfirmed' },
    ],
  },
];

// Simulated completed inspection for demo
export const completedInspection: InspectionSection[] = [
  {
    id: 'ground',
    title: '1. From the Ground',
    items: [
      { id: '1.1', label: 'Machine Parked Level & Chocked', status: 'pass', comment: 'Machine properly parked on level ground, wheel chocks in place.', evidence: ['video'] },
      { id: '1.2', label: 'Undercarriage — Track Condition & Tension', status: 'pass', comment: 'Track pads in good condition, tension within spec.', evidence: ['video'] },
      { id: '1.3', label: 'Undercarriage — Rollers, Idlers & Sprockets', status: 'monitor', comment: 'Minor wear on left front idler, within service limits but trending.', evidence: ['video', 'audio'] },
      { id: '1.4', label: 'Track Frames & Guards', status: 'pass', comment: 'No cracks or damage observed.', evidence: ['video'] },
      { id: '1.5', label: 'Boom — Structural & Welds', status: 'pass', comment: 'No visible cracking or deformation.', evidence: ['video'] },
      { id: '1.6', label: 'Stick — Structural & Welds', status: 'pass', comment: 'Structural integrity confirmed.', evidence: ['video'] },
      { id: '1.7', label: 'Bucket — Teeth, Cutting Edge & Structural', status: 'monitor', comment: 'Two teeth showing significant wear, replacement recommended within 50 hours.', evidence: ['video', 'audio'] },
      { id: '1.8', label: 'Hydraulic Cylinders — Boom', status: 'monitor', comment: 'Sensor data indicates pressure anomaly. Visual inspection shows minor seepage at rod seal.', evidence: ['video', 'sensor'], faultCode: '299:1968-3' },
      { id: '1.9', label: 'Hydraulic Cylinders — Stick', status: 'pass', comment: 'No leaks, chrome in good condition.', evidence: ['video'] },
      { id: '1.10', label: 'Hydraulic Cylinders — Bucket', status: 'pass', comment: 'Operating normally.', evidence: ['video'] },
      { id: '1.11', label: 'Hydraulic Hoses & Fittings', status: 'pass', comment: 'All connections secure, no leaks.', evidence: ['video'] },
      { id: '1.12', label: 'Swing Bearing & Drive', status: 'pass', comment: 'Smooth operation, no unusual noise.', evidence: ['audio'] },
      { id: '1.13', label: 'Counterweight & Mounting', status: 'normal', comment: 'Secure, bolts torqued.', evidence: ['video'] },
      { id: '1.14', label: 'External Lights & Reflectors', status: 'fail', comment: 'Right rear work light not functioning. Replacement required before next shift.', evidence: ['video'] },
      { id: '1.15', label: 'Decals, Placards & Safety Labels', status: 'pass', comment: 'All safety labels legible and in place.', evidence: ['video'] },
      { id: '1.16', label: 'Ground-Level Fluid Leaks', status: 'pass', comment: 'No active leaks observed under machine.', evidence: ['video'] },
    ],
  },
  {
    id: 'engine',
    title: '2. Engine Compartment',
    items: [
      { id: '2.1', label: 'Engine Oil Level & Condition', status: 'pass', comment: 'Oil at operating range, color normal.', evidence: ['video'] },
      { id: '2.2', label: 'Engine Coolant Level', status: 'monitor', comment: 'Coolant slightly below full mark. Top off recommended.', evidence: ['video', 'audio'] },
      { id: '2.3', label: 'Hydraulic Oil Level & Condition', status: 'monitor', comment: 'Level acceptable. Temperature sensor flagged high warning yesterday.', evidence: ['video', 'sensor'], faultCode: '168:0110-15' },
      { id: '2.4', label: 'Air Filter Indicator', status: 'pass', comment: 'Indicator green, no restriction.', evidence: ['video'] },
      { id: '2.5', label: 'Belts & Hoses', status: 'pass', comment: 'No cracking or fraying observed.', evidence: ['video'] },
      { id: '2.6', label: 'Radiator & Cooler Fins', status: 'fail', comment: 'Radiator fins heavily packed with debris. Requires cleaning before next shift — contributing to hydraulic oil temp warning.', evidence: ['video', 'audio', 'sensor'] },
      { id: '2.7', label: 'DEF Level', status: 'pass', comment: 'DEF tank at 65%.', evidence: ['video'] },
      { id: '2.8', label: 'Battery & Cables', status: 'pass', comment: 'Terminals clean, connections tight.', evidence: ['video'] },
    ],
  },
  {
    id: 'outside',
    title: '3. On the Machine — Outside Cab',
    items: [
      { id: '3.1', label: 'Steps & Handrails', status: 'pass', comment: 'All steps secure, handrails intact.', evidence: ['video'] },
      { id: '3.2', label: 'Cab Exterior — Glass & Seals', status: 'pass', comment: 'No cracks, seals intact.', evidence: ['video'] },
      { id: '3.3', label: 'Mirrors & Camera System', status: 'monitor', comment: 'Right-side mirror has minor scratch reducing visibility. Serviceable but should be monitored.', evidence: ['video', 'audio'] },
      { id: '3.4', label: 'Cab Mounting & ROPS/FOPS', status: 'normal', comment: 'Structure integrity verified.', evidence: ['video'] },
      { id: '3.5', label: 'Fuel Cap & Fill Area', status: 'pass', comment: 'Cap secure, no spillage.', evidence: ['video'] },
    ],
  },
  {
    id: 'cab',
    title: '4. Inside the Cab',
    items: [
      { id: '4.1', label: 'Seat & Seatbelt', status: 'pass', comment: 'Seat adjustment functional, seatbelt latches properly.', evidence: ['video'] },
      { id: '4.2', label: 'Controls — Joysticks & Pedals', status: 'pass', comment: 'All controls responsive, no binding.', evidence: ['video', 'audio'] },
      { id: '4.3', label: 'Horn', status: 'pass', comment: 'Horn audible and functional.', evidence: ['audio'] },
      { id: '4.4', label: 'Backup Alarm', status: 'pass', comment: 'Backup alarm tested and operational.', evidence: ['audio'] },
      { id: '4.5', label: 'Gauges & Warning Lights', status: 'monitor', comment: 'Hydraulic temp warning illuminated — correlates with fault code 168:0110-15.', evidence: ['video', 'sensor'], faultCode: '168:0110-15' },
      { id: '4.6', label: 'HVAC System', status: 'pass', comment: 'AC blowing cold, heat functional.', evidence: ['audio'] },
      { id: '4.7', label: 'Fire Extinguisher', status: 'pass', comment: 'Present, charged, inspection tag current.', evidence: ['video'] },
      { id: '4.8', label: 'Windshield Wipers & Washer', status: 'pass', comment: 'Wipers clear, washer fluid dispensing.', evidence: ['video'] },
      { id: '4.9', label: 'Monitor Display & Cat Grade System', status: 'pass', comment: 'Display functional, Grade with 2D calibrated.', evidence: ['video'] },
    ],
  },
];

export function getStatusCounts(sections: InspectionSection[]) {
  const counts = { pass: 0, monitor: 0, fail: 0, normal: 0, conflicted: 0 };
  sections.forEach(s => s.items.forEach(item => {
    if (item.status in counts) counts[item.status as keyof typeof counts]++;
  }));
  return counts;
}
