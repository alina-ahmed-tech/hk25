'use server';

/**
 * @fileOverview An AI agent for generating an in-depth profile of a lawyer.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {LawyerProfileSchema} from '@/lib/types';

export const GenerateLawyerProfileInputSchema = z.object({
  lawyerName: z.string().describe('The full name of the lawyer to be profiled.'),
});
export type GenerateLawyerProfileInput = z.infer<typeof GenerateLawyerProfileInputSchema>;

export async function generateLawyerProfile(input: GenerateLawyerProfileInput): Promise<z.infer<typeof LawyerProfileSchema>> {
  return generateLawyerProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLawyerProfilePrompt',
  input: {schema: GenerateLawyerProfileInputSchema},
  output: {schema: LawyerProfileSchema},
  prompt: `You are an expert legal intelligence analyst. Your mission is to create a detailed professional profile of a specific lawyer based on their name.

  Lawyer's Name: "{{lawyerName}}"

  Synthesize information from public records, case histories, and professional reputation to generate a profile. Adhere strictly to the provided JSON schema.

  **Instructions:**
  - **profileSummary:** Write a concise summary of the lawyer's professional style, reputation, areas of expertise, and typical strategic approach.
  - **caseHistory:** List several notable past cases. For each, describe the outcome (win, loss, settlement) and the key strategy the lawyer employed. If no specific cases are found, provide an empty array.
  - **negotiationStyle:** Analyze and describe the lawyer's typical negotiation style (e.g., Aggressive, Collaborative, 'Problem-Solving', 'Positional Bargaining').

  **Crucially, you must provide a value for every field. For any array field, if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  `,
});

const generateLawyerProfileFlow = ai.defineFlow(
  {
    name: 'generateLawyerProfileFlow',
    inputSchema: GenerateLawyerProfileInputSchema,
    outputSchema: LawyerProfileSchema,
  },
  async ({lawyerName}) => {
    const {output} = await prompt({lawyerName});
    if (!output) {
      throw new Error('The AI failed to generate a valid lawyer profile.');
    }
    output.name = lawyerName;
    return output;
  }
);
