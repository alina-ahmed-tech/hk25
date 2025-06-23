
'use server';
/**
 * @fileOverview A Genkit flow to generate a professional, partner-ready internal case strategy memo in DOCX format.
 * This version uses a more robust Markdown-based content generation strategy to improve reliability.
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
  PageBreak,
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

// A simple schema for the AI to return a single Markdown string.
const MarkdownMemoSchema = z.object({
  memoContent: z.string().describe("The full content of the internal memo, formatted as a single Markdown string. Use '#' for headings and '*' for list items."),
});

const internalMemoPrompt = ai.definePrompt({
  name: 'generateInternalMemoMarkdownPrompt',
  input: { schema: z.object({ analysis: DocumentGenerationInputSchema.shape.analysis }) },
  output: { schema: MarkdownMemoSchema },
  prompt: `You are a highly structured legal analyst. Your task is to synthesize the provided AI analysis into a comprehensive Internal Strategy Memo. Generate the entire memo as a single, well-formatted Markdown string.

Use the following structure precisely:
# I. Executive Summary
(Provide a concise summary of the case, strategy, and key outcomes.)

# II. Risk Analysis
(For each identified weakness, create a sub-heading and a bulleted list.)
## [Weakness Title]
* **Vulnerability Score**: [Score]/10
* **Description**: [Detailed description of the risk.]

# III. Strategic Recommendations
(For each refined strategy point, create a sub-heading and a paragraph.)
## [Pillar Title]
(Detailed rationale for the recommendation.)

# IV. Action Plan
(Create bullet points for each actionable task.)
* [Actionable task 1]
* [Actionable task 2]

# V. Appendix: Research Log
(For each relevant case citation, create a sub-heading and a structured entry.)
## [Case Name]
* **Summary**: [Brief summary of the case.]
* **Quote**: "[Direct quote from the case.]"
* **Relevance**: [Explanation of the case's relevance.]

Analysis Data to Synthesize:
\`\`\`json
{{{analysis}}}
\`\`\`
`,
});

// Function to parse the Markdown and build the DOCX document
const createDocFromMarkdown = async (markdown: string, projectName: string): Promise<Buffer> => {
    const doc = new Document({
        creator: 'Tribunal Genesis',
        title: `Internal Strategy Memo: ${projectName}`,
        styles: {
            paragraphStyles: [
                { id: 'Heading1TG', name: 'Heading 1 - TG', basedOn: 'Heading1', next: 'Normal', run: { size: 32, bold: true, color: '2E74B5' } },
                { id: 'Heading2TG', name: 'Heading 2 - TG', basedOn: 'Heading2', next: 'Normal', run: { size: 26, bold: true, color: '444444' } },
                { id: 'BodyTextTG', name: 'Body Text - TG', basedOn: 'Normal', quickFormat: true, run: { size: 22 } },
                { id: 'CitationTG', name: 'Citation - TG', basedOn: 'Normal', quickFormat: true, run: { size: 20, italics: true, color: '595959' } },
            ],
        },
    });

    const children: Paragraph[] = [
        new Paragraph({ text: 'Internal Strategy Memorandum', heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `RE: ${projectName}`, style: 'BodyTextTG' }),
        new Paragraph({ text: `DATE: ${new Date().toLocaleDateString()}`, style: 'BodyTextTG' }),
        new Paragraph({ text: '' }), // Spacer
    ];

    const lines = markdown.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('# ')) {
            children.push(new Paragraph({ text: trimmedLine.substring(2), heading: HeadingLevel.HEADING_1, style: 'Heading1TG', spacing: { before: 200, after: 100 } }));
        } else if (trimmedLine.startsWith('## ')) {
            children.push(new Paragraph({ text: trimmedLine.substring(3), heading: HeadingLevel.HEADING_2, style: 'Heading2TG', spacing: { before: 150, after: 80 } }));
        } else if (trimmedLine.startsWith('* ')) {
            // Handle bold text within bullet points
            const textRuns: TextRun[] = [];
            const parts = trimmedLine.substring(2).split('**');
            parts.forEach((part, index) => {
                if (index % 2 === 1) { // Bold part
                    textRuns.push(new TextRun({ text: part, bold: true }));
                } else {
                    textRuns.push(new TextRun(part));
                }
            });
            children.push(new Paragraph({ children: textRuns, bullet: { level: 0 }, style: 'BodyTextTG' }));
        } else if (trimmedLine) {
            children.push(new Paragraph({ text: trimmedLine, style: 'BodyTextTG' }));
        } else {
            children.push(new Paragraph({ text: '' })); // Preserve empty lines as spacers
        }
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
    // Step 1: Generate structured content from the AI as a single Markdown string.
    const { output } = await internalMemoPrompt({ analysis });

    if (!output?.memoContent) {
      throw new Error('AI failed to generate valid memo content.');
    }
    
    // Step 2: Programmatically build the DOCX document from the Markdown.
    const docBuffer = await createDocFromMarkdown(output.memoContent, projectName);
    
    // Step 3: Convert the document buffer to Base64.
    const base64String = docBuffer.toString('base64');

    return {
      fileName: `Internal_Memo_${projectName.replace(/ /g, '_')}.docx`,
      fileContent: base64String,
    };
  }
);
