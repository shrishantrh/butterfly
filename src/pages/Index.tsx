import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { AlertTriangle, Cpu, HardHat } from 'lucide-react';

const Index = () => {
  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-4 border-b border-border/40 bg-background/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">InspectAI</h1>
              <p className="label-caps mt-0.5">Safety & Maintenance</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-surface-2 border border-border/50 flex items-center justify-center">
            <span className="text-xs font-bold text-muted-foreground">MC</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-5 pt-6 pb-1">
        <p className="text-sm text-muted-foreground">{greeting}, Marcus</p>
        <h2 className="text-xl font-bold mt-0.5 text-foreground">Today's Inspections</h2>
      </div>

      {/* Fleet alerts */}
      {(totalFaults > 0 || totalFails > 0) && (
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 bg-surface-2/60 border border-border/40 rounded-lg p-3">
            <div className="flex items-center gap-4 flex-1 text-sm">
              <span className="font-mono text-muted-foreground">{mockMachines.length} machines</span>
              {totalFaults > 0 && (
                <>
                  <span className="w-px h-3.5 bg-border/60" />
                  <span className="flex items-center gap-1.5 text-status-monitor font-semibold">
                    <Cpu className="w-3.5 h-3.5" />
                    {totalFaults} fault{totalFaults !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {totalFails > 0 && (
                <>
                  <span className="w-px h-3.5 bg-border/60" />
                  <span className="flex items-center gap-1.5 text-status-fail font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {totalFails} fail{totalFails !== 1 ? 's' : ''}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="px-5 pt-1 pb-2">
        <p className="label-caps">Select machine to inspect</p>
      </div>

      {/* Machine list */}
      <div className="px-5 pb-12 space-y-2.5">
        {mockMachines.map((machine, i) => (
          <div key={machine.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <MachineCard machine={machine} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Index;
