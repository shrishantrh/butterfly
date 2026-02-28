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
    <header className={cn('flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40', className)}>
      {back && (
        <button onClick={() => navigate(back)} className="p-1.5 -ml-1.5 rounded-md hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-bold truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
