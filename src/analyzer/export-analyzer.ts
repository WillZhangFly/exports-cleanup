import { readFileSync } from 'fs';
import { resolve, relative, dirname, basename } from 'path';
import glob from 'fast-glob';
import type {
  ExportedItem,
  ExportType,
  ImportReference,
  ExportAnalysis,
  FileAnalysis,
  ScanResult,
} from '../types/index.js';

/**
 * Default patterns
 */
const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs'];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/*.d.ts',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
];

/**
 * Estimate size of a code block in bytes
 */
function estimateSize(code: string): number {
  // Rough estimate: minified code is ~60% of original
  return Math.round(code.length * 0.6);
}

/**
 * Extract exports from a file
 */
function extractExports(content: string, filePath: string): ExportedItem[] {
  const exports: ExportedItem[] = [];
  const lines = content.split('\n');

  // Regex patterns for different export types
  const patterns = [
    // export function name()
    { regex: /^export\s+function\s+(\w+)/gm, type: 'function' as ExportType },
    // export async function name()
    { regex: /^export\s+async\s+function\s+(\w+)/gm, type: 'function' as ExportType },
    // export class Name
    { regex: /^export\s+class\s+(\w+)/gm, type: 'class' as ExportType },
    // export const name =
    { regex: /^export\s+const\s+(\w+)\s*[=:]/gm, type: 'const' as ExportType },
    // export let name =
    { regex: /^export\s+let\s+(\w+)\s*[=:]/gm, type: 'variable' as ExportType },
    // export var name =
    { regex: /^export\s+var\s+(\w+)\s*[=:]/gm, type: 'variable' as ExportType },
    // export type Name =
    { regex: /^export\s+type\s+(\w+)/gm, type: 'type' as ExportType },
    // export interface Name
    { regex: /^export\s+interface\s+(\w+)/gm, type: 'interface' as ExportType },
    // export enum Name
    { regex: /^export\s+enum\s+(\w+)/gm, type: 'enum' as ExportType },
    // export default function/class/etc
    { regex: /^export\s+default\s+(?:function|class)\s+(\w+)?/gm, type: 'default' as ExportType },
    // export default name
    { regex: /^export\s+default\s+(\w+)\s*;?$/gm, type: 'default' as ExportType },
  ];

  // Find line numbers
  const getLineNumber = (index: number): number => {
    let line = 1;
    for (let i = 0; i < index && i < content.length; i++) {
      if (content[i] === '\n') line++;
    }
    return line;
  };

  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || 'default';
      const line = getLineNumber(match.index);

      // Estimate size of the export
      let endIndex = content.indexOf('\n\n', match.index);
      if (endIndex === -1) endIndex = content.length;
      const code = content.slice(match.index, endIndex);

      exports.push({
        name,
        type,
        file: filePath,
        line,
        isDefault: type === 'default',
        estimatedSize: estimateSize(code),
      });
    }
  }

  // Handle export { name1, name2 }
  const namedExportRegex = /^export\s*\{([^}]+)\}/gm;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    });

    const line = getLineNumber(match.index);

    for (const name of names) {
      if (name && !exports.some(e => e.name === name)) {
        exports.push({
          name,
          type: 'const',
          file: filePath,
          line,
          isDefault: false,
          estimatedSize: 100, // Rough estimate for re-exports
        });
      }
    }
  }

  return exports;
}

/**
 * Extract imports from a file
 */
function extractImports(content: string, filePath: string, rootDir: string): ImportReference[] {
  const imports: ImportReference[] = [];
  const lines = content.split('\n');

  // Patterns for imports
  const importPatterns = [
    // import { name } from './file'
    /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g,
    // import name from './file'
    /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
    // import * as name from './file'
    /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g,
  ];

  const getLineNumber = (index: number): number => {
    let line = 1;
    for (let i = 0; i < index && i < content.length; i++) {
      if (content[i] === '\n') line++;
    }
    return line;
  };

  // Named imports
  const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = namedImportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(n => {
      const parts = n.trim().split(/\s+as\s+/);
      return parts[0].trim();
    });
    const fromPath = match[2];
    const line = getLineNumber(match.index);

    // Skip external packages
    if (!fromPath.startsWith('.') && !fromPath.startsWith('/')) continue;

    const resolvedPath = resolveImportPath(fromPath, filePath, rootDir);

    for (const name of names) {
      if (name) {
        imports.push({
          name,
          fromFile: resolvedPath,
          toFile: filePath,
          line,
          isDefault: false,
        });
      }
    }
  }

  // Default imports
  const defaultImportRegex = /import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s*['"]([^'"]+)['"]/g;
  while ((match = defaultImportRegex.exec(content)) !== null) {
    const name = match[1];
    const fromPath = match[2];
    const line = getLineNumber(match.index);

    if (!fromPath.startsWith('.') && !fromPath.startsWith('/')) continue;

    const resolvedPath = resolveImportPath(fromPath, filePath, rootDir);

    imports.push({
      name: 'default',
      fromFile: resolvedPath,
      toFile: filePath,
      line,
      isDefault: true,
    });
  }

  return imports;
}

/**
 * Resolve import path to absolute path
 */
function resolveImportPath(importPath: string, fromFile: string, rootDir: string): string {
  const dir = dirname(fromFile);
  let resolved = resolve(dir, importPath);

  // Try adding extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '/index.ts', '/index.tsx', '/index.js'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    try {
      readFileSync(withExt);
      return withExt;
    } catch {
      continue;
    }
  }

  return resolved;
}

/**
 * Analyze exports in a directory
 */
export async function analyzeExports(
  rootDir: string,
  options: {
    includeTypes?: boolean;
    exclude?: string[];
  } = {}
): Promise<ScanResult> {
  const { includeTypes = false, exclude = [] } = options;

  const allExcludes = [...DEFAULT_EXCLUDE, ...exclude];

  // Get all files
  const files = await glob(DEFAULT_INCLUDE, {
    cwd: rootDir,
    absolute: true,
    ignore: allExcludes,
    onlyFiles: true,
  });

  // Extract all exports and imports
  const allExports: ExportedItem[] = [];
  const allImports: ImportReference[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const exports = extractExports(content, file);
      const imports = extractImports(content, file, rootDir);

      allExports.push(...exports);
      allImports.push(...imports);
    } catch {
      continue;
    }
  }

  // Filter out type exports if not including them
  const filteredExports = includeTypes
    ? allExports
    : allExports.filter(e => e.type !== 'type' && e.type !== 'interface');

  // Analyze usage
  const fileAnalysisMap = new Map<string, FileAnalysis>();

  for (const exp of filteredExports) {
    // Find imports of this export
    const usages = allImports.filter(imp => {
      const isSameFile = imp.fromFile === exp.file ||
        imp.fromFile.replace(/\.(ts|tsx|js|jsx|mjs)$/, '') === exp.file.replace(/\.(ts|tsx|js|jsx|mjs)$/, '');

      if (!isSameFile) return false;

      if (exp.isDefault) {
        return imp.isDefault;
      }
      return imp.name === exp.name;
    });

    const usedIn = [...new Set(usages.map(u => u.toFile))];
    const isUnused = usedIn.length === 0;

    const analysis: ExportAnalysis = {
      export: exp,
      usageCount: usedIn.length,
      usedIn,
      isUnused,
    };

    // Add to file analysis
    if (!fileAnalysisMap.has(exp.file)) {
      fileAnalysisMap.set(exp.file, {
        file: exp.file,
        exports: [],
        unusedCount: 0,
        usedCount: 0,
      });
    }

    const fileAnalysis = fileAnalysisMap.get(exp.file)!;
    fileAnalysis.exports.push(analysis);
    if (isUnused) {
      fileAnalysis.unusedCount++;
    } else {
      fileAnalysis.usedCount++;
    }
  }

  // Calculate totals
  const fileAnalyses = Array.from(fileAnalysisMap.values())
    .filter(f => f.exports.length > 0)
    .sort((a, b) => b.unusedCount - a.unusedCount);

  let totalExports = 0;
  let unusedExports = 0;
  let estimatedSavings = 0;

  for (const fa of fileAnalyses) {
    totalExports += fa.exports.length;
    unusedExports += fa.unusedCount;
    estimatedSavings += fa.exports
      .filter(e => e.isUnused)
      .reduce((sum, e) => sum + e.export.estimatedSize, 0);
  }

  return {
    files: fileAnalyses,
    totalExports,
    unusedExports,
    usedExports: totalExports - unusedExports,
    estimatedSavings,
  };
}
