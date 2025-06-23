
'use server';
/**
 * @fileOverview A Genkit flow to generate a professional, partner-ready internal case strategy memo in DOCX format.
 * This version uses a robust JSON-based content generation strategy to improve reliability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import {
  DocumentGenerationInputSchema,
  DocumentGenerationOutputSchema,
} from '@/lib/types';
import type { DocumentGenerationInput, DocumentGenerationOutput } from '@/lib/types';

export async function generateInternalMemo(input: DocumentGenerationInput): Promise<DocumentGenerationOutput> {
  return generateInternalMemoFlow(input);
}

// Define a structured schema for the AI to return the memo content.
const InternalMemoContentSchema = z.object({
  executiveSummary: z.string().describe("A concise summary of the case, strategy, and key outcomes."),
  riskAnalysis: z.array(z.object({
    title: z.string().describe("The title of the weakness/risk."),
    vulnerabilityScore: z.number().describe("The vulnerability score from 1-10."),
    description: z.string().describe("A detailed description of the risk."),
  })).describe("A list of identified risks. Provide an empty array if there are none."),
  strategicRecommendations: z.array(z.object({
    title: z.string().describe("The title or pillar of the recommendation."),
    rationale: z.string().describe("The detailed rationale for this recommendation."),
  })).describe("A list of strategic recommendations. Provide an empty array if there are none."),
  actionPlan: z.array(z.string()).describe("A list of actionable tasks as strings. Provide an empty array if there are none."),
  researchLog: z.array(z.object({
    caseName: z.string().describe("The name of the cited case."),
    summary: z.string().describe("A brief summary of the case."),
    quote: z.string().describe("A direct, impactful quote from the case."),
    relevance: z.string().describe("An explanation of the case's relevance."),
  })).describe("A list of relevant case citations and details. Provide an empty array if there are none."),
});
type InternalMemoContent = z.infer<typeof InternalMemoContentSchema>;

const internalMemoPrompt = ai.definePrompt({
  name: 'generateInternalMemoContentPrompt',
  input: { schema: z.object({ analysis: DocumentGenerationInputSchema.shape.analysis }) },
  output: { schema: InternalMemoContentSchema },
  prompt: `You are a highly structured legal analyst. Your task is to synthesize the provided AI analysis into a comprehensive JSON object for an Internal Strategy Memo. Adhere strictly to the JSON schema provided.

Extract and summarize the information from the analysis data below to populate all fields in the schema.

Analysis Data to Synthesize:
\`\`\`json
{{{analysis}}}
\`\`\`
`,
});

// Function to build the DOCX document from structured JSON content
const createDocFromContent = async (content: InternalMemoContent, projectName: string): Promise<Buffer> => {
    const doc = new Document({
        creator: 'Tribunal Genesis',
        title: `Internal Strategy Memo: ${projectName}`,
        styles: {
            paragraphStyles: [
                { id: 'Heading1TG', name: 'Heading 1 - TG', basedOn: 'Heading1', next: 'Normal', run: { size: 32, bold: true, color: '2E74B5' }, paragraph: { spacing: { before: 240, after: 120 } } },
                { id: 'Heading2TG', name: 'Heading 2 - TG', basedOn: 'Heading2', next: 'Normal', run: { size: 26, bold: true, color: '444444' }, paragraph: { spacing: { before: 200, after: 100 } } },
                { id: 'BodyTextTG', name: 'Body Text - TG', basedOn: 'Normal', quickFormat: true, run: { size: 22 } },
            ],
        },
    });

    const children: Paragraph[] = [
        new Paragraph({ text: 'Internal Strategy Memorandum', heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `RE: ${projectName}`, style: 'BodyTextTG' }),
        new Paragraph({ text: `DATE: ${new Date().toLocaleDateString()}`, style: 'BodyTextTG' }),
        new Paragraph({ text: '' }),
    ];
    
    // I. Executive Summary
    children.push(new Paragraph({ text: 'I. Executive Summary', style: 'Heading1TG' }));
    children.push(new Paragraph({ text: content.executiveSummary || "No summary provided.", style: 'BodyTextTG' }));

    // II. Risk Analysis
    children.push(new Paragraph({ text: 'II. Risk Analysis', style: 'Heading1TG' }));
    if (content.riskAnalysis?.length > 0) {
        (content.riskAnalysis).forEach(risk => {
            children.push(new Paragraph({ text: risk.title || 'Untitled Risk', style: 'Heading2TG' }));
            children.push(new Paragraph({ text: `Vulnerability Score: ${risk.vulnerabilityScore || 'N/A'}/10`, bullet: { level: 0 }, style: 'BodyTextTG' }));
            children.push(new Paragraph({ text: `Description: ${risk.description || 'Not provided.'}`, bullet: { level: 0 }, style: 'BodyTextTG' }));
        });
    } else {
        children.push(new Paragraph({ text: 'No significant risks were identified.', style: 'BodyTextTG' }));
    }

    // III. Strategic Recommendations
    children.push(new Paragraph({ text: 'III. Strategic Recommendations', style: 'Heading1TG' }));
    if (content.strategicRecommendations?.length > 0) {
        (content.strategicRecommendations).forEach(rec => {
            children.push(new Paragraph({ text: rec.title || 'Untitled Recommendation', style: 'Heading2TG' }));
            children.push(new Paragraph({ text: rec.rationale || 'No rationale provided.', style: 'BodyTextTG' }));
        });
    } else {
        children.push(new Paragraph({ text: 'No specific strategic recommendations were generated.', style: 'BodyTextTG' }));
    }
    
    // IV. Action Plan
    children.push(new Paragraph({ text: 'IV. Action Plan', style: 'Heading1TG' }));
    if (content.actionPlan?.length > 0) {
        (content.actionPlan).forEach(task => {
            children.push(new Paragraph({ text: task, bullet: { level: 0 }, style: 'BodyTextTG' }));
        });
    } else {
        children.push(new Paragraph({ text: 'No action plan was generated.', style: 'BodyTextTG' }));
    }

    // V. Appendix: Research Log
    children.push(new Paragraph({ text: 'V. Appendix: Research Log', style: 'Heading1TG' }));
     if (content.researchLog?.length > 0) {
        (content.researchLog).forEach(log => {
            children.push(new Paragraph({ text: log.caseName || 'Untitled Case', style: 'Heading2TG' }));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Summary: ', bold: true }), new TextRun(log.summary || 'N/A')] , style: 'BodyTextTG'}));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Quote: ', bold: true }), new TextRun({text: `"${log.quote || 'N/A'}"`, italics: true})] , style: 'BodyTextTG'}));
            children.push(new Paragraph({ children: [new TextRun({ text: 'Relevance: ', bold: true }), new TextRun(log.relevance || 'N/A')] , style: 'BodyTextTG'}));
        });
    } else {
        children.push(new Paragraph({ text: 'No research log was generated.', style: 'BodyTextTG' }));
    }


    doc.addSection({
        headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, text: `Internal Memo: ${projectName}` })] }) },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })] })] }) },
        children,
    });
    
    return Packer.toBuffer(doc);
};


const generateInternalMemoFlow = ai.defineFlow(
  {
    name: 'generateInternalMemoFlow',
    inputSchema: DocumentGenerationInputSchema,
    outputSchema: DocumentGenerationOutputSchema,
  },
  async ({ analysis, projectName }) => {
    // Step 1: Generate structured content from the AI as a JSON object.
    const { output } = await internalMemoPrompt({ analysis });

    if (!output) {
      throw new Error('AI failed to generate valid memo content.');
    }
    
    // Step 2: Programmatically build the DOCX document from the JSON content.
    const docBuffer = await createDocFromContent(output, projectName);
    
    // Step 3: Convert the document buffer to Base64.
    const base64String = docBuffer.toString('base64');

    return {
      fileName: `Internal_Memo_${projectName.replace(/ /g, '_')}.docx`,
      fileContent: base64String,
    };
  }
);
