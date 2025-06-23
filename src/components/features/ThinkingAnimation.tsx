
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const stages = [
  { name: 'Advocate', model: 'Gemini' },
  { name: 'Adversary', model: 'Gemini' },
  { name: 'Arbiter', model: 'Gemini' },
];

export function ThinkingAnimation() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    // This sets up a sequence of timeouts to advance the animation stage.
    const timers = stages.map((_, index) =>
      setTimeout(() => {
        setActiveStage(index);
      }, index * 2000)
    );

    // A final timeout to set the animation to a completed state.
    const finalTimer = setTimeout(() => {
      setActiveStage(stages.length);
    }, stages.length * 2000);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[50vh] animate-fade-in">
      <div className="flex items-center justify-center space-x-8 md:space-x-16">
        {stages.map((stage, index) => {
          // The stage whose index matches the activeStage is the one "working".
          const isActive = index === activeStage;
          // Stages with an index less than the activeStage are "done".
          const isDone = index < activeStage;

          return (
            <div key={stage.name} className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'relative h-24 w-24 md:h-32 md:w-32 rounded-full border-2 transition-all duration-500 flex items-center justify-center bg-card/30',
                  // The shining outline is ONLY applied to the active, "working" stage.
                  isActive && 'shining-outline'
                )}
                style={{
                  // The border is transparent for the active stage to reveal the shining animation.
                  // Done stages have a brighter border, and pending stages have a dim one.
                  borderColor: isActive ? 'transparent' : `hsla(var(--primary), ${isDone ? '0.5' : '0.2'})`,
                }}
              >
                <div
                  className={cn(
                    'h-full w-full rounded-full transition-all duration-500',
                    // Only pending stages will "breathe".
                    !isDone && !isActive && 'animate-breathing opacity-80'
                    // The "done" stages no longer have a background fill, to make the active stage more prominent.
                  )}
                />
              </div>
              <div className="mt-4 transition-opacity duration-500" style={{ opacity: isDone || isActive ? 1 : 0.5 }}>
                <p className="font-headline text-lg md:text-xl font-bold text-slate-200">{stage.name}</p>
                <p className="text-sm text-muted-foreground">{stage.model}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-12 text-lg text-slate-400 animate-pulse">Simulating tribunal deliberation...</p>
    </div>
  );
}
