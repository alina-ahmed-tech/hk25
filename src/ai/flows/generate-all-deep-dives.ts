'use server';

/**
 * @fileOverview This file defines a flow to generate all deep-dive analyses in the background.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AnalysisDashboardSchema, GenerateAnalysisInputSchema } from '@/lib/types';
import type { Analysis } from '@/lib/types';
import { generateDeepDive } from './generate-deep-dive';

// The input will be the initial analysis and the original strategy
export const GenerateAllDeepDivesInputSchema = z.object({
  legalStrategy: GenerateAnalysisInputSchema.shape.legalStrategy,
  initialAnalysis: AnalysisDashboardSchema,
});
export type GenerateAllDeepDivesInput = z.infer<typeof GenerateAllDeepDivesInputSchema>;

export const GenerateAllDeepDivesOutputSchema = z.object({
  updatedAnalysis: AnalysisDashboardSchema,
});
export type GenerateAllDeepDivesOutput = z.infer<typeof GenerateAllDeepDivesOutputSchema>;

export async function generateAllDeepDives(input: GenerateAllDeepDivesInput): Promise<GenerateAllDeepDivesOutput> {
  return generateAllDeepDivesFlow(input);
}

const generateAllDeepDivesFlow = ai.defineFlow(
  {
    name: 'generateAllDeepDivesFlow',
    inputSchema: GenerateAllDeepDivesInputSchema,
    outputSchema: GenerateAllDeepDivesOutputSchema,
  },
  async ({ legalStrategy, initialAnalysis }) => {
    
    const argumentDeepDivePromises = (initialAnalysis.advocateBrief || []).map(item => 
        generateDeepDive({
            originalStrategy: legalStrategy,
            priorAnalysisSection: JSON.stringify(item),
            itemToExpand: item.argument
        }).then(result => ({ ...item, detailedAnalysis: result?.detailedAnalysis || "Error generating detailed analysis for this item." }))
        .catch(e => {
            console.error(`Deep dive failed for argument: ${item.argument}`, e);
            return {...item, detailedAnalysis: "Error generating detailed analysis for this item."};
        })
    );

    const weaknessDeepDivePromises = (initialAnalysis.identifiedWeaknesses || []).map(item => 
        generateDeepDive({
            originalStrategy: legalStrategy,
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
    
    // Combine results into the final dashboard object
    const updatedAnalysis: Analysis = {
      ...initialAnalysis,
      advocateBrief: detailedArguments,
      identifiedWeaknesses: detailedWeaknesses,
    };

    return { updatedAnalysis };
  }
);
