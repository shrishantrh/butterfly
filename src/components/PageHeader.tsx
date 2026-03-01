import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, right, className }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={cn(
      'flex items-center gap-3 px-5 py-3 pt-14 border-b border-border/20 bg-background/90 backdrop-blur-2xl sticky top-0 z-40',
      className
    )}>
      {back && (
        <button
          onClick={() => navigate(back)}
          className="touch-target flex items-center justify-center -ml-1 w-9 h-9 rounded-xl bg-surface-2 border border-border/30"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-foreground" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
