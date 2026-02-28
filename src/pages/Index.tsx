import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { AlertTriangle, Shield, Cpu } from 'lucide-react';

const Index = () => {
  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-5 border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">InspectAI</h1>
              <p className="text-[10px] text-muted-foreground font-mono tracking-[0.2em] mt-0.5">SAFETY & MAINTENANCE</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">MC</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-5 pt-7 pb-2">
        <p className="text-sm text-muted-foreground">{greeting}, Marcus</p>
        <h2 className="text-2xl font-bold mt-0.5 text-foreground tracking-tight">Today's Inspections</h2>
      </div>

      {/* Fleet alerts */}
      {(totalFaults > 0 || totalFails > 0) && (
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 bg-surface-2/80 border border-border/60 rounded-xl p-3.5">
            <div className="flex items-center gap-4 flex-1">
              <span className="font-mono text-sm text-muted-foreground">{mockMachines.length} machines</span>
              {totalFaults > 0 && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <span className="flex items-center gap-1.5 text-status-monitor font-bold text-sm">
                    <Cpu className="w-4 h-4" />
                    {totalFaults} fault{totalFaults !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {totalFails > 0 && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <span className="flex items-center gap-1.5 text-status-fail font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {totalFails} FAIL{totalFails !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="px-5 pt-2 pb-2">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">Select machine to inspect</p>
      </div>

      {/* Machine list */}
      <div className="px-5 pb-12 space-y-3">
        {mockMachines.map((machine, i) => (
          <div key={machine.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <MachineCard machine={machine} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
