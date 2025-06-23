'use server';
/**
 * @fileOverview An AI agent for generating a detailed strategy draft from the Arbiter's high-level recommendations.
 *
 * - generateRefinedStrategy - A function that generates the detailed strategy.
 * - GenerateRefinedStrategyInput - The input type for the function.
 * - GenerateRefinedStrategyOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RefinedStrategySchema } from '@/lib/types';

const GenerateRefinedStrategyInputSchema = z.object({
  recommendations: z.array(RefinedStrategySchema).describe("The Arbiter's list of high-level recommendations and their rationales."),
});
export type GenerateRefinedStrategyInput = z.infer<typeof GenerateRefinedStrategyInputSchema>;

const GenerateRefinedStrategyOutputSchema = z.object({
  draftStrategy: z.string().describe('A cohesive, well-structured, and detailed final strategy document, formatted as professional text.'),
});
export type GenerateRefinedStrategyOutput = z.infer<typeof GenerateRefinedStrategyOutputSchema>;

export async function generateRefinedStrategy(input: GenerateRefinedStrategyInput): Promise<GenerateRefinedStrategyOutput> {
  return generateRefinedStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRefinedStrategyPrompt',
  input: {schema: GenerateRefinedStrategyInputSchema},
  output: {schema: GenerateRefinedStrategyOutputSchema},
  prompt: `You are a master legal strategist. Your task is to synthesize a series of high-level recommendations into a single, cohesive, and detailed final strategy document.

The document should be well-structured, professional, and ready for a client or partner to review. Elaborate on the provided points, connecting them into a flowing narrative.

**Recommendations to Synthesize:**
{{#each recommendations}}
- **Recommendation:** {{recommendation}}
  **Rationale:** {{rationale}}
{{/each}}

Produce the full strategy document based on these points.
`,
});

const generateRefinedStrategyFlow = ai.defineFlow(
  {
    name: 'generateRefinedStrategyFlow',
    inputSchema: GenerateRefinedStrategyInputSchema,
    outputSchema: GenerateRefinedStrategyOutputSchema,
  },
  async input => {
    if (!input.recommendations || input.recommendations.length === 0) {
        return { draftStrategy: "No recommendations were provided to generate a strategy." };
    }
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to generate a valid strategy draft.');
    }
    return output;
  }
);
