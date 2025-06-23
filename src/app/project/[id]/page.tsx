
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Project, ActionItem, ChatMessage, Analysis } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/Spinner';
import { StrategyForm } from '@/components/features/StrategyForm';
import { ThinkingAnimation } from '@/components/features/ThinkingAnimation';
import { AnalysisDashboard } from '@/components/features/AnalysisDashboard';
import { ActionChecklist } from '@/components/features/ActionChecklist';
import { ChatWindow } from '@/components/features/ChatWindow';
import { ScopedChatDialog } from '@/components/features/ScopedChatDialog';
import { ActionPlanDraftDialog } from '@/components/features/ActionPlanDraftDialog';
import { DocumentGenerationButton } from '@/components/features/DocumentGenerationButton';
import { generateAnalysis, generateActionPlan, generateProjectName, generateAllDeepDives, generateRefinedStrategy, refineStrategyText } from '@/lib/actions';
import { getAIErrorMessage } from '@/lib/utils';
import { MessageSquare, ListTodo, Pencil, Rocket, ChevronRight, FileDown, Wand2, PenSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type PageState = 'form' | 'thinking' | 'dashboard';

export default function ProjectPage() {
  const { id: projectIdParams } = useParams();
  const projectId = Array.isArray(projectIdParams) ? projectIdParams[0] : projectIdParams;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const isNewProject = projectId === 'new';

  const [project, setProject] = useState<Project | null>(null);
  const [pageState, setPageState] = useState<PageState>(isNewProject ? 'form' : 'thinking');
  const [loading, setLoading] = useState(!isNewProject);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [isChatOpen, setChatOpen] = useState(false);
  const [scopedChatItem, setScopedChatItem] = useState<ActionItem | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [draftActionPlan, setDraftActionPlan] = useState<string[] | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Final Strategy feature
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [strategyDraft, setStrategyDraft] = useState('');
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (isNewProject) {
      setLoading(false);
      setPageState('form');
      setProject(null);
      return;
    }

    const loadProjectData = async () => {
      // Local mode
      if (projectId.startsWith('local-')) {
          setLoading(true);
          const localDataKey = `pending-project-${projectId}`;
          const localDataJSON = sessionStorage.getItem(localDataKey);
          if (localDataJSON) {
              const projectData: Project = JSON.parse(localDataJSON);
              projectData.createdAt = new Date(projectData.createdAt as any);
              setProject(projectData);
              setProjectName(projectData.name);
              setPageState(projectData.analysis ? 'dashboard' : 'form');
          } else {
              toast({ title: 'Error', description: 'Local project data not found.', variant: 'destructive' });
              router.push('/dashboard');
          }
          setLoading(false);
          return;
      }
      
      // Firestore mode
      if (!user || !db) return;

      const projectRef = doc(db, 'users', user.uid, 'projects', projectId);

      const fetchAndSet = async (): Promise<boolean> => {
        try {
          const docSnap = await getDoc(projectRef);
          if (docSnap.exists()) {
            const projectData = { id: docSnap.id, ...docSnap.data() } as Project;
            if (projectData.analysis) {
              setProject(projectData);
              setProjectName(projectData.name);
              setPageState('dashboard');
              setLoading(false);
              sessionStorage.removeItem('pending-project-creation');
              return true; // Polling successful
            }
          }
        } catch (error) {
          console.error("Error fetching project:", error);
          toast({ title: 'Error', description: 'Failed to fetch project data.', variant: 'destructive' });
          setLoading(false);
          return true; // Stop polling on error
        }
        return false; // Polling not complete, continue
      };
      
      const isPending = sessionStorage.getItem('pending-project-creation') === projectId;
      if (isPending) {
        setLoading(true);
        setPageState('thinking');
        const intervalId = setInterval(async () => {
          const success = await fetchAndSet();
          if (success) {
            clearInterval(intervalId);
          }
        }, 2500);

        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            if (sessionStorage.getItem('pending-project-creation') === projectId) {
                toast({ title: "Timeout", description: "Project creation is taking longer than expected.", variant: "destructive"});
                router.push('/dashboard');
            }
        }, 60000);

        return () => {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        };
      } else {
        setLoading(true);
        await fetchAndSet();
        setLoading(false);
      }
    };
    
    loadProjectData();
  }, [projectId, isNewProject, user, db, router, toast]);

  // Effect to trigger background deep dive generation
  useEffect(() => {
    const runDeepDives = async (proj: Project) => {
        if (!proj.strategy || !proj.analysis || !user) return;
        
        setIsGeneratingDetails(true);
        try {
            const result = await generateAllDeepDives({
                legalStrategy: proj.strategy,
                initialAnalysis: proj.analysis
            });

            const updatedProject = {
                ...proj,
                analysis: result.updatedAnalysis,
                analysisStatus: 'complete' as const
            };
            setProject(updatedProject);

            if (db && !proj.id.startsWith('local-')) {
                const projectRef = doc(db, 'users', user.uid, 'projects', proj.id);
                await updateDoc(projectRef, { 
                    analysis: result.updatedAnalysis,
                    analysisStatus: 'complete'
                });
            }

        } catch (error) {
            console.error("Error generating deep dives:", error);
            toast({ title: 'Deep Dive Error', description: getAIErrorMessage(error), variant: 'destructive' });
        } finally {
            setIsGeneratingDetails(false);
        }
    };
    
    if (project?.analysisStatus === 'generating_details') {
      runDeepDives(project);
    }
  }, [project, user, db, toast]);


  const handleStrategySubmit = async (strategy: string) => {
    if (!user) return;
    setIsSubmitting(true);
    setPageState('thinking');
  
    try {
      const nameResult = await generateProjectName({ strategyText: strategy });
      const analysisResult = await generateAnalysis({ legalStrategy: strategy });
      
      const newProjectData: Project = {
        id: `local-${Date.now()}`,
        name: nameResult.projectName,
        userId: user.uid,
        strategy: strategy,
        analysis: analysisResult.analysisDashboard,
        analysisStatus: 'generating_details',
        createdAt: new Date(),
      };
      
      if (!db) {
        console.warn("Firebase not configured. Running in local mode.");
        toast({ title: "Local Mode", description: "Analysis generated. Project will not be saved." });
        const serializableProject = { ...newProjectData, createdAt: newProjectData.createdAt.toISOString() };
        sessionStorage.setItem(`pending-project-${newProjectData.id}`, JSON.stringify(serializableProject));
        router.push(`/project/${newProjectData.id}`);
        setIsSubmitting(false);
        return;
      }
      
      const projectWithTimestamp = {
        name: newProjectData.name,
        userId: newProjectData.userId,
        strategy: newProjectData.strategy,
        analysis: newProjectData.analysis,
        analysisStatus: newProjectData.analysisStatus,
        createdAt: serverTimestamp(),
      }

      const projectCollectionRef = collection(db, 'users', user.uid, 'projects');
      const newDocRef = await addDoc(projectCollectionRef, projectWithTimestamp);
      
      toast({ title: 'Success', description: 'Analysis generated. Creating project...' });
      sessionStorage.setItem('pending-project-creation', newDocRef.id);
      router.push(`/project/${newDocRef.id}`);

    } catch (error) {
      console.error("Error creating project and analysis:", error);
      toast({ title: 'Error', description: getAIErrorMessage(error), variant: 'destructive' });
      setPageState('form'); 
      setIsSubmitting(false);
    }
  };
  
  const handleCreateActionPlan = async () => {
    if (!project?.analysis) return;
    setIsCreatingPlan(true);

    try {
        const analysisText = JSON.stringify(project.analysis);
        const result = await generateActionPlan({ 
            analysisResults: analysisText,
            chatHistory: project.mainChatHistory || [],
        });
        
        setDraftActionPlan(result.actionItems);

    } catch (error) {
        console.error("Error generating action plan:", error);
        toast({ title: 'Error', description: getAIErrorMessage(error), variant: 'destructive' });
    } finally {
        setIsCreatingPlan(false);
    }
  };

  const handleConfirmActionPlan = (confirmedItems: {text: string}[]) => {
     const newActionPlan: ActionItem[] = confirmedItems.map((item, index) => ({
        id: `${Date.now()}-${index}`,
        text: item.text,
        completed: false,
        chatHistory: [],
    }));
    handleActionItemUpdate(newActionPlan);
    setDraftActionPlan(null);
    toast({ title: 'Success', description: 'Action plan saved.' });
  }
  
  const handleActionItemUpdate = async (updatedItems: ActionItem[]) => {
    if (!project || !user) return;
    
    const originalActionPlan = project.actionPlan;
    const updatedProject = { ...project, actionPlan: updatedItems };
    setProject(updatedProject);

    if (db && !project.id.startsWith('local-')) {
      const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
      try {
        await updateDoc(projectRef, { actionPlan: updatedItems });
      } catch (error) {
        console.error("Failed to update action plan:", error);
        toast({ title: 'Error', description: 'Failed to save action plan changes.', variant: 'destructive' });
        setProject({ ...project, actionPlan: originalActionPlan });
      }
    }
  };

  const handleNameSave = async () => {
    if (!project || project.name === projectName || !user) {
        setIsEditingName(false);
        return;
    }

    const originalName = project.name;
    const updatedProjectData = { ...project, name: projectName };
    setProject(updatedProjectData);
    setIsEditingName(false);

    if (db && !project.id.startsWith('local-')) {
        const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
        try {
            await updateDoc(projectRef, { name: projectName });
            toast({ title: 'Success', description: 'Project name updated.' });
        } catch (error) {
            console.error('Error updating project name:', error);
            toast({ title: 'Error', description: 'Failed to update project name.', variant: 'destructive' });
            setProject({ ...project, name: originalName });
        }
    }
  };


  const handleScopedChatItemUpdate = (updatedItem: ActionItem) => {
    if (!project || !project.actionPlan) return;
    const newActionPlan = project.actionPlan.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    );
    handleActionItemUpdate(newActionPlan);
    const currentScopedItem = scopedChatItem;
    if (currentScopedItem && currentScopedItem.id === updatedItem.id) {
        setScopedChatItem(updatedItem);
    }
  };

  const handleGenerateDraft = async () => {
    if (!project?.analysis?.arbiterSynthesis?.refinedStrategy) {
        toast({ title: 'Error', description: 'No refined strategy available to generate a draft.', variant: 'destructive' });
        return;
    }
    setIsGeneratingStrategy(true);
    try {
        const result = await generateRefinedStrategy({ recommendations: project.analysis.arbiterSynthesis.refinedStrategy });
        setStrategyDraft(result.draftStrategy);
        setIsEditingStrategy(true);
    } catch (error) {
        toast({ title: 'Error', description: getAIErrorMessage(error), variant: 'destructive' });
    } finally {
        setIsGeneratingStrategy(false);
    }
  };

  const handleSaveStrategy = async () => {
    if (!project || !user) return;

    const originalStrategy = project.finalStrategy;
    const updatedProject = { ...project, finalStrategy: strategyDraft };
    setProject(updatedProject);
    setIsEditingStrategy(false);

    if (db && !project.id.startsWith('local-')) {
        const projectRef = doc(db, 'users', user.uid, 'projects', project.id);
        try {
            await updateDoc(projectRef, { finalStrategy: strategyDraft });
            toast({ title: 'Success', description: 'Final strategy has been saved.' });
        } catch (error) {
            console.error("Failed to update final strategy:", error);
            toast({ title: 'Error', description: 'Failed to save the final strategy.', variant: 'destructive' });
            setProject({ ...project, finalStrategy: originalStrategy });
        }
    }
  };

  const handleEditClick = () => {
    if (project?.finalStrategy) {
        setStrategyDraft(project.finalStrategy);
        setIsEditingStrategy(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingStrategy(false);
    setStrategyDraft('');
  };
  
  const handleRefineWithAI = async () => {
    if (!refineInstruction.trim() || !strategyDraft.trim()) {
        toast({ title: 'Missing Information', description: 'Please provide an instruction to refine the strategy.', variant: 'destructive' });
        return;
    }
    setIsRefining(true);
    try {
        const result = await refineStrategyText({
            currentText: strategyDraft,
            instruction: refineInstruction,
        });
        setStrategyDraft(result.refinedText);
        setRefineInstruction('');
    } catch (error) {
        toast({ title: 'Error', description: getAIErrorMessage(error), variant: 'destructive' });
    } finally {
        setIsRefining(false);
    }
  };


  const renderContent = () => {
    switch (pageState) {
      case 'form':
        return <StrategyForm onSubmit={handleStrategySubmit} isLoading={isSubmitting} />;
      case 'thinking':
        return <ThinkingAnimation />;
      case 'dashboard':
        return project?.analysis && user ? (
          <div className="space-y-8">
            <AnalysisDashboard analysis={project.analysis} isGeneratingDetails={isGeneratingDetails} />
            
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl text-primary">Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <ListTodo className="h-10 w-10 text-primary mb-4" />
                        <h3 className="font-semibold text-lg mb-2 text-foreground">Create Action Plan</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                           Generate a checklist of actionable tasks based on the AI analysis and your conversation history.
                        </p>
                         <Button onClick={handleCreateActionPlan} disabled={isCreatingPlan}>
                            {isCreatingPlan ? <Spinner className="mr-2"/> : <ChevronRight className="mr-2" />}
                            {isCreatingPlan ? 'Generating...' : 'Generate Plan'}
                        </Button>
                    </div>

                     <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <Rocket className="h-10 w-10 text-primary mb-4" />
                        <h3 className="font-semibold text-lg mb-2 text-foreground">Enter Virtual Hearing</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                           Engage in a realistic, simulated hearing to test your arguments, practice cross-examination, and get real-time coaching.
                        </p>
                         <Button onClick={() => {
                             if (project) {
                                if (project.id.startsWith('local-')) {
                                    try {
                                        const serializableProject = {
                                            ...project,
                                            createdAt: project.createdAt?.toDate ? project.createdAt.toDate().toISOString() : new Date(project.createdAt).toISOString(),
                                        };
                                        sessionStorage.setItem('localProject', JSON.stringify(serializableProject));
                                    } catch (e) {
                                        console.error("Could not serialize project for sessionStorage", e);
                                        toast({ title: "Error", description: "Could not start local simulation.", variant: "destructive" });
                                        return;
                                    }
                                }
                                router.push(`/project/${project.id}/simulation`);
                            }
                        }}>
                             <ChevronRight className="mr-2" /> Start Simulation
                        </Button>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors">
                        <FileDown className="h-10 w-10 text-primary mb-4" />
                        <h3 className="font-semibold text-lg mb-2 text-foreground">Generate Documents</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                           Create professional DOCX or PDF reports from the complete case analysis.
                        </p>
                         <DocumentGenerationButton
                            projectName={project.name}
                            analysis={project.analysis}
                         />
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle className="font-headline text-2xl text-primary">Final Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                  {isEditingStrategy ? (
                      <div className="space-y-4">
                          <Textarea
                              value={strategyDraft}
                              onChange={(e) => setStrategyDraft(e.target.value)}
                              className="min-h-[300px] text-base bg-background"
                              placeholder="Refine your strategy here..."
                          />
                          <div className="p-4 border rounded-lg bg-secondary/30 space-y-2">
                              <h4 className="text-sm font-semibold text-foreground">Refine with AI</h4>
                              <div className="flex items-center gap-2">
                                  <Input
                                      value={refineInstruction}
                                      onChange={(e) => setRefineInstruction(e.target.value)}
                                      placeholder="e.g., 'Make the tone more assertive' or 'Add a point about contract law'"
                                      className="bg-background"
                                      disabled={isRefining}
                                  />
                                  <Button onClick={handleRefineWithAI} disabled={isRefining}>
                                      {isRefining ? <Spinner className="mr-2" /> : <Wand2 className="mr-2" />}
                                      Refine
                                  </Button>
                              </div>
                          </div>
                          <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                              <Button onClick={handleSaveStrategy}>Save Strategy</Button>
                          </div>
                      </div>
                  ) : project.finalStrategy ? (
                      <div className="space-y-4">
                          <div className="prose prose-invert prose-sm max-w-none prose-p:text-foreground whitespace-pre-wrap p-4 bg-background rounded-lg border">
                              {project.finalStrategy}
                          </div>
                           <div className="flex justify-end">
                              <Button variant="outline" onClick={handleEditClick}><PenSquare className="mr-2" /> Edit</Button>
                          </div>
                      </div>
                  ) : (
                      <div className="text-center p-4">
                          <p className="text-muted-foreground mb-4">Generate a detailed strategy draft based on the Arbiter's Synthesis.</p>
                          <Button onClick={handleGenerateDraft} disabled={isGeneratingStrategy}>
                              {isGeneratingStrategy ? <Spinner className="mr-2" /> : <PenSquare className="mr-2" />}
                              {isGeneratingStrategy ? 'Generating...' : 'Generate Initial Draft'}
                          </Button>
                      </div>
                  )}
              </CardContent>
            </Card>

            {project.actionPlan && (
                <ActionChecklist
                    items={project.actionPlan}
                    onUpdate={handleActionItemUpdate}
                    onDiscuss={(item) => setScopedChatItem(item)}
                />
            )}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project && !isNewProject) {
    return <div className="container py-8 text-center text-slate-400">Project could not be loaded. Please return to the dashboard.</div>;
  }

  return (
    <>
      <div className="container py-8 relative">
        {project && (
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
              {isEditingName ? (
                  <Input
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave();
                          if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      autoFocus
                      className="text-3xl font-bold font-headline text-slate-200 h-auto p-0 border-0 bg-transparent focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:ring-1"
                  />
              ) : (
                  <h2 
                      className="text-3xl font-bold font-headline text-slate-200 cursor-pointer"
                      onClick={() => setIsEditingName(true)}
                  >
                      {projectName}
                  </h2>
              )}
               <Pencil className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setIsEditingName(true)} />
          </div>
          {pageState === 'dashboard' && (
            <Button variant="outline" onClick={() => setChatOpen(true)}>
              <MessageSquare className="mr-2" /> Chat with Arbiter
            </Button>
          )}
        </div>
        )}
        
        {renderContent()}
      </div>
      
      {project && (
        <>
          <ChatWindow
            isOpen={isChatOpen}
            onOpenChange={setChatOpen}
            project={project}
            onProjectUpdate={setProject}
          />

          <ScopedChatDialog
            item={scopedChatItem}
            onClose={() => setScopedChatItem(null)}
            onUpdate={handleScopedChatItemUpdate}
          />
        </>
      )}

      {draftActionPlan && (
        <ActionPlanDraftDialog
            isOpen={!!draftActionPlan}
            onClose={() => setDraftActionPlan(null)}
            items={draftActionPlan.map(text => ({ text }))}
            onConfirm={handleConfirmActionPlan}
        />
      )}
    </>
  );
}
