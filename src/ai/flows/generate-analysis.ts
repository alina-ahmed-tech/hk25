
'use server';

/**
 * @fileOverview This file defines the generateAnalysis flow. It's the master orchestrator that:
 * 1. Generates profiles for the judge and opposing counsel in parallel.
 * 2. Uses those profiles to generate a high-level analysis and adversarial playbook.
 * 3. Triggers a background flow to generate "deep dives" for each item.
 * It then combines the initial results into a single, comprehensive analysis object.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {generateAdversarialPlaybook} from './generate-adversarial-playbook';
import { ThreePartAnalysisSchema, AnalysisDashboardSchema, GenerateAnalysisInputSchema } from '@/lib/types';
import type { Analysis, GenerateAnalysisInput } from '@/lib/types';
import { generateJudgeProfile } from './generate-judge-profile';
import { generateLawyerProfile } from './generate-lawyer-profile';


export type GenerateAnalysisOutput = { analysisDashboard: Analysis };

export async function generateAnalysis(input: GenerateAnalysisInput): Promise<GenerateAnalysisOutput> {
  return generateAnalysisFlow(input);
}

const threePartAnalysisPrompt = ai.definePrompt({
  name: 'threePartAnalysisPrompt',
  input: {schema: GenerateAnalysisInputSchema },
  output: {schema: ThreePartAnalysisSchema},
  prompt: `You are a world-class AI legal analyst. Your task is to provide a concise, multi-faceted analysis of a legal strategy, taking into account the specific area of law, the presiding judge, and the opposing counsel.

  **Primary Information to Analyze:**
  - **Area of Law:** {{areaOfLaw}}
  - **Legal Strategy Document:** {{{legalStrategy}}}
  {{#if files.length}}
  - **Attached Documents/Images:** Analyze the following attachments as primary sources of information.
    {{#each files}}
    - **File: {{name}}**
      {{media url=dataUri}}
    {{/each}}
  {{/if}}

  **Key Personnel Profiles (for context):**
  {{#if judgeProfile}}
  - **Presiding Judge Profile:**
    - Summary: {{judgeProfile.profileSummary}}
    - Known Preferences: {{#each judgeProfile.knownPreferences}}- {{this}} {{/each}}
  {{/if}}
  
  {{#if lawyerProfiles.length}}
  - **Opposing Counsel Dossier:**
    {{#each lawyerProfiles}}
    - **{{name}}**:
      - Style: {{profileSummary}}
      - Negotiation: {{negotiationStyle}}
    {{/each}}
  {{/if}}

  Now, produce a structured analysis in JSON format with three distinct parts, deeply integrating the context provided above. Adhere strictly to the provided JSON schema.
  
  **Crucially, you must provide a value for every field. For any list or array field (like 'caseCitations', 'identifiedWeaknesses', etc.), if there are no items to include, you MUST provide an empty array \`[]\`. Do not omit any fields.**
  The only exception is the 'predictiveAnalysis' object, which you may omit entirely if you cannot make a prediction with reasonable confidence.

  1.  **Advocate's Brief:**
      *   Formulate the most compelling arguments for the provided strategy, **tailored to the specified Area of Law and designed to appeal to the known preferences of the Judge.** If there are none, provide an empty array for 'advocateBrief'.
      *   For each argument, provide a concise summary. If relevant, include key case citations. If there are no citations for an argument, provide an empty array for 'caseCitations'.

  2.  **Identified Weaknesses:**
      *   Identify the most significant weaknesses, **especially considering how the specified Opposing Counsel might exploit them based on their known styles.** If there are none, provide an empty array for 'identifiedWeaknesses'.
      *   For each weakness, provide a description, a vulnerability score (1-10), and a brief rationale. You must always provide a rationale.

  3.  **Arbiter's Synthesis:**
      *   For each key vulnerability, identify it and list the specific arguments that it affects. If no significant vulnerabilities are found, provide an empty array for 'keyVulnerabilities'. If a vulnerability affects no arguments, provide an empty array for 'affectedArguments'.
      *   Provide a high-level refined strategy, with a clear recommendation and rationale for each point, **factoring in the personalities and preferences of the judge and opposing counsel.** If no refinements are necessary, provide an empty array for 'refinedStrategy'.
      *   Offer a predictive analysis of the case outcome. If you cannot make a prediction, you may omit the 'predictiveAnalysis' object entirely.
  `,
});

const generateAnalysisFlow = ai.defineFlow(
  {
    name: 'generateAnalysisFlow',
    outputSchema: z.object({ analysisDashboard: AnalysisDashboardSchema }),
    inputSchema: GenerateAnalysisInputSchema,
  },
  async input => {
    // Step 1: Generate Judge and Lawyer profiles in parallel.
    const profilePromises = [];

    if (input.judgeName) {
        profilePromises.push(generateJudgeProfile({ judgeName: input.judgeName }));
    } else {
        profilePromises.push(Promise.resolve(undefined)); // Placeholder for judge
    }
    
    if (input.opposingCounsel && input.opposingCounsel.length > 0) {
        const lawyerPromises = input.opposingCounsel.map(name => generateLawyerProfile({ lawyerName: name }));
        profilePromises.push(Promise.all(lawyerPromises));
    } else {
        profilePromises.push(Promise.resolve([])); // Placeholder for lawyers
    }

    const [judgeProfile, lawyerProfiles] = await Promise.all(profilePromises) as [any, any];

    const analysisInput: GenerateAnalysisInput = {
      ...input,
      judgeProfile: judgeProfile,
      lawyerProfiles: lawyerProfiles,
    };

    // Step 2: Generate the core analysis and the playbook in parallel, using the new profiles.
    const [threePartAnalysisResult, adversarialPlaybookResult] = await Promise.all([
      threePartAnalysisPrompt(analysisInput),
      generateAdversarialPlaybook(analysisInput)
    ]);
    
    const highLevelAnalysis = threePartAnalysisResult.output;
    if (!highLevelAnalysis) {
      throw new Error('Failed to generate the core analysis due to an invalid AI response format.');
    }
    
    const playbook = adversarialPlaybookResult.adversarialPlaybook;
    if (!playbook) {
      throw new Error('Failed to generate the adversarial playbook due to an invalid AI response format.');
    }

    // Step 3: Combine all results into the final dashboard object
    return {
      analysisDashboard: {
        ...highLevelAnalysis,
        adversarialPlaybook: playbook,
        judgeProfile: judgeProfile,
        lawyerProfiles: lawyerProfiles,
      },
    };
  }
);
