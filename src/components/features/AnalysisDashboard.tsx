'use client';

import { useState } from 'react';
import type { Analysis } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, ThumbsDown, Scale, ShieldQuestion, ChevronRight, MessageCircle, HelpCircle, X } from 'lucide-react';
import { LegalCaseModal } from './LegalCaseModal';
import ReactMarkdown from 'react-markdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '../Spinner';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

// --- Re-usable components from the old dashboard that I will need inside the modal ---

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
};


// --- New AnalysisDashboard implementation ---

type AnalysisDashboardProps = {
  analysis: Analysis;
  isGeneratingDetails: boolean;
};

export function AnalysisDashboard({ analysis, isGeneratingDetails }: AnalysisDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalCase, setModalCase] = useState<string | null>(null);

  const cardData = [
    {
      id: 'advocate',
      title: "Advocate's Brief",
      icon: Scale,
      color: 'text-sky-400',
      highlight: `${analysis.advocateBrief?.length || 0} key arguments identified.`,
      content: analysis.advocateBrief,
    },
    {
      id: 'weaknesses',
      title: 'Identified Weaknesses',
      icon: ThumbsDown,
      color: 'text-red-400',
      highlight: `${analysis.identifiedWeaknesses?.length || 0} potential weaknesses found.`,
      content: analysis.identifiedWeaknesses,
    },
    {
      id: 'synthesis',
      title: "Arbiter's Synthesis",
      icon: Lightbulb,
      color: 'text-amber-400',
      highlight: 'High-level strategy & predictive analysis.',
      content: analysis.arbiterSynthesis,
    },
    {
      id: 'playbook',
      title: 'Adversarial Playbook',
      icon: ShieldQuestion,
      color: 'text-purple-400',
      highlight: 'Counter-arguments & opponent analysis.',
      content: analysis.adversarialPlaybook,
    },
  ];
  
  const selectedCard = cardData.find(card => card.id === selectedId);

  const renderDetailContent = () => {
    if (!selectedCard) return null;
    
    switch (selectedCard.id) {
      case 'advocate':
        return (
          <Accordion type="single" collapsible className="w-full">
            {(selectedCard.content as Analysis['advocateBrief']).map((item, index) => (
              <AccordionItem value={`item-${index}`} key={index} className="border-border/50">
                <AccordionTrigger className="hover:no-underline text-left text-foreground">{item.argument}</AccordionTrigger>
                <AccordionContent>
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
        );
      case 'weaknesses':
        return (
          <Accordion type="single" collapsible className="w-full">
            {(selectedCard.content as Analysis['identifiedWeaknesses']).map((weakness, index) => (
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
                      <DetailSection detailedAnalysis={weakness.detailedAnalysis} isGeneratingDetails={isGeneratingDetails}/>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        );
      case 'synthesis':
        const synthesis = selectedCard.content as Analysis['arbiterSynthesis'];
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><Lightbulb className="h-5 w-5"/>Key Vulnerabilities</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-foreground">
                {synthesis.keyVulnerabilities?.map((item, index) => (
                  <li key={index}>{item.vulnerability}{item.affectedArguments && item.affectedArguments.length > 0 && (<p className="text-xs text-muted-foreground pl-2"> (Affects: {item.affectedArguments.join(', ')})</p>)}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Refined Strategy</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                {synthesis.refinedStrategy?.map((item, index) => (
                  <li key={index}>{item.recommendation} - <span className="text-muted-foreground">{item.rationale}</span></li>
                ))}
              </ul>
            </div>
            {synthesis.predictiveAnalysis && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-400"><TrendingUp className="h-5 w-5"/>Predictive Analysis</h4>
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-amber-500/20">
                  <span className="text-foreground">Case Outcome Prediction</span>
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className="text-foreground">
                        Confidence: {Math.round(synthesis.predictiveAnalysis.confidenceLevel * 100)}%
                        <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger><PopoverContent className="w-80">
                    <div className="grid gap-4"><div className="space-y-2">
                        <h4 className="font-medium leading-none">Analysis Rationale</h4>
                        <p className="text-sm text-muted-foreground">{synthesis.predictiveAnalysis.outcomePrediction}</p>
                    </div></div>
                  </PopoverContent></Popover>
              </div>
            </div>
          )}
          </div>
        );
      case 'playbook':
        const playbook = selectedCard.content as Analysis['adversarialPlaybook'];
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-purple-200 mb-2">Opponent Counsel Analysis</h4>
              <p className="text-sm text-foreground">{playbook.opponentCounselAnalysis}</p>
            </div>
            <Accordion type="multiple" className="w-full">
              {playbook.potentialCounterArguments?.map((item, index) => (
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in">
        <LayoutGroup>
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cardData.map(card => {
                const Icon = card.icon;
                return (
                <motion.div
                    layoutId={card.id}
                    key={card.id}
                    onClick={() => setSelectedId(card.id)}
                    className="p-6 bg-card rounded-lg cursor-pointer hover:border-primary/50 border border-transparent transition-colors group"
                    whileHover={{ y: -5 }}
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-2 bg-secondary rounded-lg">
                           <Icon className={`h-6 w-6 ${card.color}`} />
                        </div>
                        <motion.h2 className={`font-headline text-2xl ${card.color}`}>{card.title}</motion.h2>
                    </div>
                    <motion.p className="text-muted-foreground">{card.highlight}</motion.p>
                </motion.div>
                );
            })}
            </motion.div>

            <AnimatePresence>
            {selectedCard && (
                <motion.div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 sm:p-8 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedId(null)}
                >
                    <motion.div
                        layoutId={selectedCard.id}
                        className="bg-card rounded-lg w-full max-w-4xl h-[90vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="p-2 bg-secondary rounded-lg">
                                 <selectedCard.icon className={`h-6 w-6 ${selectedCard.color}`} />
                               </div>
                               <CardTitle className={`font-headline text-2xl ${selectedCard.color}`}>{selectedCard.title}</CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                                <X className="h-5 w-5" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto pr-2">
                           {renderDetailContent()}
                        </CardContent>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </LayoutGroup>

        {modalCase && <LegalCaseModal caseName={modalCase} onClose={() => setModalCase(null)} />}
    </div>
  );
}
