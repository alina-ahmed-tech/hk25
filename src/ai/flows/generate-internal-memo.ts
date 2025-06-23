
'use server';
/**
 * @fileOverview A Genkit flow to generate a professional, partner-ready internal case strategy memo in DOCX format.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  DocumentGenerationInputSchema,
  DocumentGenerationOutputSchema,
  InternalMemoSchema,
} from '@/lib/types';
import type { DocumentGenerationInput, DocumentGenerationOutput, InternalMemo } from '@/lib/types';

export async function generateInternalMemo(input: DocumentGenerationInput): Promise<DocumentGenerationOutput> {
  return generateInternalMemoFlow(input);
}

const internalMemoPrompt = ai.definePrompt({
  name: 'generateInternalMemoContentPrompt',
  input: { schema: z.object({ analysis: DocumentGenerationInputSchema.shape.analysis }) },
  output: { schema: InternalMemoSchema },
  prompt: `You are a highly structured legal analyst. Based on the provided AI analysis data, generate a structured JSON object for an Internal Strategy Memo. The JSON must have the following top-level keys: executive_summary, risk_analysis, strategic_recommendations, action_plan, and research_log.
- For risk_analysis, provide a list of objects, each with risk_title, description, and vulnerability_score.
- For strategic_recommendations, provide a list of objects, each with pillar_title and detailed_rationale.
- For action_plan, provide a list of objects grouped by category (e.g., 'Evidentiary Development'), each with task_description.
- For research_log, provide a list of objects, each with case_name, case_summary, source_quote, and ai_reasoning.

Analysis Data:
\`\`\`json
{{{analysis}}}
\`\`\`
`,
});

const generateInternalMemoFlow = ai.defineFlow(
  {
    name: 'generateInternalMemoFlow',
    inputSchema: DocumentGenerationInputSchema,
    outputSchema: DocumentGenerationOutputSchema,
  },
  async ({ analysis, projectName }) => {
    // Dynamically import 'docx' only when this flow is called.
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      AlignmentType,
      PageBreak,
      Header,
      Footer,
      PageNumber,
    } = await import('docx');

    // Step 1: Generate structured content from the AI.
    const { output: memoContent } = await internalMemoPrompt({ analysis });

    if (!memoContent) {
      throw new Error('AI failed to generate valid memo content.');
    }
    
    // Step 2: Programmatically build the DOCX document.
    const styles = {
      paragraphStyles: [
        { id: 'Heading1TG', name: 'Heading 1 - TG', basedOn: 'Heading1', next: 'Normal', run: { size: 32, bold: true, color: '2E74B5' } },
        { id: 'Heading2TG', name: 'Heading 2 - TG', basedOn: 'Heading2', next: 'Normal', run: { size: 26, bold: true } },
        { id: 'BodyTextTG', name: 'Body Text - TG', basedOn: 'Normal', quickFormat: true, run: { size: 22 } },
        { id: 'CitationTG', name: 'Citation - TG', basedOn: 'Normal', quickFormat: true, run: { size: 20, italics: true, color: '595959' } },
        { id: 'AppendixHeaderTG', name: 'Appendix Header - TG', basedOn: 'Heading1', next: 'Normal', run: { size: 28, bold: true, color: 'BF9000' } },
      ],
    };

    const doc = new Document({
      creator: 'Tribunal Genesis',
      title: `Internal Strategy Memo: ${projectName}`,
      styles,
      sections: [{
        headers: {
            default: new Header({
                children: [new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun(`Internal Memo: ${projectName}`)],
                })],
            }),
        },
        footers: {
            default: new Footer({
                children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ children: [PageNumber.CURRENT] })],
                })],
            }),
        },
        children: [
            new Paragraph({ text: 'Internal Strategy Memorandum', heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `RE: ${projectName}`, heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),
            new Paragraph({ text: `DATE: ${new Date().toLocaleDateString()}`, heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),

            new Paragraph({ text: 'I. Executive Summary', heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),
            new Paragraph({ text: memoContent.executive_summary || '', style: 'BodyTextTG' }),

            new Paragraph({ text: 'II. Risk Analysis', heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),
            ...(memoContent.risk_analysis || []).flatMap(risk => [
                new Paragraph({ text: risk.risk_title || 'Untitled Risk', heading: HeadingLevel.HEADING_2, style: 'Heading2TG' }),
                new Paragraph({ text: `Vulnerability Score: ${risk.vulnerability_score || 'N/A'}/10`, style: 'BodyTextTG', run: { bold: true } }),
                new Paragraph({ text: risk.description || 'No description provided.', style: 'BodyTextTG' }),
            ]),
            
            new Paragraph({ text: 'III. Strategic Recommendations', heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),
            ...(memoContent.strategic_recommendations || []).flatMap(rec => [
                new Paragraph({ text: rec.pillar_title || 'Untitled Recommendation', heading: HeadingLevel.HEADING_2, style: 'Heading2TG' }),
                new Paragraph({ text: rec.detailed_rationale || 'No rationale provided.', style: 'BodyTextTG' }),
            ]),

            new Paragraph({ text: 'IV. Action Plan', heading: HeadingLevel.HEADING_1, style: 'Heading1TG' }),
            ...(memoContent.action_plan || []).flatMap(item => [
                new Paragraph({ text: `Category: ${item.category || 'Uncategorized'}`, heading: HeadingLevel.HEADING_2, style: 'Heading2TG' }),
                new Paragraph({ text: item.task_description || 'No task description.', style: 'BodyTextTG', bullet: { level: 0 } }),
            ]),

            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ text: 'Appendix: Research Log', heading: HeadingLevel.HEADING_1, style: 'AppendixHeaderTG' }),
            ...(memoContent.research_log || []).flatMap(log => [
                new Paragraph({ text: log.case_name || 'Unknown Case', heading: HeadingLevel.HEADING_2, style: 'Heading2TG' }),
                new Paragraph({ text: `Summary: ${log.case_summary || ''}`, style: 'BodyTextTG' }),
                new Paragraph({ text: `Key Quote: "${log.source_quote || ''}"`, style: 'CitationTG' }),
                new Paragraph({ text: `AI Reasoning: ${log.ai_reasoning || ''}`, style: 'BodyTextTG' }),
                new Paragraph({ text: '' }), // Spacer
            ]),
        ],
      }],
    });
    
    // Step 3: Convert the document to Base64.
    const base64String = await Packer.toBase64(doc);

    return {
      fileName: `Internal_Memo_${projectName.replace(/ /g, '_')}.docx`,
      fileContent: base64String,
    };
  }
);
