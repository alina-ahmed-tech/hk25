
'use server';
/**
 * @fileOverview A Genkit flow to generate a polished, client-facing PDF report.
 * This version uses JSPDF for robust, programmatic PDF creation, avoiding heavy
 * dependencies like Puppeteer and problematic plugins.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { jsPDF } from 'jspdf';
import {
  DocumentGenerationInputSchema,
  DocumentGenerationOutputSchema,
} from '@/lib/types';
import type { DocumentGenerationInput, DocumentGenerationOutput } from '@/lib/types';

// Define a schema for the structured text content the AI will generate
const ClientReportContentSchema = z.object({
    report_title: z.string().describe("A concise title for the report."),
    executive_takeaway: z.string().describe("A single, powerful sentence summarizing the key takeaway for the client."),
    current_situation: z.string().describe("A brief, clear summary of the current state of the case."),
    risks_and_opportunities: z.array(z.object({
        type: z.enum(['Risk', 'Opportunity']),
        description: z.string()
    })).describe("A list of identified risks and opportunities, each with a type and description."),
    our_recommended_path_forward: z.string().describe("A high-level description of the recommended strategy and its benefits.")
});
type ClientReportContent = z.infer<typeof ClientReportContentSchema>;


export async function generateClientReport(input: DocumentGenerationInput): Promise<DocumentGenerationOutput> {
  return generateClientReportFlow(input);
}

const clientReportPrompt = ai.definePrompt({
  name: 'generateClientReportContentPrompt',
  input: { schema: z.object({ analysis: DocumentGenerationInputSchema.shape.analysis }) },
  output: { schema: ClientReportContentSchema },
  prompt: `You are a strategic legal consultant reporting to a CEO. Your task is to translate the provided dense legal analysis into a clear, concise, and business-focused JSON object suitable for a client report. The tone must be confident and strategic, avoiding jargon.

Analysis Data:
\`\`\`json
{{{analysis}}}
\`\`\`

Strictly adhere to the following JSON schema:
- report_title: A concise title for the report.
- executive_takeaway: A single, powerful sentence summarizing the key takeaway for the client.
- current_situation: A brief, clear summary of the current state of the case.
- risks_and_opportunities: A list of objects, each with a 'type' ('Risk' or 'Opportunity') and a 'description'.
- our_recommended_path_forward: A high-level description of the recommended strategy and its benefits.
`,
});

const generateClientReportFlow = ai.defineFlow(
  {
    name: 'generateClientReportFlow',
    inputSchema: DocumentGenerationInputSchema,
    outputSchema: DocumentGenerationOutputSchema,
  },
  async ({ analysis, projectName }) => {
    // Step 1: Generate structured content.
    const { output: reportContent } = await clientReportPrompt({ analysis });

    if (!reportContent) {
      throw new Error('AI failed to generate valid report content.');
    }

    // Step 2: Programmatically create the PDF using jsPDF.
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = 20;
    const margin = 20;
    const cellPadding = 3;
    const tableColWidths = [30, pageWidth - 40 - 30];

    // --- Helper Functions ---
    const addHeader = () => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Client Update', margin, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), pageWidth - margin, currentY, { align: 'right' });
        currentY += 5;
        doc.setDrawColor(200);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 15;
    };

    const addFooter = () => {
        const pageCount = (doc.internal as any).pages.length;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`CONFIDENTIAL & PRIVILEGED | Tribunal Genesis`, margin, pageHeight - 10);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
    };
    
    const addSectionTitle = (title: string) => {
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = margin;
            addHeader();
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(70, 80, 90); // Slate Gray
        doc.text(title, margin, currentY);
        currentY += 8;
    }

    const addBodyText = (text: string) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50);
        const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
        doc.text(splitText, margin, currentY);
        currentY += (splitText.length * 5) + 8;
    }

    const drawTable = (headers: string[], data: string[][]) => {
      // Draw Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setFillColor(70, 80, 90);
      doc.setTextColor(255);
      doc.rect(margin, currentY, tableColWidths[0] + tableColWidths[1], 10, 'F');
      doc.text(headers[0], margin + cellPadding, currentY + 7);
      doc.text(headers[1], margin + tableColWidths[0] + cellPadding, currentY + 7);
      currentY += 10;
      doc.setTextColor(50);

      // Draw Rows
      data.forEach(row => {
          doc.setFont('helvetica', 'normal');
          const typeText = doc.splitTextToSize(row[0], tableColWidths[0] - (cellPadding * 2));
          const descText = doc.splitTextToSize(row[1], tableColWidths[1] - (cellPadding * 2));
          const rowHeight = Math.max(typeText.length, descText.length) * 5 + (cellPadding * 2);

          if (currentY + rowHeight > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
          }
          
          doc.setDrawColor(200);
          doc.line(margin, currentY, pageWidth - margin, currentY); // Top border
          
          doc.text(typeText, margin + cellPadding, currentY + cellPadding + 3);
          doc.text(descText, margin + tableColWidths[0] + cellPadding, currentY + cellPadding + 3);
          
          currentY += rowHeight;
      });
      doc.setDrawColor(200);
      doc.line(margin, currentY, pageWidth - margin, currentY); // Bottom border of last row
      currentY += 10;
    }
    
    // --- Build PDF Document ---
    addHeader();
    
    // Title
    doc.setFontSize(24);
    doc.setFont('times', 'bold');
    doc.setTextColor(0);
    doc.text(reportContent.report_title, pageWidth / 2, currentY, { align: 'center'});
    currentY += 15;
    
    // Executive Takeaway
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin*2), 18, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(80);
    addBodyText(`"${reportContent.executive_takeaway}"`);
    currentY += 10;
    
    // Current Situation
    addSectionTitle('Current Situation');
    addBodyText(reportContent.current_situation);
    
    // Risks & Opportunities Table
    addSectionTitle('Risks & Opportunities');
    const tableData = (reportContent.risks_and_opportunities || []).map(item => [item.type, item.description]);
    drawTable(['Type', 'Description'], tableData);
    
    // Recommended Path
    addSectionTitle('Our Recommended Path Forward');
    addBodyText(reportContent.our_recommended_path_forward);

    // Finalize
    addFooter();
    const pdfOutput = doc.output('arraybuffer');
    const base64String = Buffer.from(pdfOutput).toString('base64');
    
    return {
      fileName: `Client_Report_${projectName.replace(/ /g, '_')}.pdf`,
      fileContent: base64String,
    };
  }
);
