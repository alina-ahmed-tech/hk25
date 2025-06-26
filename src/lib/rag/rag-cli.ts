#!/usr/bin/env node

import readline from 'readline';
import { RAGService } from './rag-service';

class RAGCLI {
  private ragService: RAGService;
  private rl: readline.Interface;

  constructor() {
    this.ragService = new RAGService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🚀 Starting RAG CLI...\n');
    
    try {
      // Initialize RAG system
      console.log('📚 Loading arbitration cases...');
      await this.ragService.initialize();
      
      const stats = this.ragService.getStats();
      console.log('✅ RAG System Ready!');
      console.log(`📊 Knowledge Base: ${stats.totalChunks} chunks from ${stats.uniqueCases} cases`);
      console.log(`📄 Document Types: ${Object.entries(stats.chunksByType).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      console.log('');
      
      this.showHelp();
      this.promptUser();
      
    } catch (error) {
      console.error('❌ Failed to initialize RAG system:', error);
      process.exit(1);
    }
  }

  private showHelp() {
    console.log('🤖 RAG CLI Commands:');
    console.log('  /help     - Show this help');
    console.log('  /stats    - Show system statistics');
    console.log('  /quit     - Exit the CLI');
    console.log('  /clear    - Clear the screen');
    console.log('');
    console.log('💡 Just type your question to search the arbitration cases!');
    console.log('');
  }

  private promptUser() {
    this.rl.question('🔍 Query: ', async (input) => {
      const query = input.trim();
      
      if (!query) {
        this.promptUser();
        return;
      }

      // Handle commands
      if (query.startsWith('/')) {
        await this.handleCommand(query);
        this.promptUser();
        return;
      }

      // Process query
      await this.processQuery(query);
      this.promptUser();
    });
  }

  private async handleCommand(command: string) {
    switch (command.toLowerCase()) {
      case '/help':
        this.showHelp();
        break;
        
      case '/stats':
        const stats = this.ragService.getStats();
        console.log('\n📊 System Statistics:');
        console.log(`  Total Chunks: ${stats.totalChunks}`);
        console.log(`  Unique Cases: ${stats.uniqueCases}`);
        console.log(`  Chunks with Embeddings: ${stats.chunksWithEmbeddings}`);
        console.log('  Chunks by Type:');
        Object.entries(stats.chunksByType).forEach(([type, count]) => {
          console.log(`    ${type}: ${count}`);
        });
        console.log('');
        break;
        
      case '/quit':
        console.log('👋 Goodbye!');
        this.rl.close();
        process.exit(0);
        break;
        
      case '/clear':
        console.clear();
        this.showHelp();
        break;
        
      default:
        console.log('❌ Unknown command. Type /help for available commands.');
        break;
    }
  }

  private async processQuery(query: string) {
    console.log('\n🤔 Processing query...');
    
    try {
      const startTime = Date.now();
      const response = await this.ragService.query(query, 5);
      const endTime = Date.now();
      
      console.log(`\n✅ Answer (${endTime - startTime}ms):`);
      console.log('─'.repeat(50));
      console.log(response.answer);
      console.log('─'.repeat(50));
      
      if (response.sources.length > 0) {
        console.log('\n📚 Sources:');
        response.sources.forEach((source, index) => {
          const chunk = source.chunk;
          console.log(`  ${index + 1}. ${chunk.metadata.caseTitle}`);
          console.log(`     Type: ${chunk.metadata.documentType}`);
          console.log(`     Title: ${chunk.metadata.documentTitle}`);
          console.log(`     Score: ${source.score.toFixed(3)}`);
          if (chunk.metadata.date) {
            console.log(`     Date: ${new Date(chunk.metadata.date).toLocaleDateString()}`);
          }
          console.log(`     Content: ${chunk.content.substring(0, 150)}...`);
          console.log('');
        });
      } else {
        console.log('\n⚠️  No relevant sources found.');
      }
      
    } catch (error) {
      console.error('❌ Error processing query:', error);
    }
    
    console.log('');
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  const cli = new RAGCLI();
  cli.start().catch(console.error);
}

export { RAGCLI }; 