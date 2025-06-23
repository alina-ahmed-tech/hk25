'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Project } from '@/lib/types';
import type { SimulationState, UserAction, Speaker } from '@/lib/simulation-types';
import { runSimulation, generateSpeech } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { getAIErrorMessage } from '@/lib/utils';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { Spinner } from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';
import { AvatarDisplay } from './AvatarDisplay';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AudioQueueItem = {
  speaker: Speaker;
  audioSrc: string;
};

type VoiceSimulationClientProps = {
  project: Project;
  onSaveState: (state: SimulationState) => Promise<void>;
};

export function VoiceSimulationClient({ project, onSaveState }: VoiceSimulationClientProps) {
  const { toast } = useToast();
  const [state, setState] = useState<SimulationState | null>(project.simulationState || null);
  const [isLoading, setIsLoading] = useState(!project.simulationState);
  const [error, setError] = useState<string | null>(null);

  const [audioQueue, setAudioQueue] = useState<AudioQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const processedTranscriptIndex = useRef(0);

  const { isListening, transcript, startListening, stopListening } = useSpeechToText();

  const runSimulationTurn = useCallback(async (userAction?: UserAction) => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await runSimulation({
        projectId: project.id,
        caseStrategy: project.strategy || '',
        currentState: state || undefined,
        userAction: userAction,
      });
      setState(newState);
      await onSaveState(newState);
    } catch (err) {
      const errorMessage = getAIErrorMessage(err);
      setError(errorMessage);
      toast({ title: 'Simulation Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [project, state, onSaveState, toast]);

  useEffect(() => {
    if (!state) {
      runSimulationTurn();
    }
  }, [state, runSimulationTurn]);

  useEffect(() => {
    const processTranscript = async () => {
      if (!state || state.transcript.length <= processedTranscriptIndex.current) return;

      const newEntries = state.transcript.slice(processedTranscriptIndex.current);
      const newAudioItems: AudioQueueItem[] = [];

      for (const entry of newEntries) {
        if (['TRIBUNAL', 'OPPOSING_COUNSEL', 'WITNESS', 'COACHING'].includes(entry.speaker)) {
          try {
            const { audioContent } = await generateSpeech({ text: entry.text, speaker: entry.speaker });
            newAudioItems.push({ speaker: entry.speaker, audioSrc: audioContent });
          } catch (err) {
            console.error(`Failed to generate speech for ${entry.speaker}:`, err);
            toast({ title: 'Audio Error', description: `Could not generate audio for ${entry.speaker}.`, variant: 'destructive'});
          }
        }
      }

      if (newAudioItems.length > 0) {
        setAudioQueue(prev => [...prev, ...newAudioItems]);
      }
      processedTranscriptIndex.current = state.transcript.length;
    };
    processTranscript();
  }, [state?.transcript, toast]);

  useEffect(() => {
    if (!isPlaying && audioQueue.length > 0) {
      const nextItem = audioQueue[0];
      setAudioQueue(prev => prev.slice(1));
      setActiveSpeaker(nextItem.speaker);
      
      if (audioRef.current) {
        audioRef.current.src = nextItem.audioSrc;
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        setIsPlaying(true);
      }
    } else if (audioQueue.length === 0) {
        setActiveSpeaker(null);
    }
  }, [audioQueue, isPlaying]);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
      if (!isListening && transcript) {
          const userActionType = state?.phase === 'OPENING_STATEMENTS' ? 'SUBMIT_STATEMENT'
                             : state?.phase === 'WITNESS_EXAMINATION' ? 'SUBMIT_QUESTION'
                             : 'SUBMIT_CLOSING';
          runSimulationTurn({ type: userActionType, payload: transcript });
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript]);


  if (!state) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-8 bg-background text-foreground">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Initializing immersive simulation...</p>
        {error && <p className="mt-4 text-destructive">{error}</p>}
      </div>
    );
  }

  const latestCoachingTip = state.transcript.slice().reverse().find(t => t.speaker === 'COACHING')?.text;
  const canSpeak = state.isAwaitingUserInput && !isLoading && !isPlaying && audioQueue.length === 0;

  return (
    <div className="flex h-screen w-full flex-col items-center justify-between p-8 bg-background text-foreground">
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        
        {/* Top Avatars */}
        <div className="flex justify-around w-full max-w-5xl">
            <AvatarDisplay speaker="OPPOSING_COUNSEL" isSpeaking={activeSpeaker === 'OPPOSING_COUNSEL'} />
            <AvatarDisplay speaker="TRIBUNAL" isSpeaking={activeSpeaker === 'TRIBUNAL'} />
            <AvatarDisplay speaker="COACHING" isSpeaking={activeSpeaker === 'COACHING'} />
        </div>

        {/* Center Content & User Avatar */}
        <div className="flex flex-col items-center gap-8">
            {latestCoachingTip && !isPlaying && (
                <Card className="max-w-xl p-4 bg-purple-900/20 border border-purple-500/30 animate-fade-in">
                    <CardContent className="p-0">
                        <p className="text-center text-purple-300">{latestCoachingTip}</p>
                    </CardContent>
                </Card>
            )}
            <AvatarDisplay speaker="USER" isSpeaking={isListening} />
        </div>

        {/* Mic Button & Footer */}
        <div className="flex flex-col items-center gap-4">
            {isListening && (
                <p className="text-lg text-primary animate-pulse">Listening...</p>
            )}
            <Button 
                onClick={handleMicClick}
                disabled={!canSpeak}
                className={cn("h-20 w-20 rounded-full transition-all duration-300", isListening && 'bg-red-600 hover:bg-red-700')}
            >
                {isListening ? <Square className="h-8 w-8" /> : <Mic className="h-10 w-10" />}
            </Button>
            <p className="text-sm text-muted-foreground h-4">
                {isLoading && !isListening && "AI is responding..."}
                {!canSpeak && !isLoading && isPlaying && "Listen to the hearing..."}
                {canSpeak && "Press the mic to speak"}
            </p>
        </div>
    </div>
  );
}
