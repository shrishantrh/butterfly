interface InspectionTranscriptProps {
  committedTexts: string[];
  latestPartial: string;
  isConnected: boolean;
  isConnecting: boolean;
}

export function InspectionTranscript({ committedTexts, latestPartial, isConnected, isConnecting }: InspectionTranscriptProps) {
  return (
    <div className="px-5 py-4 border-t border-border bg-card">
      <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-2">Transcript</p>
      <div className="min-h-[44px] max-h-[80px] overflow-y-auto">
        {committedTexts.length > 0 && (
          <p className="text-sm text-muted-foreground/60 mb-1 leading-relaxed">
            {committedTexts.slice(-2).join(' ')}
          </p>
        )}
        <p className="text-sm text-foreground leading-relaxed">
          {latestPartial || (isConnected ? 'Listening…' : isConnecting ? 'Connecting…' : 'Waiting')}
        </p>
      </div>
    </div>
  );
}
