
'use server';
/**
 * @fileOverview A Genkit flow to generate a Google Slides presentation from a case analysis.
 * This flow takes a structured analysis object, generates presentation content using an LLM,
 * and then uses the Google Slides and Drive APIs via a service account to create
 * and share the presentation.
 *
 * NOTE: This flow requires Google Cloud Service Account credentials with permissions for
 * the Google Slides and Google Drive APIs to be available in the environment.
 * The service account must have the "roles/slides.editor" and "roles/drive.file" roles,
 * or equivalent custom permissions.
 */

import { ai } from '@/ai/genkit';
import { google } from 'googleapis';
import { z } from 'zod';
import {
  GeneratePresentationInputSchema,
  GeneratePresentationOutputSchema,
  PresentationContentSchema,
} from '@/lib/types';
import type { GeneratePresentationInput, GeneratePresentationOutput, PresentationContent } from '@/lib/types';

export async function generatePresentation(input: GeneratePresentationInput): Promise<GeneratePresentationOutput> {
  return generatePresentationFlow(input);
}

const presentationContentPrompt = ai.definePrompt({
  name: 'generatePresentationContentPrompt',
  input: { schema: GeneratePresentationInputSchema.pick({ analysis: true, projectName: true }) },
  output: { schema: PresentationContentSchema },
  prompt: `You are an expert legal assistant tasked with creating a professional slide deck from a detailed case analysis.
  
  The project is named: "{{projectName}}"

  Here is the full analysis data:
  \`\`\`json
  {{{json anlys=analysis}}}
  \`\`\`
  
  Your task is to synthesize this data into a clear, concise, and compelling presentation. Structure the output as a JSON object adhering to the provided schema. Create slides for the following sections:
  1.  **Title Slide**: Project Name and a subtitle like "Strategic Case Analysis".
  2.  **Executive Summary**: A slide summarizing the Arbiter's high-level predictive analysis and refined strategy.
  3.  **Our Strengths (Advocate's Brief)**: One slide for each key argument, listing the argument as the title and relevant case citations in the bullets.
  4.  **Potential Weaknesses**: One slide for each identified weakness, with the weakness as the title, and the rationale and vulnerability score as bullets.
  5.  **Adversarial Playbook**: A slide summarizing the opposing counsel's likely strategy and our primary counter-arguments.
  6.  **Action Plan**: A final slide with a title like "Next Steps" or "Recommendations".

  For each slide, provide concise bullet points and, where appropriate, speaker notes to elaborate on key points.
  `,
  // Use a powerful model for this complex generation task.
  model: 'googleai/gemini-2.5-flash',
});

const generatePresentationFlow = ai.defineFlow(
  {
    name: 'generatePresentationFlow',
    inputSchema: GeneratePresentationInputSchema,
    outputSchema: GeneratePresentationOutputSchema,
  },
  async ({ analysis, projectName, userEmail }) => {
    // Step 1: Generate the structured content for the presentation.
    const { output: presentationContent } = await presentationContentPrompt({ analysis, projectName });

    if (!presentationContent) {
      throw new Error('AI failed to generate presentation content.');
    }

    // Step 2: Authenticate with Google APIs using a Service Account.
    // This assumes that the GOOGLE_APPLICATION_CREDENTIALS environment variable is set.
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/presentations',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    const authClient = await auth.getClient();
    google.options({ auth: authClient });
    
    const slidesService = google.slides('v1');
    const driveService = google.drive('v3');

    // Step 3: Create the blank presentation.
    const presentation = await slidesService.presentations.create({
      requestBody: {
        title: presentationContent.title,
      },
    });

    const presentationId = presentation.data.presentationId;
    if (!presentationId) {
      throw new Error('Failed to create Google Slides presentation.');
    }
    
    // Step 4: Build the requests to add slides and content.
    let requests = [];
    for (const slide of presentationContent.slides) {
      const slideId = `slide_${requests.length}`;
      requests.push({
        createSlide: {
          objectId: slideId,
          slideLayoutReference: {
            predefinedLayout: slide.bullets ? 'TITLE_AND_BODY' : 'TITLE_ONLY',
          },
        },
      });
      // Add title
      requests.push({
        insertText: {
          objectId: slideId,
          text: slide.title,
          insertionIndex: 0,
        },
      });
      // Add subtitle or bullets
      if (slide.subtitle) {
         requests.push({ insertText: { objectId: slideId, text: `\n${slide.subtitle}`, insertionIndex: slide.title.length } });
      }
      if (slide.bullets && slide.bullets.length > 0) {
        requests.push({ insertText: { objectId: slideId, text: `\n${slide.bullets.map(b => `• ${b}`).join('\n')}`, insertionIndex: slide.title.length } });
      }
    }

    // Step 5: Batch update the presentation with the new slides.
    if (requests.length > 0) {
      await slidesService.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests,
        },
      });
    }

    // Step 6: Share the presentation with the user.
    await driveService.permissions.create({
      fileId: presentationId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: userEmail,
      },
    });

    // Step 7: Return the URL of the created presentation.
    const presentationUrl = presentation.data.presentationUrl;
    if (!presentationUrl) {
      throw new Error('Could not retrieve presentation URL.');
    }

    return { presentationUrl };
  }
);
