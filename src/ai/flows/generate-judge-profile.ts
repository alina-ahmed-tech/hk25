'use server';

/**
 * @fileOverview An AI agent for generating an in-depth profile of a judge.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {JudgeProfileSchema, GenerateJudgeProfileInputSchema, type GenerateJudgeProfileInput} from '@/lib/types';


export async function generateJudgeProfile(input: GenerateJudgeProfileInput): Promise<z.infer<typeof JudgeProfileSchema>> {
  return generateJudgeProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJudgeProfilePrompt',
  input: {schema: GenerateJudgeProfileInputSchema},
  output: {schema: JudgeProfileSchema},
  prompt: `You are a master legal strategist and judicial psychologist with decades of experience observing the bench. Your task is to create an exceptionally deep, actionable intelligence dossier on a specific judge. Go beyond public records and provide the kind of nuanced, predictive insights a top-tier litigator would pay for.
  
  Judge's Name: "{{judgeName}}"

  Analyze their entire career, past rulings, written opinions, and public statements to generate a comprehensive profile adhering strictly to the provided JSON schema.
  
  **Instructions:**
  - **profileSummary:** This is not just a biography. This is a strategic overview. What is this judge's **judicial DNA**? Are they a textualist, a pragmatist, an activist? What is their courtroom temperament—patient, irascible, academic? What are their core motivations and judicial philosophy? Synthesize this into a powerful, predictive summary of what a lawyer should expect when walking into their courtroom.
  - **pastCases:** Do not just summarize cases. Analyze them for **patterns**. Why did they rule a certain way? Was it based on a strict interpretation of a statute, a particular legal theory, or a sense of fairness? For each case, highlight the **strategic lesson** for a lawyer appearing before them. If no specific cases are found, provide an empty array.
  - **knownPreferences:** Reframe this as a **"Playbook for This Judge."** What are the unwritten rules? What arguments are they highly receptive to? What types of legal reasoning or lawyer behavior do they visibly dislike or punish? Provide a list of tactical "Do's and Don'ts" for oral arguments, briefs, and courtroom conduct. Be specific (e.g., 'Responds well to arguments grounded in economic efficiency,' 'Has a low tolerance for discovery disputes.'). If none are known, provide an empty array.

  **Crucially, you must provide a value for every field. For any array field, if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  `,
});

const generateJudgeProfileFlow = ai.defineFlow(
  {
    name: 'generateJudgeProfileFlow',
    inputSchema: GenerateJudgeProfileInputSchema,
    outputSchema: JudgeProfileSchema,
  },
  async ({judgeName}) => {
    const {output} = await prompt({judgeName});
    if (!output) {
      throw new Error('The AI failed to generate a valid judge profile.');
    }
    output.name = judgeName;
    return output;
  }
);
