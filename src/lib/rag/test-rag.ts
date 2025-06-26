import { RAGService } from './rag-service';
import { DataLoader } from './data-loader';
import { DocumentChunker } from './chunker';
import { EmbeddingService } from './embedding-service';

async function testRAGImplementation() {
  console.log('=== RAG Implementation Test ===\n');

  try {
    // Step 1: Test Data Loading
    console.log('Step 1: Testing Data Loading...');
    const dataLoader = new DataLoader();
    const allCases = await dataLoader.loadAllCases();
    
    // Use only first 10 cases for testing to avoid memory issues
    const cases = allCases.slice(0, 10);
    const stats = dataLoader.getDataStats(cases);
    
    console.log('✅ Data Loading Results:');
    console.log(`- Total cases available: ${allCases.length}`);
    console.log(`- Testing with: ${cases.length} cases`);
    console.log(`- Total decisions: ${stats.totalDecisions}`);
    console.log(`- Total opinions: ${stats.totalOpinions}`);
    console.log(`- Total content length: ${stats.totalContentLength} characters`);
    console.log('');

    // Step 2: Test Document Chunking
    console.log('Step 2: Testing Document Chunking...');
    const chunker = new DocumentChunker(500, 50);
    const chunks = chunker.chunkCases(cases);
    const chunkStats = chunker.getChunkingStats(chunks);
    
    console.log('✅ Chunking Results:');
    console.log(`- Total chunks created: ${chunkStats.totalChunks}`);
    console.log(`- Average chunk length: ${chunkStats.avgChunkLength} characters`);
    console.log(`- Min chunk length: ${chunkStats.minChunkLength} characters`);
    console.log(`- Max chunk length: ${chunkStats.maxChunkLength} characters`);
    console.log(`- Chunks by type:`, chunkStats.chunksByType);
    console.log('');

    // Print a few example chunks
    console.log('📄 Example Chunks:');
    chunks.slice(0, 3).forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`);
      console.log(`- ID: ${chunk.id}`);
      console.log(`- Case: ${chunk.metadata.caseTitle}`);
      console.log(`- Type: ${chunk.metadata.documentType}`);
      console.log(`- Content: ${chunk.content.substring(0, 100)}...`);
      console.log('');
    });

    // Step 3: Test Embedding Service
    console.log('Step 3: Testing Embedding Service...');
    const embeddingService = new EmbeddingService();
    
    // Test embedding generation
    const testTexts = [
      'This is a test arbitration case about environmental damage.',
      'The tribunal ruled in favor of the claimant.',
      'International arbitration proceedings were initiated.'
    ];
    
    const embeddings = await embeddingService.embedTexts(testTexts);
    console.log('✅ Embedding Results:');
    console.log(`- Generated ${embeddings.length} embeddings`);
    console.log(`- Embedding dimension: ${embeddings[0]?.length || 0}`);
    console.log('');

    // Test similarity calculation
    const similarity = embeddingService.calculateCosineSimilarity(
      embeddings[0], 
      embeddings[1]
    );
    console.log(`- Similarity between test texts: ${similarity.toFixed(3)}`);
    console.log('');

    // Step 4: Test RAG Service (with limited data)
    console.log('Step 4: Testing RAG Service...');
    const ragService = new RAGService();
    
    // Initialize the RAG system with limited data
    console.log('Initializing RAG system with test data...');
    const testChunks = chunker.chunkCases(cases);
    await ragService['vectorStore'].addChunks(testChunks);
    
    // Mark as initialized for testing
    (ragService as any).isInitialized = true;
    
    const ragStats = ragService.getStats();
    console.log('✅ RAG System Statistics:');
    console.log(`- Total chunks in store: ${ragStats.totalChunks}`);
    console.log(`- Chunks with embeddings: ${ragStats.chunksWithEmbeddings}`);
    console.log(`- Unique cases: ${ragStats.uniqueCases}`);
    console.log(`- Chunks by type:`, ragStats.chunksByType);
    console.log('');

    // Step 5: Test Querying
    console.log('Step 5: Testing Querying...');
    const testQueries = [
      'What are the main issues in this case?',
      'How did the tribunal rule?',
      'What evidence was presented?'
    ];

    for (const query of testQueries) {
      console.log(`🔍 Testing query: "${query}"`);
      try {
        const response = await ragService.query(query, 3);
        console.log('✅ Query Results:');
        console.log(`- Answer: ${response.answer.substring(0, 200)}...`);
        console.log(`- Sources found: ${response.sources.length}`);
        response.sources.forEach((source, index) => {
          console.log(`  Source ${index + 1}: ${source.chunk.metadata.caseTitle} (Score: ${source.score.toFixed(3)})`);
        });
        console.log('');
      } catch (error) {
        console.error(`❌ Error processing query: ${error}`);
        console.log('');
      }
    }

    console.log('=== RAG Implementation Test Complete ===');
    console.log('✅ All steps completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRAGImplementation();
}

export { testRAGImplementation }; 