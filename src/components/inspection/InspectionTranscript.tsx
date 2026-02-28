interface InspectionTranscriptProps {
  committedTexts: string[];
  latestPartial: string;
  isConnected: boolean;
  isConnecting: boolean;
}

export function InspectionTranscript({ committedTexts, latestPartial, isConnected, isConnecting }: InspectionTranscriptProps) {
  return (
    <div className="px-4 py-3 border-t border-border bg-card">
      <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest mb-1.5">Transcript</p>
      <div className="min-h-[36px] max-h-[72px] overflow-y-auto">
        {committedTexts.length > 0 && (
          <p className="text-[11px] text-muted-foreground/60 mb-1 leading-relaxed">
            {committedTexts.slice(-2).join(' ')}
          </p>
        )}
        <p className="text-xs text-foreground leading-relaxed">
          {latestPartial || (isConnected ? 'Listening…' : isConnecting ? 'Connecting…' : 'Waiting')}
        </p>
      </div>
    </div>
  );
}
