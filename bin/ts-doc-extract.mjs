#!/usr/bin/env node

/**
 * CLI entry point for ts-doc-extract.
 * Extracts AST documentation from TypeScript/JavaScript files and outputs JSON.
 */

import { extractModule } from '../src/extractor.mjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function printUsage() {
  console.error(`Usage: ts-doc-extract <file-path> [--variant=public|internal]

Extract AST documentation from TypeScript/JavaScript files.

Arguments:
  file-path           Path to .ts, .tsx, .js, or .jsx file

Options:
  --variant=VAR       Variant to extract: 'public' (default) or 'internal'
  --help             Show this help message

Output:
  JSON to stdout containing extracted documentation

Examples:
  ts-doc-extract src/index.ts
  ts-doc-extract src/components/Button.tsx --variant=internal
`);
}

function parseArgs(args) {
  const parsed = {
    filePath: null,
    variant: 'public',
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--variant=')) {
      parsed.variant = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      parsed.filePath = arg;
    }
  }

  return parsed;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const { filePath, variant } = parseArgs(args);

  if (!filePath) {
    console.error('Error: file-path argument required\n');
    printUsage();
    process.exit(1);
  }

  // Validate variant
  if (variant !== 'public' && variant !== 'internal') {
    console.error(`Error: variant must be 'public' or 'internal', got '${variant}'\n`);
    printUsage();
    process.exit(1);
  }

  // Resolve to absolute path
  const absolutePath = resolve(filePath);

  // Check file exists
  try {
    readFileSync(absolutePath);
  } catch (error) {
    console.error(`Error: cannot read file '${absolutePath}': ${error.message}`);
    process.exit(1);
  }

  // Extract documentation
  try {
    const result = extractModule(absolutePath, variant);

    // Output JSON to stdout
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`Error: extraction failed: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
