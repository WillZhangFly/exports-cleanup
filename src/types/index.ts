/**
 * Type of export
 */
export type ExportType = 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'default' | 'variable';

/**
 * Represents an exported item
 */
export interface ExportedItem {
  name: string;
  type: ExportType;
  file: string;
  line: number;
  isDefault: boolean;
  estimatedSize: number; // bytes
}

/**
 * Import reference
 */
export interface ImportReference {
  name: string;
  fromFile: string;
  toFile: string;
  line: number;
  isDefault: boolean;
}

/**
 * Analysis result for an export
 */
export interface ExportAnalysis {
  export: ExportedItem;
  usageCount: number;
  usedIn: string[];
  isUnused: boolean;
}

/**
 * File analysis result
 */
export interface FileAnalysis {
  file: string;
  exports: ExportAnalysis[];
  unusedCount: number;
  usedCount: number;
}

/**
 * Overall scan result
 */
export interface ScanResult {
  files: FileAnalysis[];
  totalExports: number;
  unusedExports: number;
  usedExports: number;
  estimatedSavings: number; // bytes
}

/**
 * CLI options
 */
export interface CliOptions {
  path: string;
  json: boolean;
  includeTypes: boolean;
  ignore: string[];
}
