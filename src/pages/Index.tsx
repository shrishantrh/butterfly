import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { AlertTriangle, ChevronRight } from 'lucide-react';

const Index = () => {
  const totalFaults = mockMachines.reduce((acc, m) => acc + m.activeFaultCodes.length, 0);
  const totalFails = mockMachines.reduce((acc, m) => acc + (m.lastInspection?.summary.fail ?? 0), 0);
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 pt-4 pb-3 border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs font-mono">AI</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground">InspectAI</h1>
              <p className="text-[10px] text-muted-foreground font-mono tracking-wide">SAFETY & MAINTENANCE</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface-2 border border-border flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">MC</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-4 pt-5 pb-1">
        <p className="text-sm text-muted-foreground">{greeting}, Marcus</p>
        <h2 className="text-xl font-bold mt-0.5 text-foreground">Today's Inspections</h2>
      </div>

      {/* Fleet alerts */}
      {(totalFaults > 0 || totalFails > 0) && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 bg-surface-2 border border-border rounded p-3">
            <div className="flex items-center gap-4 text-xs flex-1">
              <span className="font-mono text-muted-foreground">{mockMachines.length} machines</span>
              {totalFaults > 0 && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span className="flex items-center gap-1 text-status-monitor font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    {totalFaults} fault{totalFaults !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {totalFails > 0 && (
                <>
                  <span className="w-px h-3 bg-border" />
                  <span className="text-status-fail font-semibold">{totalFails} open FAIL{totalFails !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="px-4 pt-1 pb-2">
        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">Select machine to inspect</p>
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
