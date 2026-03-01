/**
 * Client-side detector that cross-references speech transcripts with sensor telemetry
 * to find conflicts and trigger ElevenLabs voice agent interjections.
 */
import { SENSORS, SENSOR_TO_FORM_ITEMS, getData, type SensorSnapshot } from './sensor-data';

// Maps keywords/phrases to sensor keys
const COMPONENT_KEYWORDS: Record<string, string[]> = {
  battery_voltage: ['battery', 'voltage', 'battery voltage', 'batt'],
  engine_coolant_temp: ['coolant', 'coolant temp', 'coolant temperature', 'antifreeze', 'coolant level'],
  engine_oil_pressure: ['oil pressure', 'engine oil', 'oil level'],
  hydraulic_oil_temp: ['hydraulic oil', 'hydraulic temp', 'hydraulic fluid', 'hydro oil'],
  pump_pressure_front: ['pump pressure', 'front pump', 'hydraulic pump'],
  pump_pressure_rear: ['rear pump'],
  engine_rpm: ['rpm', 'engine speed', 'revs'],
  engine_load: ['engine load'],
  boost_pressure: ['boost', 'turbo', 'boost pressure', 'air filter'],
  fuel_level: ['fuel level', 'fuel tank', 'fuel'],
  def_level: ['def level', 'def fluid', 'diesel exhaust fluid', 'def'],
  exhaust_gas_temp: ['exhaust temp', 'exhaust gas', 'egt'],
  dpf_soot_load: ['dpf', 'soot', 'particulate filter'],
};

// Positive-sentiment words that indicate the inspector thinks something is OK
const POSITIVE_WORDS = [
  'good', 'fine', 'ok', 'okay', 'normal', 'looks good', 'no issues',
  'within spec', 'acceptable', 'satisfactory', 'pass', 'clean',
  'looks fine', 'all good', 'no problems', 'healthy', 'solid',
  'no leaks', 'functioning', 'operating normally', 'running fine',
  'looks great', 'in good shape', 'no concerns', 'checks out',
];

export interface SensorConflict {
  sensorKey: string;
  sensorLabel: string;
  latestValue: number;
  unit: string;
  status: 'warning' | 'critical';
  threshold: number;
  direction: string;
  latestTime: string;
  matchedKeyword: string;
}

/**
 * Scans a transcript snippet for mentions of components where the inspector
 * says something is fine but sensor data says otherwise.
 */
export function detectSensorConflicts(
  transcriptSnippet: string,
  sensorSnapshots: SensorSnapshot[]
): SensorConflict[] {
  const text = transcriptSnippet.toLowerCase();
  const conflicts: SensorConflict[] = [];

  // Check if the text contains positive sentiment
  const hasPositiveSentiment = POSITIVE_WORDS.some(word => text.includes(word));
  if (!hasPositiveSentiment) return conflicts;

  // Check each sensor's keywords
  for (const [sensorKey, keywords] of Object.entries(COMPONENT_KEYWORDS)) {
    const mentionsComponent = keywords.some(kw => text.includes(kw));
    if (!mentionsComponent) continue;

    // Find the sensor in snapshots
    const sensor = sensorSnapshots.find(s => s.sensorKey === sensorKey);
    if (!sensor) continue;

    // Is the sensor in warning or critical?
    if (sensor.status === 'warning' || sensor.status === 'critical') {
      conflicts.push({
        sensorKey: sensor.sensorKey,
        sensorLabel: sensor.label,
        latestValue: sensor.latestValue,
        unit: sensor.unit,
        status: sensor.status,
        threshold: sensor.status === 'critical' ? (sensor.critThreshold ?? 0) : (sensor.warnThreshold ?? 0),
        direction: sensor.direction ?? 'above',
        latestTime: sensor.latestTime,
        matchedKeyword: keywords.find(kw => text.includes(kw)) || '',
      });
    }
  }

  return conflicts;
}

/**
 * Build a concise interjection message for the voice agent.
 */
export function buildConflictInterjection(conflict: SensorConflict): string {
  const dirWord = conflict.direction === 'above' ? 'above' : 'below';
  return `IMPORTANT INTERJECTION: The inspector just said the ${conflict.sensorLabel.toLowerCase()} is fine, but telemetry shows it at ${conflict.latestValue} ${conflict.unit}, which is ${dirWord} the ${conflict.status === 'critical' ? 'critical' : 'warning'} threshold of ${conflict.threshold} ${conflict.unit} (as of ${conflict.latestTime}). Politely but firmly correct the inspector. Be concise — max 2 sentences. State the actual reading and threshold.`;
}
