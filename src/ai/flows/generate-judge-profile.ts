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
  prompt: `You are a world-class judicial analyst and legal researcher. Your task is to generate a detailed and insightful profile of a judge based on their name.
  
  Judge's Name: "{{judgeName}}"

  Based on publicly available information, legal databases, and known judicial patterns, generate a comprehensive profile adhering strictly to the provided JSON schema.
  
  **Instructions:**
  - **profileSummary:** Provide a concise, well-rounded summary of the judge's judicial philosophy, temperament, career history, and key characteristics.
  - **pastCases:** Identify a few significant past cases. For each, provide a brief, neutral summary of the case and highlight the judge's specific role or key ruling. If no specific cases are found, provide an empty array.
  - **knownPreferences:** List any known preferences, dislikes, or judicial quirks. This could include preferences for specific types of arguments (e.g., textualist vs. purposive), courtroom decorum, or attitudes towards certain legal motions. Synthesize this from common knowledge about judges of their type. If none are known, provide an empty array.

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
