import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { User, ChevronRight, Activity } from 'lucide-react';

const Index = () => {
  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-gradient-primary">Inspect</span>
            <span className="text-foreground">AI</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Safety &amp; Maintenance Daily</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      </header>

      {/* Greeting + Fleet summary */}
      <div className="px-4 pt-5 pb-3">
        <p className="text-muted-foreground text-sm">Good morning, Marcus</p>
        <h2 className="text-xl font-bold mt-0.5">Today's Inspections</h2>
      </div>

      {/* Fleet stats bar */}
      <div className="px-4 pb-4">
        <div className="glass-surface rounded-lg p-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{mockMachines.length} machines</span>
          </div>
          <div className="h-4 w-px bg-border" />
          {totalFaults > 0 && (
            <span className="text-xs font-semibold text-status-monitor">
              {totalFaults} active fault{totalFaults !== 1 ? 's' : ''}
            </span>
          )}
          {totalFails > 0 && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="text-xs font-semibold text-status-fail">
                {totalFails} open FAIL{totalFails !== 1 ? 's' : ''}
              </span>
            </>
          )}
          <div className="ml-auto">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Tap a machine to begin inspection</p>
      </div>

      {/* Machine list */}
      <div className="px-4 pb-8 space-y-3">
        {mockMachines.map((machine) => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </div>
  );
};

export default Index;
