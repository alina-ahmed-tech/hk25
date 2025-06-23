'use server';

/**
 * @fileOverview An AI agent for generating an in-depth profile of a lawyer.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {LawyerProfileSchema, GenerateLawyerProfileInputSchema, type GenerateLawyerProfileInput} from '@/lib/types';


export async function generateLawyerProfile(input: GenerateLawyerProfileInput): Promise<z.infer<typeof LawyerProfileSchema>> {
  return generateLawyerProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLawyerProfilePrompt',
  input: {schema: GenerateLawyerProfileInputSchema},
  output: {schema: LawyerProfileSchema},
  prompt: `You are an elite opposition researcher and legal strategist at a top-tier law firm. Your specialty is creating deep psychological and strategic dossiers on opposing counsel. Your analysis must be predictive, insightful, and tactical.
  
  Lawyer's Name: "{{lawyerName}}"

  Synthesize public records, case histories, professional reputation, and common legal tactics to generate an actionable intelligence profile. Adhere strictly to the provided JSON schema.

  **Instructions:**
  - **profileSummary:** What is this lawyer's **signature style**? Are they a "scorched-earth" litigator, a meticulous preparer, a charismatic performer? What is their reputation among judges and peers? Provide a concise, strategic summary of their overall approach to litigation.
  - **caseHistory:** Analyze their past cases to uncover their **strategic playbook**. How do they typically win? What were the root causes of their losses? Identify recurring arguments, motions, or tactics they favor. For each case, extract a key strategic takeaway for how to counter them. If no specific cases are found, provide an empty array.
  - **negotiationStyle:** Go beyond simple labels. Describe their **game plan** in negotiations and litigation. Are they known for aggressive lowball offers, seeking early settlement, or pushing every case to the brink? What are their tells? How do they react under pressure? Provide actionable intelligence on how to approach a negotiation with them.

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
