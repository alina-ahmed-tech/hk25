
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
import {AdversarialPlaybookSchema, GenerateAnalysisInputSchema} from '@/lib/types';

const GenerateAdversarialPlaybookInputSchema = GenerateAnalysisInputSchema;
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
  prompt: `You are a master legal strategist with expertise in anticipating and neutralizing opposing arguments. Your task is to create an exceptionally deep "Adversarial Playbook" based on the provided case information.

  **Case Context:**
  - **Area of Law:** {{areaOfLaw}}
  - **Legal Strategy Document:** {{{legalStrategy}}}
  {{#if judgeProfile}}
  - **Judge Profile Summary:** {{judgeProfile.profileSummary}}
  {{/if}}
  {{#if lawyerProfiles}}
  - **Opposing Counsel Profiles:**
    {{#each lawyerProfiles}}
    - **{{name}}**: {{profileSummary}} (Typical Negotiation Style: {{negotiationStyle}})
    {{/each}}
  {{/if}}

  Adhere strictly to the provided JSON schema. **You must provide a value for every field. For any list or array, if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  
  Based on all available information, generate the following:
  1.  **Potential Counter-Arguments:** Create an exhaustive list of every potential argument the opposing side could realistically make. **These arguments should reflect the known styles and past strategies of the opposing counsel.**
  2.  **Rebuttals & Counter-Rebuttals:** For each counter-argument:
      a.  Provide a set of strong, well-supported **rebuttals**. These should be framed in a way that would be most persuasive to the **presiding judge's known preferences and judicial philosophy.** For each rebuttal, include supporting **citations**.
      b.  For each rebuttal, anticipate and generate a list of likely **potentialCounterRebuttals**, assessing each one's strength as "High", "Medium", or "Low".
  3.  **Opponent Counsel Analysis:** Synthesize the provided lawyer profiles and the case facts into a cohesive analysis of their likely overall strategy in *this specific case*. How will they likely open? What will be their primary line of attack?
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
