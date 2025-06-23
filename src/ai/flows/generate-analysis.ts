
'use server';

/**
 * @fileOverview This file defines the generateAnalysis flow. It performs a two-phase analysis:
 * 1. Generates a high-level analysis and adversarial playbook.
 * 2. Triggers a background flow to generate "deep dives" for each item.
 * It then combines the initial results into a single, comprehensive analysis object.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateAdversarialPlaybook} from './generate-adversarial-playbook';
import { ThreePartAnalysisSchema, AnalysisDashboardSchema, GenerateAnalysisInputSchema } from '@/lib/types';
import type { Analysis, GenerateAnalysisInput } from '@/lib/types';

export type GenerateAnalysisOutput = { analysisDashboard: Analysis };

export async function generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisOutput> {
  return generateAnalysisFlow(input);
}

const threePartAnalysisPrompt = ai.definePrompt({
  name: 'threePartAnalysisPrompt',
  input: {schema: GenerateAnalysisInputSchema },
  output: {schema: ThreePartAnalysisSchema},
  prompt: `You are a world-class AI legal analyst. Your task is to provide a concise, multi-faceted analysis of a legal strategy.

  Legal Strategy to Analyze:
  {{{legalStrategy}}}

  Produce a structured analysis in JSON format with three distinct parts. Adhere strictly to the provided JSON schema.
  **Crucially, you must provide a value for every field. For any list or array field (like 'caseCitations', 'identifiedWeaknesses', etc.), if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  The only exception is the 'predictiveAnalysis' object, which you may omit entirely if you cannot make a prediction with reasonable confidence.

  1.  **Advocate's Brief:**
      *   Formulate the most compelling arguments for the provided strategy. If there are none, provide an empty array for 'advocateBrief'.
      *   For each argument, provide a concise summary. If relevant, include key case citations. If there are no citations for an argument, provide an empty array for 'caseCitations'.

  2.  **Identified Weaknesses:**
      *   Identify the most significant weaknesses in the overall legal strategy. If there are none, provide an empty array for 'identifiedWeaknesses'.
      *   For each weakness, provide a description, a vulnerability score (1-10), and a brief rationale. You must always provide a rationale.

  3.  **Arbiter's Synthesis:**
      *   For each key vulnerability, identify it and list the specific arguments that it affects. If no significant vulnerabilities are found, provide an empty array for 'keyVulnerabilities'. If a vulnerability affects no arguments, provide an empty array for 'affectedArguments'.
      *   Provide a high-level refined strategy, with a clear recommendation and rationale for each point. If no refinements are necessary, provide an empty array for 'refinedStrategy'.
      *   Offer a predictive analysis of the case outcome. If you cannot make a prediction, you may omit the 'predictiveAnalysis' object entirely.
  `,
});

const generateAnalysisFlow = ai.defineFlow(
  {
    name: 'generateAnalysisFlow',
    outputSchema: z.object({ analysisDashboard: AnalysisDashboardSchema }),
    inputSchema: GenerateAnalysisInputSchema,
  },
  async input => {
    // Step 1: Generate the high-level three-part analysis.
    const threePartAnalysisResult = await threePartAnalysisPrompt(input);
    const highLevelAnalysis = threePartAnalysisResult.output;

    if (!highLevelAnalysis) {
      throw new Error('Failed to generate the core analysis due to an invalid AI response format.');
    }
    
    // Step 2: Generate the adversarial playbook sequentially.
    const adversarialPlaybookResult = await generateAdversarialPlaybook(input);
    const playbook = adversarialPlaybookResult.adversarialPlaybook;

    if (!playbook) {
      throw new Error('Failed to generate the adversarial playbook due to an invalid AI response format.');
    }

    // Step 3: Combine initial results into the final dashboard object
    return {
      analysisDashboard: {
        ...highLevelAnalysis,
        advocateBrief: highLevelAnalysis.advocateBrief || [],
        identifiedWeaknesses: highLevelAnalysis.identifiedWeaknesses || [],
        adversarialPlaybook: playbook,
      },
    };
  }
);
