import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ClampTextProps {
  text?: string | null;
  lines?: 1 | 2 | 3;
  className?: string;
}

const CLAMP = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' } as const;

export default function ClampText({ text, lines = 2, className = '' }: ClampTextProps) {
  const value = text || '';
  if (!value) return null;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <div className={`${CLAMP[lines]} break-words leading-snug cursor-default ${className}`}>{value}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm whitespace-normal break-words bg-card text-foreground border-2 border-accent shadow-xl">
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
