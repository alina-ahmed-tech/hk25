import fs from 'fs';
import path from 'path';
import { CaseData } from './types';

export class DataLoader {
  private dataPath: string;

  constructor(dataPath: string = 'data/cases') {
    this.dataPath = dataPath;
  }

  /**
   * Load all case files from the data directory
   */
  async loadAllCases(): Promise<CaseData[]> {
    try {
      const files = await fs.promises.readdir(this.dataPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`Found ${jsonFiles.length} case files`);
      
      const cases: CaseData[] = [];
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.dataPath, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const caseData: CaseData = JSON.parse(content);
          cases.push(caseData);
        } catch (error) {
          console.error(`Error loading case file ${file}:`, error);
        }
      }
      
      console.log(`Successfully loaded ${cases.length} cases`);
      return cases;
    } catch (error) {
      console.error('Error loading cases:', error);
      throw error;
    }
  }

  /**
   * Load a single case by ID
   */
  async loadCase(caseId: string): Promise<CaseData | null> {
    try {
      const filePath = path.join(this.dataPath, `${caseId}.json`);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Get statistics about the loaded data
   */
  getDataStats(cases: CaseData[]): {
    totalCases: number;
    totalDecisions: number;
    totalOpinions: number;
    totalContentLength: number;
  } {
    let totalDecisions = 0;
    let totalOpinions = 0;
    let totalContentLength = 0;

    cases.forEach(caseData => {
      totalDecisions += caseData.Decisions.length;
      
      caseData.Decisions.forEach(decision => {
        totalOpinions += decision.Opinions.length;
        totalContentLength += decision.Content.length;
        
        decision.Opinions.forEach(opinion => {
          totalContentLength += opinion.Content.length;
        });
      });
    });

    return {
      totalCases: cases.length,
      totalDecisions,
      totalOpinions,
      totalContentLength
    };
  }
} 