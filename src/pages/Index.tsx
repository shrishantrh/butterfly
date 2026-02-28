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
      <header className="px-5 pt-5 pb-4 border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm font-mono">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">InspectAI</h1>
              <p className="text-xs text-muted-foreground font-mono tracking-wide">SAFETY & MAINTENANCE</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground">MC</span>
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-5 pt-6 pb-2">
        <p className="text-sm text-muted-foreground">{greeting}, Marcus</p>
        <h2 className="text-2xl font-bold mt-1 text-foreground">Today's Inspections</h2>
      </div>

      {/* Fleet alerts */}
      {(totalFaults > 0 || totalFails > 0) && (
        <div className="px-5 py-3">
          <div className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl p-4">
            <div className="flex items-center gap-4 text-sm flex-1">
              <span className="font-mono text-muted-foreground">{mockMachines.length} machines</span>
              {totalFaults > 0 && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <span className="flex items-center gap-1.5 text-status-monitor font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    {totalFaults} fault{totalFaults !== 1 ? 's' : ''}
                  </span>
                </>
              )}
              {totalFails > 0 && (
                <>
                  <span className="w-px h-4 bg-border" />
                  <span className="text-status-fail font-semibold">{totalFails} FAIL{totalFails !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Section label */}
      <div className="px-5 pt-2 pb-3">
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Select machine to inspect</p>
      </div>

      {/* Machine list */}
      <div className="px-5 pb-10 space-y-3">
        {mockMachines.map((machine) => (
          <MachineCard key={machine.id} machine={machine} />
        ))}
      </div>
    </div>
  );
};

export default Index;
