import { DocumentChunk } from './types';

export class EmbeddingService {
  private model: string;

  constructor(model: string = 'text-embedding-3-small') {
    this.model = model;
  }

  /**
   * Generate embeddings for a single text
   * For now, using a simple hash-based approach as placeholder
   */
  async embedText(text: string): Promise<number[]> {
    try {
      // Simple hash-based embedding for demonstration
      // In production, you'd use a proper embedding model
      const hash = this.simpleHash(text);
      const embedding = new Array(1536).fill(0);
      
      // Use hash to seed some values in the embedding
      for (let i = 0; i < Math.min(100, embedding.length); i++) {
        embedding[i] = Math.sin(hash + i) * 0.5;
      }
      
      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Simple hash function for demonstration
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    for (const text of texts) {
      try {
        const embedding = await this.embedText(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Error embedding text: ${text.substring(0, 100)}...`, error);
        // Add a zero vector as fallback
        embeddings.push(new Array(1536).fill(0));
      }
    }
    
    return embeddings;
  }

  /**
   * Generate embeddings for document chunks
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.embedTexts(texts);
    
    return chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index]
    }));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Find most similar chunks to a query
   */
  async findSimilarChunks(
    query: string, 
    chunks: DocumentChunk[], 
    topK: number = 5
  ): Promise<{ chunk: DocumentChunk; similarity: number }[]> {
    const queryEmbedding = await this.embedText(query);
    
    const similarities = chunks
      .filter(chunk => chunk.embedding)
      .map(chunk => ({
        chunk,
        similarity: this.calculateCosineSimilarity(queryEmbedding, chunk.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return similarities;
  }
} 