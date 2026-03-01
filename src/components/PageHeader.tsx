import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
  className?: string;
  large?: boolean;
}

export function PageHeader({ title, subtitle, back, right, className, large = false }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={cn(
      'sticky top-0 z-40 glass-surface',
      className
    )}>
      {/* iOS-style nav bar */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2 min-h-[48px]">
        {back ? (
          <button
            onClick={() => navigate(back)}
            className="flex items-center gap-0.5 -ml-1 text-primary active:opacity-50 transition-opacity touch-target"
          >
            <ChevronLeft className="w-[22px] h-[22px]" />
            <span className="ios-body">Back</span>
          </button>
        ) : (
          <div className="w-[60px]" />
        )}
        {!large && (
          <h1 className="ios-title text-foreground absolute left-1/2 -translate-x-1/2 truncate max-w-[60%] text-center">
            {title}
          </h1>
        )}
        <div className="flex items-center gap-2">
          {right}
        </div>
      </div>
      {large && (
        <div className="px-5 pb-3">
          <h1 className="ios-large-title text-foreground">{title}</h1>
          {subtitle && <p className="ios-subhead text-muted-foreground mt-1.5">{subtitle}</p>}
        </div>
      )}
      {!large && subtitle && (
        <div className="px-5 pb-2">
          <p className="ios-caption text-muted-foreground text-center">{subtitle}</p>
        </div>
      )}
    </header>
  );
}
