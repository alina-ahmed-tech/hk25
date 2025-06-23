'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineStrategyTextInputSchema = z.object({
  currentText: z.string().describe("The current version of the legal strategy text."),
  instruction: z.string().describe("The user's instruction for how to edit or refine the text."),
});
export type RefineStrategyTextInput = z.infer<typeof RefineStrategyTextInputSchema>;

const RefineStrategyTextOutputSchema = z.object({
  refinedText: z.string().describe("The new version of the legal strategy, updated according to the instruction."),
});
export type RefineStrategyTextOutput = z.infer<typeof RefineStrategyTextOutputSchema>;

export async function refineStrategyText(input: RefineStrategyTextInput): Promise<RefineStrategyTextOutput> {
  return refineStrategyTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refineStrategyTextPrompt',
  input: {schema: RefineStrategyTextInputSchema},
  output: {schema: RefineStrategyTextOutputSchema},
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an AI legal writing assistant. Your task is to modify the provided legal strategy text based on a specific instruction. Return only the full, updated text.

**Current Strategy Text:**
{{{currentText}}}

**User's Instruction:**
"{{{instruction}}}"

Now, provide the complete, newly refined strategy text.`,
});

const refineStrategyTextFlow = ai.defineFlow(
  {
    name: 'refineStrategyTextFlow',
    inputSchema: RefineStrategyTextInputSchema,
    outputSchema: RefineStrategyTextOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('The AI failed to refine the strategy text.');
    }
    return output;
  }
);
