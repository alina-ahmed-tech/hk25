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
import { Mic, Square } from 'lucide-react';
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
  const [isTurnLoading, setIsTurnLoading] = useState(!project.simulationState);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audioQueue, setAudioQueue] = useState<AudioQueueItem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<Speaker | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const processedTranscriptIndex = useRef(0);

  const { isListening, transcript, startListening, stopListening } = useSpeechToText();

  const runSimulationTurn = useCallback(async (userAction?: UserAction) => {
    setIsTurnLoading(true);
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
      setIsTurnLoading(false);
    }
  }, [project, state, onSaveState, toast]);

  // Initial run to setup the simulation
  useEffect(() => {
    if (!state) {
      runSimulationTurn();
    }
  }, [state, runSimulationTurn]);

  // Process new transcript entries to generate audio sequentially
  useEffect(() => {
    const processTranscript = async () => {
      if (!state || state.transcript.length <= processedTranscriptIndex.current) return;

      const newEntries = state.transcript.slice(processedTranscriptIndex.current);
      
      if (newEntries.some(e => ['TRIBUNAL', 'OPPOSING_COUNSEL', 'WITNESS', 'COACHING'].includes(e.speaker))) {
        setIsGeneratingAudio(true);
      }

      const newAudioItems: AudioQueueItem[] = [];

      for (const entry of newEntries) {
        if (['TRIBUNAL', 'OPPOSING_COUNSEL', 'WITNESS', 'COACHING'].includes(entry.speaker)) {
          try {
            // Await each call to ensure sequential processing and ordering
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
      setIsGeneratingAudio(false);
    };
    
    processTranscript();
  }, [state?.transcript, toast]);

  // Play audio from the queue
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

  // Submit transcript when listening stops
  useEffect(() => {
      if (!isListening && transcript) {
          const userActionType = state?.phase === 'OPENING_STATEMENTS' ? 'SUBMIT_STATEMENT'
                             : state?.phase === 'WITNESS_EXAMINATION' ? 'SUBMIT_QUESTION'
                             : 'SUBMIT_CLOSING';
          runSimulationTurn({ type: userActionType, payload: transcript });
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, transcript]);


  if (!state && isTurnLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-8 bg-background text-foreground">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">Initializing immersive simulation...</p>
        {error && <p className="mt-4 text-destructive">{error}</p>}
      </div>
    );
  }
  
  if (!state) {
     return <div className="flex h-screen items-center justify-center text-destructive">Simulation could not be loaded.</div>;
  }

  const latestCoachingTip = state.transcript.slice().reverse().find(t => t.speaker === 'COACHING')?.text;
  const isProcessing = isTurnLoading || isGeneratingAudio;
  const canSpeak = state.isAwaitingUserInput && !isProcessing && !isPlaying && audioQueue.length === 0;

  const getFooterText = () => {
    if (isTurnLoading) return "AI is responding...";
    if (isGeneratingAudio) return "Generating audio...";
    if (isPlaying) return "Listen to the hearing...";
    if (isListening) return ""; // 'Listening...' is a separate element
    if (canSpeak) return "Press the mic to speak";
    if (state.isAwaitingUserInput && isProcessing) return "Preparing for your turn...";
    return "Awaiting response from other parties...";
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-between p-8 bg-background text-foreground">
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        
        <div className="flex justify-around w-full max-w-5xl">
            <AvatarDisplay speaker="OPPOSING_COUNSEL" isSpeaking={activeSpeaker === 'OPPOSING_COUNSEL'} />
            <AvatarDisplay speaker="TRIBUNAL" isSpeaking={activeSpeaker === 'TRIBUNAL'} />
            <AvatarDisplay speaker="WITNESS" isSpeaking={activeSpeaker === 'WITNESS'} className={!state.currentWitness ? 'opacity-30' : ''}/>
        </div>

        <div className="flex flex-col items-center gap-8">
            {latestCoachingTip && !isPlaying && (
                <Card className="max-w-xl p-4 bg-purple-900/20 border border-purple-500/30 animate-fade-in">
                    <CardContent className="p-0">
                         <div className="flex items-center gap-4">
                            <AvatarDisplay speaker="COACHING" isSpeaking={activeSpeaker === 'COACHING'} />
                            <p className="text-center text-purple-300">{latestCoachingTip}</p>
                         </div>
                    </CardContent>
                </Card>
            )}
            <AvatarDisplay speaker="USER" isSpeaking={isListening} isListening={canSpeak && !isListening} />
        </div>

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
              {getFooterText()}
            </p>
        </div>
    </div>
  );
}
