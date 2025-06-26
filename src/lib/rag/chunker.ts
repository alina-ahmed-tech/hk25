import { CaseData, DocumentChunk } from './types';

export class DocumentChunker {
  private chunkSize: number;
  private overlap: number;

  constructor(chunkSize: number = 500, overlap: number = 50) {
    this.chunkSize = chunkSize;
    this.overlap = overlap;
  }

  /**
   * Split text into chunks with overlap
   */
  private splitText(text: string): string[] {
    if (text.length <= this.chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      let chunk = text.slice(start, end);

      // Try to break at sentence boundaries
      if (end < text.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewline = chunk.lastIndexOf('\n');
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + this.chunkSize * 0.7) {
          chunk = chunk.slice(0, breakPoint + 1);
          start = start + breakPoint + 1;
        } else {
          start = end - this.overlap;
        }
      } else {
        start = end;
      }

      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  /**
   * Convert case data into document chunks
   */
  chunkCase(caseData: CaseData): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let chunkIndex = 0;

    // Process each decision
    caseData.Decisions.forEach((decision, decisionIndex) => {
      // Create chunks from decision content
      const decisionChunks = this.splitText(decision.Content);
      
      decisionChunks.forEach((chunk, chunkIndex) => {
        chunks.push({
          id: `${caseData.Identifier}-decision-${decisionIndex}-${chunkIndex}`,
          content: chunk,
          metadata: {
            caseId: caseData.Identifier,
            caseTitle: caseData.Title,
            documentType: 'Decision',
            documentTitle: decision.Title,
            date: decision.Date,
            chunkIndex: chunkIndex,
            totalChunks: decisionChunks.length
          }
        });
      });

      // Process each opinion within the decision
      decision.Opinions.forEach((opinion, opinionIndex) => {
        const opinionChunks = this.splitText(opinion.Content);
        
        opinionChunks.forEach((chunk, chunkIndex) => {
          chunks.push({
            id: `${caseData.Identifier}-opinion-${decisionIndex}-${opinionIndex}-${chunkIndex}`,
            content: chunk,
            metadata: {
              caseId: caseData.Identifier,
              caseTitle: caseData.Title,
              documentType: 'Opinion',
              documentTitle: opinion.Title,
              date: opinion.Date,
              chunkIndex: chunkIndex,
              totalChunks: opinionChunks.length
            }
          });
        });
      });
    });

    return chunks;
  }

  /**
   * Chunk multiple cases
   */
  chunkCases(cases: CaseData[]): DocumentChunk[] {
    const allChunks: DocumentChunk[] = [];
    
    cases.forEach(caseData => {
      const caseChunks = this.chunkCase(caseData);
      allChunks.push(...caseChunks);
    });

    return allChunks;
  }

  /**
   * Get chunking statistics
   */
  getChunkingStats(chunks: DocumentChunk[]): {
    totalChunks: number;
    avgChunkLength: number;
    minChunkLength: number;
    maxChunkLength: number;
    chunksByType: Record<string, number>;
  } {
    if (chunks.length === 0) {
      return {
        totalChunks: 0,
        avgChunkLength: 0,
        minChunkLength: 0,
        maxChunkLength: 0,
        chunksByType: {}
      };
    }

    const lengths = chunks.map(chunk => chunk.content.length);
    const totalLength = lengths.reduce((sum, len) => sum + len, 0);
    const avgLength = totalLength / lengths.length;
    
    const chunksByType: Record<string, number> = {};
    chunks.forEach(chunk => {
      const type = chunk.metadata.documentType;
      chunksByType[type] = (chunksByType[type] || 0) + 1;
    });

    return {
      totalChunks: chunks.length,
      avgChunkLength: Math.round(avgLength),
      minChunkLength: Math.min(...lengths),
      maxChunkLength: Math.max(...lengths),
      chunksByType
    };
  }
} 