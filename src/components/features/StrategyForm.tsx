'use client';

import { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Lightbulb, Check, X, Trash2, PlusCircle, UploadCloud, File as FileIcon } from 'lucide-react';
import { Spinner } from '../Spinner';
import { useDebounce } from '@/hooks/use-debounce';
import { optimizePrompt } from '@/lib/actions';
import { getAIErrorMessage } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type StrategyFormProps = {
  onSubmit: (data: {
    strategy: string;
    areaOfLaw: string;
    judgeName: string;
    opposingCounsel: string[];
    files: File[];
  }) => void;
  isLoading: boolean;
};

const areasOfLaw = [
    "Administrative Law", "Admiralty Law", "Antitrust Law", "Appellate Law",
    "Arbitration", "Aviation Law", "Banking Law", "Bankruptcy Law",
    "Business Law", "Civil Rights Law", "Commercial Law", "Communications Law",
    "Constitutional Law", "Construction Law", "Consumer Law", "Contract Law",
    "Corporate Law", "Criminal Law", "Cybersecurity Law", "Education Law",
    "Elder Law", "Energy Law", "Entertainment Law", "Environmental Law",
    "Family Law", "Finance Law", "Government Law", "Health Law",
    "Immigration Law", "Insurance Law", "Intellectual Property Law", "International Law",
    "Labor and Employment Law", "Litigation", "Media Law", "Medical Malpractice",
    "Mergers and Acquisitions", "Military Law", "Personal Injury Law", "Privacy Law",
    "Product Liability Law", "Public Interest Law", "Real Estate Law", "Securities Law",
    "Sports Law", "Tax Law", "Torts", "Transportation Law", "Trusts and Estates Law", "Water Law"
];


export function StrategyForm({ onSubmit, isLoading }: StrategyFormProps) {
  const { toast } = useToast();
  const [strategy, setStrategy] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState<string | null>(null);
  
  const [areaOfLaw, setAreaOfLaw] = useState('');
  const [judgeName, setJudgeName] = useState('');
  const [opposingCounsel, setOpposingCounsel] = useState<string[]>(['']);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedStrategy = useDebounce(strategy, 2000);

  useEffect(() => {
    if (debouncedStrategy.length > 50) {
      const getSuggestion = async () => {
        setIsOptimizing(true);
        try {
          const result = await optimizePrompt({ rawPrompt: debouncedStrategy });
          setSuggestedPrompt(result.suggestedPrompt);
        } catch (error) {
          console.error("Error optimizing prompt:", error);
          // Don't bother user with this error, just fail silently.
        } finally {
          setIsOptimizing(false);
        }
      };
      getSuggestion();
    } else {
        setSuggestedPrompt(null);
    }
  }, [debouncedStrategy]);

  const handleAddCounsel = () => {
    setOpposingCounsel([...opposingCounsel, '']);
  };

  const handleRemoveCounsel = (index: number) => {
    if (opposingCounsel.length > 1) {
        setOpposingCounsel(opposingCounsel.filter((_, i) => i !== index));
    } else {
        setOpposingCounsel(['']);
    }
  };

  const handleCounselChange = (index: number, name: string) => {
    const newCounsel = [...opposingCounsel];
    newCounsel[index] = name;
    setOpposingCounsel(newCounsel);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const onFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (strategy.trim() && areaOfLaw) {
      onSubmit({
        strategy: strategy.trim(),
        areaOfLaw,
        judgeName: judgeName.trim(),
        opposingCounsel: opposingCounsel.map(n => n.trim()).filter(n => n),
        files: files,
      });
    } else {
      toast({
        title: 'Missing Information',
        description: 'Please provide the case strategy and select an area of law.',
        variant: 'destructive',
      });
    }
  };

  const useSuggestion = () => {
    if (suggestedPrompt) {
        setStrategy(suggestedPrompt);
        setSuggestedPrompt(null);
        toast({ title: 'Prompt updated', description: 'The suggested prompt has been applied.' });
    }
  }

  const isButtonDisabled = isLoading || isOptimizing || !strategy.trim() || !areaOfLaw;

  return (
    <Card className="w-full max-w-4xl mx-auto bg-transparent border-0 shadow-none animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="font-headline text-4xl text-foreground">Submit Your Case Details</CardTitle>
        <CardDescription className="text-lg pt-2 text-slate-400">
          Provide your case facts, key players, and initial strategy to begin the analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="strategy-textarea" className="text-lg">Case Strategy & Facts</Label>
            <Textarea
                id="strategy-textarea"
                placeholder="Describe your case facts, legal arguments, and desired outcomes..."
                className="min-h-[250px] text-base bg-slate-900/60 backdrop-blur-sm focus-visible:ring-1 border-slate-800"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Documents or Images (Optional)</Label>
            <div 
              className="relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer border-border/50 hover:border-primary/50 bg-slate-900/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={onFileDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <UploadCloud className="w-10 h-10 mb-2 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG, etc.</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                disabled={isLoading}
              />
            </div>
            {files.length > 0 && (
              <div className="pt-4 space-y-2">
                <h4 className="text-sm font-medium text-foreground">Attached Files:</h4>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary">
                      <div className="flex items-center gap-2 truncate">
                        <FileIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                  <Label htmlFor="area-of-law">Area of Law</Label>
                   <Select value={areaOfLaw} onValueChange={setAreaOfLaw} disabled={isLoading}>
                      <SelectTrigger id="area-of-law" className="bg-slate-900/60 border-slate-800">
                        <SelectValue placeholder="Select the relevant area of law..." />
                      </SelectTrigger>
                      <SelectContent>
                        {areasOfLaw.map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="judge-name">Judge / Arbiter Name (Optional)</Label>
                  <Input 
                    id="judge-name"
                    placeholder="e.g., Hon. John Doe"
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    className="bg-slate-900/60 border-slate-800"
                    disabled={isLoading}
                  />
              </div>
          </div>

          <div className="space-y-2">
              <Label>Opposing Counsel (Optional)</Label>
              <div className="space-y-2">
                  {opposingCounsel.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <Input 
                            placeholder={`e.g., Jane Smith`}
                            value={name}
                            onChange={(e) => handleCounselChange(index, e.target.value)}
                            className="bg-slate-900/60 border-slate-800"
                            disabled={isLoading}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveCounsel(index)} disabled={isLoading}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                  ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddCounsel} disabled={isLoading}>
                  <PlusCircle className="mr-2"/> Add Another Counsel
              </Button>
          </div>

          {suggestedPrompt && (
            <div className="p-3 bg-secondary rounded-md flex items-center justify-between gap-4 animate-fade-in">
                <p className="text-sm text-muted-foreground">We've suggested an optimized prompt for better results.</p>
                <div className="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={useSuggestion}><Check className="mr-2"/> Use Suggested</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestedPrompt(null)}><X className="mr-2"/> Keep Original</Button>
                </div>
            </div>
          )}

          <div className="flex justify-center items-center gap-4 pt-4">
            <Button type="submit" disabled={isButtonDisabled} size="lg">
              {isLoading ? (
                <>
                  <Spinner className="mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate Analysis
                </>
              )}
            </Button>
            <HoverCard>
                <HoverCardTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className={isOptimizing ? 'animate-pulse' : ''}>
                        <Lightbulb className={`h-5 w-5 ${suggestedPrompt ? 'text-amber-400' : 'text-muted-foreground'}`}/>
                    </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                    <h4 className="font-semibold text-foreground mb-2">Prompt Optimization</h4>
                    <p className="text-sm text-muted-foreground">
                        {isOptimizing ? "Optimizing your prompt..." : suggestedPrompt ? "Hover over the suggestion bar to see the optimized version." : "Type more than 50 characters and pause for an AI-powered prompt suggestion to appear."}
                    </p>
                    {suggestedPrompt && (
                        <div className="mt-4 p-2 bg-secondary rounded-md max-h-40 overflow-y-auto">
                            <p className="text-xs text-foreground whitespace-pre-wrap">{suggestedPrompt}</p>
                        </div>
                    )}
                </HoverCardContent>
            </HoverCard>

          </div>
        </form>
      </CardContent>
    </Card>
  );
}
