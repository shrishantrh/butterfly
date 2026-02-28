import { useConversation } from '@elevenlabs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

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
}

const AGENT_ID = 'agent_9601kjhjsqyzf4mtbpdfc1m13xs8';

export function VoiceAgent({ formState, setFormState }: VoiceAgentProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const formStateRef = useRef<FormState>(formState);
  formStateRef.current = formState;

  const conversation = useConversation({
    onConnect: () => {
      console.log('[VoiceAgent] Connected');
      // Send initial context 1s after connect
      setTimeout(() => {
        try {
          conversation.sendContextualUpdate(
            JSON.stringify(formStateRef.current)
          );
        } catch (e) {
          console.error('[VoiceAgent] Failed to send context:', e);
        }
      }, 1000);
    },
    onDisconnect: () => console.log('[VoiceAgent] Disconnected'),
    onError: (error) => console.error('[VoiceAgent] Error:', error),
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversation.endSession().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'webrtc',
        clientTools: {
          getFormState: () => {
            return JSON.stringify(formStateRef.current);
          },
          getMissingFields: () => {
            const missing = Object.values(formStateRef.current.components)
              .filter(c => !c.inspected || c.status === null)
              .map(c => ({ id: c.id, name: c.name }));
            return JSON.stringify(missing);
          },
          getComponentDetails: (params: { componentId: string }) => {
            const comp = formStateRef.current.components[params.componentId];
            if (!comp) return JSON.stringify({ error: 'Component not found' });
            return JSON.stringify({
              name: comp.name,
              status: comp.status,
              notes: comp.notes,
              inspected: comp.inspected,
            });
          },
          updateFormField: (params: { componentId: string; status: string; notes: string }) => {
            setFormState(prev => ({
              ...prev,
              components: {
                ...prev.components,
                [params.componentId]: {
                  ...prev.components[params.componentId],
                  status: params.status as FormComponentState['status'],
                  notes: params.notes,
                  inspected: true,
                },
              },
            }));
            return JSON.stringify({ success: true, componentId: params.componentId });
          },
          playAcknowledgment: async () => {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
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
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, setFormState]);

  const stopSession = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isActive = conversation.status === 'connected';
  const isSpeaking = conversation.isSpeaking;

  // Button color & pulse
  let buttonClasses = 'bg-status-monitor text-status-monitor-foreground'; // yellow default
  let pulseClasses = '';
  let label = '';

  if (isActive && isSpeaking) {
    buttonClasses = 'bg-status-monitor text-background';
    pulseClasses = 'animate-pulse';
    label = 'Butterfly is responding';
  } else if (isActive) {
    buttonClasses = 'bg-status-pass text-background';
    pulseClasses = 'animate-pulse';
    label = 'Say "Hey Butterfly" to speak';
  }

  return (
    <div className="fixed bottom-28 right-4 z-50 flex flex-col items-center gap-1.5">
      {label && (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg max-w-[180px]">
          <p className="text-[11px] font-medium text-foreground text-center leading-tight">{label}</p>
        </div>
      )}
      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${buttonClasses} ${pulseClasses} disabled:opacity-50`}
      >
        <Mic className="w-6 h-6" />
      </button>
    </div>
  );
}
