'use client';

import { useState } from 'react';
import type { Analysis, JudgeProfile, LawyerProfile } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, ThumbsDown, Scale, ShieldQuestion, ChevronRight, MessageCircle, HelpCircle, Gavel, Users, Star, Briefcase, FileText } from 'lucide-react';
import { LegalCaseModal } from './LegalCaseModal';
import ReactMarkdown from 'react-markdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '../Spinner';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

const DetailSection = ({ detailedAnalysis, isGeneratingDetails }: { detailedAnalysis?: string; isGeneratingDetails: boolean }) => {
  if (detailedAnalysis) {
    return (
      <div className="mt-4 prose prose-invert prose-sm max-w-none prose-p:text-foreground prose-ul:text-foreground prose-li:text-foreground">
        <ReactMarkdown>{detailedAnalysis}</ReactMarkdown>
      </div>
    );
  }
  if (isGeneratingDetails) {
    return (
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
        <Spinner size="sm" />
        <span>Generating detailed analysis...</span>
      </div>
    );
  }
  return <p className="mt-4 text-sm text-muted-foreground">Detailed analysis will be generated shortly.</p>;
};

const getVulnerabilityColor = (score: number) => {
  if (score >= 8) return 'border-destructive text-destructive';
  if (score >= 5) return 'border-foreground/40 text-foreground/80';
  return 'border-foreground/20 text-foreground/60';
};

const getCounterRebuttalStrengthColor = (strength: "High" | "Medium" | "Low") => {
  switch (strength) {
    case "High": return "text-destructive";
    case "Medium": return "text-foreground/80";
    case "Low": return "text-foreground/60";
    default: return "text-muted-foreground";
  }
};

type AnalysisDashboardProps = {
  analysis: Analysis;
  isGeneratingDetails: boolean;
};

export function AnalysisDashboard({ analysis, isGeneratingDetails }: AnalysisDashboardProps) {
  const [modalCase, setModalCase] = useState<string | null>(null);

  const defaultOpen = ['advocate'];
  if (analysis.judgeProfile) defaultOpen.push('judge');
  if (analysis.lawyerProfiles && analysis.lawyerProfiles.length > 0) defaultOpen.push('counsel');


  return (
    <div className="animate-fade-in space-y-4">
      <Accordion type="multiple" className="w-full space-y-4" defaultValue={defaultOpen}>
        
        {analysis.judgeProfile && (
          <AccordionItem value="judge" className="border-0">
            <div className="bg-card rounded-lg border">
              <AccordionTrigger className="p-6 hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Gavel className="h-6 w-6 text-yellow-300" />
                  </div>
                  <h2 className="font-headline text-2xl text-yellow-300">Judicial Profile</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                 <Card className="bg-background/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="text-xl text-foreground">{analysis.judgeProfile.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{analysis.judgeProfile.profileSummary}</p>
                        <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-yellow-300"/> Known Preferences</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                                {(analysis.judgeProfile.knownPreferences || []).map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                         <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-yellow-300"/> Relevant Past Cases</h4>
                            <div className="space-y-2">
                                {(analysis.judgeProfile.pastCases || []).map((item, index) => (
                                    <div key={index} className="p-2 bg-secondary/30 rounded-md">
                                        <p className="font-semibold text-foreground/90">{item.caseName}</p>
                                        <p className="text-xs text-muted-foreground">{item.summary}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                 </Card>
              </AccordionContent>
            </div>
          </AccordionItem>
        )}
        
        {analysis.lawyerProfiles && analysis.lawyerProfiles.length > 0 && (
          <AccordionItem value="counsel" className="border-0">
            <div className="bg-card rounded-lg border">
              <AccordionTrigger className="p-6 hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Users className="h-6 w-6 text-green-400" />
                  </div>
                  <h2 className="font-headline text-2xl text-green-400">Opposing Counsel Dossier</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid gap-4 md:grid-cols-2">
                    {(analysis.lawyerProfiles).map((lawyer, index) => (
                        <Card key={index} className="bg-background/50 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-xl text-foreground">{lawyer.name}</CardTitle>
                                <CardContent className="text-sm text-muted-foreground p-0 pt-2">{lawyer.profileSummary}</CardContent>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-green-400"/> Case History</h4>
                                    <div className="space-y-2">
                                        {(lawyer.caseHistory || []).map((item, c_index) => (
                                            <div key={c_index} className="p-2 bg-secondary/30 rounded-md">
                                                <p className="font-semibold text-foreground/90">{item.caseName} <span className="text-xs font-normal text-muted-foreground">({item.outcome})</span></p>
                                                <p className="text-xs text-muted-foreground">Strategy: {item.strategyUsed}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-400"/> Negotiation Style</h4>
                                    <p className="text-sm text-foreground/90">{lawyer.negotiationStyle}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
              </AccordionContent>
            </div>
          </AccordionItem>
        )}

        <AccordionItem value="advocate" className="border-0">
          <div className="bg-card rounded-lg border">
            <AccordionTrigger className="p-6 hover:no-underline">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-secondary rounded-lg">
                  <Scale className="h-6 w-6 text-sky-400" />
                </div>
                <h2 className="font-headline text-2xl text-sky-400">Advocate's Brief</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Accordion type="single" collapsible className="w-full -mx-2">
                {(analysis.advocateBrief || []).map((item, index) => (
                  <AccordionItem value={`item-${index}`} key={index} className="border-b-border/50">
                    <AccordionTrigger className="hover:no-underline text-left text-foreground px-2">{item.argument}</AccordionTrigger>
                    <AccordionContent className="px-2">
                      <p className="font-semibold text-sm mb-2 text-muted-foreground">Case Citations & Relevance:</p>
                      <div className="space-y-4 mb-4">
                        {item.caseCitations && item.caseCitations.length > 0 ? (
                          item.caseCitations.map((citation, i) => (
                            <div key={i} className="pl-4 border-l-2 border-primary/30">
                              <Button variant="link" className="p-0 h-auto font-normal text-base text-blue-400 hover:text-blue-300 text-left mb-1" onClick={() => setModalCase(citation.citation)}>
                                {citation.citation}
                              </Button>
                              <p className="text-sm text-muted-foreground">{citation.relevance}</p>
                            </div>
                          ))
                        ) : <p className="text-sm text-muted-foreground pl-4 border-l-2 border-border/50">No cases cited.</p>}
                      </div>
                      <DetailSection detailedAnalysis={item.detailedAnalysis} isGeneratingDetails={isGeneratingDetails} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </div>
        </AccordionItem>

        <AccordionItem value="weaknesses" className="border-0">
          <div className="bg-card rounded-lg border">
            <AccordionTrigger className="p-6 hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary rounded-lg">
                    <ThumbsDown className="h-6 w-6 text-red-400" />
                  </div>
                  <h2 className="font-headline text-2xl text-red-400">Identified Weaknesses</h2>
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
               <Accordion type="single" collapsible className="w-full -mx-2">
                {(analysis.identifiedWeaknesses || []).map((weakness, index) => (
                    <AccordionItem value={`weakness-${index}`} key={index} className="border-b-border/50">
                      <AccordionTrigger className="hover:no-underline text-left px-2">
                        <div className="flex flex-col items-start text-left w-full">
                            <p className="font-semibold text-foreground text-left">{weakness.weakness}</p>
                            <Badge variant="outline" className={`mt-2 ${getVulnerabilityColor(weakness.vulnerabilityScore)}`}>
                              Vulnerability Score: {weakness.vulnerabilityScore}/10
                            </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2">
                          <p className="text-xs text-muted-foreground mb-4">{weakness.rationale}</p>
                          <DetailSection detailedAnalysis={weakness.detailedAnalysis} isGeneratingDetails={isGeneratingDetails}/>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
            </AccordionContent>
          </div>
        </AccordionItem>

        <AccordionItem value="synthesis" className="border-0">
            <div className="bg-card rounded-lg border">
              <AccordionTrigger className="p-6 hover:no-underline">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Lightbulb className="h-6 w-6 text-amber-400" />
                    </div>
                    <h2 className="font-headline text-2xl text-amber-400">Arbiter's Synthesis</h2>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><Lightbulb className="h-5 w-5"/>Key Vulnerabilities</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                      {(analysis.arbiterSynthesis?.keyVulnerabilities || []).map((item, index) => (
                        <li key={index}>{item.vulnerability}{item.affectedArguments && item.affectedArguments.length > 0 && (<p className="text-xs text-muted-foreground pl-2"> (Affects: {item.affectedArguments.join(', ')})</p>)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Refined Strategy</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                      {(analysis.arbiterSynthesis?.refinedStrategy || []).map((item, index) => (
                        <li key={index}>{item.recommendation} - <span className="text-muted-foreground">{item.rationale}</span></li>
                      ))}
                    </ul>
                  </div>
                  {analysis.arbiterSynthesis?.predictiveAnalysis && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Predictive Analysis</h4>
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                        <span className="text-foreground">Case Outcome Prediction</span>
                        <Popover><PopoverTrigger asChild>
                          <Button variant="outline" className="text-foreground">
                              Confidence: {Math.round(analysis.arbiterSynthesis.predictiveAnalysis.confidenceLevel * 100)}%
                              <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground" />
                          </Button>
                        </PopoverTrigger><PopoverContent className="w-80">
                          <div className="grid gap-4"><div className="space-y-2">
                              <h4 className="font-medium leading-none">Analysis Rationale</h4>
                              <p className="text-sm text-muted-foreground">{analysis.arbiterSynthesis.predictiveAnalysis.outcomePrediction}</p>
                          </div></div>
                        </PopoverContent></Popover>
                    </div>
                  </div>
                )}
                </div>
              </AccordionContent>
            </div>
        </AccordionItem>

        <AccordionItem value="playbook" className="border-0">
          <div className="bg-card rounded-lg border">
            <AccordionTrigger className="p-6 hover:no-underline">
              <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary rounded-lg">
                    <ShieldQuestion className="h-6 w-6 text-violet-400" />
                  </div>
                  <h2 className="font-headline text-2xl text-violet-400">Adversarial Playbook</h2>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-violet-400 mb-2">Opponent Counsel Analysis</h4>
                    <p className="text-sm text-foreground">{analysis.adversarialPlaybook?.opponentCounselAnalysis}</p>
                  </div>
                  <Accordion type="multiple" className="w-full -mx-2">
                    {(analysis.adversarialPlaybook?.potentialCounterArguments || []).map((item, index) => (
                      <AccordionItem value={`counter-${index}`} key={index} className="border-b-border/50">
                          <AccordionTrigger className="hover:no-underline text-left text-foreground px-2">{item.counterArgument}</AccordionTrigger>
                          <AccordionContent className="px-2">
                            <div className="pl-4 border-l-2 border-primary/30 space-y-4">
                              {(item.rebuttals || []).map((rebuttal, rIndex) => (
                                <div key={rIndex}>
                                  <p className="font-semibold text-sm text-muted-foreground flex items-center"><MessageCircle className="h-4 w-4 mr-2" /> Our Rebuttal</p>
                                  <p className="text-sm mt-1 text-foreground">{rebuttal.rebuttal}</p>

                                  {rebuttal.potentialCounterRebuttals && rebuttal.potentialCounterRebuttals.length > 0 && (
                                    <div className="mt-3 pl-4 border-l-2 border-border/70">
                                      <p className="font-semibold text-sm text-muted-foreground mb-2">Potential Counter-Rebuttals:</p>
                                      <ul className="space-y-2 text-sm">
                                        {rebuttal.potentialCounterRebuttals.map((counter, cIndex) => (
                                          <li key={cIndex} className="flex items-start gap-2">
                                            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                            <div><span className={getCounterRebuttalStrengthColor(counter.strength)}>({counter.strength} Strength)</span><span className="text-muted-foreground ml-1">{counter.counterRebuttal}</span></div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {rebuttal.citations && rebuttal.citations.length > 0 && (
                                    <div className="mt-3">
                                      <p className="font-semibold text-xs text-muted-foreground mb-1">Citations:</p>
                                      <div className="flex flex-col items-start space-y-1">
                                          {rebuttal.citations.map((citation, cIndex) => (<Button key={cIndex} variant="link" className="p-0 h-auto font-normal text-xs text-blue-400 hover:text-blue-300" onClick={() => setModalCase(citation)}>{citation}</Button>))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>

      {modalCase && <LegalCaseModal caseName={modalCase} onClose={() => setModalCase(null)} />}
    </div>
  );
}
