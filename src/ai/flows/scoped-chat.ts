'use server';

/**
 * @fileOverview This file defines the Genkit flow for the scoped chat feature.
 *
 * - scopedChat - A function that handles the scoped chat with the AI arbiter.
 * - ScopedChatInput - The input type for the scopedChat function.
 * - ScopedChatOutput - The return type for the scopedChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScopedChatInputSchema = z.object({
  actionItemId: z.string().describe('The ID of the action item.'),
  message: z.string().describe('The user message for the chat.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'arbiter']),
    content: z.string(),
  })).optional().describe('The chat history for the action item.'),
});
export type ScopedChatInput = z.infer<typeof ScopedChatInputSchema>;

const ScopedChatOutputSchema = z.object({
  response: z.string().describe('The AI arbiter response.'),
});
export type ScopedChatOutput = z.infer<typeof ScopedChatOutputSchema>;

export async function scopedChat(input: ScopedChatInput): Promise<ScopedChatOutput> {
  return scopedChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scopedChatPrompt',
  input: {schema: ScopedChatInputSchema},
  output: {schema: ScopedChatOutputSchema},
  prompt: `You are an AI arbiter assisting a lawyer with an action item.

Action Item ID: {{{actionItemId}}}

{{#if chatHistory}}
Chat History:
{{#each chatHistory}}
{{#ifCond role '===' 'user'}}
Lawyer: {{{content}}}
{{else}}
Arbiter: {{{content}}}
{{/ifCond}}
{{/each}}
{{/if}}

Lawyer: {{{message}}}
Arbiter:`, // The model will complete this
  templateHelpers: {
    ifCond: function (v1: any, operator: any, v2: any, options: any) {
      if (operator === '===' && v1 === v2) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    },
  },
});

const scopedChatFlow = ai.defineFlow(
  {
    name: 'scopedChatFlow',
    inputSchema: ScopedChatInputSchema,
    outputSchema: ScopedChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {response: output!};
  }
);
