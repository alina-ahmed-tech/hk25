import { DocumentChunk, SearchResult } from './types';
import { EmbeddingService } from './embedding-service';

export class VectorStore {
  private chunks: DocumentChunk[] = [];
  private embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Add chunks to the vector store
   */
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    console.log(`Adding ${chunks.length} chunks to vector store...`);
    
    // Generate embeddings for chunks that don't have them
    const chunksToEmbed = chunks.filter(chunk => !chunk.embedding);
    if (chunksToEmbed.length > 0) {
      const embeddedChunks = await this.embeddingService.embedChunks(chunksToEmbed);
      //this.chunks.push(...embeddedChunks);
      this.chunks = this.chunks.concat(embeddedChunks);
    } else {
      this.chunks.push(...chunks);
    }
    
    console.log(`Vector store now contains ${this.chunks.length} chunks`);
  }

  /**
   * Search for similar chunks
   */
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const similarChunks = await this.embeddingService.findSimilarChunks(
      query, 
      this.chunks, 
      topK
    );

    return similarChunks.map(({ chunk, similarity }) => ({
      chunk,
      score: similarity
    }));
  }

  /**
   * Search by metadata filters
   */
  async searchByMetadata(
    filters: Partial<{
      caseId: string;
      documentType: string;
      date: string;
    }>,
    topK: number = 10
  ): Promise<DocumentChunk[]> {
    let filteredChunks = this.chunks;

    if (filters.caseId) {
      filteredChunks = filteredChunks.filter(
        chunk => chunk.metadata.caseId === filters.caseId
      );
    }

    if (filters.documentType) {
      filteredChunks = filteredChunks.filter(
        chunk => chunk.metadata.documentType === filters.documentType
      );
    }

    if (filters.date) {
      filteredChunks = filteredChunks.filter(
        chunk => chunk.metadata.date === filters.date
      );
    }

    return filteredChunks.slice(0, topK);
  }

  /**
   * Get chunk by ID
   */
  getChunkById(id: string): DocumentChunk | undefined {
    return this.chunks.find(chunk => chunk.id === id);
  }

  /**
   * Get all chunks for a specific case
   */
  getChunksByCase(caseId: string): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.caseId === caseId);
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    totalChunks: number;
    chunksWithEmbeddings: number;
    uniqueCases: number;
    chunksByType: Record<string, number>;
  } {
    const uniqueCases = new Set(this.chunks.map(chunk => chunk.metadata.caseId)).size;
    const chunksWithEmbeddings = this.chunks.filter(chunk => chunk.embedding).length;
    
    const chunksByType: Record<string, number> = {};
    this.chunks.forEach(chunk => {
      const type = chunk.metadata.documentType;
      chunksByType[type] = (chunksByType[type] || 0) + 1;
    });

    return {
      totalChunks: this.chunks.length,
      chunksWithEmbeddings,
      uniqueCases,
      chunksByType
    };
  }

  /**
   * Clear all chunks from the store
   */
  clear(): void {
    this.chunks = [];
  }
} 