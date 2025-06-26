import { ai } from '../../ai/genkit';
import { DataLoader } from './data-loader';
import { DocumentChunker } from './chunker';
import { EmbeddingService } from './embedding-service';
import { VectorStore } from './vector-store';
import { RAGResponse, SearchResult } from './types';

export class RAGService {
  private dataLoader: DataLoader;
  private chunker: DocumentChunker;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;
  private isInitialized: boolean = false;

  constructor() {
    this.dataLoader = new DataLoader();
    this.chunker = new DocumentChunker(500, 50);
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore(this.embeddingService);
  }

  /**
   * Initialize the RAG system by loading and processing all cases
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('RAG system already initialized');
      return;
    }

    console.log('Initializing RAG system...');

    // Step 1: Load all cases
    const cases = await this.dataLoader.loadAllCases();
    console.log(`Loaded ${cases.length} cases`);

    // Step 2: Chunk the documents
    const chunks = this.chunker.chunkCases(cases);
    console.log(`Created ${chunks.length} chunks`);

    // Step 3: Add chunks to vector store (embeddings will be generated automatically)
    await this.vectorStore.addChunks(chunks);

    // Step 4: Print statistics
    const stats = this.vectorStore.getStats();
    console.log('RAG System Statistics:', stats);

    this.isInitialized = true;
    console.log('RAG system initialized successfully');
  }

  /**
   * Query the RAG system
   */
  async query(userQuery: string, topK: number = 5): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('RAG system not initialized. Call initialize() first.');
    }

    console.log(`Processing query: "${userQuery}"`);

    // Step 1: Retrieve relevant chunks
    const searchResults = await this.vectorStore.search(userQuery, topK);
    console.log(`Retrieved ${searchResults.length} relevant chunks`);

    // Step 2: Prepare context for generation
    const context = this.prepareContext(searchResults);
    
    // Step 3: Generate answer using LLM
    const answer = await this.generateAnswer(userQuery, context);

    return {
      answer,
      sources: searchResults,
      query: userQuery
    };
  }

  /**
   * Prepare context from search results
   */
  private prepareContext(searchResults: SearchResult[]): string {
    const contextParts = searchResults.map((result, index) => {
      const chunk = result.chunk;
      return `Source ${index + 1} (Score: ${result.score.toFixed(3)}):
Case: ${chunk.metadata.caseTitle}
Document: ${chunk.metadata.documentType} - ${chunk.metadata.documentTitle}
Date: ${chunk.metadata.date || 'Unknown'}
Content: ${chunk.content}

---`;
    });

    return contextParts.join('\n');
  }

  /**
   * Generate answer using the LLM
   */
  private async generateAnswer(query: string, context: string): Promise<string> {
    const prompt = `You are a legal assistant specializing in international arbitration cases. 
Based on the following context from arbitration case documents, please answer the user's question.

Context:
${context}

User Question: ${query}

Instructions:
1. Answer based ONLY on the provided context
2. If the context doesn't contain enough information to answer the question, say so
3. Cite specific sources when possible
4. Be concise but thorough
5. Use legal terminology appropriately

Answer:`;

    try {
      const result = await ai.generate({
        prompt: prompt,
      });

      return result.text || 'Unable to generate answer';
    } catch (error) {
      console.error('Error generating answer:', error);
      return 'Sorry, I encountered an error while generating the answer.';
    }
  }

  /**
   * Get statistics about the RAG system
   */
  getStats() {
    return this.vectorStore.getStats();
  }

  /**
   * Search for specific cases or documents
   */
  async searchByMetadata(filters: any, topK: number = 10) {
    return await this.vectorStore.searchByMetadata(filters, topK);
  }

  /**
   * Get chunks for a specific case
   */
  getCaseChunks(caseId: string) {
    return this.vectorStore.getChunksByCase(caseId);
  }
} 