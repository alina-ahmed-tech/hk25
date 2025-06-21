'use client';

import type { Analysis } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, ThumbsDown, Scale, ShieldQuestion, ChevronRight, MessageCircle, HelpCircle } from 'lucide-react';
import { LegalCaseModal } from './LegalCaseModal';
import ReactMarkdown from 'react-markdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

type AnalysisDashboardProps = {
  analysis: Analysis;
  strategy?: string;
};

export function AnalysisDashboard({ analysis, strategy }: AnalysisDashboardProps) {
  const [modalCase, setModalCase] = useState<string | null>(null);

  const getVulnerabilityColor = (score: number) => {
    if (score >= 8) return 'border-destructive text-destructive';
    if (score >= 5) return 'border-orange-400/50 text-orange-300';
    return 'border-yellow-400/50 text-yellow-300';
  };
  
  const getCounterRebuttalStrengthColor = (strength: "High" | "Medium" | "Low") => {
    switch (strength) {
      case "High": return "text-destructive";
      case "Medium": return "text-orange-400";
      case "Low": return "text-yellow-400";
      default: return "text-muted-foreground";
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in">
      {/* Advocate's Brief */}
      <Card className="bg-card backdrop-blur-lg border shadow-xl shadow-black/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg"><Scale className="h-6 w-6 text-sky-400" /></div>
            <CardTitle className="font-headline text-2xl text-sky-400">Advocate's Brief</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {analysis.advocateBrief.map((item, index) => (
              <AccordionItem value={`item-${index}`} key={index} className="border-border/50">
                <AccordionTrigger className="hover:no-underline text-left text-foreground">{item.argument}</AccordionTrigger>
                <AccordionContent>
                  <p className="font-semibold text-sm mb-2 text-muted-foreground">Case Citations & Relevance:</p>
                  <div className="space-y-4 mb-4">
                    {item.caseCitations && item.caseCitations.length > 0 ? (
                       item.caseCitations.map((citation, i) => (
                          <div key={i} className="pl-4 border-l-2 border-primary/30">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-normal text-base text-blue-400 hover:text-blue-300 text-left mb-1"
                              onClick={() => setModalCase(citation.citation)}
                            >
                              {citation.citation}
                            </Button>
                            <p className="text-sm text-muted-foreground">{citation.relevance}</p>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground pl-4 border-l-2 border-border/50">No cases cited.</p>
                    )}
                  </div>
                   
                  <div className="mt-4 prose prose-invert prose-sm max-w-none prose-p:text-foreground prose-ul:text-foreground prose-li:text-foreground">
                    {item.detailedAnalysis ? (
                        <ReactMarkdown>{item.detailedAnalysis}</ReactMarkdown>
                    ) : (
                        <p className="text-sm text-muted-foreground">Detailed analysis was not generated for this item.</p>
                    )}
                  </div>

                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Identified Weaknesses */}
      <Card className="bg-card backdrop-blur-lg border shadow-xl shadow-black/20">
        <CardHeader>
           <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg"><ThumbsDown className="h-6 w-6 text-red-400" /></div>
            <CardTitle className="font-headline text-2xl text-red-400">Identified Weaknesses</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {analysis.identifiedWeaknesses.map((weakness, index) => (
              <AccordionItem value={`weakness-${index}`} key={index} className="border-border/50">
                <AccordionTrigger className="hover:no-underline text-left">
                  <div className="flex flex-col items-start text-left w-full">
                      <p className="font-semibold text-foreground text-left">{weakness.weakness}</p>
                      <Badge variant="outline" className={`mt-2 ${getVulnerabilityColor(weakness.vulnerabilityScore)}`}>
                        Vulnerability Score: {weakness.vulnerabilityScore}/10
                      </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                    <p className="text-xs text-muted-foreground mb-4">{weakness.rationale}</p>
                    
                    <div className="prose prose-invert prose-sm max-w-none prose-p:text-foreground prose-ul:text-foreground prose-li:text-foreground">
                        {weakness.detailedAnalysis ? (
                            <ReactMarkdown>{weakness.detailedAnalysis}</ReactMarkdown>
                        ) : (
                            <p className="text-sm text-muted-foreground">Detailed analysis was not generated for this item.</p>
                        )}
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Arbiter's Synthesis */}
      <Card className="bg-card backdrop-blur-lg border shadow-xl shadow-black/20">
        <CardHeader>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-secondary rounded-lg"><Lightbulb className="h-6 w-6 text-amber-400" /></div>
            <CardTitle className="font-headline text-2xl text-amber-400">Arbiter's Synthesis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><Lightbulb className="h-5 w-5"/>Key Vulnerabilities</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
              {analysis.arbiterSynthesis.keyVulnerabilities?.map((item, index) => (
                <li key={index}>
                  {item.vulnerability}
                   {item.affectedArguments && item.affectedArguments.length > 0 && (
                     <p className="text-xs text-muted-foreground pl-2"> (Affects: {item.affectedArguments.join(', ')})</p>
                   )}
                </li>
              ))}
            </ul>
          </div>
           <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Refined Strategy</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
              {analysis.arbiterSynthesis.refinedStrategy?.map((item, index) => (
                <li key={index}>{item.recommendation} - <span className="text-muted-foreground">{item.rationale}</span></li>
              ))}
            </ul>
          </div>
          {analysis.arbiterSynthesis.predictiveAnalysis && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Predictive Analysis</h4>
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-amber-500/20">
                  <span className="text-foreground">Case Outcome Prediction</span>
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="outline" className="text-foreground">
                              Confidence: {Math.round(analysis.arbiterSynthesis.predictiveAnalysis.confidenceLevel * 100)}%
                              <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground" />
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                          <div className="grid gap-4">
                              <div className="space-y-2">
                                  <h4 className="font-medium leading-none">Analysis Rationale</h4>
                                  <p className="text-sm text-muted-foreground">
                                      {analysis.arbiterSynthesis.predictiveAnalysis.outcomePrediction}
                                  </p>
                              </div>
                          </div>
                      </PopoverContent>
                  </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adversarial Playbook */}
      <Card className="bg-card backdrop-blur-lg border shadow-xl shadow-black/20 lg:col-span-2 xl:col-span-1">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary rounded-lg"><ShieldQuestion className="h-6 w-6 text-purple-400" /></div>
                <CardTitle className="font-headline text-2xl text-purple-400">Adversarial Playbook</CardTitle>
            </div>
        </CardHeader>
        <CardContent id="playbook-content">
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-purple-200 mb-2">Opponent Counsel Analysis</h4>
                    <p className="text-sm text-foreground">{analysis.adversarialPlaybook.opponentCounselAnalysis}</p>
                </div>
                <Accordion type="multiple" className="w-full">
                    {analysis.adversarialPlaybook.potentialCounterArguments?.map((item, index) => (
                      <AccordionItem value={`counter-${index}`} key={index} className="border-border/50">
                          <AccordionTrigger className="hover:no-underline text-left text-foreground">{item.counterArgument}</AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-4 border-l-2 border-purple-400/30 space-y-4">
                              {item.rebuttals?.map((rebuttal, rIndex) => (
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
                                            <div>
                                              <span className={getCounterRebuttalStrengthColor(counter.strength)}>({counter.strength} Strength)</span>
                                              <span className="text-muted-foreground ml-1">{counter.counterRebuttal}</span>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {rebuttal.citations && rebuttal.citations.length > 0 && (
                                    <div className="mt-3">
                                      <p className="font-semibold text-xs text-muted-foreground mb-1">Citations:</p>
                                      <div className="flex flex-col items-start space-y-1">
                                          {rebuttal.citations.map((citation, cIndex) => (
                                              <Button
                                                  key={cIndex}
                                                  variant="link"
                                                  className="p-0 h-auto font-normal text-xs text-blue-400 hover:text-blue-300"
                                                  onClick={() => setModalCase(citation)}
                                              >
                                                  {citation}
                                              </Button>
                                          ))}
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
        </CardContent>
      </Card>


      {modalCase && <LegalCaseModal caseName={modalCase} onClose={() => setModalCase(null)} />}
    </div>
  );
}
