
'use server';
/**
 * @fileOverview A Genkit flow to generate a polished, client-facing PDF report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import puppeteer from 'puppeteer';
import {
  DocumentGenerationInputSchema,
  DocumentGenerationOutputSchema,
  ClientReportSchema,
} from '@/lib/types';
import type { DocumentGenerationInput, DocumentGenerationOutput, ClientReport } from '@/lib/types';

export async function generateClientReport(input: DocumentGenerationInput): Promise<DocumentGenerationOutput> {
  return generateClientReportFlow(input);
}

const clientReportPrompt = ai.definePrompt({
  name: 'generateClientReportContentPrompt',
  input: { schema: z.object({ analysis: DocumentGenerationInputSchema.shape.analysis }) },
  output: { schema: ClientReportSchema },
  prompt: `You are a strategic legal consultant reporting to a CEO. Translate the provided dense legal analysis into a clear, concise, and business-focused JSON object for a client report. The tone must be confident and strategic, avoiding jargon. The JSON must have the following keys: report_title, executive_takeaway (a single, powerful sentence), current_situation (a brief summary), identified_risks_and_opportunities (a list of simple, bulleted items), and our_recommended_path_forward (a high-level description of the new strategy and its benefits).

Analysis Data:
\`\`\`json
{{{analysis}}}
\`\`\`
`,
});

const generateHtml = (content: ClientReport, projectName: string, caseStrength: number): string => {
  const risksAndOpportunitiesHtml = content.identified_risks_and_opportunities
    .map(item => `<li>${item}</li>`)
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${content.report_title}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap');
            body { 
                font-family: 'PT Sans', sans-serif; 
                color: #333; 
                line-height: 1.6; 
                margin: 0;
                background-color: #fff;
            }
            .page {
                width: 210mm;
                height: 297mm;
                padding: 20mm;
                box-sizing: border-box;
                background-color: white;
                page-break-after: always;
                display: flex;
                flex-direction: column;
            }
            .header, .footer {
                flex-shrink: 0;
                padding-bottom: 10px;
                border-bottom: 1px solid #ccc;
            }
            .footer {
                padding-top: 10px;
                border-top: 1px solid #ccc;
                border-bottom: none;
                margin-top: auto;
                font-size: 10px;
                text-align: center;
                color: #777;
            }
            .content { flex-grow: 1; }
            h1, h2, h3 { font-family: 'Playfair Display', serif; color: #708090; }
            h1 { font-size: 32pt; margin-bottom: 0; text-align: center; }
            h2 { font-size: 20pt; border-bottom: 2px solid #D4A27A; padding-bottom: 5px; margin-top: 20px;}
            h3 { font-size: 16pt; color: #708090; }
            .executive-takeaway {
                background-color: #F0F0F0;
                border-left: 5px solid #D4A27A;
                padding: 15px;
                margin: 20px 0;
                font-size: 14pt;
                font-weight: bold;
                color: #555;
            }
            ul {
                list-style-type: none;
                padding-left: 0;
            }
            li {
                position: relative;
                padding-left: 25px;
                margin-bottom: 10px;
            }
            li::before {
                content: '•';
                position: absolute;
                left: 0;
                color: #D4A27A;
                font-size: 20px;
                line-height: 1;
            }
            .strength-meter { margin-top: 15px; }
            .strength-label { font-size: 11pt; font-weight: bold; color: #555; margin-bottom: 5px; }
            .strength-bar-container { background-color: #e0e0e0; border-radius: 5px; height: 20px; width: 100%; }
            .strength-bar { background-color: #708090; height: 100%; border-radius: 5px; text-align: right; color: white; line-height: 20px; padding-right: 5px; box-sizing: border-box; }
        </style>
    </head>
    <body>
        <div class="page">
            <div class="header">
                <h3>Client Update: ${projectName}</h3>
            </div>
            <div class="content">
                <h1>${content.report_title}</h1>
                <div class="executive-takeaway">${content.executive_takeaway}</div>
                
                <h2>Current Situation</h2>
                <p>${content.current_situation}</p>

                <div class="strength-meter">
                    <div class="strength-label">Current Estimated Case Strength</div>
                    <div class="strength-bar-container">
                        <div class="strength-bar" style="width: ${caseStrength}%;">${caseStrength}%</div>
                    </div>
                </div>

                <h2>Identified Risks & Opportunities</h2>
                <ul>${risksAndOpportunitiesHtml}</ul>

                <h2>Our Recommended Path Forward</h2>
                <p>${content.our_recommended_path_forward}</p>
            </div>
            <div class="footer">
                CONFIDENTIAL & PRIVILEGED | ${new Date().toLocaleDateString()} | Tribunal Genesis
            </div>
        </div>
    </body>
    </html>
  `;
};

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
    
    // Step 2: Extract case strength for visualization.
    const parsedAnalysis = JSON.parse(analysis);
    const caseStrength = parsedAnalysis?.arbiterSynthesis?.predictiveAnalysis?.confidenceLevel * 100 || 50;

    // Step 3: Generate HTML.
    const html = generateHtml(reportContent, projectName, Math.round(caseStrength));
    
    // Step 4: Convert HTML to PDF using Puppeteer.
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Step 5: Convert buffer to Base64 string.
    const base64String = pdfBuffer.toString('base64');
    
    return {
      fileName: `Client_Report_${projectName.replace(/ /g, '_')}.pdf`,
      fileContent: base64String,
    };
  }
);
