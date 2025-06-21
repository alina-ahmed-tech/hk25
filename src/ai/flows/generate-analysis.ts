
'use server';

/**
 * @fileOverview This file defines the generateAnalysis flow. It performs a two-phase analysis:
 * 1. Generates a high-level analysis and adversarial playbook using Gemini 2.5 Pro.
 * 2. Generates a detailed "deep dive" for each argument and weakness from the high-level analysis.
 * It then combines everything into a single, comprehensive analysis object.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {generateAdversarialPlaybook} from './generate-adversarial-playbook';
import { ThreePartAnalysisSchema, AnalysisDashboardSchema, GenerateAnalysisInputSchema } from '@/lib/types';
import type { Analysis, LegalArgument, Weakness } from '@/lib/types';
import { generateDeepDive } from './generate-deep-dive';

export type GenerateAnalysisInput = z.infer<typeof GenerateAnalysisInputSchema>;
export type GenerateAnalysisOutput = { analysisDashboard: Analysis };

export async function generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisOutput> {
  return generateAnalysisFlow(input);
}

const threePartAnalysisPrompt = ai.definePrompt({
  name: 'threePartAnalysisPrompt',
  input: {schema: GenerateAnalysisInputSchema},
  output: {schema: ThreePartAnalysisSchema},
  prompt: `You are a world-class AI legal analyst. Your task is to provide a concise, multi-faceted analysis of a legal strategy.

  Legal Strategy to Analyze:
  {{{legalStrategy}}}

  Produce a structured analysis in JSON format with three distinct parts. Adhere strictly to the provided JSON schema. Fields marked as optional in the schema can be omitted if there is no relevant information to include.

  1.  **Advocate's Brief:**
      *   Formulate the most compelling arguments for the provided strategy.
      *   For each argument, provide a concise summary. If relevant, include key case citations with brief relevance explanations. You may omit 'caseCitations' if none apply.

  2.  **Identified Weaknesses:**
      *   Identify the most significant weaknesses in the overall legal strategy.
      *   For each weakness, provide a description, a vulnerability score (1-10), and a brief rationale.

  3.  **Arbiter's Synthesis:**
      *   For each key vulnerability, identify it and list the specific arguments that it affects. You may omit 'affectedArguments' if it's not applicable. If no significant vulnerabilities are found, you may omit the 'keyVulnerabilities' array entirely.
      *   Provide a high-level refined strategy, with a clear recommendation and rationale for each point. You may omit the 'refinedStrategy' array if no refinements are necessary.
      *   Offer a predictive analysis of the case outcome, including a confidence level as a float between 0.0 and 1.0 (e.g., 0.75 for 75%). If you cannot make a prediction, you may omit the 'predictiveAnalysis' object.
  `,
});

const generateAnalysisFlow = ai.defineFlow(
  {
    name: 'generateAnalysisFlow',
    outputSchema: z.object({ analysisDashboard: AnalysisDashboardSchema }),
    inputSchema: GenerateAnalysisInputSchema,
  },
  async input => {
    // Step 1: Generate high-level analysis and playbook in parallel
    const [threePartAnalysisResult, adversarialPlaybookResult] = await Promise.all([
      threePartAnalysisPrompt(input, { model: 'googleai/gemini-2.5-pro' }),
      generateAdversarialPlaybook(input),
    ]);

    const highLevelAnalysis = threePartAnalysisResult.output;
    const playbook = adversarialPlaybookResult.adversarialPlaybook;

    if (!highLevelAnalysis || !playbook) {
      throw new Error('Failed to generate one or more parts of the initial analysis.');
    }

    // Step 2: Generate deep dives for all arguments and weaknesses in parallel
    const argumentDeepDivePromises = (highLevelAnalysis.advocateBrief || []).map(item => 
        generateDeepDive({
            originalStrategy: input.legalStrategy,
            priorAnalysisSection: JSON.stringify(item),
            itemToExpand: item.argument
        }).then(result => ({ ...item, detailedAnalysis: result?.detailedAnalysis || "Error generating detailed analysis for this item." }))
        .catch(e => {
            console.error(`Deep dive failed for argument: ${item.argument}`, e);
            return {...item, detailedAnalysis: "Error generating detailed analysis for this item."};
        })
    );

    const weaknessDeepDivePromises = (highLevelAnalysis.identifiedWeaknesses || []).map(item => 
        generateDeepDive({
            originalStrategy: input.legalStrategy,
            priorAnalysisSection: JSON.stringify(item),
            itemToExpand: item.weakness
        }).then(result => ({ ...item, detailedAnalysis: result?.detailedAnalysis || "Error generating detailed analysis for this item." }))
        .catch(e => {
            console.error(`Deep dive failed for weakness: ${item.weakness}`, e);
            return {...item, detailedAnalysis: "Error generating detailed analysis for this item."};
        })
    );

    const [detailedArguments, detailedWeaknesses] = await Promise.all([
        Promise.all(argumentDeepDivePromises),
        Promise.all(weaknessDeepDivePromises),
    ]);
    
    // Step 3: Combine all results into the final dashboard object
    return {
      analysisDashboard: {
        ...highLevelAnalysis,
        advocateBrief: detailedArguments,
        identifiedWeaknesses: detailedWeaknesses,
        adversarialPlaybook: playbook,
      },
    };
  }
);
