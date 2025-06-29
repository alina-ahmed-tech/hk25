import {z} from 'genkit';
import type { SimulationState } from './simulation-types';

// For Adversarial Playbook
const CounterRebuttalSchema = z.object({
  counterRebuttal: z.string().describe("A potential counter-rebuttal the opposing counsel might use against our rebuttal."),
  strength: z.enum(["High", "Medium", "Low"]).describe("The estimated strength of this counter-rebuttal.")
});

const RebuttalSchema = z.object({
  rebuttal: z.string().describe('A potential rebuttal to the counter-argument.'),
  citations: z.array(z.string()).describe('Case citations to support the rebuttal. Provide an empty array if there are none.'),
  potentialCounterRebuttals: z.array(CounterRebuttalSchema).describe("A list of potential counter-rebuttals the opponent might use in response to our rebuttal. Provide an empty array if there are none.")
});

const CounterArgumentSchema = z.object({
  counterArgument: z.string().describe('A potential counter-argument the opponent might raise.'),
  rebuttals: z.array(RebuttalSchema).describe('Potential rebuttals to this counter-argument. Provide an empty array if there are none.'),
});

export const AdversarialPlaybookSchema = z.object({
  potentialCounterArguments: z.array(CounterArgumentSchema).describe('An exhaustive list of potential counter-arguments. Provide an empty array if there are none.'),
  opponentCounselAnalysis: z
    .string()
    .describe(
      "An analysis of the opposing counsel's known strategies or patterns, based on public information and past arbitration records. If no information is available, state that."
    ),
});

// NEW Schemas for Judge and Lawyer Profiles
export const GenerateJudgeProfileInputSchema = z.object({
  judgeName: z.string().describe('The full name of the judge to be profiled.'),
});
export type GenerateJudgeProfileInput = z.infer<typeof GenerateJudgeProfileInputSchema>;

export const GenerateLawyerProfileInputSchema = z.object({
  lawyerName: z.string().describe('The full name of the lawyer to be profiled.'),
});
export type GenerateLawyerProfileInput = z.infer<typeof GenerateLawyerProfileInputSchema>;

export const JudgeProfileSchema = z.object({
  name: z.string(),
  profileSummary: z.string().describe("A concise summary of the judge's judicial philosophy, temperament, and key characteristics."),
  pastCases: z.array(z.object({
    caseName: z.string(),
    summary: z.string().describe("A brief summary of the case and the judge's role or key ruling.")
  })).describe("A list of relevant past cases. Provide an empty array if none are found."),
  knownPreferences: z.array(z.string()).describe("A list of known preferences, dislikes, or judicial quirks (e.g., 'Prefers concise arguments', 'Dislikes ad hominem attacks'). Provide an empty array if none are found."),
});

export const LawyerProfileSchema = z.object({
  name: z.string(),
  profileSummary: z.string().describe("A concise summary of the lawyer's professional style, reputation, and strategic tendencies."),
  caseHistory: z.array(z.object({
    caseName: z.string(),
    outcome: z.string().describe("The outcome of the case (e.g., 'Win', 'Loss', 'Settlement')."),
    strategyUsed: z.string().describe("A brief description of the strategy or key arguments used by the lawyer in that case.")
  })).describe("A list of notable past cases. Provide an empty array if none are found."),
  negotiationStyle: z.string().describe("An analysis of the lawyer's typical negotiation style (e.g., 'Aggressive', 'Collaborative', 'Principled')."),
});


// For Main Analysis
export const GenerateAnalysisInputSchema = z.object({
  legalStrategy: z.string().describe('The legal strategy to be analyzed, including case facts and initial arguments.'),
  areaOfLaw: z.string().describe('The specific area of law for the case (e.g., Corporate, Criminal, Family).'),
  judgeName: z.string().optional().describe("The name of the judge or arbiter presiding over the case."),
  opposingCounsel: z.array(z.string()).optional().describe("A list of names for the opposing counsel lawyers."),
  files: z.array(z.object({
    name: z.string(),
    dataUri: z.string().describe("A file attached by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  })).optional().describe("An optional list of files (documents or images) to analyze along with the strategy text."),
  // These fields are for passing the generated profiles between flows
  judgeProfile: JudgeProfileSchema.optional(),
  lawyerProfiles: z.array(LawyerProfileSchema).optional(),
  ragContext: z.string().optional().describe('Context string from RAG retrieval to be included in the analysis.'),
  ragSources: z.array(z.any()).optional().describe('Raw RAG sources for reference/display.'),
});
export type GenerateAnalysisInput = z.infer<typeof GenerateAnalysisInputSchema>;

export const CaseCitationSchema = z.object({
    citation: z.string().describe("The name of the cited case."),
    relevance: z.string().describe("A brief explanation of how this case supports the argument.")
});

export const LegalArgumentSchema = z.object({
  argument: z.string().describe('A compelling argument for the provided strategy.'),
  caseCitations: z.array(CaseCitationSchema).describe('List of key case citations with relevance explanations. Provide an empty array if there are none.'),
  detailedAnalysis: z.string().optional().describe("An extremely detailed, exhaustive analysis of the argument, generated in the background."),
});

export const WeaknessSchema = z.object({
  weakness: z.string().describe('A specific weakness identified in the overall strategy.'),
  vulnerabilityScore: z.number().min(1).max(10).describe('A numerical score from 1-10 indicating the severity of the vulnerability (1=low, 10=high).'),
  rationale: z.string().describe("A brief rationale explaining why this vulnerability score was given."),
  detailedAnalysis: z.string().optional().describe("An extremely detailed, exhaustive analysis of the weakness, generated in the background."),
});

export const KeyVulnerabilitySchema = z.object({
  vulnerability: z.string().describe('A key vulnerability identified in the legal strategy.'),
  affectedArguments: z.array(z.string()).describe('List of arguments that are affected by this vulnerability. Provide an empty array if there are none.'),
});

export const RefinedStrategySchema = z.object({
  recommendation: z.string().describe('A recommendation to refine the legal strategy.'),
  rationale: z.string().describe('The rationale behind the refined strategy recommendation.'),
});

export const PredictiveAnalysisSchema = z.object({
  outcomePrediction: z.string().describe('Prediction of the case outcome based on the analysis.'),
  confidenceLevel: z.number().min(0).max(1).describe('A numerical score between 0.0 and 1.0 representing the confidence level of the prediction (e.g., 0.75 for 75%).'),
});

export const ArbiterSynthesisSchema = z.object({
    keyVulnerabilities: z.array(KeyVulnerabilitySchema).describe('Key vulnerabilities identified in the legal strategy. Provide an empty array if there are none.'),
    refinedStrategy: z.array(RefinedStrategySchema).describe('Recommendations for refining the legal strategy. Provide an empty array if there are none.'),
    predictiveAnalysis: PredictiveAnalysisSchema.optional().describe('Predictive analysis of the case outcome. Omit this field entirely if a prediction cannot be made.'),
});

export const ThreePartAnalysisSchema = z.object({
  advocateBrief: z.array(LegalArgumentSchema).describe("The advocate's brief with key arguments and citations. Provide an empty array if there are none."),
  identifiedWeaknesses: z.array(WeaknessSchema).describe("A list of identified weaknesses in the overall strategy. Provide an empty array if there are none."),
  arbiterSynthesis: ArbiterSynthesisSchema.describe("The arbiter's synthesis of the arguments and rebuttals."),
});

export const AnalysisDashboardSchema = z.object({
  advocateBrief: z.array(LegalArgumentSchema).describe("The advocate's brief with key arguments and citations. Provide an empty array if there are none."),
  identifiedWeaknesses: z.array(WeaknessSchema).describe("A list of identified weaknesses in the overall strategy. Provide an empty array if there are none."),
  arbiterSynthesis: ArbiterSynthesisSchema.describe("The arbiter's synthesis of the arguments and rebuttals."),
  adversarialPlaybook: AdversarialPlaybookSchema.describe('An adversarial playbook with counter-arguments and rebuttals.'),
  judgeProfile: JudgeProfileSchema.optional().describe("An in-depth profile of the presiding judge."),
  lawyerProfiles: z.array(LawyerProfileSchema).optional().describe("In-depth profiles of the opposing counsel."),
});


// For GenerateAllDeepDives Flow
export const GenerateAllDeepDivesInputSchema = z.object({
  legalStrategy: GenerateAnalysisInputSchema.shape.legalStrategy,
  initialAnalysis: AnalysisDashboardSchema,
});
export type GenerateAllDeepDivesInput = z.infer<typeof GenerateAllDeepDivesInputSchema>;

export const GenerateAllDeepDivesOutputSchema = z.object({
  updatedAnalysis: AnalysisDashboardSchema,
});
export type GenerateAllDeepDivesOutput = z.infer<typeof GenerateAllDeepDivesOutputSchema>;

// For Document Generation
export const DocumentGenerationInputSchema = z.object({
  analysis: z.string().describe("A JSON string of the full, structured AI analysis from Firestore."),
  projectName: z.string(),
});
export type DocumentGenerationInput = z.infer<typeof DocumentGenerationInputSchema>;

export const DocumentGenerationOutputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().describe("Base64 encoded file content."),
});
export type DocumentGenerationOutput = z.infer<typeof DocumentGenerationOutputSchema>;

export const InternalMemoSchema = z.object({
    executive_summary: z.string(),
    risk_analysis: z.array(z.object({
        risk_title: z.string(),
        description: z.string(),
        vulnerability_score: z.number(),
    })),
    strategic_recommendations: z.array(z.object({
        pillar_title: z.string(),
        detailed_rationale: z.string(),
    })),
    action_plan: z.array(z.object({
        category: z.string(),
        task_description: z.string(),
    })),
    research_log: z.array(z.object({
        case_name: z.string(),
        case_summary: z.string(),
        source_quote: z.string(),
        ai_reasoning: z.string(),
    })),
});
export type InternalMemo = z.infer<typeof InternalMemoSchema>;

export const ClientReportSchema = z.object({
    report_title: z.string(),
    executive_takeaway: z.string(),
    current_situation: z.string(),
    identified_risks_and_opportunities: z.array(z.string()),
    our_recommended_path_forward: z.string(),
});
export type ClientReport = z.infer<typeof ClientReportSchema>;


// Main Project Type
export type Project = {
  id: string;
  name: string;
  userId: string;
  createdAt: any;
  strategy?: string;
  analysis?: z.infer<typeof AnalysisDashboardSchema>;
  analysisStatus?: 'complete' | 'generating_details';
  actionPlan?: ActionItem[];
  mainChatHistory?: ChatMessage[];
  simulationState?: SimulationState;
  finalStrategy?: string;
  // New fields for context
  areaOfLaw?: string;
  judgeName?: string;
  opposingCounsel?: string[];
  fileNames?: string[];
};

export type Analysis = z.infer<typeof AnalysisDashboardSchema>;
export type LegalArgument = z.infer<typeof LegalArgumentSchema>;
export type Weakness = z.infer<typeof WeaknessSchema>;
export type AdversarialPlaybook = z.infer<typeof AdversarialPlaybookSchema>;
export type JudgeProfile = z.infer<typeof JudgeProfileSchema>;
export type LawyerProfile = z.infer<typeof LawyerProfileSchema>;

export type ActionItem = {
  id: string;
  text: string;
  completed: boolean;
  chatHistory?: ChatMessage[];
};

export type ChatMessage = {
  id?: string;
  role: 'user' | 'arbiter';
  content: string;
  createdAt?: any;
};

export const SlideSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()),
  speakerNotes: z.string().optional(),
});
export type Slide = z.infer<typeof SlideSchema>;

export const PresentationContentSchema = z.object({
  title: z.string(),
  slides: z.array(SlideSchema),
});
export type PresentationContent = z.infer<typeof PresentationContentSchema>;

export const GeneratePresentationInputSchema = z.object({
  analysis: z.string().describe("A JSON string of the full, structured AI analysis."),
  projectName: z.string(),
});
export type GeneratePresentationInput = z.infer<typeof GeneratePresentationInputSchema>;

export const GeneratePresentationOutputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string().describe("Base64 encoded file content."),
});
export type GeneratePresentationOutput = z.infer<typeof GeneratePresentationOutputSchema>;
