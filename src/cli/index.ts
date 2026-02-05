#!/usr/bin/env node

import { Command } from 'commander';
import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeExports } from '../analyzer/export-analyzer.js';
import { printScanResult, printCompactResult, printJsonResult, printSupportMessage } from './output.js';

const program = new Command();

program
  .name('exports-cleanup')
  .description('Find unused exports in your codebase')
  .version('0.0.1');

program
  .argument('[path]', 'Directory to scan', '.')
  .option('--json', 'Output results as JSON', false)
  .option('--compact', 'Compact output format', false)
  .option('--include-types', 'Include type and interface exports', false)
  .option('--show-used', 'Also show used exports', false)
  .option('--ignore <patterns>', 'Additional patterns to ignore (comma-separated)', '')
  .action(async (
    pathArg: string,
    options: {
      json: boolean;
      compact: boolean;
      includeTypes: boolean;
      showUsed: boolean;
      ignore: string;
    }
  ) => {
    try {
      const projectPath = resolve(pathArg);

      // Parse ignore patterns
      const ignorePatterns = options.ignore
        ? options.ignore.split(',').map(p => p.trim())
        : [];

      // Scan
      const spinner = ora('Scanning for exports...').start();

      let result;
      try {
        result = await analyzeExports(projectPath, {
          includeTypes: options.includeTypes,
          exclude: ignorePatterns,
        });
        spinner.stop();
      } catch (error) {
        spinner.fail('Scan failed');
        throw error;
      }

      // Output
      if (options.json) {
        printJsonResult(result, projectPath);
        return;
      }

      if (options.compact) {
        printCompactResult(result, projectPath);
      } else {
        printScanResult(result, projectPath, options.showUsed);
      }

      printSupportMessage();

      // Exit with code 1 if unused exports found (useful for CI)
      if (result.unusedExports > 0) {
        process.exit(1);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}`));
      } else {
        console.error(chalk.red('\n❌ An unexpected error occurred'));
      }
      process.exit(1);
    }
  });

program.parse();
