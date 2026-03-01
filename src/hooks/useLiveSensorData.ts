import { useState, useEffect, useRef } from 'react';
import { getData, tickAllSensors } from '@/lib/sensor-data';
import type { DataPoint } from '@/lib/sensor-data';

/**
 * Hook that provides live-updating sensor data.
 * Ticks all sensors every `intervalMs` and returns fresh data for the given key.
 */
export function useLiveSensorData(
  sensorKey: string,
  machineId?: string,
  intervalMs = 5000,
): DataPoint[] {
  const [data, setData] = useState<DataPoint[]>(() => getData(sensorKey, machineId));
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Initial data
    setData(getData(sensorKey, machineId));

    tickRef.current = setInterval(() => {
      tickAllSensors(machineId);
      setData([...getData(sensorKey, machineId)]);
    }, intervalMs);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [sensorKey, machineId, intervalMs]);

  return data;
}

/**
 * Hook that triggers a global tick and returns a counter for re-render.
 * Use this in components that display multiple sensors.
 */
export function useLiveTick(machineId?: string, intervalMs = 5000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickAllSensors(machineId);
      setTick(t => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [machineId, intervalMs]);

  return tick;
}
