import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import { QrCode, Search, User } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-gradient-primary">Inspect</span>
            <span className="text-foreground">AI</span>
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Safety & Maintenance Daily</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <QrCode className="w-5 h-5 text-primary" />
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="px-4 py-5">
        <p className="text-muted-foreground text-sm">Good morning, Marcus</p>
        <h2 className="text-xl font-bold">3 machines assigned today</h2>
      </div>

      {/* Quick scan */}
      <div className="px-4 pb-4">
        <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm glow-primary hover:brightness-110 transition-all">
          <QrCode className="w-5 h-5" />
          Scan Machine QR / Barcode
        </button>
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
