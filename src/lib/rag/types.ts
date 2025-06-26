export interface CaseData {
  Identifier: string;
  Title: string;
  CaseNumber: string | null;
  Industries: string[];
  Status: string;
  PartyNationalities: string[];
  Institution: string;
  RulesOfArbitration: string[];
  ApplicableTreaties: string[];
  Decisions: Decision[];
}

export interface Decision {
  Title: string;
  Type: string;
  Date: string | null;
  Opinions: Opinion[];
  Content: string;
}

export interface Opinion {
  Title: string;
  Type: string;
  Date: string | null;
  Content: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    caseId: string;
    caseTitle: string;
    documentType: string;
    documentTitle: string;
    date: string | null;
    chunkIndex: number;
    totalChunks: number;
  };
  embedding?: number[];
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  query: string;
} 