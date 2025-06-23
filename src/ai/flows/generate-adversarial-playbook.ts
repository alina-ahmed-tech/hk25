
'use server';
/**
 * @fileOverview Defines the Genkit flow for generating an "Adversarial Playbook".
 * This includes potential counter-arguments, rebuttals, counter-rebuttals, and analysis of opposing counsel.
 *
 * - generateAdversarialPlaybook: The main function to trigger the playbook generation.
 * - GenerateAdversarialPlaybookInput: Input type for the flow.
 * - GenerateAdversarialPlaybookOutput: Output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {AdversarialPlaybook} from '@/lib/types';
import {AdversarialPlaybookSchema} from '@/lib/types';

const GenerateAdversarialPlaybookInputSchema = z.object({
  legalStrategy: z.string().describe('The full legal strategy, including case facts and arguments, for which to generate a playbook.'),
});
export type GenerateAdversarialPlaybookInput = z.infer<typeof GenerateAdversarialPlaybookInputSchema>;

const GenerateAdversarialPlaybookOutputSchema = z.object({
  adversarialPlaybook: AdversarialPlaybookSchema,
});
export type GenerateAdversarialPlaybookOutput = z.infer<typeof GenerateAdversarialPlaybookOutputSchema>;

export async function generateAdversarialPlaybook(input: GenerateAdversarialPlaybookInput): Promise<GenerateAdversarialPlaybookOutput> {
  return generateAdversarialPlaybookFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAdversarialPlaybookPrompt',
  input: {schema: GenerateAdversarialPlaybookInputSchema},
  output: {schema: AdversarialPlaybookSchema},
  prompt: `You are a master legal strategist with expertise in international arbitration, thinking multiple moves ahead. Your task is to create an exceptionally deep "Adversarial Playbook" based on the provided legal strategy.

  Legal Strategy Document:
  {{{legalStrategy}}}
  
  Adhere strictly to the provided JSON schema. **Crucially, you must provide a value for every field. For any list or array field (like 'potentialCounterArguments', 'rebuttals', 'citations', 'potentialCounterRebuttals'), if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  
  Based on the document, generate the following:
  1.  **Potential Counter-Arguments:** Create an exhaustive list of every potential argument the opposing side could realistically make. If none are found, return an empty array for 'potentialCounterArguments'.
  2.  **Rebuttals & Counter-Rebuttals:** For each counter-argument:
      a.  Provide a set of strong, well-supported **rebuttals**. If there are no rebuttals for a counter-argument, provide an empty 'rebuttals' array. For each rebuttal, include supporting **citations**. If a rebuttal has no citations, provide an empty 'citations' array.
      b.  For each rebuttal, anticipate and generate a list of likely **potentialCounterRebuttals**. For each, assess its strength as "High", "Medium", or "Low". If a rebuttal has no counter-rebuttals, provide an empty 'potentialCounterRebuttals' array.
  3.  **Opponent Counsel Analysis:** Provide a brief analysis of what the opposing counsel's strategic patterns might be.
  `,
});

const generateAdversarialPlaybookFlow = ai.defineFlow(
  {
    name: 'generateAdversarialPlaybookFlow',
    inputSchema: GenerateAdversarialPlaybookInputSchema,
    outputSchema: GenerateAdversarialPlaybookOutputSchema,
  },
  async input => {
    const {output: playbook} = await prompt(input);
    
    if (!playbook) {
      throw new Error('The AI failed to generate a valid adversarial playbook.');
    }
    
    return { adversarialPlaybook: playbook };
  }
);
