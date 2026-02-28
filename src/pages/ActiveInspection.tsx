import { useParams, useNavigate } from 'react-router-dom';
import { mockMachines, inspectionFormSections } from '@/lib/mock-data';
import { useState, useEffect } from 'react';
import { Mic, Camera, Square, Wifi } from 'lucide-react';

export default function ActiveInspection() {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const machine = mockMachines.find(m => m.id === machineId);
  const [elapsed, setElapsed] = useState(0);
  const [fieldsCompleted, setFieldsCompleted] = useState(0);
  const [transcript, setTranscript] = useState('');

  const totalFields = inspectionFormSections.reduce((acc, s) => acc + s.items.length, 0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate AI filling fields
  useEffect(() => {
    const phrases = [
      "Machine is parked level, chocks in place...",
      "Checking track tension on the left side...",
      "Track pads look good, moving to rollers...",
      "Idler on the left front showing some wear...",
      "Boom structure looks solid, no visible cracks...",
      "Checking hydraulic cylinders now...",
      "Minor seepage at the boom rod seal...",
      "That correlates with the pressure sensor fault...",
      "Moving to the engine compartment...",
      "Coolant's a little low again...",
      "Radiator fins are packed with debris...",
      "That's probably causing the high temp warning...",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < phrases.length) {
        setTranscript(phrases[idx]);
        setFieldsCompleted(prev => Math.min(prev + Math.ceil(Math.random() * 3), totalFields));
        idx++;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [totalFields]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = Math.round((fieldsCompleted / totalFields) * 100);

  if (!machine) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-card/50 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-status-fail animate-recording-pulse" />
          <span className="text-xs font-mono text-status-fail font-semibold">REC</span>
          <span className="text-xs font-mono text-muted-foreground ml-2">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-sensor" />
          <span className="text-[10px] font-mono text-sensor">LIVE</span>
        </div>
      </header>

      {/* Main content — mostly empty, like the spec says */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative">
        {/* Progress ring */}
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold font-mono text-foreground">{pct}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Complete</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">{fieldsCompleted}/{totalFields} fields captured</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">{machine.assetId}</p>
        </div>

        {/* Active indicators */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-1.5 bg-status-fail/15 text-status-fail px-3 py-1.5 rounded-full text-xs font-semibold">
            <Mic className="w-3.5 h-3.5" />
            Audio
          </div>
          <div className="flex items-center gap-1.5 bg-primary/15 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
            <Camera className="w-3.5 h-3.5" />
            Video
          </div>
        </div>
      </div>

      {/* Live transcript ticker */}
      <div className="px-4 py-3 border-t border-border bg-card/30">
        <p className="text-xs text-muted-foreground mb-0.5 font-mono uppercase tracking-wider">Live Transcript</p>
        <p className="text-sm text-foreground min-h-[20px] animate-fade-in" key={transcript}>
          {transcript || 'Listening...'}
        </p>
      </div>

      {/* Stop button */}
      <div className="p-4 bg-card/50 border-t border-border">
        <button
          onClick={() => navigate(`/review/${machine.id}`)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-status-fail text-accent-foreground font-bold text-base hover:brightness-110 transition-all"
        >
          <Square className="w-5 h-5" />
          End Inspection
        </button>
      </div>
    </div>
  );
}
