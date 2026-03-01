import { useConversation } from '@elevenlabs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, Bot } from 'lucide-react';
import { inspectionFormSections } from '@/lib/mock-data';
import type { SensorSnapshot } from '@/lib/sensor-data';

export interface FormComponentState {
  id: string;
  name: string;
  status: 'pass' | 'monitor' | 'fail' | 'normal' | null;
  notes: string;
  inspected: boolean;
}

export interface FormState {
  components: Record<string, FormComponentState>;
}

interface VoiceAgentProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  speechTranscript?: string;
  sensorSnapshot?: SensorSnapshot[];
}

const AGENT_ID = 'agent_9601kjhjsqyzf4mtbpdfc1m13xs8';

// Build a rich schema description for the agent
function buildFormSchemaDescription(): string {
  return inspectionFormSections.map(section =>
    `### ${section.title}\n` +
    section.items.map(item => `- ${item.id}: ${item.label}`).join('\n')
  ).join('\n\n');
}

function buildSensorSummaryForAgent(snapshots: SensorSnapshot[]): string {
  return snapshots.map(s => {
    const thresholdInfo = s.warnThreshold !== null
      ? ` [warn ${s.direction === 'above' ? '≥' : '≤'}${s.warnThreshold}, crit ${s.direction === 'above' ? '≥' : '≤'}${s.critThreshold}]`
      : '';
    const formItems = s.relatedFormItems.length > 0 ? ` → form items: ${s.relatedFormItems.join(', ')}` : '';
    return `${s.label}: ${s.latestValue} ${s.unit} (${s.status.toUpperCase()} at ${s.latestTime})${thresholdInfo}${formItems}`;
  }).join('\n');
}

export function VoiceAgent({ formState, setFormState, speechTranscript, sensorSnapshot }: VoiceAgentProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [wakeWordCooldown, setWakeWordCooldown] = useState(false);
  const formStateRef = useRef<FormState>(formState);
  formStateRef.current = formState;
  const sensorRef = useRef<SensorSnapshot[]>(sensorSnapshot || []);
  sensorRef.current = sensorSnapshot || [];
  const lastProcessedTranscript = useRef('');
  const conversationHistory = useRef<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const wasSpeakingRef = useRef(false);
  const autoDisconnectTimer = useRef<number | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('[VoiceAgent] Connected');
      setTimeout(() => {
        try {
          const sensorSummary = sensorRef.current.length > 0
            ? buildSensorSummaryForAgent(sensorRef.current)
            : 'No sensor data available.';

          const context = {
            formSchema: buildFormSchemaDescription(),
            currentState: formStateRef.current,
            summary: buildProgressSummary(formStateRef.current),
            sensorTelemetry: sensorSummary,
            previousConversation: conversationHistory.current.length > 0
              ? conversationHistory.current
              : 'No previous conversation — this is the first activation.',
            instruction: `You have access to real-time sensor telemetry data. CRITICAL BEHAVIOR: If the inspector states something about a component's condition, cross-reference it with the sensor data. If the sensor data CONTRADICTS the inspector (e.g. inspector says "battery voltage is fine" but sensor shows 11.5V which is below the 11.8V warning threshold), you MUST interject and say something like: "Hold on — the telemetry shows battery voltage at 11.5 volts, which is below the 11.8 volt warning threshold. That reading suggests it's not fine." Be specific with the actual value and threshold. Be concise — max 2 sentences. If there's no conflict, don't mention telemetry unless asked.`,
          };
          conversation.sendContextualUpdate(JSON.stringify(context));
        } catch (e) {
          console.error('[VoiceAgent] Failed to send context:', e);
        }
      }, 800);
    },
    onDisconnect: () => {
      console.log('[VoiceAgent] Disconnected');
      if (autoDisconnectTimer.current) clearTimeout(autoDisconnectTimer.current);
      setTimeout(() => setWakeWordCooldown(false), 2000);
    },
    onMessage: (message: any) => {
      if (message.type === 'user_transcript' && message.user_transcription_event?.user_transcript) {
        conversationHistory.current.push({ role: 'user', text: message.user_transcription_event.user_transcript });
      }
      if (message.type === 'agent_response' && message.agent_response_event?.agent_response) {
        conversationHistory.current.push({ role: 'agent', text: message.agent_response_event.agent_response });
      }
      if (conversationHistory.current.length > 50) {
        conversationHistory.current = conversationHistory.current.slice(-40);
      }
    },
    onError: (error) => console.error('[VoiceAgent] Error:', error),
  });

  // Wake word detection from speech transcript
  useEffect(() => {
    if (!speechTranscript || wakeWordCooldown) return;
    if (conversation.status === 'connected') return;

    const newContent = speechTranscript.slice(lastProcessedTranscript.current.length).toLowerCase();
    lastProcessedTranscript.current = speechTranscript;

    if (!newContent) return;

    const wakePatterns = [
      'hey cat', 'hey kat', 'a cat', 'hey cap',
      'hey cats', 'hay cat', 'hey cut',
      'hey butterfly', 'hey butter fly', 'a butterfly',
    ];

    const hasWakeWord = wakePatterns.some(pattern => newContent.includes(pattern));

    if (hasWakeWord) {
      console.log('[VoiceAgent] Wake word detected!');
      setWakeWordCooldown(true);
      startSession();
    }
  }, [speechTranscript, wakeWordCooldown, conversation.status]);

  // Auto-disconnect after agent finishes speaking
  useEffect(() => {
    const speaking = conversation.isSpeaking;
    if (wasSpeakingRef.current && !speaking && conversation.status === 'connected') {
      console.log('[VoiceAgent] Agent finished speaking, auto-disconnecting in 3s...');
      autoDisconnectTimer.current = window.setTimeout(() => {
        if (conversation.status === 'connected') {
          console.log('[VoiceAgent] Auto-disconnecting');
          conversation.endSession().catch(() => {});
        }
      }, 3000);
    }
    if (speaking && autoDisconnectTimer.current) {
      clearTimeout(autoDisconnectTimer.current);
      autoDisconnectTimer.current = null;
    }
    wasSpeakingRef.current = speaking;
  }, [conversation.isSpeaking, conversation.status]);

  useEffect(() => {
    return () => {
      conversation.endSession().catch(() => {});
      if (autoDisconnectTimer.current) clearTimeout(autoDisconnectTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = useCallback(async () => {
    if (isConnecting || conversation.status === 'connected') return;
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'webrtc',
        clientTools: {
          getFormState: () => {
            const state = formStateRef.current;
            const summary = buildProgressSummary(state);
            return JSON.stringify({ summary, components: state.components });
          },
          getMissingFields: () => {
            const missing = Object.values(formStateRef.current.components)
              .filter(c => !c.inspected || c.status === null)
              .map(c => ({ id: c.id, name: c.name }));
            return JSON.stringify({ count: missing.length, items: missing });
          },
          getComponentDetails: (params: { componentId: string }) => {
            const comp = formStateRef.current.components[params.componentId];
            if (!comp) {
              const match = Object.values(formStateRef.current.components)
                .find(c => c.name.toLowerCase().includes(params.componentId.toLowerCase()));
              if (match) {
                return JSON.stringify({ id: match.id, name: match.name, status: match.status, notes: match.notes, inspected: match.inspected });
              }
              return JSON.stringify({ error: 'Component not found', available: Object.keys(formStateRef.current.components).slice(0, 10) });
            }
            return JSON.stringify({ id: comp.id, name: comp.name, status: comp.status, notes: comp.notes, inspected: comp.inspected });
          },
          updateFormField: (params: { componentId: string; status: string; notes: string }) => {
            const validStatuses = ['pass', 'monitor', 'fail', 'normal'];
            const status = validStatuses.includes(params.status) ? params.status : 'normal';
            setFormState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.componentId]: {
                  ...prev.components[params.componentId],
                  status: status as FormComponentState['status'],
                  notes: params.notes || '',
                  inspected: true,
                },
              },
            }));
            return JSON.stringify({ success: true, componentId: params.componentId, status });
          },
          getInspectionProgress: () => {
            return JSON.stringify(buildProgressSummary(formStateRef.current));
          },
          getFailedItems: () => {
            const failed = Object.values(formStateRef.current.components)
              .filter(c => c.status === 'fail' || c.status === 'monitor')
              .map(c => ({ id: c.id, name: c.name, status: c.status, notes: c.notes }));
            return JSON.stringify({ count: failed.length, items: failed });
          },
          getSensorData: (params: { sensorKey?: string; formItemId?: string }) => {
            const sensors = sensorRef.current;
            if (!sensors.length) return JSON.stringify({ error: 'No sensor data available' });

            // Lookup by specific sensor key
            if (params.sensorKey) {
              const sensor = sensors.find(s => s.sensorKey === params.sensorKey);
              if (sensor) return JSON.stringify(sensor);
              return JSON.stringify({ error: `Sensor '${params.sensorKey}' not found` });
            }

            // Lookup by form item ID — find sensors related to that form item
            if (params.formItemId) {
              const related = sensors.filter(s => s.relatedFormItems.includes(params.formItemId!));
              if (related.length > 0) return JSON.stringify({ formItemId: params.formItemId, sensors: related });
              return JSON.stringify({ error: `No sensors mapped to form item '${params.formItemId}'` });
            }

            // Return all sensors with alerts
            const alerts = sensors.filter(s => s.status !== 'normal');
            return JSON.stringify({
              totalSensors: sensors.length,
              alertCount: alerts.length,
              alerts: alerts.map(s => ({
                label: s.label,
                value: `${s.latestValue} ${s.unit}`,
                status: s.status,
                relatedFormItems: s.relatedFormItems,
              })),
            });
          },
          playAcknowledgment: async () => {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
            await new Promise(r => setTimeout(r, 300));
            ctx.close();
            return JSON.stringify({ done: true });
          },
        },
      });
    } catch (error) {
      console.error('[VoiceAgent] Failed to start:', error);
      setWakeWordCooldown(false);
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, setFormState, isConnecting]);

  const stopSession = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isActive = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  let ringColor = 'ring-primary/20';
  let bgColor = 'bg-surface-2';
  let iconColor = 'text-muted-foreground';
  let pulseClass = '';
  let label = '';

  if (isConnecting) {
    bgColor = 'bg-primary/80';
    iconColor = 'text-primary-foreground';
    ringColor = 'ring-primary/30';
    pulseClass = 'animate-pulse';
    label = 'Connecting...';
  } else if (isActive && isSpeaking) {
    bgColor = 'bg-primary';
    iconColor = 'text-primary-foreground';
    ringColor = 'ring-primary/30';
    pulseClass = 'animate-pulse';
    label = 'Cat is responding...';
  } else if (isActive) {
    bgColor = 'bg-status-pass';
    iconColor = 'text-background';
    ringColor = 'ring-status-pass/30';
    pulseClass = 'animate-pulse';
    label = 'Listening — say your command';
  } else {
    label = 'Say "Hey Cat" to activate';
  }

  return (
    <div className="fixed bottom-28 right-4 z-50 flex flex-col items-center gap-2">
      {label && (
        <div className="glass-surface-elevated rounded-lg px-3 py-1.5 max-w-[180px]">
          <p className="text-[10px] font-medium text-foreground text-center leading-tight">{label}</p>
        </div>
      )}
      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`rounded-full flex items-center justify-center ring-4 ${ringColor} ${bgColor} ${pulseClass} shadow-lg transition-all duration-200 active:scale-90 disabled:opacity-50`}
        style={{ width: 52, height: 52 }}
      >
        {isActive ? (
          <Bot className={`w-5 h-5 ${iconColor}`} />
        ) : (
          <Mic className={`w-5 h-5 ${iconColor}`} />
        )}
      </button>
    </div>
  );
}

function buildProgressSummary(formState: FormState) {
  const all = Object.values(formState.components);
  const inspected = all.filter(c => c.inspected);
  const passed = all.filter(c => c.status === 'pass');
  const monitored = all.filter(c => c.status === 'monitor');
  const failed = all.filter(c => c.status === 'fail');
  const remaining = all.filter(c => !c.inspected);

  return {
    total: all.length,
    inspected: inspected.length,
    passed: passed.length,
    monitored: monitored.length,
    failed: failed.length,
    remaining: remaining.length,
    percentComplete: Math.round((inspected.length / all.length) * 100),
    nextUninspected: remaining.slice(0, 3).map(c => ({ id: c.id, name: c.name })),
  };
}
