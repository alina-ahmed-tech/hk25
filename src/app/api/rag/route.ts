import { NextRequest, NextResponse } from 'next/server';
import { RAGService } from '@/lib/rag/rag-service';

// Initialize RAG service as a singleton
let ragService: RAGService | null = null;

async function getRAGService(): Promise<RAGService> {
  if (!ragService) {
    ragService = new RAGService();
    await ragService.initialize();
  }
  return ragService;
}

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 5 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const service = await getRAGService();
    const response = await service.query(query, topK);

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('RAG API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const service = await getRAGService();
    const stats = service.getStats();

    return NextResponse.json({
      success: true,
      data: {
        stats,
        status: 'ready'
      }
    });

  } catch (error) {
    console.error('RAG Stats API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 