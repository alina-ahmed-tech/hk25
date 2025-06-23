
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { FileDown, FileText, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInternalMemo, generateClientReport } from '@/lib/doc-actions';
import { getAIErrorMessage } from '@/lib/utils';
import type { Analysis } from '@/lib/types';
import { saveAs } from 'file-saver';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DocumentGenerationButtonProps = {
  projectName: string;
  analysis: Analysis;
};

type ButtonState = 'idle' | 'memo-loading' | 'report-loading' | 'error';

// Helper to convert Base64 to Blob
const base64ToBlob = (base64: string, contentType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
};

export function DocumentGenerationButton({ projectName, analysis }: DocumentGenerationButtonProps) {
  const { toast } = useToast();
  const [state, setState] = useState<ButtonState>('idle');

  // This effect handles resetting the button after an error.
  useEffect(() => {
    if (state === 'error') {
      const timer = setTimeout(() => {
        setState('idle');
      }, 3000); // Reset after 3 seconds

      // Cleanup the timer if the component unmounts or state changes
      return () => clearTimeout(timer);
    }
  }, [state]);


  const handleGenerateMemo = async () => {
    if (state !== 'idle') return;
    setState('memo-loading');

    try {
      const result = await generateInternalMemo({
        projectName,
        analysis: JSON.stringify(analysis),
      });

      const blob = base64ToBlob(result.fileContent, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      saveAs(blob, result.fileName);
      toast({ title: 'Download Started', description: 'Your internal memo is downloading.' });
      setState('idle');

    } catch (err) {
      console.error('Error generating internal memo:', err);
      toast({ title: 'Generation Failed', description: getAIErrorMessage(err), variant: 'destructive' });
      setState('error');
    }
  };

  const handleGenerateReport = async () => {
    if (state !== 'idle') return;
    setState('report-loading');
    try {
      const result = await generateClientReport({
        projectName,
        analysis: JSON.stringify(analysis),
      });

      const blob = base64ToBlob(result.fileContent, 'application/pdf');
      saveAs(blob, result.fileName);
      toast({ title: 'Download Started', description: 'Your client report is downloading.' });
      setState('idle');

    } catch (err) {
      console.error('Error generating client report:', err);
      toast({ title: 'Generation Failed', description: getAIErrorMessage(err), variant: 'destructive' });
      setState('error');
    }
  };

  const isLoading = state === 'memo-loading' || state === 'report-loading';

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button disabled={isLoading}>
                {isLoading ? <Spinner className="mr-2" /> : <FileDown className="mr-2" />}
                {state === 'memo-loading' ? 'Generating Memo...' : state === 'report-loading' ? 'Generating Report...' : 'Generate Document'}
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuLabel>Select a document to generate</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleGenerateMemo} disabled={isLoading}>
                <FileSignature className="mr-2" />
                Internal Case Memo (.docx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleGenerateReport} disabled={isLoading}>
                <FileText className="mr-2" />
                Client Update Report (.pdf)
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
