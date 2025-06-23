'use server';

import { generateInternalMemo as generateInternalMemoFlow } from '@/ai/flows/generate-internal-memo';
import { generateClientReport as generateClientReportFlow } from '@/ai/flows/generate-client-report';
import type { DocumentGenerationInput, DocumentGenerationOutput } from '@/lib/types';

export async function generateInternalMemo(
    input: DocumentGenerationInput
): Promise<DocumentGenerationOutput> {
    return await generateInternalMemoFlow(input);
}

export async function generateClientReport(
    input: DocumentGenerationInput
): Promise<DocumentGenerationOutput> {
    return await generateClientReportFlow(input);
}
