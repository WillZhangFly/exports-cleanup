/**
 * unused-exports
 * Find and remove unused exports from your codebase
 */

// Types
export type {
  ExportType,
  ExportedItem,
  ImportReference,
  ExportAnalysis,
  FileAnalysis,
  ScanResult,
  CliOptions,
} from './types/index.js';

// Analyzer
export { analyzeExports } from './analyzer/export-analyzer.js';
