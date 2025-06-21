
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { Presentation, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePresentation } from '@/lib/actions';
import { getAIErrorMessage } from '@/lib/utils';
import type { Analysis } from '@/lib/types';

type GenerateDeckButtonProps = {
  projectName: string;
  analysis: Analysis;
  userEmail: string;
  initialUrl?: string | null;
  onSuccess: (url: string) => void;
};

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function GenerateDeckButton({ projectName, analysis, userEmail, initialUrl, onSuccess }: GenerateDeckButtonProps) {
  const { toast } = useToast();
  const [state, setState] = useState<ButtonState>(initialUrl ? 'success' : 'idle');
  const [presentationUrl, setPresentationUrl] = useState<string | null>(initialUrl || null);

  const handleClick = async () => {
    if (state === 'loading' || state === 'success') return;

    setState('loading');
    try {
      const result = await generatePresentation({
        projectName,
        analysis,
        userEmail,
      });

      if (result.presentationUrl) {
        setPresentationUrl(result.presentationUrl);
        onSuccess(result.presentationUrl);
        setState('success');
        toast({
          title: 'Success!',
          description: 'Your strategy deck has been generated and shared with you.',
        });
      } else {
        throw new Error('The presentation URL was not returned.');
      }
    } catch (err) {
      console.error('Error generating presentation:', err);
      toast({
        title: 'Generation Failed',
        description: getAIErrorMessage(err),
        variant: 'destructive',
      });
      setState('error');
      // Reset after a few seconds
      setTimeout(() => setState('idle'), 5000);
    }
  };

  const content = {
    idle: {
      icon: <Presentation className="mr-2 h-5 w-5" />,
      text: 'Generate Strategy Deck',
    },
    loading: {
      icon: <Spinner className="mr-2" />,
      text: 'Generating...',
    },
    success: {
      icon: <CheckCircle2 className="mr-2 h-5 w-5" />,
      text: 'Open Presentation',
    },
    error: {
      icon: <AlertTriangle className="mr-2 h-5 w-5" />,
      text: 'Generation Failed',
    },
  };
  
  if (state === 'success' && presentationUrl) {
    return (
        <Button asChild>
            <a href={presentationUrl} target="_blank" rel="noopener noreferrer">
                {content.success.icon}
                {content.success.text}
            </a>
        </Button>
    )
  }

  return (
    <Button onClick={handleClick} disabled={state === 'loading'}>
      {content[state].icon}
      {content[state].text}
    </Button>
  );
}
