'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Project } from '@/lib/types';
import type { SimulationState } from '@/lib/simulation-types';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/hooks/use-toast';
import { SimulationClient } from '@/components/features/simulation/SimulationClient';
import { VoiceSimulationClient } from '@/components/features/simulation/VoiceSimulationClient';
import { Card } from '@/components/ui/card';
import { Mic, Type } from 'lucide-react';
import { cn } from '@/lib/utils';


type SimulationMode = 'choice' | 'text' | 'voice';

export default function SimulationPage() {
  const { id: projectId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<SimulationMode>('choice');

  useEffect(() => {
    if (!user || !projectId) {
      router.push('/dashboard');
      return;
    }

    const fetchProjectData = async () => {
      setLoading(true);

      if ((projectId as string).startsWith('local-')) {
        const localProjectJSON = sessionStorage.getItem('localProject');
        if (localProjectJSON) {
            try {
                const projectData: Project = JSON.parse(localProjectJSON);
                if (projectData.id === projectId) {
                    if (!projectData.strategy || !projectData.analysis) {
                        toast({ title: 'Cannot start simulation', description: 'Project analysis must be complete before starting a simulation.', variant: 'destructive' });
                        router.push(`/project/${projectId}`);
                        return;
                    }
                    projectData.createdAt = new Date(projectData.createdAt as string);
                    setProject(projectData);
                    setLoading(false);
                    return; 
                }
            } catch (e) {
                 console.error("Failed to parse local project from sessionStorage", e);
            }
        }
        toast({ title: 'Error', description: 'Could not load local project data session. Please return to the dashboard.', variant: 'destructive' });
        router.push('/dashboard');
        return;
      }
      
      if (!db) {
        toast({ title: "Error", description: "Firebase is not configured for this project.", variant: "destructive" });
        router.push('/dashboard');
        return;
      }
      
      const projectDocRef = doc(db, 'users', user.uid, projectId as string);
      try {
        const docSnap = await getDoc(projectDocRef);
        if (docSnap.exists()) {
          const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
          if (!projectData.strategy || !projectData.analysis) {
             toast({ title: 'Cannot start simulation', description: 'Project analysis must be complete before starting a simulation.', variant: 'destructive' });
             router.push(`/project/${projectId}`);
             return;
          }
          setProject(projectData);
        } else {
          toast({ title: 'Error', description: 'Project not found.', variant: 'destructive' });
          router.push('/dashboard');
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({ title: 'Error', description: 'Failed to fetch project data.', variant: 'destructive' });
      }
      setLoading(false);
    };

    fetchProjectData();
  }, [user, projectId, toast, router]);

  const handleSaveState = async (simulationState: SimulationState) => {
    if (!user || !project) return;
     if (project.id.startsWith('local-')) {
        const projectToStore = {
            ...project,
            simulationState,
            createdAt: project.createdAt?.toISOString ? project.createdAt.toISOString() : new Date().toISOString(),
        };
        sessionStorage.setItem('localProject', JSON.stringify(projectToStore));
        return;
     }

    const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
    try {
      await updateDoc(projectRef, { simulationState });
    } catch (error) {
      console.error("Failed to save simulation state:", error);
      toast({ title: 'Error', description: 'Failed to save simulation progress.', variant: 'destructive' });
    }
  };

  const renderChoiceScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="font-headline text-4xl mb-4 text-center">Choose Simulation Mode</h1>
        <p className="text-muted-foreground mb-8 text-center max-w-2xl">Select how you want to interact with the virtual hearing. You can use the standard text-based interface or the immersive, voice-driven experience.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <Card 
                onClick={() => setMode('text')}
                className={cn('p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-primary/80 group')}
            >
                <Type className="h-16 w-16 mb-4 text-primary transition-transform group-hover:scale-110"/>
                <h2 className="font-headline text-2xl mb-2">Text-Based</h2>
                <p className="text-muted-foreground">The classic interface. Read the transcript and type your responses.</p>
            </Card>
            <Card 
                onClick={() => setMode('voice')}
                className={cn('p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-primary/80 group')}
            >
                <Mic className="h-16 w-16 mb-4 text-primary transition-transform group-hover:scale-110"/>
                <h2 className="font-headline text-2xl mb-2">Voice-Based</h2>
                <p className="text-muted-foreground">An immersive experience. Listen to the hearing and speak your responses.</p>
            </Card>
        </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      );
    }

    if (!project) {
       return <div className="flex h-screen items-center justify-center text-destructive">Project not found or invalid.</div>;
    }
    
    switch (mode) {
        case 'choice':
            return renderChoiceScreen();
        case 'text':
            return <SimulationClient project={project} onSaveState={handleSaveState} />;
        case 'voice':
            return <VoiceSimulationClient project={project} onSaveState={handleSaveState} />;
        default:
            return renderChoiceScreen();
    }
  }
  
  return <>{renderContent()}</>;
}
