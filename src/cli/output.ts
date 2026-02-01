import chalk from 'chalk';
import { relative } from 'path';
import type { ScanResult, FileAnalysis, ExportAnalysis } from '../types/index.js';

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get color for export type
 */
function getTypeColor(type: string): (text: string) => string {
  switch (type) {
    case 'function':
      return chalk.blue;
    case 'class':
      return chalk.magenta;
    case 'const':
    case 'variable':
      return chalk.cyan;
    case 'type':
    case 'interface':
      return chalk.gray;
    case 'enum':
      return chalk.yellow;
    case 'default':
      return chalk.green;
    default:
      return chalk.white;
  }
}

/**
 * Print scan results
 */
export function printScanResult(result: ScanResult, cwd: string, showUsed: boolean = false): void {
  console.log();

  if (result.unusedExports === 0) {
    console.log(chalk.green('✅ No unused exports found!'));
    console.log(chalk.gray(`   Scanned ${result.totalExports} exports across ${result.files.length} files.`));
    console.log();
    return;
  }

  console.log(chalk.bold.yellow(`🔍 Unused Exports (${result.unusedExports} found):`));
  console.log();

  // Summary
  console.log(chalk.gray('Summary:'));
  console.log(`  Total exports:  ${result.totalExports}`);
  console.log(`  ${chalk.red(`Unused:`)}        ${result.unusedExports}`);
  console.log(`  ${chalk.green(`Used:`)}          ${result.usedExports}`);
  console.log(`  Potential savings: ${chalk.cyan(formatBytes(result.estimatedSavings))}`);
  console.log();

  // Files with unused exports
  for (const fileAnalysis of result.files) {
    if (fileAnalysis.unusedCount === 0 && !showUsed) continue;

    const relativePath = relative(cwd, fileAnalysis.file);
    console.log(chalk.bold.white(`📁 ${relativePath}`));

    for (const exp of fileAnalysis.exports) {
      if (exp.isUnused) {
        const typeColor = getTypeColor(exp.export.type);
        const typeLabel = typeColor(`[${exp.export.type}]`);
        console.log(`  ${chalk.red('❌')} ${exp.export.name}() ${typeLabel}`);
        console.log(chalk.gray(`     Line ${exp.export.line} - exported but never imported`));
      } else if (showUsed) {
        const typeColor = getTypeColor(exp.export.type);
        const typeLabel = typeColor(`[${exp.export.type}]`);
        console.log(`  ${chalk.green('✅')} ${exp.export.name}() ${typeLabel}`);
        console.log(chalk.gray(`     Used in ${exp.usageCount} file(s)`));
      }
    }
    console.log();
  }

  // Tips
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('Potential bundle reduction:'), chalk.cyan(formatBytes(result.estimatedSavings)));
  console.log();
  console.log(chalk.gray('💡 Tips:'));
  console.log(chalk.gray('  • Remove unused exports to reduce bundle size'));
  console.log(chalk.gray('  • Some exports may be used dynamically (check manually)'));
  console.log(chalk.gray('  • Entry points and public APIs may show as "unused"'));
  console.log();
}

/**
 * Print compact results
 */
export function printCompactResult(result: ScanResult, cwd: string): void {
  console.log();

  if (result.unusedExports === 0) {
    console.log(chalk.green('✅ No unused exports found!'));
    return;
  }

  console.log(chalk.bold.yellow(`🔍 Found ${result.unusedExports} unused exports:`));
  console.log();

  for (const fileAnalysis of result.files) {
    if (fileAnalysis.unusedCount === 0) continue;

    const relativePath = relative(cwd, fileAnalysis.file);
    const unusedNames = fileAnalysis.exports
      .filter(e => e.isUnused)
      .map(e => e.export.name)
      .join(', ');

    console.log(`  ${chalk.gray(relativePath)}`);
    console.log(`    ${chalk.red(unusedNames)}`);
  }

  console.log();
  console.log(chalk.gray(`Potential savings: ${formatBytes(result.estimatedSavings)}`));
  console.log();
}

/**
 * Print JSON result
 */
export function printJsonResult(result: ScanResult, cwd: string): void {
  // Convert to relative paths for cleaner output
  const output = {
    ...result,
    files: result.files.map(f => ({
      ...f,
      file: relative(cwd, f.file),
      exports: f.exports.map(e => ({
        ...e,
        export: {
          ...e.export,
          file: relative(cwd, e.export.file),
        },
        usedIn: e.usedIn.map(u => relative(cwd, u)),
      })),
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

/**
 * Print support message
 */
export function printSupportMessage(): void {
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray('Cleaned up dead code? Consider supporting:'));
  console.log(chalk.cyan('☕ https://buymeacoffee.com/willzhangfly'));
  console.log();
}
