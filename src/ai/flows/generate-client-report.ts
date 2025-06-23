
'use server';
/**
 * @fileOverview A Genkit flow to generate a polished, client-facing PDF report.
 * This version uses JSPDF for robust, programmatic PDF creation, avoiding heavy
 * dependencies like Puppeteer.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Ensure the plugin is imported
import {
  DocumentGenerationInputSchema,
  DocumentGenerationOutputSchema,
} from '@/lib/types';
import type { DocumentGenerationInput, DocumentGenerationOutput } from '@/lib/types';

// Extend jsPDF with the autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

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
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    let currentY = 20;

    // --- Helper Functions ---
    const addHeader = () => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Client Update', 20, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString(), pageWidth - 20, currentY, { align: 'right' });
        currentY += 5;
        doc.setDrawColor(200);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 15;
    };

    const addFooter = () => {
        const pageCount = doc.internal.pages.length;
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`CONFIDENTIAL & PRIVILEGED | Tribunal Genesis`, 20, pageHeight - 10);
            doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
        }
    };
    
    const addSectionTitle = (title: string) => {
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 20;
            addHeader();
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(70, 80, 90); // Slate Gray
        doc.text(title, 20, currentY);
        currentY += 8;
    }

    const addBodyText = (text: string) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50);
        const splitText = doc.splitTextToSize(text, pageWidth - 40);
        doc.text(splitText, 20, currentY);
        currentY += (splitText.length * 5) + 8;
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
    doc.rect(20, currentY, pageWidth - 40, 18, 'F');
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
    doc.autoTable({
        startY: currentY,
        head: [['Type', 'Description']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [70, 80, 90] },
        didDrawPage: (data) => {
            currentY = data.cursor?.y ? data.cursor.y + 10 : currentY;
        }
    });

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
