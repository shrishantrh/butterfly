import { mockMachines } from '@/lib/mock-data';
import { MachineCard } from '@/components/MachineCard';
import {
  Search, SlidersHorizontal, Plus, History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'listing' | 'map'>('listing');

  const filteredMachines = mockMachines.filter(m =>
    !searchQuery ||
    m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.serial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-14 pb-3 bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-extrabold tracking-tight">Fleet</h1>
          <button
            onClick={() => navigate('/history')}
            className="w-10 h-10 rounded-xl bg-surface-2 border border-border/40 flex items-center justify-center"
          >
            <History className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="Enter Asset ID, Serial, Model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-2 border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-all"
            />
          </div>
          <button className="w-12 h-12 rounded-xl bg-surface-2 border border-border/30 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
        </div>

        {/* Listing / Map toggle */}
        <div className="flex bg-surface-2 rounded-xl p-1 border border-border/20">
          <button
            onClick={() => setActiveTab('listing')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'listing'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Listing
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            Map
          </button>
        </div>
      </header>

      <div className="px-5 pb-24 space-y-3">
        {/* Add new */}
        <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface-2/50 border border-dashed border-border/40">
          <div>
            <p className="text-sm font-semibold text-foreground">Add new vehicle</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Add a vehicle to the list</p>
          </div>
          <Plus className="w-5 h-5 text-muted-foreground/40" />
        </button>

        {/* Machine list */}
        {filteredMachines.map((machine) => (
          <MachineCard key={machine.id} machine={machine} />
        ))}

        {filteredMachines.length === 0 && searchQuery && (
          <div className="p-12 text-center">
            <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No machines found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
