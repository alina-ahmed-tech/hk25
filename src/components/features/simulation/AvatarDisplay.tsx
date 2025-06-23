'use client';

import { cn } from '@/lib/utils';
import type { Speaker } from '@/lib/simulation-types';
import { User, Scale, Bot, Lightbulb } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type AvatarDisplayProps = {
  speaker: Speaker;
  isSpeaking: boolean;
  isListening?: boolean;
  className?: string;
};

const speakerConfig = {
  USER: {
    label: 'You',
    icon: <User className="h-8 w-8" />,
    color: 'text-sky-400',
    bgColor: 'bg-sky-900/50',
    borderColor: 'border-sky-500/50',
    speakingBorderColor: 'border-sky-400',
  },
  TRIBUNAL: {
    label: 'Tribunal',
    icon: <Scale className="h-8 w-8" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/50',
    borderColor: 'border-amber-500/50',
    speakingBorderColor: 'border-amber-400',
  },
  OPPOSING_COUNSEL: {
    label: 'Opponent',
    icon: <User className="h-8 w-8" />,
    color: 'text-red-400',
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-500/50',
    speakingBorderColor: 'border-red-400',
  },
  COACHING: {
    label: 'Coach',
    icon: <Lightbulb className="h-8 w-8" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/50',
    borderColor: 'border-purple-500/50',
    speakingBorderColor: 'border-purple-400',
  },
  WITNESS: {
    label: 'Witness',
    icon: <User className="h-8 w-8" />,
    color: 'text-green-400',
    bgColor: 'bg-green-900/50',
    borderColor: 'border-green-500/50',
    speakingBorderColor: 'border-green-400',
  },
  SYSTEM: {
    label: 'System',
    icon: <Bot className="h-8 w-8" />,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-border',
    speakingBorderColor: 'border-foreground',
  },
};

export function AvatarDisplay({
  speaker,
  isSpeaking,
  isListening,
  className,
}: AvatarDisplayProps) {
  const config = speakerConfig[speaker] || speakerConfig.SYSTEM;

  return (
    <div className={cn('flex flex-col items-center gap-4 transition-all duration-300', className)}>
      <div className={cn('relative', isSpeaking ? 'scale-110' : 'scale-100')}>
        <Avatar
          className={cn(
            'h-32 w-32 border-4 transition-all duration-300',
            config.bgColor,
            isSpeaking ? config.speakingBorderColor : config.borderColor,
            isSpeaking && 'shadow-lg',
          )}
          style={{
            boxShadow: isSpeaking ? `0 0 20px 5px hsla(var(${config.color.startsWith('text-') ? '--' + config.color.substring(5) : config.color}), 0.5)` : 'none'
          }}
        >
          <AvatarFallback className={cn('bg-transparent', config.color)}>
            {config.icon}
          </AvatarFallback>
        </Avatar>
        {isListening && (
           <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
        )}
      </div>
      <h3 className={cn('font-headline text-2xl', config.color)}>{config.label}</h3>
    </div>
  );
}
