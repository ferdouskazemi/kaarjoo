import { BoundingBox } from '@kaarjoo/shared';

export interface ParsedBlock {
  text: string;
  page: number;
  bbox: BoundingBox;
  fontSize?: number;
  isBold?: boolean;
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
  blocks: ParsedBlock[];
}

export interface ParsedDocument {
  filePath: string;
  fileName: string;
  mimeType: string;
  pageCount: number;
  isScanned: boolean;
  ocrConfidence?: number;
  pages: ParsedPage[];
  rawText: string;
}
